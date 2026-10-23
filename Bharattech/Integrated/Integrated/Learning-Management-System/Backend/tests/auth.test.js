const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { keycloakAuth, audienceAllowed, inactiveReason, assertAuthConfig } = require("../middlewares/keycloakAuth");
const { allowOrigin } = require("../middlewares/corsOptions");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

const OLD_FALLBACK = "fallback-secret-for-encryption-1234567890";
const REAL_SECRET = "test-local-secret-please-change";

let server;
let base;
const saved = {};

before(async () => {
  await connectTestDb();
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
  await disconnectTestDb();
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

test("the local-secret path is off entirely unless a real JWT_SECRET is set", async () => {
  const user = await User.create(userFields());
  // JWT_SECRET unset: even a token this server could once have made is refused
  assert.equal((await whoami(hs256({ id: String(user._id), role: "Employee" }, OLD_FALLBACK))).status, 401);
});

test("with a real JWT_SECRET set, a token signed with it still signs an active user in", async () => {
  process.env.JWT_SECRET = REAL_SECRET;
  const user = await User.create(userFields({ role: "Employee" }));
  const r = await whoami(hs256({ id: String(user._id), role: "Employee" }, REAL_SECRET));
  assert.equal(r.status, 200);
  assert.equal(r.body.id, String(user._id));
});

test("a token signed with the wrong secret is refused even when a real one is set", async () => {
  process.env.JWT_SECRET = REAL_SECRET;
  const user = await User.create(userFields());
  assert.equal((await whoami(hs256({ id: String(user._id), role: "Admin" }, "some-other-secret"))).status, 401);
});

// --- blocked and deleted accounts lose access at the door ---

test("a blocked account is refused, not just hidden", async () => {
  process.env.JWT_SECRET = REAL_SECRET;
  const user = await User.create(userFields({ role: "Employee", isBanned: true }));
  const r = await whoami(hs256({ id: String(user._id), role: "Employee" }, REAL_SECRET));
  assert.equal(r.status, 403);
});

test("a deleted account is refused", async () => {
  process.env.JWT_SECRET = REAL_SECRET;
  const user = await User.create(userFields({ role: "Employee", isDeleted: true }));
  assert.equal((await whoami(hs256({ id: String(user._id), role: "Employee" }, REAL_SECRET))).status, 403);
});

test("a token for an account that no longer exists is refused", async () => {
  process.env.JWT_SECRET = REAL_SECRET;
  assert.equal((await whoami(hs256({ id: "6a1f00000000000000000099", role: "Admin" }, REAL_SECRET))).status, 401);
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

test("the server refuses to start in production without a real JWT_SECRET or admin password", () => {
  process.env.NODE_ENV = "production";
  process.env.KEYCLOAK_ADMIN_PASSWORD = "a-real-password";
  assert.throws(() => assertAuthConfig(), /JWT_SECRET/i);
  process.env.JWT_SECRET = OLD_FALLBACK;
  assert.throws(() => assertAuthConfig(), /JWT_SECRET/i);
  process.env.JWT_SECRET = REAL_SECRET;
  process.env.KEYCLOAK_ADMIN_PASSWORD = "admin";
  assert.throws(() => assertAuthConfig(), /admin/i);
});

test("the config guard is happy with safe production settings, and never complains in development", () => {
  process.env.NODE_ENV = "production";
  process.env.JWT_SECRET = REAL_SECRET;
  process.env.KEYCLOAK_ADMIN_PASSWORD = "a-real-password";
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
