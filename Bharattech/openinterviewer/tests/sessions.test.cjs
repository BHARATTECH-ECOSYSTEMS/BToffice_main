// Security report 2026-10-28 leads 7 + 8 (owner's F6A): a researcher session lasted 7 days, named nobody, and was
// signed with the shared ADMIN_PASSWORD when SESSION_SECRET was missing. Now:
// - a session from the portal or Keycloak says whose it is, lasts 8 hours, and is good only while the portal backend
//   says that person is still an active Admin or Super Admin (asked at most once a minute per person);
// - a session from the shared password names nobody and also lasts 8 hours;
// - only SESSION_SECRET signs sessions: without it nobody gets one.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { randomUUID } = require('node:crypto');
const jose = require('jose');
const { NextRequest } = require('next/server');
const { emptyDatabase, closeDatabase, jsonRequest, signOut } = require('./support/helpers.cjs');
const { cookieJar } = require('./support/nextHeaders.cjs');

const { createSessionToken, verifySessionToken, getSessionCookieOptions, forgetSessionChecks } = require('@/lib/auth');
const { POST: launch } = require('@/app/api/auth/launch/route');
const { POST: passwordLogin } = require('@/app/api/auth/route');
const { middleware } = require('@/middleware');

const encode = (value) => new TextEncoder().encode(value);
const EIGHT_HOURS = 8 * 60 * 60;

// a stand-in for the portal backend's POST /api/openinterviewer/session-check
const backend = { active: new Set(), asked: [], down: false };
let backendServer;
const backendUrl = () => `http://127.0.0.1:${backendServer.address().port}`;
before(async () => {
  await emptyDatabase();
  backendServer = http.createServer(async (req, res) => {
    if (backend.down) return req.socket.destroy();
    const check = (req.headers.authorization || '').replace(/^Bearer /, '');
    try {
      const { payload } = await jose.jwtVerify(check, encode('test-launch-secret'));
      backend.asked.push(payload);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ active: payload.type === 'openinterviewer-session-check' && backend.active.has(payload.sub) }));
    } catch {
      res.statusCode = 401;
      res.end('{}');
    }
  });
  await new Promise((resolve) => backendServer.listen(0, '127.0.0.1', resolve));
  process.env.BHARATTECH_API_URL = backendUrl();
});
after(async () => {
  delete process.env.BHARATTECH_API_URL;
  backendServer.close();
  await closeDatabase();
});
beforeEach(() => {
  signOut();
  forgetSessionChecks();
  Object.assign(backend, { active: new Set(), asked: [], down: false });
});

const portalPass = (sub = randomUUID(), role = 'Admin') => {
  const now = Math.floor(Date.now() / 1000);
  let pass = new jose.SignJWT({ type: 'bharattech-admin-launch', role })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(randomUUID())
    .setIssuedAt(now)
    .setExpirationTime(now + 60);
  if (sub) pass = pass.setSubject(sub);
  return pass.sign(encode('test-launch-secret'));
};
const launchAs = async (sub) => {
  const res = await launch(jsonRequest('/api/auth/launch', { body: { launchToken: await portalPass(sub) } }));
  return { status: res.status, cookie: cookieJar().get('research-auth')?.value };
};

test('a session from the portal names its Admin and lasts 8 hours, cookie included', async () => {
  const sub = randomUUID();
  const { status, cookie } = await launchAs(sub);
  assert.equal(status, 200);
  const claims = jose.decodeJwt(cookie);
  assert.equal(claims.sub, sub);
  assert.equal(claims.via, 'portal');
  assert.equal(claims.exp - claims.iat, EIGHT_HOURS);
  assert.equal(getSessionCookieOptions().maxAge, EIGHT_HOURS);
});

test('a portal pass that names nobody opens no session', async () => {
  const res = await launch(jsonRequest('/api/auth/launch', { body: { launchToken: await portalPass(null) } }));
  assert.equal(res.status, 401);
  assert.equal(cookieJar().get('research-auth'), undefined);
});

test('the session works while the backend says they are an active admin, and stops once it says they are not', async () => {
  const sub = randomUUID();
  backend.active.add(sub);
  const { cookie } = await launchAs(sub);

  assert.equal(await verifySessionToken(cookie), true);
  const [check] = backend.asked;
  assert.equal(check.sub, sub);
  assert.ok(check.exp - check.iat <= 60, 'the check itself lives a minute at most');

  // blocked, removed, left or demoted in the portal; a minute later the backend is asked again
  backend.active.delete(sub);
  forgetSessionChecks();
  assert.equal(await verifySessionToken(cookie), false);
});

test('the backend is asked at most once a minute per person, not on every request', async () => {
  const sub = randomUUID();
  backend.active.add(sub);
  const { cookie } = await launchAs(sub);
  for (let i = 0; i < 5; i++) assert.equal(await verifySessionToken(cookie), true);
  assert.equal(backend.asked.length, 1);
});

test("when the backend can't be reached, a named session is refused, not waved through", async () => {
  const sub = randomUUID();
  backend.active.add(sub);
  const { cookie } = await launchAs(sub);
  backend.down = true;
  assert.equal(await verifySessionToken(cookie), false);

  delete process.env.BHARATTECH_API_URL;
  forgetSessionChecks();
  try {
    assert.equal(await verifySessionToken(cookie), false, 'nowhere to ask');
  } finally {
    process.env.BHARATTECH_API_URL = backendUrl();
  }
});

test('a session from the shared password names nobody, lasts 8 hours, and needs no backend', async (t) => {
  // the password door is off where the portal launch is set up (as here) unless switched back on
  process.env.OPENINTERVIEWER_PASSWORD_LOGIN = 'on';
  t.after(() => delete process.env.OPENINTERVIEWER_PASSWORD_LOGIN);
  const res = await passwordLogin(jsonRequest('/api/auth', { body: { password: 'test-admin-password' } }));
  assert.equal(res.status, 200);
  const cookie = cookieJar().get('research-auth').value;
  const claims = jose.decodeJwt(cookie);
  assert.equal(claims.via, 'password');
  assert.equal(claims.sub, undefined);
  assert.equal(claims.exp - claims.iat, EIGHT_HOURS);
  assert.equal(await verifySessionToken(cookie), true);
  assert.equal(backend.asked.length, 0);
});

test('an old 7-day session, made before sessions said how they were opened, no longer counts', async () => {
  const old = await new jose.SignJWT({ type: 'session' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encode('test-session-secret'));
  assert.equal(await verifySessionToken(old), false);
});

test('only SESSION_SECRET signs sessions: without it nobody gets one, and a cookie signed with ADMIN_PASSWORD is refused', async () => {
  const byPassword = await new jose.SignJWT({ type: 'session', via: 'password' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(encode('test-admin-password'));
  assert.equal(await verifySessionToken(byPassword), false);

  const saved = process.env.SESSION_SECRET;
  delete process.env.SESSION_SECRET;
  try {
    await assert.rejects(createSessionToken(), /SESSION_SECRET/);
    assert.equal(await verifySessionToken(byPassword), false);
    const page = await middleware(new NextRequest('http://localhost:3000/dashboard', { headers: { cookie: `research-auth=${byPassword}` } }));
    assert.match(page.headers.get('location') || '', /\/login/);
  } finally {
    process.env.SESSION_SECRET = saved;
  }
});
