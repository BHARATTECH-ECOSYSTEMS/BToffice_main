import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, createApi } from '../../src/portal/api';

type Call = { url: string; init: RequestInit };

function backend(reply: Response | Error | 'hang') {
  const calls: Call[] = [];
  const request = ((url: string, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });
    if (reply === 'hang') {
      // a backend that never answers: only the request's abort signal ends it
      return new Promise((_, reject) => init.signal?.addEventListener('abort', () => reject(init.signal!.reason)));
    }
    return reply instanceof Error ? Promise.reject(reply) : Promise.resolve(reply);
  }) as unknown as typeof fetch;
  return { calls, request };
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const signedIn = { token: async () => 'token-123', signedIn: () => true };

async function failure(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (e) {
    assert.ok(e instanceof ApiError, `expected an ApiError, got ${e}`);
    return e.kind;
  }
  assert.fail('expected the request to fail');
}

test('a request goes to the backend with the sign-in token and returns its data', async () => {
  const net = backend(json(200, { fullName: 'Test Employee' }));
  const api = createApi({ base: 'http://api.test/api', ...signedIn, request: net.request });

  assert.deepEqual(await api.get('/user/me'), { fullName: 'Test Employee' });
  assert.equal(net.calls[0].url, 'http://api.test/api/user/me');
  assert.equal(new Headers(net.calls[0].init.headers).get('Authorization'), 'Bearer token-123');
});

test('signed out: no token means no request at all', async () => {
  const net = backend(json(200, {}));
  const api = createApi({ base: 'http://api.test/api', token: async () => null, signedIn: () => false, request: net.request });

  assert.equal(await failure(api.get('/user/me')), 'signed-out');
  assert.equal(net.calls.length, 0);
});

test('signed in but no token (Keycloak unreachable) reads as unavailable, not signed out', async () => {
  const net = backend(json(200, {}));
  const api = createApi({ base: 'http://api.test/api', token: async () => null, signedIn: () => true, request: net.request });

  assert.equal(await failure(api.get('/user/me')), 'unavailable');
});

test('each kind of backend answer becomes its own error', async () => {
  const cases: [Response | Error, string][] = [
    [json(401, { message: 'Auth failed' }), 'signed-out'],
    [json(403, { message: 'Admin or Superadmin required' }), 'forbidden'],
    [json(404, { message: 'User not found' }), 'not-found'],
    [json(400, { message: 'bad stream' }), 'bad-request'],
    [json(500, { message: 'Failed to fetch profile' }), 'unavailable'],
    [json(429, { message: 'Too many requests' }), 'unavailable'],
    [new TypeError('Failed to fetch'), 'unavailable'],
    [new Response('<html>proxy error</html>', { status: 200 }), 'unavailable'],
  ];
  for (const [reply, kind] of cases) {
    const api = createApi({ base: 'http://api.test/api', ...signedIn, request: backend(reply).request });
    assert.equal(await failure(api.get('/user/me')), kind, `for ${reply instanceof Error ? reply.message : reply.status}`);
  }
});

test("the backend's own message comes along for bad input", async () => {
  const api = createApi({ base: 'http://api.test/api', ...signedIn, request: backend(json(400, { message: 'Team is too long.' })).request });
  try {
    await api.get('/user/me');
    assert.fail('expected a failure');
  } catch (e) {
    assert.equal((e as ApiError).message, 'Team is too long.');
  }
});

test('a change is sent as JSON with the sign-in token, and the answer comes back', async () => {
  const net = backend(json(200, { _id: 'u1', team: 'Platform' }));
  const api = createApi({ base: 'http://api.test/api', ...signedIn, request: net.request });

  assert.deepEqual(await api.patch('/user/u1', { team: 'Platform', stream: 'tech' }), { _id: 'u1', team: 'Platform' });
  const { url, init } = net.calls[0];
  assert.equal(url, 'http://api.test/api/user/u1');
  assert.equal(init.method, 'PATCH');
  assert.equal(new Headers(init.headers).get('Authorization'), 'Bearer token-123');
  assert.equal(new Headers(init.headers).get('Content-Type'), 'application/json');
  assert.deepEqual(JSON.parse(String(init.body)), { team: 'Platform', stream: 'tech' });
});

test('a delete is sent with the sign-in token and no body', async () => {
  const net = backend(json(200, { message: 'User deleted successfully' }));
  const api = createApi({ base: 'http://api.test/api', ...signedIn, request: net.request });

  await api.del('/user/u1');
  assert.equal(net.calls[0].init.method, 'DELETE');
  assert.equal(net.calls[0].init.body, undefined);
  assert.equal(new Headers(net.calls[0].init.headers).get('Authorization'), 'Bearer token-123');
});

