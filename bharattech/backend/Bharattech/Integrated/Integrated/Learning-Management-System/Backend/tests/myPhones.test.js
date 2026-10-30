const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

// Owner's 1A 2A (2026-10-25): everyone edits their own phone and work phone (a 10-digit Indian number, saved as typed,
// empty clears it) and chooses whether colleagues see them. A stand-in for the Keycloak admin client records the
// phone sync that PATCH /me does.
const kcUpdates = [];
class FakeKcAdminClient {
  constructor() {
    this.users = {
      findOne: async ({ id }) => ({ id, username: "someone", attributes: {} }),
      update: async (_where, body) => kcUpdates.push(body),
    };
  }
  async auth() {}
}
require("./helpers/fakeKeycloakAdmin").stubKeycloakAdminPackage(FakeKcAdminClient);

const User = require("../models/User");
const { updateCurrentUser, getCurrentUser, getDirectory } = require("../controllers/userController");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

let server;
let base;

before(async () => {
  await connectTestDb();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = JSON.parse(req.get("x-test-user"));
    next();
  });
  app.get("/me", getCurrentUser);
  app.patch("/me", updateCurrentUser);
  app.get("/directory", getDirectory);
  await new Promise((resolve) => (server = app.listen(0, "127.0.0.1", resolve)));
  base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(async () => {
  kcUpdates.length = 0;
  await clearTestDb();
});
after(async () => {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  await disconnectTestDb();
});

const as = (p) => JSON.stringify({ id: String(p._id), role: p.role, keycloakId: p.keycloakId, email: p.email });
const send = async (who, method, path, body) => {
  const res = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", "x-test-user": as(who) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};
const stored = async (p) => User.findById(p._id).lean();

test("a person saves their own phone and work phone as typed, and the profile and Keycloak get them", async () => {
  const me = await User.create(userFields());

  const res = await send(me, "PATCH", "/me", { phone: "  +91 98765 43210 ", workPhone: "080-4000-1234" });

  assert.equal(res.status, 200);
  const saved = await stored(me);
  assert.equal(saved.phone, "+91 98765 43210");
  assert.equal(saved.workPhone, "080-4000-1234");
  assert.equal(kcUpdates.length, 1);
  assert.deepEqual(kcUpdates[0].attributes.phone, ["+91 98765 43210"]);
  assert.equal((await send(me, "GET", "/me")).body.phone, "+91 98765 43210");
});

test("ten digits with or without +91 or a leading 0 are all accepted", async () => {
  const me = await User.create(userFields());
  for (const phone of ["9876543210", "+919876543210", "+91-98765-43210", "09876543210", "98765 43210"]) {
    const res = await send(me, "PATCH", "/me", { phone });
    assert.equal(res.status, 200, phone);
    assert.equal((await stored(me)).phone, phone);
  }
});

test("a number that isn't a 10-digit Indian number is refused and nothing is saved or synced", async () => {
  const me = await User.create(userFields({ phone: "+91 98765 43210", workPhone: "+91 80 4000 1234" }));
  for (const phone of ["+91 1", "12345", "98765432101", "+44 20 7946 0958", "abc", "98765x43210", "+91 98765 43210 ext 5", "9".repeat(40), "+91  -  98765  -  43210", 9876543210]) {
    const res = await send(me, "PATCH", "/me", { phone, workPhone: "9876543210" });
    assert.equal(res.status, 400, String(phone));
    assert.match(res.body.message, /10-digit/);
  }
  const bad = await send(me, "PATCH", "/me", { workPhone: "123" });
  assert.equal(bad.status, 400);
  assert.match(bad.body.message, /work phone/i);
  const saved = await stored(me);
  assert.equal(saved.phone, "+91 98765 43210");
  assert.equal(saved.workPhone, "+91 80 4000 1234");
  assert.equal(kcUpdates.length, 0);
});

test("an empty number clears it", async () => {
  const me = await User.create(userFields({ phone: "+91 98765 43210", workPhone: "+91 80 4000 1234" }));

  const res = await send(me, "PATCH", "/me", { phone: "", workPhone: "   " });

  assert.equal(res.status, 200);
  const saved = await stored(me);
  assert.equal(saved.phone, "");
  assert.equal(saved.workPhone, "");
  assert.deepEqual(kcUpdates[0].attributes.workPhone, [""]);
});

test("a person hides their phone numbers from colleagues and shows them again", async () => {
  const me = await User.create(userFields({ phone: "+91 98765 43210", workPhone: "+91 80 4000 1234" }));
  const colleague = await User.create(userFields());
  const row = async () => (await send(colleague, "GET", "/directory")).body.find((p) => p.id === String(me._id));

  const hide = await send(me, "PATCH", "/me", { showPhone: false });
  assert.equal(hide.status, 200);
  assert.equal((await stored(me)).privacySettings.showPhone, false);
  assert.equal((await send(me, "GET", "/me")).body.privacySettings.showPhone, false);
  assert.equal((await row()).phone, undefined);
  assert.equal((await row()).workPhone, undefined);
  // only the switch changed, so Keycloak isn't asked to rewrite the numbers
  assert.equal(kcUpdates.length, 0);

  assert.equal((await send(me, "PATCH", "/me", { showPhone: true })).status, 200);
  assert.equal((await row()).phone, "+91 98765 43210");
});

test("the switch only takes true or false, and leaves the person's other privacy choices alone", async () => {
  const me = await User.create(userFields({ privacySettings: { showEmail: false, showPhone: true } }));

  for (const showPhone of ["no", 0, null, "false"]) {
    const res = await send(me, "PATCH", "/me", { showPhone, phone: "9876543210" });
    assert.equal(res.status, 400, String(showPhone));
  }
  assert.equal((await stored(me)).phone, undefined);

  await send(me, "PATCH", "/me", { showPhone: false });
  const saved = await stored(me);
  assert.equal(saved.privacySettings.showPhone, false);
  assert.equal(saved.privacySettings.showEmail, false);
});
