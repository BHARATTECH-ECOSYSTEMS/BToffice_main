import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAuth, type AuthConfig } from '../../src/portal/auth';
import { fetchMyLearning } from '../../src/portal/myLearning';
import { sendEmploymentRequest } from '../../src/portal/inbox';
import { TIMEOUT_MS } from '../../src/portal/timedFetch';

// Review 2026-10-26 W6 (owner's 4A): sign-in, renewing the sign-in, sign-out, changing the password, My learning and
// the website's employment-request form waited for their answer with no time limit, so a hung Keycloak or backend
// left every page loading until a reload (every backend request waits for the renewal first). Now each gives up
// after the portal's usual 20 seconds and reads as "couldn't reach it just now".

const CONFIG: AuthConfig = { api: 'http://api.test/api', keycloak: 'http://kc.test', realm: 'bharattech', clientId: 'lms-client' };
const LIMIT = 50;

function jwt(seconds: number, tag = 'a') {
  const part = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${part({ alg: 'none' })}.${part({ exp: Math.floor(Date.now() / 1000) + seconds, tag })}.sig`;
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const loginOk = (access = jwt(300)) =>
  json(200, { access_token: access, refresh_token: jwt(1800, 'r'), id_token: jwt(300, 'id'), user: { fullName: 'Test Employee', username: 'test.employee', email: 'test.employee@example.test', role: 'EMPLOYEE' } });

/** Answers the queued replies, then never answers again: only the request's abort signal ends a hung one. */
function hangsAfter(...replies: Response[]) {
  const urls: string[] = [];
  const request = ((url: string, init: RequestInit = {}) => {
    urls.push(String(url));
    const reply = replies.shift();
    if (reply) return Promise.resolve(reply);
    return new Promise((_, reject) => init.signal?.addEventListener('abort', () => reject(init.signal!.reason)));
  }) as unknown as typeof fetch;
  return { urls, request };
}

/** Runs `work` and says how long it took, failing if it took far longer than the limit. */
async function quickly<T>(work: Promise<T>): Promise<T> {
  const started = Date.now();
  const result = await work;
  assert.ok(Date.now() - started < 1000, `took ${Date.now() - started} ms`);
  return result;
}

test('signing in gives up after the time limit and reads as unavailable', async () => {
  const auth = createAuth(CONFIG, hangsAfter().request, LIMIT);
  assert.deepEqual(await quickly(auth.signIn('test.employee', 'pw', false)), { ok: false, reason: 'unavailable' });
  assert.equal(auth.signedIn(), false);
});

test('finishing an invite, asking for a reset link and setting a new password give up too', async () => {
  const auth = createAuth(CONFIG, hangsAfter().request, LIMIT);
  const setup = { username: 'neha@example.test', temporaryPassword: 'temp-pass', newPassword: 'new-pass-123', newUsername: 'neha.k' };
  assert.equal((await quickly(auth.acceptInvite(setup, false))).ok, false);
  assert.deepEqual(await quickly(auth.requestPasswordReset('neha@example.test')), { ok: false, reason: 'unavailable' });
  assert.equal((await quickly(auth.resetPassword('token', 'New-Password-2'))).ok, false);
});

test('a renewal Keycloak never answers gives up and keeps the person signed in, like being offline', async () => {
  const net = hangsAfter(loginOk(jwt(10)));
  const auth = createAuth(CONFIG, net.request, LIMIT);
  await auth.signIn('test.employee', 'pw', false);

  assert.equal(await quickly(auth.accessToken()), null);
  assert.equal(auth.signedIn(), true);
  assert.match(net.urls[1], /\/protocol\/openid-connect\/token$/);
});

test('changing the password gives up and nothing changes here', async () => {
  const auth = createAuth(CONFIG, hangsAfter(loginOk()).request, LIMIT);
  await auth.signIn('test.employee', 'pw', false);

  assert.deepEqual(await quickly(auth.changePassword('Old-Password-1', 'New-Password-2')), { ok: false, reason: 'unavailable' });
  assert.equal(auth.signedIn(), true);
});

test('signing out finishes here even when Keycloak never answers', async () => {
  const auth = createAuth(CONFIG, hangsAfter(loginOk()).request, LIMIT);
  // signed in for real, so there is a Keycloak session to end and "signed out" is the sign-out's doing
  assert.equal((await auth.signIn('test.employee', 'pw', false)).ok, true);
  assert.equal(auth.signedIn(), true);

  await quickly(auth.signOut());
  assert.equal(auth.signedIn(), false);
});

test('My learning gives up and reads as unavailable', async () => {
  assert.deepEqual(await quickly(fetchMyLearning('http://lms.test', async () => 'token', hangsAfter().request, LIMIT)), { kind: 'error', reason: 'unavailable' });
});

test("the website's employment-request form gives up and says it couldn't send", async () => {
  const draft = { requesterName: 'A', requesterCompany: 'B', requesterEmail: 'a@b.test', employeeName: 'C', employeeId: '', message: '' };
  const sent = await quickly(sendEmploymentRequest(draft as never, '', { base: 'http://api.test/api', request: hangsAfter().request as never, timeoutMs: LIMIT }));
  assert.equal(sent.ok, false);
});

test('every one of them uses the same 20-second limit as the rest of the portal', () => {
  assert.equal(TIMEOUT_MS, 20_000);
  assert.match(readFileSync('src/portal/api.ts', 'utf8'), /import \{ TIMEOUT_MS \} from '\.\/timedFetch';/);
  assert.match(readFileSync('src/portal/auth.ts', 'utf8'), /timeoutMs = TIMEOUT_MS\) \{\r?\n  const request = timed\(send, timeoutMs\);/);
  assert.match(readFileSync('src/portal/myLearning.ts', 'utf8'), /timeoutMs = TIMEOUT_MS\)/);
  assert.match(readFileSync('src/portal/inbox.ts', 'utf8'), /timeoutMs = TIMEOUT_MS/);
});
