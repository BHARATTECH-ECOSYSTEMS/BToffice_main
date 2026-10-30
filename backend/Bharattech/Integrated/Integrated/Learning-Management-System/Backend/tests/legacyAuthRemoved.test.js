const { test, before, beforeEach, after, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { connectTestDb, clearTestDb, disconnectTestDb } = require("./helpers/testDb");
const User = require("../models/User");
const authRoutes = require("../routes/authRoutes");

// Step 17 Part 1 (owner's 1A): the company's old local sign-up and sign-in routes are gone. /register took any role
// from the request (Superadmin included) and logged the whole request, password and all; /signup + /verify-email
// made an enabled Keycloak account for anyone; /login handed out the local tokens keycloakAuth no longer accepts.
// Nothing in the company's frontend or our portal calls them.

let server;
let base;
const logged = [];
const realLog = console.log;
const realError = console.error;

before(async () => {
  await connectTestDb();
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  await new Promise((resolve) => (server = app.listen(0, "127.0.0.1", resolve)));
  base = `http://127.0.0.1:${server.address().port}/api/auth`;
});
beforeEach(async () => {
  await clearTestDb();
  logged.length = 0;
  console.log = (...args) => logged.push(args.map(String).join(" "));
  console.error = (...args) => logged.push(args.map(String).join(" "));
});
afterEach(() => {
  console.log = realLog;
  console.error = realError;
});
after(async () => {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  await disconnectTestDb();
});

const PASSWORD = "Never-Log-Me-123";
const call = (method, path, body) =>
  fetch(base + path, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }).then((r) => r.status);

test("the old local sign-up, sign-in and verify routes are gone", async () => {
  const self = { username: "intruder", email: "intruder@example.test", password: PASSWORD, role: "Superadmin", keycloakId: "kc-intruder" };
  assert.equal(await call("POST", "/register", self), 404);
  assert.equal(await call("POST", "/signup", self), 404);
  assert.equal(await call("POST", "/login", { email: self.email, password: PASSWORD }), 404);
  assert.equal(await call("POST", "/change-password", { currentPassword: PASSWORD, newPassword: "x" }), 404);
  assert.equal(await call("GET", "/verify-email?token=abc"), 404);
  assert.equal(await call("GET", "/check-admin-session"), 404);
  assert.equal(await call("GET", "/whoami"), 404);
  // nothing was saved and no password reached the log
  assert.equal(await User.countDocuments(), 0);
  assert.equal(logged.some((line) => line.includes(PASSWORD)), false);
});

test("the sign-in routes the portal uses are still there", async () => {
  for (const path of ["/keycloak-login", "/accept-invite", "/forgot-password", "/reset-password", "/keycloak-change-password"]) {
    assert.notEqual(await call("POST", path, {}), 404, path);
  }
});

test("the old handlers are gone from the controller too, so nothing can mount them again", () => {
  const controller = require("../controllers/authController");
  for (const name of ["registerUser", "loginUser", "changePassword", "signup", "verifyEmail", "checkAdminSession"]) {
    assert.equal(name in controller, false, name);
  }
});
