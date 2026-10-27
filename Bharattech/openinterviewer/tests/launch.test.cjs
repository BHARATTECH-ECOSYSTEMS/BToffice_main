// Step 14 Part 2 (owner's 3A + 4A): how the BharatTech portal signs a researcher in.
// - The portal backend's pass is signed with BHARATTECH_LAUNCH_SECRET only, lives 60 seconds and works once.
// - A Keycloak sign-in counts only from this app's own Keycloak client, for admins, and only from the Keycloak
//   named in KEYCLOAK_URL (no fallback to the live company server).
// - The pass is redeemed by POST /api/auth/launch, not by the address-bar check in the middleware.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { randomUUID } = require('node:crypto');
const jose = require('jose');
const { NextRequest } = require('next/server');
const { emptyDatabase, closeDatabase, jsonRequest, signOut } = require('./support/helpers.cjs');
const { cookieJar } = require('./support/nextHeaders.cjs');

const { verifyLaunchToken, getKeycloakIssuer } = require('@/lib/launchAuth');
const { POST: launch } = require('@/app/api/auth/launch/route');
const { middleware } = require('@/middleware');

const encode = (value) => new TextEncoder().encode(value);
const now = () => Math.floor(Date.now() / 1000);

async function portalPass({ signWith = 'test-launch-secret', type = 'bharattech-admin-launch', role = 'Admin', lifeSeconds = 60, issuedAgo = 0, id = randomUUID() } = {}) {
  const issuedAt = now() - issuedAgo;
  let pass = new jose.SignJWT({ type, role, email: 'admin@example.test', name: 'Test Admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + lifeSeconds);
  if (id) pass = pass.setJti(id);
  // whose pass it is (since 2026-10-28 a pass must say so; tests/sessions.test.cjs)
  return pass.setSubject('kc-test-admin').sign(encode(signWith));
}

before(emptyDatabase);
after(closeDatabase);
beforeEach(signOut);

test('a portal pass opens a researcher session once; the same pass is refused the second time', async () => {
  const pass = await portalPass();

  const first = await launch(jsonRequest('/api/auth/launch', { body: { launchToken: pass } }));
  assert.equal(first.status, 200);
  assert.ok(cookieJar().get('research-auth')?.value, 'session cookie set');

  signOut();
  const again = await launch(jsonRequest('/api/auth/launch', { body: { launchToken: pass } }));
  assert.equal(again.status, 401);
  assert.equal(cookieJar().get('research-auth'), undefined);
});

test('passes signed with any other secret are refused', async () => {
  process.env.ADMIN_SECRET = 'test-admin-secret';
  try {
    for (const other of ['test-admin-password', 'test-session-secret', 'test-admin-secret', 'test-participant-secret']) {
      assert.equal(await verifyLaunchToken(await portalPass({ signWith: other })), false, other);
    }
  } finally {
    delete process.env.ADMIN_SECRET;
  }
});

test('a pass must be the portal launch kind, for an Admin or Super Admin', async () => {
  assert.equal(await verifyLaunchToken(await portalPass({ type: 'openinterviewer-launch' })), false);
  assert.equal(await verifyLaunchToken(await portalPass({ type: 'session' })), false);
  assert.equal(await verifyLaunchToken(await portalPass({ role: 'Employee' })), false);
  assert.equal(await verifyLaunchToken(await portalPass({ role: 'Subadmin' })), false);
  assert.equal(await verifyLaunchToken(await portalPass({ role: 'Superadmin' })), true);
  assert.equal(await verifyLaunchToken(await portalPass({ role: 'Admin' })), true);
});

test('a pass needs its own id and may live 60 seconds at most', async () => {
  assert.equal(await verifyLaunchToken(await portalPass({ id: null })), false);
  assert.equal(await verifyLaunchToken(await portalPass({ lifeSeconds: 300 })), false);
  assert.equal(await verifyLaunchToken(await portalPass({ lifeSeconds: 61 })), false);
  assert.equal(await verifyLaunchToken(await portalPass({ lifeSeconds: 60 })), true);
});

test('an expired pass is refused', async () => {
  assert.equal(await verifyLaunchToken(await portalPass({ issuedAgo: 120 })), false);
});

// R1: the portal backend and OpenInterviewer run on different servers whose clocks differ a little; a pass stamped a
// second or two "in the future" by a server whose clock runs ahead must still work, a far-future one must not.
test('a pass from a server whose clock runs a little ahead still works', async () => {
  assert.equal(await verifyLaunchToken(await portalPass({ issuedAgo: -2 })), true);
  assert.equal(await verifyLaunchToken(await portalPass({ issuedAgo: -30 })), false);
});

test('without KEYCLOAK_URL no Keycloak is asked, so tokens never go to the live company server', async () => {
  assert.equal(getKeycloakIssuer(), null);
  const { privateKey } = await jose.generateKeyPair('RS256');
  const token = await new jose.SignJWT({ azp: 'openinterviewer-client', realm_access: { roles: ['Admin'] } })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer('https://keycloak-24-0-5-9yaq.onrender.com/realms/bharattech')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);
  assert.equal(await verifyLaunchToken(token), false);
});

test("a Keycloak sign-in counts only from this app's own client, from the configured Keycloak, for admins", async () => {
  const { publicKey, privateKey } = await jose.generateKeyPair('RS256');
  const jwk = { ...(await jose.exportJWK(publicKey)), kid: 'test-key', alg: 'RS256', use: 'sig' };
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ keys: [jwk] }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const keycloak = `http://127.0.0.1:${server.address().port}`;
  process.env.KEYCLOAK_URL = keycloak;
  process.env.KEYCLOAK_REALM = 'bharattech';

  const token = ({ azp = 'openinterviewer-client', roles = ['Admin'], issuer = `${keycloak}/realms/bharattech` } = {}) =>
    new jose.SignJWT({ azp, realm_access: { roles } })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setSubject('kc-test-admin')
      .setIssuer(issuer)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);

  try {
    assert.equal(getKeycloakIssuer(), `${keycloak}/realms/bharattech`);
    assert.equal(await verifyLaunchToken(await token()), true);
    assert.equal(await verifyLaunchToken(await token({ roles: ['Superadmin'] })), true);
    assert.equal(await verifyLaunchToken(await token({ azp: 'lms-client' })), false, 'another app\'s token');
    assert.equal(await verifyLaunchToken(await token({ roles: ['Employee'] })), false, 'not an admin');
    assert.equal(await verifyLaunchToken(await token({ issuer: 'https://elsewhere.example/realms/bharattech' })), false, 'other issuer');
  } finally {
    delete process.env.KEYCLOAK_URL;
    delete process.env.KEYCLOAK_REALM;
    server.close();
  }
});

