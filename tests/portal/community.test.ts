import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, BUSY_MESSAGE, createApi } from '../../src/portal/api';
import { communityCalls, communityFailedMessage, personalEmailProblem, toMembers } from '../../src/portal/community';
import { canMarkLeft, ACCOUNT_ROLES, type AccountRole } from '../../src/portal/people';

// GET /api/community/members as the local backend returns it (controllers/communityController.js), admin view
const vikram = { id: '6ad8bc3dd430c9b545aa4001', name: 'Vikram Joshi', stream: 'operations', leftOn: '2026-08-14', employeeId: 'BT-0010', personalEmail: '', canBringBack: true };
const neha = { id: '6ad8bc3dd430c9b545aa4002', name: 'Neha Kapoor', stream: 'tech', leftOn: '2026-06-30', employeeId: 'BT-0009', personalEmail: 'neha.home@example.net', canBringBack: false };

test('members come in as the community shows them, in the order the backend sent (newest leaver first)', () => {
  assert.deepEqual(toMembers([vikram, neha]), [
    { id: vikram.id, name: 'Vikram Joshi', stream: 'operations', left: '2026-08-14', employeeId: 'BT-0010', personalEmail: undefined, canBringBack: true },
    { id: neha.id, name: 'Neha Kapoor', stream: 'tech', left: '2026-06-30', employeeId: 'BT-0009', personalEmail: 'neha.home@example.net', canBringBack: false },
  ]);
});

test("what an employee is sent (no Employee ID, personal email or buttons) comes in without them", () => {
  assert.deepEqual(toMembers([{ id: neha.id, name: 'Neha Kapoor', stream: 'tech', leftOn: '2026-06-30' }]), [
    { id: neha.id, name: 'Neha Kapoor', stream: 'tech', left: '2026-06-30', employeeId: undefined, personalEmail: undefined, canBringBack: false },
  ]);
});

test('a broken member is left out instead of breaking the wall; an answer that is not a list is an error', () => {
  const broken = [{ ...neha, id: '' }, { ...neha, name: '' }, { ...neha, stream: 'sales' }, { ...neha, leftOn: '2026-02-30' }, { ...neha, leftOn: 'yesterday' }, null, 'Neha'];
  assert.deepEqual(toMembers([...broken, vikram]).map((m) => m.id), [vikram.id]);
  assert.throws(() => toMembers({ members: [] }), (e: unknown) => e instanceof ApiError && e.kind === 'unavailable');
});

test("who may mark someone as left matches the backend: whoever may delete them, never yourself, and only with a stream", () => {
  const allowed: [AccountRole, AccountRole][] = [
    ['Superadmin', 'Admin'],
    ['Superadmin', 'Subadmin'],
    ['Superadmin', 'Employee'],
    ['Superadmin', 'Intern'],
    ['Admin', 'Subadmin'],
    ['Admin', 'Employee'],
    ['Admin', 'Intern'],
  ];
  for (const actor of ACCOUNT_ROLES) {
    for (const target of ACCOUNT_ROLES) {
      const yes = allowed.some(([a, t]) => a === actor && t === target);
      assert.equal(canMarkLeft(actor, { accountRole: target, stream: 'tech' }, false) === '', yes, `${actor} → ${target}`);
    }
  }
  assert.match(canMarkLeft('Superadmin', { accountRole: 'Employee', stream: 'tech' }, true), /yourself/);
  assert.match(canMarkLeft('Admin', { accountRole: 'Employee' }, false), /stream/i);
  assert.match(canMarkLeft('Subadmin', { accountRole: 'Employee', stream: 'tech' }, false), /admins/i);
});

test("a personal email is checked as the backend checks it; empty is fine (it takes the email away)", () => {
  assert.equal(personalEmailProblem('', 'asha@bharattech.example'), '');
  assert.equal(personalEmailProblem('  Asha.Home@Example.net ', 'asha@bharattech.example'), '');
  assert.match(personalEmailProblem('asha.home', 'asha@bharattech.example'), /name@gmail\.com/);
  assert.match(personalEmailProblem('ASHA@bharattech.example', 'asha@bharattech.example'), /work email/i);
  assert.match(personalEmailProblem(`${'a'.repeat(120)}@example.net`, ''), /long/i);
});