test('a refused change becomes the same errors as a refused read', async () => {
  const api = createApi({ base: 'http://api.test/api', ...signedIn, request: backend(json(403, { message: 'You do not have permission to delete this user.' })).request });
  try {
    await api.del('/user/u1');
    assert.fail('expected a failure');
  } catch (e) {
    assert.equal((e as ApiError).kind, 'forbidden');
    assert.equal((e as ApiError).message, 'You do not have permission to delete this user.');
  }
});

test('a new record is posted as JSON with the sign-in token', async () => {
  const net = backend(json(201, { success: true }));
  const api = createApi({ base: 'http://api.test/api', ...signedIn, request: net.request });

  assert.deepEqual(await api.post('/invite/send-invite', { name: 'Neha', email: 'neha@example.test', role: 'Employee' }), { success: true });
  assert.equal(net.calls[0].init.method, 'POST');
  assert.deepEqual(JSON.parse(String(net.calls[0].init.body)), { name: 'Neha', email: 'neha@example.test', role: 'Employee' });
});

test('"already exists" is its own error', async () => {
  const api = createApi({ base: 'http://api.test/api', ...signedIn, request: backend(json(409, { message: 'User exists with same email' })).request });
  try {
    await api.post('/invite/send-invite', {});
    assert.fail('expected a failure');
  } catch (e) {
    assert.equal((e as ApiError).kind, 'conflict');
  }
});

test("a failure keeps the backend's whole answer, for pages that need its details", async () => {
  const answer = { success: false, message: 'Invite email could not be sent.', inviteEmailSent: false, keycloakSynced: true };
  const api = createApi({ base: 'http://api.test/api', ...signedIn, request: backend(json(500, answer)).request });
  try {
    await api.post('/invite/send-invite', {});
    assert.fail('expected a failure');
  } catch (e) {
    assert.deepEqual((e as ApiError).details, answer);
  }
});

test('a slow request can be given more time than the usual limit', async () => {
  const net = backend('hang');
  const api = createApi({ base: 'http://api.test/api', ...signedIn, request: net.request, timeoutMs: 30 });
  const started = Date.now();
  await failure(api.post('/invite/send-invite', {}, { timeoutMs: 150 }));
  assert.ok(Date.now() - started >= 140, 'gave up before its own limit');
});

test('a file (a PDF) comes back as a Blob, asked for with the sign-in token', async () => {
  const pdf = new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), { status: 200, headers: { 'Content-Type': 'application/pdf' } });
  const net = backend(pdf);
  const api = createApi({ base: 'http://api.test/api', ...signedIn, request: net.request });

  const file = await api.getFile('/certificates/c1/pdf');

  assert.equal(file.type, 'application/pdf');
  assert.equal(await file.text(), '%PDF-');
  assert.equal(new Headers(net.calls[0].init.headers).get('Authorization'), 'Bearer token-123');
});

test("a refused file comes back as the backend's error, not as a broken file", async () => {
  const api = createApi({ base: 'http://api.test/api', ...signedIn, request: backend(json(403, { message: 'You can only open your own certificates.' })).request });
  try {
    await api.getFile('/certificates/c1/pdf');
    assert.fail('expected a failure');
  } catch (e) {
    assert.equal((e as ApiError).kind, 'forbidden');
    assert.equal((e as ApiError).message, 'You can only open your own certificates.');
  }
});

test('an upload is sent as the form itself, so the browser sets its own file boundary', async () => {
  const net = backend(json(201, { _id: 'p1' }));
  const api = createApi({ base: 'http://api.test/api', ...signedIn, request: net.request });
  const form = new FormData();
  form.append('name', 'Leave Policy');
  form.append('pdf', new Blob(['%PDF-'], { type: 'application/pdf' }), 'leave.pdf');

  assert.deepEqual(await api.postForm('/policies', form), { _id: 'p1' });
  const { init } = net.calls[0];
  assert.equal(init.method, 'POST');
  assert.equal(init.body, form);
  assert.equal(new Headers(init.headers).get('Content-Type'), null);
  assert.equal(new Headers(init.headers).get('Authorization'), 'Bearer token-123');
});

test('a backend that never answers gives up after the time limit instead of loading forever', async () => {
  const api = createApi({ base: 'http://api.test/api', ...signedIn, request: backend('hang').request, timeoutMs: 50 });
  const started = Date.now();

  assert.equal(await failure(api.get('/user/me')), 'unavailable');
  assert.ok(Date.now() - started < 1000);
});
