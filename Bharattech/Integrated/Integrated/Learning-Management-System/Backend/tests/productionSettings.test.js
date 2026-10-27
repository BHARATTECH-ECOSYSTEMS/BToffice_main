const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { assertAuthConfig } = require("../middlewares/keycloakAuth");
const { corsOptions } = require("../middlewares/corsOptions");

// Review 2026-10-26 M16: the start-up check refused dangerous settings only when NODE_ENV said "production", so a
// Render server without it skipped every check; and two settings production needs weren't checked at all: the
// Keycloak client (without it, tokens issued for any other app of the realm are accepted) and, when the interview
// tool is set up, its launch secret (without it, opening Interview fails for everyone).

const NAMES = ["NODE_ENV", "RENDER", "AUTH_MODE", "KEYCLOAK_ADMIN_PASSWORD", "KEYCLOAK_CLIENT_ID", "OPEN_INTERVIEWER_URL", "BHARATTECH_LAUNCH_SECRET"];
const saved = {};
beforeEach(() => {
  for (const k of NAMES) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});
afterEach(() => {
  for (const k of NAMES) saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k]);
});

/** Production settings that pass every check. */
const safeProduction = () => Object.assign(process.env, { NODE_ENV: "production", KEYCLOAK_ADMIN_PASSWORD: "a-real-password", KEYCLOAK_CLIENT_ID: "lms-client" });

test("a Render server counts as production even without NODE_ENV", () => {
  process.env.RENDER = "true";
  process.env.AUTH_MODE = "demo";
  assert.throws(() => assertAuthConfig(), /demo/i);
  delete process.env.AUTH_MODE;
  assert.throws(() => assertAuthConfig(), /KEYCLOAK_ADMIN_PASSWORD/);
});

test("production needs the Keycloak client the tokens must be issued for", () => {
  safeProduction();
  delete process.env.KEYCLOAK_CLIENT_ID;
  assert.throws(() => assertAuthConfig(), /KEYCLOAK_CLIENT_ID/);
});

test("with the interview tool set up, production needs its launch secret", () => {
  safeProduction();
  process.env.OPEN_INTERVIEWER_URL = "https://interview.example";
  assert.throws(() => assertAuthConfig(), /BHARATTECH_LAUNCH_SECRET/);
  process.env.BHARATTECH_LAUNCH_SECRET = "the-launch-secret";
  assert.doesNotThrow(() => assertAuthConfig());
});

test("safe production settings start, and development never complains", () => {
  safeProduction();
  assert.doesNotThrow(() => assertAuthConfig());
  for (const k of NAMES) delete process.env[k];
  process.env.NODE_ENV = "development";
  process.env.OPEN_INTERVIEWER_URL = "http://localhost:3000";
  assert.doesNotThrow(() => assertAuthConfig());
});

test("on a Render server without NODE_ENV, only the listed sites may call the API from a browser", async () => {
  process.env.RENDER = "true";
  const allowed = (origin) => new Promise((resolve) => corsOptions.origin(origin, (_e, ok) => resolve(ok)));
  assert.equal(await allowed("https://evil.example.com"), false);
  delete process.env.RENDER;
  assert.equal(await allowed("https://evil.example.com"), true, "development stays open");
});
