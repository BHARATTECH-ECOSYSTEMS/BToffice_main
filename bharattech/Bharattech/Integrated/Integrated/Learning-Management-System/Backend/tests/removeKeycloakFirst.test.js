const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");

// Review 2026-10-26 M10 (owner's 2A): removing someone marked them removed here even when Keycloak couldn't delete
// their account, which was only logged: they could still sign in to the other apps, and the next admin list brought
// them back. Now Keycloak goes first: if it can't delete the account, nothing is removed. An account that's already
// gone from Keycloak counts as done.

const kc = { deleted: [], failWith: null };
class FakeKcAdminClient {
  constructor() {
    this.users = {
      del: async ({ id }) => {
        if (kc.failWith) throw kc.failWith;
        kc.deleted.push(id);
      },
    };
  }
  async auth() {}
}
require("./helpers/fakeKeycloakAdmin").stubKeycloakAdminPackage(FakeKcAdminClient);

const User = require("../models/User");
const { deleteUser } = require("../controllers/userController");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

before(connectTestDb);
beforeEach(async () => {
  await clearTestDb();
  Object.assign(kc, { deleted: [], failWith: null });
});
after(disconnectTestDb);

const remove = async (id) => {
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
  const [log, error] = [console.log, console.error];
  console.log = console.error = () => {};
  try {
    await deleteUser({ params: { id: String(id) }, user: { role: "Superadmin" } }, res);
  } finally {
    [console.log, console.error] = [log, error];
  }
  return reply;
};
const httpError = (status) => Object.assign(new Error(`Request failed with status code ${status}`), { response: { status } });
const asha = () => User.create(userFields({ keycloakId: "kc-asha", authProvider: "keycloak", role: "Employee" }));

test("when Keycloak can't delete the account, nobody is removed, and the reply says to try again", async () => {
  const person = await asha();
  kc.failWith = httpError(503);
  const reply = await remove(person._id);
  assert.equal(reply.status, 502);
  assert.match(reply.body.message, /nothing was changed/i);
  assert.equal((await User.findById(person._id)).isDeleted, false);
});

test("an account already gone from Keycloak counts as done", async () => {
  const person = await asha();
  kc.failWith = httpError(404);
  const reply = await remove(person._id);
  assert.equal(reply.status, 200);
  assert.equal((await User.findById(person._id)).isDeleted, true);
});

test("removing someone deletes their Keycloak account, then marks the record removed", async () => {
  const person = await asha();
  const reply = await remove(person._id);
  assert.equal(reply.status, 200);
  assert.deepEqual(kc.deleted, ["kc-asha"]);
  assert.equal((await User.findById(person._id)).isDeleted, true);
});
