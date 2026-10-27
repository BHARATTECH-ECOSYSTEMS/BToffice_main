// Low items (owner's 1B 2A, 2026-10-27).
// 1B: opened from the portal, the login page tried the portal's pass and the company sign-in at the same time. Now
//     the pass goes first, and only if it is refused is the company sign-in tried; never both at once.
// 2A: the pass was used up before the session was made, so a failure there wasted it. Now the session is made first
//     and the pass is used last, just before the session cookie is set.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const jose = require('jose');
const { emptyDatabase, closeDatabase, jsonRequest, signOut } = require('./support/helpers.cjs');
const { cookieJar } = require('./support/nextHeaders.cjs');

const { signInFromPortal } = require('@/lib/portalSignIn');
const { POST: launch } = require('@/app/api/auth/launch/route');

const later = (ms, value) => new Promise((done) => setTimeout(() => done(value), ms));

test('with a pass: the pass goes first, and the company sign-in is never tried when it works', async () => {
  const calls = [];
  const result = await signInFromPortal({
    launchToken: 'pass',
    tryLaunch: async (token) => (calls.push(`launch ${token}`), later(20, { ok: true })),
    trySso: async () => (calls.push('sso'), { ok: true }),
  });
  assert.deepEqual(result, { ok: true, by: 'pass' });
  assert.deepEqual(calls, ['launch pass']);
});

test('a refused pass falls back to the company sign-in, only after the pass has answered', async () => {
  const calls = [];
  let passAnswered = false;
  const result = await signInFromPortal({
    launchToken: 'old-pass',
    tryLaunch: async () => (calls.push('launch'), later(30).then(() => ((passAnswered = true), { ok: false, error: 'Invalid or unauthorized launch token' }))),
    trySso: async () => (calls.push(passAnswered ? 'sso after the pass' : 'sso too early'), { ok: true }),
  });
  assert.deepEqual(result, { ok: true, by: 'sso' }, 'signed in, with no error to show');
  assert.deepEqual(calls, ['launch', 'sso after the pass']);
});

test("when neither works, the pass's own reason is shown", async () => {
  const result = await signInFromPortal({
    launchToken: 'old-pass',
    tryLaunch: async () => ({ ok: false, error: 'Invalid or unauthorized launch token' }),
    trySso: async () => ({ ok: false }),
  });
  assert.deepEqual(result, { ok: false, error: 'Invalid or unauthorized launch token' });
});

test('without a pass only the company sign-in is tried, and a miss shows no error', async () => {
  const calls = [];
  const result = await signInFromPortal({
    launchToken: null,
    tryLaunch: async () => (calls.push('launch'), { ok: true }),
    trySso: async () => (calls.push('sso'), { ok: false }),
  });
  assert.deepEqual(result, { ok: false });
  assert.deepEqual(calls, ['sso']);
});

test('the login page makes one sign-in attempt per visit, through signInFromPortal', () => {
  const login = require('node:fs').readFileSync('src/components/Login.tsx', 'utf8');
  assert.equal((login.match(/signInFromPortal\(/g) || []).length, 1);
  assert.equal((login.match(/fetch\('\/api\/auth\/launch'/g) || []).length, 1, 'one place posts to the launch route');
  assert.match(login, /if \(portalSignInStarted\) return;\s+portalSignInStarted = true;/);
});

// 2A
const encode = (value) => new TextEncoder().encode(value);
async function portalPass() {
  const issuedAt = Math.floor(Date.now() / 1000);
  return new jose.SignJWT({ type: 'bharattech-admin-launch', role: 'Admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + 60)
    .setJti(randomUUID())
    .sign(encode('test-launch-secret'));
}

before(emptyDatabase);
after(closeDatabase);
beforeEach(signOut);

test("a pass isn't used up when the session can't be made, so it still works after", async () => {
  const pass = await portalPass();
  const secret = process.env.SESSION_SECRET;
  const password = process.env.ADMIN_PASSWORD;
  delete process.env.SESSION_SECRET;
  delete process.env.ADMIN_PASSWORD;
  try {
    const failed = await launch(jsonRequest('/api/auth/launch', { body: { launchToken: pass } }));
    assert.equal(failed.status, 500);
    assert.equal(cookieJar().get('research-auth'), undefined);
  } finally {
    process.env.SESSION_SECRET = secret;
    process.env.ADMIN_PASSWORD = password;
  }
  const retried = await launch(jsonRequest('/api/auth/launch', { body: { launchToken: pass } }));
  assert.equal(retried.status, 200, 'the same pass still opens the session');
  assert.ok(cookieJar().get('research-auth')?.value);

  signOut();
  const third = await launch(jsonRequest('/api/auth/launch', { body: { launchToken: pass } }));
  assert.equal(third.status, 401, 'and only once');
});
