const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { getLaunchSecret, createOpenInterviewerToken, LAUNCH_PASS_SECONDS } = require("../utils/openInterviewerToken");

// Step 17 Part 1 (owner's 5A): the OpenInterviewer launch is signed with its own secret, BHARATTECH_LAUNCH_SECRET.
// It used to fall back to JWT_SECRET, ADMIN_SECRET, SESSION_SECRET or ADMIN_PASSWORD, so OpenInterviewer could end up
// holding a secret this backend uses for something else.
// Step 14 Part 2 (owner's 3A + 4A): no built-in secret in any environment (it was public in the code), and a pass
// lives 60 seconds with its own id, which OpenInterviewer records so the pass works once.

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

test("in development too, without its own secret no launch pass is made", async () => {
  process.env.NODE_ENV = "development";
  process.env.JWT_SECRET = "a-jwt";
  assert.throws(() => getLaunchSecret(), /not configured/);
  await assert.rejects(createOpenInterviewerToken({ role: "Admin", email: "admin@example.test" }), /not configured/);
});

test("a pass lives 60 seconds and carries its own id", async () => {
  process.env.BHARATTECH_LAUNCH_SECRET = "the-launch-secret";
  const first = jwt.verify(await createOpenInterviewerToken({ role: "Admin" }), "the-launch-secret", { algorithms: ["HS256"] });
  const second = jwt.verify(await createOpenInterviewerToken({ role: "Superadmin" }), "the-launch-secret", { algorithms: ["HS256"] });
  assert.equal(first.exp - first.iat, LAUNCH_PASS_SECONDS);
  assert.equal(LAUNCH_PASS_SECONDS, 60);
  assert.ok(first.jti && second.jti);
  assert.notEqual(first.jti, second.jti);
});

test("a pass carries the signed-in person's real role; nobody gets Admin by default", async () => {
  process.env.BHARATTECH_LAUNCH_SECRET = "the-launch-secret";
  const pass = jwt.verify(await createOpenInterviewerToken({ role: "Superadmin" }), "the-launch-secret", { algorithms: ["HS256"] });
  assert.equal(pass.role, "Superadmin");
  await assert.rejects(createOpenInterviewerToken({ email: "someone@example.test" }), /role/);
});

test("POST /launch-token answers with the launch address and the pass's real lifetime", async () => {
  process.env.BHARATTECH_LAUNCH_SECRET = "the-launch-secret";
  const layer = require("../routes/openInterviewerRoutes").stack.find((l) => l.route?.path === "/launch-token");
  const handler = layer.route.stack.at(-1).handle;
  let reply;
  await handler({ user: { role: "Admin", email: "admin@example.test" } }, { json: (body) => (reply = body), status() { return this; } });
  assert.equal(reply.expiresIn, 60);
  assert.match(reply.launchUrl, /\/login\?launchToken=/);
});

test("a launch token checks out with the launch secret and not with JWT_SECRET", async () => {
  process.env.NODE_ENV = "production";
  process.env.BHARATTECH_LAUNCH_SECRET = "the-launch-secret";
  process.env.JWT_SECRET = "a-jwt";
  const token = await createOpenInterviewerToken({ role: "Admin", email: "admin@example.test" });
  assert.equal(jwt.verify(token, "the-launch-secret", { algorithms: ["HS256"] }).type, "bharattech-admin-launch");
  assert.throws(() => jwt.verify(token, "a-jwt", { algorithms: ["HS256"] }));
});
