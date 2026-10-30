const { test, before, beforeEach, afterEach, after } = require("node:test");
const assert = require("node:assert/strict");

// Review 2026-10-26 M7 (owner's 4A): "accept invite" took any account whose password was right, so anyone with a
// current password could change it and the username there, skipping Change password's "sign out everywhere". Now it
// only finishes an invite: an account still waiting for its first password.

const { installFakeKeycloakAdmin } = require("./helpers/fakeKeycloakAdmin");
const realm = installFakeKeycloakAdmin();
const { fakeTokenEndpoint, restore } = require("./helpers/fakeTokenEndpoint");

const { acceptInvite } = require("../controllers/authController");
const { connectTestDb, clearTestDb, disconnectTestDb } = require("./helpers/testDb");

before(connectTestDb);
beforeEach(async () => {
  await clearTestDb();
  Object.assign(realm, { accounts: [], passwords: new Map(), calls: [], next: 1 });
});
afterEach(restore);
after(disconnectTestDb);

const call = async (body) => {
  const reply = { status: 200, body: undefined };
  const res = {
    status(code) {
      reply.status = code;
      return res;
    },
    json(value) {
      reply.body = value;
      return res;
    },
  };
  const [log, error, warn] = [console.log, console.error, console.warn];
  console.log = console.error = console.warn = () => {};
  try {
    await acceptInvite({ body }, res);
  } finally {
    [console.log, console.error, console.warn] = [log, error, warn];
  }
  return reply;
};
const account = (waiting) => {
  const a = { id: "kc-1", username: "asha", email: "asha@example.test", enabled: true, requiredActions: waiting ? ["UPDATE_PASSWORD"] : [], realmRoles: ["Employee"] };
  realm.accounts.push(a);
  return a;
};
const accept = (overrides = {}) => call({ username: "asha", temporaryPassword: "Current-Pass-1", newPassword: "Brand-New-Pass-1", newUsername: "asha.rao", ...overrides });
const changes = () => realm.calls.filter(([what]) => what === "resetPassword" || what === "update");

test("a fully set-up account can't be changed through 'accept invite', even with its right password", async () => {
  account(false);
  fakeTokenEndpoint("ok");

  const reply = await accept();

  assert.equal(reply.status, 409);
  // its own code, so the portal doesn't take it for "that username is taken" (the other 409 here)
  assert.equal(reply.body.code, "already-set-up");
  assert.match(reply.body.message, /already set up/i);
  assert.match(reply.body.message, /Change password/);
  assert.deepEqual(changes(), []);
  assert.equal(realm.accounts[0].username, "asha");
});

test("an invite still waiting for its first password is finished as before", async () => {
  account(true);
  fakeTokenEndpoint("set up", "ok");

  const reply = await accept();

  assert.equal(reply.status, 200);
  assert.equal(realm.passwords.get("kc-1").value, "Brand-New-Pass-1");
  assert.equal(realm.accounts[0].username, "asha.rao");
  assert.deepEqual(realm.accounts[0].requiredActions, []);
});

test("a wrong password says so, whether or not the account is set up", async () => {
  account(false);
  fakeTokenEndpoint("wrong");

  const reply = await accept();

  assert.equal(reply.status, 401);
  assert.deepEqual(changes(), []);
});
