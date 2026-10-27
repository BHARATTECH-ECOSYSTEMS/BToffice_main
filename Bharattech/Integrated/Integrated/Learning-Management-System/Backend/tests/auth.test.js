const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const http = require("node:http");
const express = require("express");
const jwt = require("jsonwebtoken");

// A stand-in Keycloak that only publishes its signing key, so tokens can go through the real Keycloak path. Its
// address must be known before keycloakAuth loads (the key client is made then), so the port is picked here.
const KEYCLOAK_PORT = 47000 + Math.floor(Math.random() * 2000);
process.env.KEYCLOAK_BASE_URL = `http://127.0.0.1:${KEYCLOAK_PORT}`;
process.env.KEYCLOAK_REALM = "bharattech";
const ISSUER = `http://127.0.0.1:${KEYCLOAK_PORT}/realms/bharattech`;
const keys = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const otherKeys = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const KID = "test-key";

const User = require("../models/User");
const { keycloakAuth, audienceAllowed, inactiveReason, assertAuthConfig } = require("../middlewares/keycloakAuth");
const { allowOrigin } = require("../middlewares/corsOptions");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

const OLD_FALLBACK = "fallback-secret-for-encryption-1234567890";
const REAL_SECRET = "test-local-secret-please-change";

let server;
let keycloak;
let base;
const saved = {};

before(async () => {
  await connectTestDb();
  const jwk = { ...keys.publicKey.export({ format: "jwk" }), kid: KID, use: "sig", alg: "RS256" };
  keycloak = http.createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ keys: [jwk] }));
  });
  await new Promise((resolve) => keycloak.listen(KEYCLOAK_PORT, "127.0.0.1", resolve));
  const app = express();
  app.use(express.json());
  // the real middleware guards a route that simply reports who it decided you are
  app.get("/whoami", keycloakAuth, (req, res) => res.json({ id: req.user.id, role: req.user.role, email: req.user.email }));
  await new Promise((resolve) => (server = app.listen(0, "127.0.0.1", resolve)));
  base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(async () => {
  await clearTestDb();
  // each test sets the env it needs; start from a known, locked-down state (not demo, not production)
  for (const k of ["AUTH_MODE", "JWT_SECRET", "KEYCLOAK_CLIENT_ID", "NODE_ENV", "KEYCLOAK_ADMIN_PASSWORD"]) saved[k] = process.env[k];
  delete process.env.AUTH_MODE;
  delete process.env.JWT_SECRET;
  delete process.env.KEYCLOAK_CLIENT_ID;
  process.env.NODE_ENV = "test";
});
after(async () => {
  for (const [k, v] of Object.entries(saved)) v === undefined ? delete process.env[k] : (process.env[k] = v);
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  if (keycloak?.listening) await new Promise((resolve) => keycloak.close(resolve));
  await disconnectTestDb();
});

/** A token as Keycloak would sign it for this person (or with another key, to prove it's refused). */
const keycloakToken = (user, { key = keys.privateKey, claims = {} } = {}) =>
  jwt.sign({ sub: user.keycloakId, email: user.email, preferred_username: user.username, realm_access: { roles: [user.role] }, ...claims }, key, {
    algorithm: "RS256",
    keyid: KID,
    issuer: ISSUER,
    expiresIn: "5m",
  });

const whoami = (token, headers = {}) =>
  fetch(`${base}/whoami`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers } }).then(async (r) => ({ status: r.status, body: await r.json() }));

const hs256 = (payload, secret) => jwt.sign(payload, secret, { algorithm: "HS256" });

// --- the fake-token holes are closed ---

test("'demo-token' is refused when demo mode is off, whatever role header it carries", async () => {
  const r = await whoami("demo-token", { "x-demo-role": "superadmin" });
  assert.equal(r.status, 401);
});

test("'mock-token' is refused when demo mode is off", async () => {
  assert.equal((await whoami("mock-token", { "x-demo-role": "admin" })).status, 401);
});

test("a request with no token is refused when demo mode is off", async () => {
  assert.equal((await whoami(null)).status, 401);
});

// --- demo mode, when deliberately switched on, still works through its own path ---

test("with demo mode on, 'demo-token' signs in as the role the header asks for", async () => {
  process.env.AUTH_MODE = "demo";
  const r = await whoami("demo-token", { "x-demo-role": "subadmin" });
  assert.equal(r.status, 200);
  assert.equal(r.body.role, "Subadmin");
});

// --- the forgeable local-secret path is closed ---

test("a token signed with the old hardcoded fallback secret is refused", async () => {
  const user = await User.create(userFields());
  const r = await whoami(hs256({ id: String(user._id), role: "Superadmin" }, OLD_FALLBACK));
  assert.equal(r.status, 401);
});

// Step 17 (owner's 1A): only Keycloak's tokens sign in. The backend's own local tokens (from the removed
// /api/auth/login) are refused even when signed with the real JWT_SECRET.
test("a token signed with JWT_SECRET is refused: only Keycloak's tokens sign in", async () => {
  process.env.JWT_SECRET = REAL_SECRET;
  const user = await User.create(userFields({ role: "Superadmin" }));
  assert.equal((await whoami(hs256({ id: String(user._id), role: "Superadmin" }, REAL_SECRET))).status, 401);
});

