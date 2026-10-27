const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");

// Security report 2026-10-28 leads 7 + 8 (owner's F6A): an OpenInterviewer session lasted 7 days and said nobody's
// name, so blocking, removing, marking as left or demoting an Admin never ended it. The pass now says whose it is, and
// OpenInterviewer asks this backend, with a check signed by the launch secret, whether that person is still an active
// Admin or Super Admin.
process.env.BHARATTECH_LAUNCH_SECRET = "the-launch-secret";
const User = require("../models/User");
const openInterviewerRoutes = require("../routes/openInterviewerRoutes");
const { createOpenInterviewerToken } = require("../utils/openInterviewerToken");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

let server;
let base;
before(async () => {
  await connectTestDb();
  const app = express();
  app.use(express.json());
  app.use("/api/openinterviewer", openInterviewerRoutes);
  await new Promise((resolve) => (server = app.listen(0, "127.0.0.1", resolve)));
  base = `http://127.0.0.1:${server.address().port}/api/openinterviewer`;
});
beforeEach(clearTestDb);
after(async () => {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  await disconnectTestDb();
});

const checkFor = (sub, { secret = "the-launch-secret", type = "openinterviewer-session-check", life = 60 } = {}) =>
  jwt.sign({ type, sub }, secret, { algorithm: "HS256", expiresIn: life });
const ask = async (check) => {
  const res = await fetch(`${base}/session-check`, { method: "POST", headers: check ? { Authorization: `Bearer ${check}` } : {} });
  return { status: res.status, body: await res.json() };
};

test("a pass says whose it is: their Keycloak account", async () => {
  const pass = jwt.verify(await createOpenInterviewerToken({ role: "Admin", keycloakId: "kc-admin" }), "the-launch-secret");
  assert.equal(pass.sub, "kc-admin");
});

test("a current Admin or Super Admin is still a researcher; anyone blocked, gone, demoted or unknown isn't", async () => {
  const people = {
    admin: await User.create(userFields({ role: "Admin", keycloakId: "kc-admin" })),
    superadmin: await User.create(userFields({ role: "Superadmin", keycloakId: "kc-super" })),
    blocked: await User.create(userFields({ role: "Admin", keycloakId: "kc-blocked", isBanned: true })),
    left: await User.create(userFields({ role: "Admin", keycloakId: "kc-left", isDeleted: true, leftOn: "2026-10-01" })),
    demoted: await User.create(userFields({ role: "Employee", keycloakId: "kc-demoted" })),
  };
  const expected = { admin: true, superadmin: true, blocked: false, left: false, demoted: false };
  for (const [who, person] of Object.entries(people)) {
    const reply = await ask(checkFor(person.keycloakId));
    assert.equal(reply.status, 200, who);
    assert.deepEqual(reply.body, { active: expected[who] }, who);
  }
  assert.deepEqual((await ask(checkFor("kc-nobody"))).body, { active: false });
});

test("only OpenInterviewer can ask: a check signed otherwise, of another kind, too long-lived or missing is refused", async () => {
  await User.create(userFields({ role: "Admin", keycloakId: "kc-admin" }));
  for (const check of [
    checkFor("kc-admin", { secret: "something-else" }),
    checkFor("kc-admin", { type: "bharattech-admin-launch" }),
    checkFor("kc-admin", { life: 3600 }),
    checkFor(""),
    undefined,
  ]) {
    assert.equal((await ask(check)).status, 401);
  }
});