test("a refusal shows the backend's own words where they say what to do; otherwise a plain explanation", () => {
  const words = "Set their stream in Details first: it decides which community they join.";
  assert.equal(communityFailedMessage(new ApiError('bad-request', words)), words);
  assert.equal(communityFailedMessage(new ApiError('conflict', 'Someone else already uses this email.')), 'Someone else already uses this email.');
  assert.equal(communityFailedMessage(new ApiError('forbidden', "You can't bring this person back.")), "You can't bring this person back.");
  // the backend's 502 says Keycloak didn't answer and that nothing changed
  const kc = "Their sign-in couldn't be switched off right now, so nothing was changed. Try again in a minute.";
  assert.equal(communityFailedMessage(new ApiError('unavailable', kc)), kc);
  assert.match(communityFailedMessage(new ApiError('unavailable')), /couldn’t reach/);
  assert.match(communityFailedMessage(new ApiError('not-found')), /refreshed/);
  assert.equal(communityFailedMessage(new ApiError('busy')), BUSY_MESSAGE);
  assert.match(communityFailedMessage(new ApiError('signed-out')), /sign in again/i);
});

/** A stand-in backend that records each request and answers with the next reply. */
const backend = (...replies: [number, unknown][]) => {
  const calls: { url: string; method: string; body: unknown }[] = [];
  const request = async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const [status, body] = replies.shift() ?? [500, {}];
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  };
  const calls$ = communityCalls(createApi({ base: 'http://api.test/api', token: async () => 'token', signedIn: () => true, request: request as typeof fetch }));
  return { calls, community: calls$ };
};

test('each action goes to its own address with only what the backend reads', async () => {
  const { calls, community } = backend(
    [200, [neha]],
    [200, { member: { id: neha.id } }],
    [200, { person: { id: neha.id, name: 'Neha Kapoor' }, needsInvite: true }],
    [200, { personalEmail: '' }],
    [200, { personalEmail: 'asha.home@example.net' }],
    [200, { personalEmail: 'neha.2@example.net' }],
  );
  assert.equal((await community.members())[0].name, 'Neha Kapoor');
  await community.leave('6ad8 bc');
  assert.deepEqual(await community.bringBack(neha.id), { needsInvite: true });
  assert.equal(await community.myPersonalEmail(), '');
  assert.equal(await community.saveMyPersonalEmail(' Asha.Home@example.net '), 'asha.home@example.net');
  assert.equal(await community.saveMemberPersonalEmail(neha.id, 'neha.2@example.net'), 'neha.2@example.net');

  assert.deepEqual(
    calls.map((c) => [c.method, c.url.replace('http://api.test/api', ''), c.body]),
    [
      ['GET', '/community/members', undefined],
      ['POST', '/community/leave/6ad8%20bc', {}],
      ['POST', `/community/members/${neha.id}/back`, {}],
      ['GET', '/community/me/personal-email', undefined],
      ['PUT', '/community/me/personal-email', { personalEmail: 'asha.home@example.net' }],
      ['PUT', `/community/members/${neha.id}/personal-email`, { personalEmail: 'neha.2@example.net' }],
    ],
  );
});

test("a refused action rejects with the backend's reason, and a strange answer counts as no answer", async () => {
  const { community } = backend([409, { message: 'Someone else already uses this email.' }], [200, { nothing: true }], [200, { person: {} }]);
  await assert.rejects(community.saveMyPersonalEmail('x@example.net'), (e: unknown) => e instanceof ApiError && e.kind === 'conflict' && e.message === 'Someone else already uses this email.');
  await assert.rejects(community.myPersonalEmail(), (e: unknown) => e instanceof ApiError && e.kind === 'unavailable');
  assert.deepEqual(await community.bringBack(neha.id), { needsInvite: false });
});
