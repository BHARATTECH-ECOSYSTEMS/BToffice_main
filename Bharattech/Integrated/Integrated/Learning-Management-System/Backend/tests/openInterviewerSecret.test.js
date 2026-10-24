const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { getLaunchSecret, createOpenInterviewerToken } = require("../utils/openInterviewerToken");

// Step 17 Part 1 (owner's 5A): the OpenInterviewer launch is signed with its own secret, BHARATTECH_LAUNCH_SECRET.
// It used to fall back to JWT_SECRET, ADMIN_SECRET, SESSION_SECRET or ADMIN_PASSWORD, so OpenInterviewer could end up
// holding a secret this backend uses for something else. The built-in fallback is for development only.

const NAMES = ["BHARATTECH_LAUNCH_SECRET", "ADMIN_SECRET", "JWT_SECRET", "SESSION_SECRET", "ADMIN_PASSWORD", "NODE_ENV"];
const saved = {};
const realWarn = console.warn;
beforeEach(() => {
  for (const k of NAMES) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  console.warn = () => {};
});
afterEach(() => {
  for (const k of NAMES) saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k]);
  console.warn = realWarn;
});

test("in production only its own secret signs the launch; other secrets are never borrowed", () => {
  process.env.NODE_ENV = "production";
  Object.assign(process.env, { ADMIN_SECRET: "a-admin", JWT_SECRET: "a-jwt", SESSION_SECRET: "a-session", ADMIN_PASSWORD: "a-password" });
  assert.throws(() => getLaunchSecret(), /not configured/);
  process.env.BHARATTECH_LAUNCH_SECRET = "the-launch-secret";
  assert.equal(getLaunchSecret(), "the-launch-secret");
});

test("in development, without its own secret, the built-in one is used, never another secret", () => {
  process.env.NODE_ENV = "development";
  process.env.JWT_SECRET = "a-jwt";
  const secret = getLaunchSecret();
  assert.ok(secret);
  assert.notEqual(secret, "a-jwt");
});

test("a launch token checks out with the launch secret and not with JWT_SECRET", async () => {
  process.env.NODE_ENV = "production";
  process.env.BHARATTECH_LAUNCH_SECRET = "the-launch-secret";
  process.env.JWT_SECRET = "a-jwt";
  const token = await createOpenInterviewerToken({ role: "Admin", email: "admin@example.test" });
  assert.equal(jwt.verify(token, "the-launch-secret", { algorithms: ["HS256"] }).type, "bharattech-admin-launch");
  assert.throws(() => jwt.verify(token, "a-jwt", { algorithms: ["HS256"] }));
});