test("a token Keycloak signed signs an active person in", async () => {
  const user = await User.create(userFields({ role: "Employee" }));
  const r = await whoami(keycloakToken(user));
  assert.equal(r.status, 200);
  assert.equal(r.body.id, String(user._id));
});

test("a token signed with any other key is refused", async () => {
  const user = await User.create(userFields({ role: "Employee" }));
  assert.equal((await whoami(keycloakToken(user, { key: otherKeys.privateKey }))).status, 401);
});

// --- blocked and deleted accounts lose access at the door ---

// Review 2026-10-26 low list: Keycloak signs its ID tokens (who someone is, for the app that asked) with the same key,
// and they were accepted for requests like access tokens. Only an access token ("Bearer") signs a request in now.
test("an ID token or a refresh token is refused; an access token signs in", async () => {
  const user = await User.create(userFields({ isDeleted: false, isBanned: false }));
  assert.equal((await whoami(keycloakToken(user, { claims: { typ: "ID" } }))).status, 401);
  assert.equal((await whoami(keycloakToken(user, { claims: { typ: "Refresh" } }))).status, 401);
  assert.equal((await whoami(keycloakToken(user, { claims: { typ: "Bearer" } }))).status, 200);
});

// the refusal carries the "switched-off" code the sign-in uses, so an open portal signs out and says why (review
// 2026-10-26 low list, owner's 2A)
test("a blocked account is refused, not just hidden, and told it's switched off", async () => {
  const user = await User.create(userFields({ role: "Employee", isBanned: true }));
  const r = await whoami(keycloakToken(user));
  assert.equal(r.status, 403);
  assert.equal(r.body.code, "switched-off");
});

test("a deleted account is refused, and told it's switched off", async () => {
  const user = await User.create(userFields({ role: "Employee", isDeleted: true }));
  const r = await whoami(keycloakToken(user));
  assert.equal(r.status, 403);
  assert.equal(r.body.code, "switched-off");
});

// --- audience / authorized-party check (unit, since the real path needs Keycloak) ---

test("a token is accepted only when it was issued for this app's Keycloak client", () => {
  process.env.KEYCLOAK_CLIENT_ID = "lms-client";
  assert.equal(audienceAllowed({ azp: "lms-client", aud: "account" }), true);
  assert.equal(audienceAllowed({ azp: "some-other-app", aud: "account" }), false);
  assert.equal(audienceAllowed({ aud: ["account", "lms-client"] }), true);
  assert.equal(audienceAllowed({ azp: "x", aud: "account" }), false);
});

test("the audience check is skipped when no client is configured, so it can't lock people out by accident", () => {
  delete process.env.KEYCLOAK_CLIENT_ID;
  assert.equal(audienceAllowed({ azp: "anything" }), true);
});

// --- the inactive-account helper, shared by both sign-in paths ---

test("the inactive-account reason names deletion and blocking, and is empty for a good account", () => {
  assert.match(inactiveReason({ isDeleted: true }), /remov/i);
  assert.match(inactiveReason({ isBanned: true }), /block/i);
  assert.equal(inactiveReason({}), null);
});

// --- the config guard refuses dangerous production settings at boot ---

test("the server refuses to start with demo mode on in production", () => {
  process.env.NODE_ENV = "production";
  process.env.AUTH_MODE = "demo";
  process.env.JWT_SECRET = REAL_SECRET;
  process.env.KEYCLOAK_ADMIN_PASSWORD = "a-real-password";
  assert.throws(() => assertAuthConfig(), /demo/i);
});

test("the server refuses to start in production without a real Keycloak admin password", () => {
  process.env.NODE_ENV = "production";
  delete process.env.KEYCLOAK_ADMIN_PASSWORD;
  assert.throws(() => assertAuthConfig(), /admin/i);
  process.env.KEYCLOAK_ADMIN_PASSWORD = "admin";
  assert.throws(() => assertAuthConfig(), /admin/i);
});

test("the config guard is happy with safe production settings, and never complains in development", () => {
  process.env.NODE_ENV = "production";
  // no local tokens any more (step 17), so JWT_SECRET isn't needed to start
  delete process.env.JWT_SECRET;
  process.env.KEYCLOAK_ADMIN_PASSWORD = "a-real-password";
  process.env.KEYCLOAK_CLIENT_ID = "lms-client";
  assert.doesNotThrow(() => assertAuthConfig());
  process.env.NODE_ENV = "development";
  delete process.env.JWT_SECRET;
  delete process.env.KEYCLOAK_ADMIN_PASSWORD;
  assert.doesNotThrow(() => assertAuthConfig());
});

// --- CORS: only listed sites in production, open in development ---

test("in production only listed sites may call the API from a browser", () => {
  const allowed = ["https://portal.example.com", "https://app.example.com"];
  assert.equal(allowOrigin("https://portal.example.com", { allowed, isProd: true }), true);
  assert.equal(allowOrigin("https://evil.example.com", { allowed, isProd: true }), false);
  // server-to-server and same-origin requests send no Origin; those are allowed
  assert.equal(allowOrigin(undefined, { allowed, isProd: true }), true);
});

test("in development any site is allowed, so local tools keep working", () => {
  assert.equal(allowOrigin("http://localhost:9999", { allowed: [], isProd: false }), true);
});
