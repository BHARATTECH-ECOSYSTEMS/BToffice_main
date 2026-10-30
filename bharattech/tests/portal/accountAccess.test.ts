import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, BUSY_MESSAGE, createApi } from '../../src/portal/api';
import { isUsername } from '../../src/portal/auth';
import { accountCalls, accountFailedMessage, blockProblem, resetLinkProblem, type AccountRole } from '../../src/portal/people';

// Gap audit group B, owner's 1A, 2A and 3A: Block / Unblock and "Send reset link" in People, and a username at sign-in.

const person = (accountRole: AccountRole, status: 'active' | 'inactive' = 'active') => ({ accountRole, status });

test('who may block whom: the backend rules, never yourself and never a Super Admin', () => {
  assert.equal(blockProblem('Admin', person('Employee'), false), '');
  assert.equal(blockProblem('Admin', person('Subadmin'), false), '');
  assert.equal(blockProblem('Superadmin', person('Admin'), false), '');
  // unblocking follows the same rule
  assert.equal(blockProblem('Admin', person('Intern', 'inactive'), false), '');

  assert.match(blockProblem('Admin', person('Employee'), true), /yourself/i);
  assert.match(blockProblem('Admin', person('Admin'), false), /your role/i);
  assert.match(blockProblem('Superadmin', person('Superadmin'), false), /Super Admin/);
  for (const actor of ['Subadmin', 'Employee', 'Intern'] as AccountRole[]) assert.match(blockProblem(actor, person('Intern'), false), /admins/i, actor);
});

test('who may get a reset link: the same people, but not someone blocked and not yourself', () => {
  assert.equal(resetLinkProblem('Admin', person('Employee'), false), '');
  assert.equal(resetLinkProblem('Superadmin', person('Superadmin'), false), '');

  assert.match(resetLinkProblem('Admin', person('Employee'), true), /Change password/);
  assert.match(resetLinkProblem('Admin', person('Employee', 'inactive'), false), /Unblock/);
  assert.match(resetLinkProblem('Admin', person('Admin'), false), /your role/i);
  assert.match(resetLinkProblem('Subadmin', person('Intern'), false), /admins/i);
});

/** A stand-in backend that records each request and answers with the next reply. */
const backend = (...replies: [number, unknown][]) => {
  const calls: { url: string; method: string; body: unknown }[] = [];
  const request = async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const [status, body] = replies.shift() ?? [500, {}];
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  };
  return { calls, account: accountCalls(createApi({ base: 'http://api.test/api', token: async () => 'token', signedIn: () => true, request: request as typeof fetch })) };
};

test('blocking and unblocking send only isBanned to the edit route', async () => {
  const { calls, account } = backend([200, { status: 'inactive' }], [200, { status: 'active' }]);
  await account.setBlocked('6ad8bc3dd430c9b545aa2844', true);
  await account.setBlocked('6ad8bc3dd430c9b545aa2844', false);
  assert.deepEqual(calls, [
    { url: 'http://api.test/api/user/6ad8bc3dd430c9b545aa2844', method: 'PATCH', body: { isBanned: true } },
    { url: 'http://api.test/api/user/6ad8bc3dd430c9b545aa2844', method: 'PATCH', body: { isBanned: false } },
  ]);
});

test('a reset link goes to its own route and comes back with the backend’s sentence', async () => {
  const sentence = 'A reset link went to asha@example.test, their work email. It works once, for 30 minutes.';
  const { calls, account } = backend([200, { message: sentence }], [200, {}]);
  assert.equal(await account.sendResetLink('6ad8bc3dd430c9b545aa2844'), sentence);
  assert.deepEqual(calls[0], { url: 'http://api.test/api/user/6ad8bc3dd430c9b545aa2844/reset-link', method: 'POST', body: {} });
  // an odd answer still reads as sent
  assert.match(await account.sendResetLink('x'), /reset link/i);
});

test('a refusal shows the backend’s own words; without them, a plain sentence per kind', () => {
  assert.equal(accountFailedMessage(new ApiError('conflict', 'They’re blocked. Unblock them first, then send a reset link.')), 'They’re blocked. Unblock them first, then send a reset link.');
  assert.equal(accountFailedMessage(new ApiError('unavailable', 'Their sign-in couldn’t be switched right now, so nothing was changed.')), 'Their sign-in couldn’t be switched right now, so nothing was changed.');
  assert.equal(accountFailedMessage(new ApiError('busy')), BUSY_MESSAGE);
  assert.match(accountFailedMessage(new ApiError('unavailable')), /nothing was changed/i);
  assert.match(accountFailedMessage(new ApiError('signed-out')), /sign in again/i);
});

test('a username is what the invite setup lets people choose', () => {
  for (const typed of ['asha.rao', 'neha_k', 'ops-team', 'abc', ' asha.rao ', 'a'.repeat(32)]) assert.equal(isUsername(typed), true, typed);
  for (const typed of ['', 'ab', 'has space', 'asha@example.test', 'a'.repeat(33), 'asha!']) assert.equal(isUsername(typed), false, typed);
});