test('the middleware leaves a pass in the address bar alone; only POST /api/auth/launch redeems it', async () => {
  const pass = await portalPass();

  const response = await middleware(new NextRequest(`http://localhost:3000/login?launchToken=${pass}`));
  assert.ok(!(response.headers.get('set-cookie') || '').includes('research-auth='), 'no session from the address bar');

  const redeemed = await launch(jsonRequest('/api/auth/launch', { body: { launchToken: pass } }));
  assert.equal(redeemed.status, 200, 'the pass was not used up by the middleware');
});

test('researcher pages still need a session', async () => {
  const response = await middleware(new NextRequest('http://localhost:3000/studies'));
  assert.equal(response.status, 307);
  assert.match(response.headers.get('location'), /\/login\?redirect=%2Fstudies$/);
});

// R6: a browser only replaces a cookie with one that has the same settings, and from another site only a
// SameSite=None; Secure one. So sign-out sends an expired cookie with exactly the settings the session was set with.
test('sign-out expires the session cookie with the settings it was set with', async () => {
  const { POST: logout } = require('@/app/api/auth/logout/route');
  const { DELETE: signOutHere } = require('@/app/api/auth/route');

  for (const [embedded, sameSite, secure] of [[undefined, 'lax', false], ['true', 'none', true]]) {
    if (embedded) process.env.OPENINTERVIEWER_EMBEDDED = embedded;
    try {
      for (const route of [logout, signOutHere]) {
        signOut();
        const response = await route(jsonRequest('/api/auth/logout'));
        assert.equal(response.status, 200);
        const cookie = cookieJar().get('research-auth');
        assert.equal(cookie?.value, '');
        assert.equal(cookie?.options?.maxAge, 0);
        assert.equal(cookie?.options?.sameSite, sameSite);
        assert.equal(cookie?.options?.secure, secure);
        assert.equal(cookie?.options?.httpOnly, true);
        assert.equal(cookie?.options?.path, '/');
      }
    } finally {
      delete process.env.OPENINTERVIEWER_EMBEDDED;
    }
  }
});
