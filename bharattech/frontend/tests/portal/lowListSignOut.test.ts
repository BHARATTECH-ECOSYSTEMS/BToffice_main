import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ApiError, createApi, failedText } from '../../src/portal/api';
import { createAuth, type AuthConfig } from '../../src/portal/auth';
import { fetchMyLearning } from '../../src/portal/myLearning';

// Review 2026-10-26 low list, portal (owner's 2A and 3A): someone blocked or removed while the portal was open kept it
// open, every page saying "your role can't do that"; and answers the portal has no words of its own for (413 too big,
// 410 gone, 502 a service behind the backend) all read "couldn't reach", hiding the backend's own reason. A few texts
// misled too: the dashboard panels said "couldn't reach" when the backend asked to slow down, My learning called a
// refusal an ended sign-in, and certificates guessed at what a refusal meant.

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const answering = (reply: Response) => (async () => reply) as unknown as typeof fetch;
const signedIn = { token: async () => 'token-123', signedIn: () => true };

async function failure(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (e) {
    assert.ok(e instanceof ApiError, `expected an ApiError, got ${e}`);
    return e;
  }
  return assert.fail('expected the request to fail');
}

test("the backend saying the account is switched off signs the portal out", async () => {
  let switchedOff = 0;
  const api = createApi({ base: 'http://api.test/api', ...signedIn, request: answering(json(403, { code: 'switched-off', message: 'This account has been blocked.' })), onSwitchedOff: () => (switchedOff += 1) });
  const e = await failure(api.get('/user/me'));
  assert.equal(e.kind, 'signed-out');
  assert.equal(switchedOff, 1);
});

test("any other refusal (403) stays a refusal, and nobody is signed out", async () => {
  let switchedOff = 0;
  const api = createApi({ base: 'http://api.test/api', ...signedIn, request: answering(json(403, { message: 'Only admins can do that.' })), onSwitchedOff: () => (switchedOff += 1) });
  assert.equal((await failure(api.get('/tasks'))).kind, 'forbidden');
  assert.equal(switchedOff, 0);
});

test('for an answer the portal has no words for (413, 410, 502), the backend’s own reason is what shows', async () => {
  const texts = { 'signed-out': 'a', forbidden: 'b', 'not-found': 'c', conflict: 'd', 'bad-request': 'e', busy: 'f', unavailable: 'We couldn’t reach the server.' } as const;
  for (const status of [413, 410, 502]) {
    const api = createApi({ base: 'http://api.test/api', ...signedIn, request: answering(json(status, { message: `Reason ${status}` })) });
    assert.equal(failedText(await failure(api.get('/x')), texts), `Reason ${status}`, String(status));
  }
  // with no reason given, and for the answers the portal knows, its own words stay
  const silent = createApi({ base: 'http://api.test/api', ...signedIn, request: answering(json(502, {})) });
  assert.equal(failedText(await failure(silent.get('/x')), texts), 'We couldn’t reach the server.');
  const known = createApi({ base: 'http://api.test/api', ...signedIn, request: answering(json(404, { message: 'Nope' })) });
  assert.equal(failedText(await failure(known.get('/x')), texts), 'c');
  // the network being down is still "couldn't reach"
  assert.equal(failedText(new ApiError('unavailable'), texts), 'We couldn’t reach the server.');
});

test('every page picks its error text through failedText, so none hides the backend’s reason', () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(ts|tsx)$/.test(name)) files.push(path);
    }
  };
  walk('src/portal');
  const direct = files.flatMap((f) => (readFileSync(f, 'utf8').match(/[A-Z_]*FAILED\[\(?[\w.!]+( as ApiError\))?\.kind\]/g) ?? []).map((m) => `${f}: ${m}`));
  assert.deepEqual(direct, []);
});

const CONFIG: AuthConfig = { api: 'http://api.test/api', keycloak: 'http://kc.test', realm: 'bharattech', clientId: 'lms-client' };

test("signing out as switched off tells the portal why", () => {
  const auth = createAuth(CONFIG, answering(json(200, {})));
  const reasons: (string | undefined)[] = [];
  auth.onExpire((reason) => reasons.push(reason));
  auth.switchedOff();
  assert.deepEqual(reasons, ['switched-off']);
  assert.equal(auth.signedIn(), false);
});

test('the sign-in box then opens saying the sign-in is switched off', () => {
  const session = readFileSync('src/portal/session.ts', 'utf8');
  assert.match(session, /auth\?\.onExpire\(\(reason\) => \{\s*switchedOff = reason === 'switched-off';\s*endSessionForNewSignIn\(\);/);
  assert.match(session, /export const endedSwitchedOff = \(\) => switchedOff;/);
  const login = readFileSync('src/components/Login.tsx', 'utf8');
  assert.match(login, /endedSwitchedOff\(\) \? \{ kind: 'notice', text: SIGN_IN_FAILED\['switched-off'\] \}/);
});

test('My learning tells a refusal apart from an ended sign-in', async () => {
  const state = await fetchMyLearning('http://lms.test', async () => 'token', answering(json(403, {})));
  assert.deepEqual(state, { kind: 'error', reason: 'forbidden' });
  assert.match(readFileSync('src/portal/pages/MyLearningPanel.tsx', 'utf8'), /forbidden: 'Learning didn’t let your account in/);
});

test('the dashboard panels say "too many requests" when asked to slow down', () => {
  assert.match(readFileSync('src/portal/pages/DashboardConnected.tsx', 'utf8'), /: error\.kind === 'busy'\s*\? BUSY_MESSAGE/);
});

test('certificates show the backend’s reason for a refusal instead of guessing', () => {
  const src = readFileSync('src/portal/pages/CertificatesConnected.tsx', 'utf8');
  assert.match(src, /const actionFailed = \(e: ApiError\) => \(\(e\.kind === 'bad-request' \|\| e\.kind === 'conflict'\) && e\.message !== e\.kind \? e\.message : failedText\(e, ACTION_FAILED\)\);/);
  // issuing and deleting both say it that way
  assert.equal((src.match(/actionFailed\(e as ApiError\)/g) ?? []).length, 2);
  assert.equal((src.match(/failedText\(e as ApiError, ACTION_FAILED\)/g) ?? []).length, 0);
});
