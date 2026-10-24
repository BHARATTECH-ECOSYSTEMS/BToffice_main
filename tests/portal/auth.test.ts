import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as authModule from '../../src/portal/auth';
import { createAuth, isEmployeeId, loginRedirect, portalRole, resetTokenFrom, type AuthConfig } from '../../src/portal/auth';

const CONFIG: AuthConfig = { api: 'http://api.test/api', keycloak: 'http://kc.test', realm: 'bharattech', clientId: 'lms-client' };
const LOGIN_URL = 'http://api.test/api/auth/keycloak-login';
const TOKEN_URL = 'http://kc.test/realms/bharattech/protocol/openid-connect/token';
const LOGOUT_URL = 'http://kc.test/realms/bharattech/protocol/openid-connect/logout';

/** An unsigned JWT that expires `seconds` from now; only its exp claim is read in the browser. */
function jwt(seconds: number, tag = 'a') {
  const part = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${part({ alg: 'none' })}.${part({ exp: Math.floor(Date.now() / 1000) + seconds, tag })}.sig`;
}

type Call = { url: string; init: RequestInit };

/** Stands in for the network: answers each request with the next queued reply and records what was sent. */
function network(...replies: (Response | Error)[]) {
  const calls: Call[] = [];
  const request = async (url: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });
    const reply = replies.shift();
    if (!reply) throw new Error(`unexpected request to ${url}`);
    if (reply instanceof Error) throw reply;
    return reply;
  };
  return { calls, request: request as typeof fetch };
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// the backend's real success shape (controllers/authController.js keycloakLogin)
const loginOk = (access = jwt(300), refresh = jwt(1800, 'r'), role = 'EMPLOYEE') =>
  json(200, {
    success: true,
    ok: true,
    access_token: access,
    refresh_token: refresh,
    id_token: jwt(300, 'id'),
    user: { fullName: 'Test Employee', firstName: 'Test', lastName: 'Employee', username: 'test.employee', email: 'test.employee@example.test', role },
  });

const form = (call: Call) => Object.fromEntries(new URLSearchParams(String(call.init.body)));

test('each account role opens the matching portal view, and interns see the employee view', () => {
  assert.equal(portalRole('SUPERADMIN'), 'admin');
  assert.equal(portalRole('ADMIN'), 'admin');
  assert.equal(portalRole('SUBADMIN'), 'subadmin');
  assert.equal(portalRole('EMPLOYEE'), 'employee');
  assert.equal(portalRole('INTERN'), 'employee');
});

test('an unknown role gets the least-privileged view', () => {
  assert.equal(portalRole('SOMETHING-NEW'), 'employee');
  assert.equal(portalRole(''), 'employee');
});

test('Employee IDs are recognised the way the backend accepts them', () => {
  for (const typed of ['BT-0001', 'bt-0001', 'BT0001', ' BT-0042 ', 'BT-12345']) assert.equal(isEmployeeId(typed), true, typed);
});

test('anything else is not an Employee ID', () => {
  for (const typed of ['', 'BT-', 'BT-01', 'BT-00A1', 'XY-0001', '0001', 'BT--0001', 'name@bt-0001.com']) {
    assert.equal(isEmployeeId(typed), false, typed);
  }
});

test('signing in sends the email and password to the backend login route and returns the account', async () => {
  const net = network(loginOk(undefined, undefined, 'SUBADMIN'));
  const auth = createAuth(CONFIG, net.request);

  const result = await auth.signIn('test.employee@example.test', 'pw-123', false);

  assert.deepEqual(result, { ok: true, account: { name: 'Test Employee', email: 'test.employee@example.test', role: 'subadmin' } });
  assert.equal(net.calls.length, 1);
  assert.equal(net.calls[0].url, LOGIN_URL);
  assert.equal(net.calls[0].init.method, 'POST');
  assert.deepEqual(JSON.parse(String(net.calls[0].init.body)), { username: 'test.employee@example.test', password: 'pw-123' });
  assert.equal(auth.signedIn(), true);
});

test('wrong credentials are reported as such and leave no one signed in', async () => {
  const auth = createAuth(CONFIG, network(json(401, { message: 'Invalid username or password' })).request);
  assert.deepEqual(await auth.signIn('a@example.test', 'nope', false), { ok: false, reason: 'credentials' });
  assert.equal(auth.signedIn(), false);
});

test('an invited account that still has its temporary password is asked to set a new one', async () => {
  const reply = json(403, { requiresPasswordChange: true, message: 'Please set a new password to finish accepting your invite.' });
  const auth = createAuth(CONFIG, network(reply).request);
  assert.deepEqual(await auth.signIn('a@example.test', 'temp', false), { ok: false, reason: 'set-password' });
});

test('a backend that is down or failing reads as unavailable, not as a wrong password', async () => {
  for (const reply of [new TypeError('Failed to fetch'), json(500, { message: 'Login failed' })]) {
    const auth = createAuth(CONFIG, network(reply).request);
    assert.deepEqual(await auth.signIn('a@example.test', 'pw', false), { ok: false, reason: 'unavailable' });
    assert.equal(auth.signedIn(), false);
  }
});

test('too many sign-in tries from here reads as busy (wait and try again), not as unavailable or a wrong password', async () => {
  const auth = createAuth(CONFIG, network(json(429, { message: 'Too many requests. Wait a minute and try again.' })).request);
  assert.deepEqual(await auth.signIn('a@example.test', 'pw', false), { ok: false, reason: 'busy' });
  assert.equal(auth.signedIn(), false);
});

test('a success reply without tokens is not treated as signed in', async () => {
  const auth = createAuth(CONFIG, network(json(200, { success: true, user: { email: 'a@example.test', role: 'ADMIN' } })).request);
  assert.deepEqual(await auth.signIn('a@example.test', 'pw', false), { ok: false, reason: 'unavailable' });
  assert.equal(auth.signedIn(), false);
});

test('a fresh access token is handed out without asking Keycloak', async () => {
  const access = jwt(300);
  const net = network(loginOk(access));
  const auth = createAuth(CONFIG, net.request);
  await auth.signIn('a@example.test', 'pw', false);

  assert.equal(await auth.accessToken(), access);
  assert.equal(net.calls.length, 1);
});

test('an access token about to expire is renewed with the refresh token first', async () => {
  const refresh = jwt(1800, 'r1');
  const renewed = jwt(300, 'new');
  const net = network(loginOk(jwt(10), refresh), json(200, { access_token: renewed, refresh_token: jwt(1800, 'r2'), id_token: jwt(300, 'id2'), expires_in: 300 }));
  const auth = createAuth(CONFIG, net.request);
  await auth.signIn('a@example.test', 'pw', false);

  assert.equal(await auth.accessToken(), renewed);
  assert.equal(net.calls[1].url, TOKEN_URL);
  assert.deepEqual(form(net.calls[1]), { grant_type: 'refresh_token', client_id: 'lms-client', refresh_token: refresh });
});

test('requests made at the same moment share one renewal', async () => {
  const renewed = jwt(300, 'new');
  const net = network(loginOk(jwt(10)), json(200, { access_token: renewed, refresh_token: jwt(1800, 'r2') }));
  const auth = createAuth(CONFIG, net.request);
  await auth.signIn('a@example.test', 'pw', false);

  assert.deepEqual(await Promise.all([auth.accessToken(), auth.accessToken(), auth.accessToken()]), [renewed, renewed, renewed]);
  assert.equal(net.calls.length, 2);
});

test('when Keycloak refuses the renewal, the person is signed out and the portal is told', async () => {
  const net = network(loginOk(jwt(10)), json(400, { error: 'invalid_grant', error_description: 'Session not active' }));
  const auth = createAuth(CONFIG, net.request);
  let expired = 0;
  auth.onExpire(() => expired++);
  await auth.signIn('a@example.test', 'pw', false);

  assert.equal(await auth.accessToken(), null);
  assert.equal(auth.signedIn(), false);
  assert.equal(expired, 1);
});

test('a renewal that cannot reach Keycloak keeps the person signed in so the next request can retry', async () => {
  const net = network(loginOk(jwt(10)), new TypeError('Failed to fetch'));
  const auth = createAuth(CONFIG, net.request);
  await auth.signIn('a@example.test', 'pw', false);

  assert.equal(await auth.accessToken(), null);
  assert.equal(auth.signedIn(), true);
});

test('an expired refresh token means signed out, without a network call', async () => {
  const net = network(loginOk(jwt(-60), jwt(-1, 'r')));
  const auth = createAuth(CONFIG, net.request);
  let expired = 0;
  auth.onExpire(() => expired++);
  await auth.signIn('a@example.test', 'pw', false);

  assert.equal(auth.signedIn(), false);
  assert.equal(await auth.accessToken(), null);
  assert.equal(net.calls.length, 1);
  assert.equal(expired, 1);
});

test('signing out forgets the tokens and ends the Keycloak session', async () => {
  const refresh = jwt(1800, 'r');
  const net = network(loginOk(jwt(300), refresh), new Response(null, { status: 204 }));
  const auth = createAuth(CONFIG, net.request);
  await auth.signIn('a@example.test', 'pw', false);

  await auth.signOut();

  assert.equal(auth.signedIn(), false);
  assert.equal(await auth.accessToken(), null);
  assert.equal(net.calls[1].url, LOGOUT_URL);
  assert.deepEqual(form(net.calls[1]), { client_id: 'lms-client', refresh_token: refresh });
});

test('signing out still works locally when Keycloak cannot be reached', async () => {
  const auth = createAuth(CONFIG, network(loginOk(), new TypeError('Failed to fetch')).request);
  await auth.signIn('a@example.test', 'pw', false);
  await auth.signOut();
  assert.equal(auth.signedIn(), false);
});

// ---- first sign-in after an invite: POST /auth/accept-invite (controllers/authController.js acceptInvite)

const SETUP = { username: 'neha@example.test', temporaryPassword: 'temp-pass', newPassword: 'new-pass-123', newUsername: 'neha.k' };

test('finishing an invite sends the temporary password, the new one and the chosen username, then signs in', async () => {
  const net = network(loginOk(undefined, undefined, 'INTERN'));
  const auth = createAuth(CONFIG, net.request);

  const result = await auth.acceptInvite(SETUP, true);

  assert.deepEqual(result, { ok: true, account: { name: 'Test Employee', email: 'test.employee@example.test', role: 'employee' } });
  assert.equal(net.calls[0].url, 'http://api.test/api/auth/accept-invite');
  assert.equal(net.calls[0].init.method, 'POST');
  assert.deepEqual(JSON.parse(String(net.calls[0].init.body)), SETUP);
  assert.equal(auth.signedIn(), true);
});

test('a wrong temporary password is reported as such', async () => {
  const auth = createAuth(CONFIG, network(json(401, { message: 'Invalid username or temporary password' })).request);
  assert.deepEqual(await auth.acceptInvite(SETUP, false), { ok: false, reason: 'credentials' });
  assert.equal(auth.signedIn(), false);
});

test('a username someone else has is reported so another can be chosen', async () => {
  const auth = createAuth(CONFIG, network(json(409, { message: 'That username is already taken. Please choose another.' })).request);
  assert.deepEqual(await auth.acceptInvite(SETUP, false), { ok: false, reason: 'username-taken' });
});

test("a username the backend won't accept comes back with its reason", async () => {
  const message = 'Username must be 3-32 characters and contain only letters, numbers, dots, dashes, or underscores.';
  const auth = createAuth(CONFIG, network(json(400, { message })).request);
  assert.deepEqual(await auth.acceptInvite(SETUP, false), { ok: false, reason: 'invalid', message });
});

test('a backend that is down or fails while finishing reads as unavailable', async () => {
  for (const reply of [new TypeError('Failed to fetch'), json(500, { message: 'Failed to set new password' })]) {
    const auth = createAuth(CONFIG, network(reply).request);
    assert.deepEqual(await auth.acceptInvite(SETUP, false), { ok: false, reason: 'unavailable' });
  }
});

test('too many tries while finishing an invite reads as busy', async () => {
  const auth = createAuth(CONFIG, network(json(429, {})).request);
  assert.deepEqual(await auth.acceptInvite(SETUP, false), { ok: false, reason: 'busy' });
});

// ---- the link in invite emails: <site>/login

test('the /login address from invite emails opens the portal login', () => {
  assert.equal(loginRedirect('/login'), '/#/portal');
  assert.equal(loginRedirect('/login/'), '/#/portal');
  assert.equal(loginRedirect('/LOGIN'), '/#/portal');
});

test('every other address is left alone', () => {
  for (const path of ['/', '/index.html', '/loginx', '/portal/login', '/login/extra']) assert.equal(loginRedirect(path), null, path);
});

test('a renewal that finishes after sign-out does not sign the person back in', async () => {
  let answer!: (r: Response) => void;
  const calls: string[] = [];
  const request = (async (url: string) => {
    calls.push(String(url));
    if (calls.length === 1) return loginOk(jwt(10));
    if (calls.length === 2) return new Promise<Response>((resolve) => (answer = resolve));
    return new Response(null, { status: 204 });
  }) as unknown as typeof fetch;
  const auth = createAuth(CONFIG, request);
  await auth.signIn('a@example.test', 'pw', false);

  const pending = auth.accessToken();
  await auth.signOut();
  answer(json(200, { access_token: jwt(300, 'late'), refresh_token: jwt(1800, 'late') }));

  assert.equal(await pending, null);
  assert.equal(auth.signedIn(), false);
});

// --- changing the password ---

const CHANGE_URL = 'http://api.test/api/auth/keycloak-change-password';

/** Signed in as test.employee, with the replies for what comes after the sign-in queued behind it. */
async function signedInWith(...replies: (Response | Error)[]) {
  const net = network(loginOk(), ...replies);
  const auth = createAuth(CONFIG, net.request);
  await auth.signIn('test.employee@example.test', 'Old-Password-1', false);
  return { auth, calls: net.calls };
}

test('changing the password sends both passwords with the sign-in token, then ends the sign-in here', async () => {
  const { auth, calls } = await signedInWith(json(200, { success: true, signedOutEverywhere: true }));

  const result = await auth.changePassword('Old-Password-1', 'New-Password-2');

  assert.deepEqual(result, { ok: true });
  assert.equal(calls[1].url, CHANGE_URL);
  assert.equal(calls[1].init.method, 'POST');
  assert.match(String((calls[1].init.headers as Record<string, string>).Authorization), /^Bearer /);
  assert.deepEqual(JSON.parse(String(calls[1].init.body)), { currentPassword: 'Old-Password-1', newPassword: 'New-Password-2' });
  // the backend ended every session, so this one is over too
  assert.equal(auth.signedIn(), false);
});

test('a wrong current password is told apart from an ended sign-in, and keeps the person signed in', async () => {
  const { auth } = await signedInWith(json(401, { message: 'Current password is incorrect' }));

  assert.deepEqual(await auth.changePassword('not-it', 'New-Password-2'), { ok: false, reason: 'wrong-current' });
  assert.equal(auth.signedIn(), true);
});

test('a 401 for any other reason means the sign-in has ended', async () => {
  const { auth } = await signedInWith(json(401, { message: 'Auth failed' }));
  assert.deepEqual(await auth.changePassword('Old-Password-1', 'New-Password-2'), { ok: false, reason: 'signed-out' });
});

test("a new password the server refuses comes back with the server's reason", async () => {
  const { auth } = await signedInWith(json(400, { message: 'Invalid password: minimum length 12.' }));

  assert.deepEqual(await auth.changePassword('Old-Password-1', 'short-pw'), { ok: false, reason: 'refused', message: 'Invalid password: minimum length 12.' });
  assert.equal(auth.signedIn(), true);
});

test('a server that is down or failing reads as unavailable, and nothing changes here', async () => {
  for (const reply of [new TypeError('Failed to fetch'), json(500, { message: 'Failed to change password' })]) {
    const { auth } = await signedInWith(reply);
    assert.deepEqual(await auth.changePassword('Old-Password-1', 'New-Password-2'), { ok: false, reason: 'unavailable' });
    assert.equal(auth.signedIn(), true);
  }
});

test('too many tries reads as busy, and the person stays signed in', async () => {
  const { auth } = await signedInWith(json(429, {}));
  assert.deepEqual(await auth.changePassword('Old-Password-1', 'New-Password-2'), { ok: false, reason: 'busy' });
  assert.equal(auth.signedIn(), true);
});

test('someone signed out cannot change a password and no request is sent', async () => {
  const net = network();
  const auth = createAuth(CONFIG, net.request);

  assert.deepEqual(await auth.changePassword('a', 'b'), { ok: false, reason: 'signed-out' });
  assert.equal(net.calls.length, 0);
});

// Step 16: the backend now receives passwords exactly as typed, so no form blocks a $ any more.
const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? sourceFiles(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : []));

test('a $ is allowed in new passwords: the old block is gone from every form', () => {
  assert.equal('passwordHasBlockedCharacter' in authModule, false);
  const blocking = sourceFiles('src').filter((f) => /passwordHasBlockedCharacter|contain a \$ sign|No \$ sign/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(blocking, []);
});

test('a new password with a $ is sent exactly as typed', async () => {
  const net = network(json(200, { success: true, signedOutEverywhere: true }));
  const auth = createAuth(CONFIG, net.request);
  assert.deepEqual(await auth.resetPassword('token-1', 'Pa$$word-123'), { ok: true });
  assert.equal(JSON.parse(String(net.calls[0].init?.body)).newPassword, 'Pa$$word-123');
});

// --- "Forgot password?" (controllers/passwordResetController.js); neither call needs a sign-in ---

const FORGOT_URL = 'http://api.test/api/auth/forgot-password';
const RESET_URL = 'http://api.test/api/auth/reset-password';
const SAME = "If that account exists, we've sent a reset link to its email. The link works once, for 30 minutes.";

test("asking for a reset link sends what was typed and shows the backend's one reply", async () => {
  const net = network(json(200, { message: SAME }));
  const auth = createAuth(CONFIG, net.request);

  assert.deepEqual(await auth.requestPasswordReset('BT-0001'), { ok: true, message: SAME });
  assert.equal(net.calls[0].url, FORGOT_URL);
  assert.equal(net.calls[0].init.method, 'POST');
  assert.deepEqual(JSON.parse(String(net.calls[0].init.body)), { login: 'BT-0001' });
  assert.equal(new Headers(net.calls[0].init.headers).get('Authorization'), null);
});

test('a backend that is down or failing means no link was asked for', async () => {
  for (const reply of [new TypeError('Failed to fetch'), json(500, {}), json(500, { message: 'Server Error' })]) {
    const auth = createAuth(CONFIG, network(reply).request);
    assert.deepEqual(await auth.requestPasswordReset('asha@example.test'), { ok: false, reason: 'unavailable' });
  }
});

test('too many reset requests from here, or tries with a link, read as busy', async () => {
  assert.deepEqual(await createAuth(CONFIG, network(json(429, {})).request).requestPasswordReset('asha@example.test'), { ok: false, reason: 'busy' });
  assert.deepEqual(await createAuth(CONFIG, network(json(429, {})).request).resetPassword('t'.repeat(64), 'New-Password-2'), { ok: false, reason: 'busy' });
});

test('a link sets the new password; the backend says when the link is dead or the password refused', async () => {
  const ok = network(json(200, { success: true, signedOutEverywhere: true }));
  assert.deepEqual(await createAuth(CONFIG, ok.request).resetPassword('tok', 'Brand-New-Pass-1'), { ok: true });
  assert.equal(ok.calls[0].url, RESET_URL);
  assert.deepEqual(JSON.parse(String(ok.calls[0].init.body)), { token: 'tok', newPassword: 'Brand-New-Pass-1' });

  const gone = createAuth(CONFIG, network(json(400, { code: 'link-gone', message: 'This link has expired or was already used.' })).request);
  assert.deepEqual(await gone.resetPassword('tok', 'Brand-New-Pass-1'), { ok: false, reason: 'link-gone' });

  const refused = createAuth(CONFIG, network(json(400, { message: 'Invalid password: minimum length 12.' })).request);
  assert.deepEqual(await refused.resetPassword('tok', 'short-pw-1'), { ok: false, reason: 'refused', message: 'Invalid password: minimum length 12.' });

  for (const reply of [new TypeError('Failed to fetch'), json(502, { message: "We couldn't reach the sign-in service" }), json(500, {})]) {
    assert.deepEqual(await createAuth(CONFIG, network(reply).request).resetPassword('tok', 'Brand-New-Pass-1'), { ok: false, reason: 'unavailable' });
  }
});

test('the reset link in the email is read from the site address, and only there', () => {
  const TOKEN = 'AbC-12_xyzAbC-12_xyzAbC-12_xyzAbC-12_xyz123';
  assert.equal(resetTokenFrom('/reset-password', `?token=${TOKEN}`), TOKEN);
  assert.equal(resetTokenFrom('/reset-password/', `?token=${TOKEN}&x=1`), TOKEN);
  assert.equal(resetTokenFrom('/reset-password', ''), null);
  assert.equal(resetTokenFrom('/reset-password', '?token=<script>'), null);
  assert.equal(resetTokenFrom('/reset-password', '?token=short'), null);
  assert.equal(resetTokenFrom('/portal', `?token=${TOKEN}`), null);
});