const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");

// Review 2026-10-26 H1 + H2 (owner's 2A): an admin's GET /api/user syncs the records from Keycloak. Since blocking
// switches the Keycloak account off (group B), the sync took a switched-off account for a removed one and marked the
// blocked person removed (H1); it also made records for invitees still waiting to set their password, so their invite
// left "Pending invites" (H2). Now a switched-off account still counts as existing and its record is left as it is,
// and an invite nobody has accepted gets no record until they sign in.

const keycloak = { users: [], total: null, roles: {} };
class FakeKcAdminClient {
  constructor() {
    this.users = {
      find: async () => keycloak.users,
      count: async () => keycloak.total ?? keycloak.users.length,
      listRealmRoleMappings: async ({ id }) => (keycloak.roles[id] || ["Employee"]).map((name) => ({ name })),
    };
  }
  async auth() {}
}
require("./helpers/fakeKeycloakAdmin").stubKeycloakAdminPackage(FakeKcAdminClient);

const User = require("../models/User");
const { getUsers } = require("../controllers/userController");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

before(connectTestDb);
beforeEach(async () => {
  await clearTestDb();
  Object.assign(keycloak, { users: [], total: null, roles: {} });
});
after(disconnectTestDb);

const adminList = async () => {
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
  await getUsers({ user: { id: "6a1f00000000000000000001", role: "Admin" }, query: {} }, res);
  assert.equal(reply.status, 200);
  return reply.body.map((p) => p.email).sort();
};
/** A Keycloak account; `waiting` = it still has to set its first password. */
const account = (id, email, { enabled = true, waiting = false } = {}) => {
  const a = { id, username: email.split("@")[0], email, firstName: email.split("@")[0], lastName: "", enabled, requiredActions: waiting ? ["UPDATE_PASSWORD"] : [] };
  keycloak.users.push(a);
  return a;
};
const stored = (email) => User.findOne({ email }).lean();

test("a blocked person (sign-in switched off) stays in People, still blocked, and keeps their record", async () => {
  await User.create(userFields({ keycloakId: "kc-asha", email: "asha@example.test", fullName: "Asha Rao", isBanned: true, team: "Design" }));
  account("kc-asha", "asha@example.test", { enabled: false });
  account("kc-ravi", "ravi@example.test");

  const before = await stored("asha@example.test");
  assert.deepEqual(await adminList(), ["asha@example.test", "ravi@example.test"]);
  const after = await stored("asha@example.test");
  assert.equal(after.isDeleted, false);
  assert.equal(after.isBanned, true);
  assert.equal(after.team, "Design");
  assert.equal(String(after.updatedAt), String(before.updatedAt), "the sync doesn't rewrite a switched-off person's record");
});

test("someone who left (sign-in switched off, record removed) stays removed and out of the list", async () => {
  await User.create(userFields({ keycloakId: "kc-left", email: "left@example.test", isDeleted: true, deletedAt: new Date(), leftOn: new Date() }));
  account("kc-left", "left@example.test", { enabled: false });

  assert.deepEqual(await adminList(), []);
  assert.equal((await stored("left@example.test")).isDeleted, true);
});

test("an invite nobody has accepted gets no record, so it stays a pending invite", async () => {
  account("kc-new", "new.hire@example.test", { waiting: true });
  account("kc-ravi", "ravi@example.test");

  assert.deepEqual(await adminList(), ["ravi@example.test"]);
  assert.equal(await User.countDocuments({ email: "new.hire@example.test" }), 0);
});

test("someone removed and invited again isn't brought back before they accept", async () => {
  await User.create(userFields({ keycloakId: "kc-old", email: "back@example.test", isDeleted: true, deletedAt: new Date() }));
  account("kc-new", "back@example.test", { waiting: true });

  assert.deepEqual(await adminList(), []);
  const record = await stored("back@example.test");
  assert.equal(record.isDeleted, true);
  assert.equal(record.keycloakId, "kc-old");
});

test("someone with a record whose account waits for a new password is still synced", async () => {
  await User.create(userFields({ keycloakId: "kc-asha", email: "asha@example.test", fullName: "Old Name" }));
  const asha = account("kc-asha", "asha@example.test", { waiting: true });
  asha.firstName = "Asha";
  asha.lastName = "Rao";

  assert.deepEqual(await adminList(), ["asha@example.test"]);
  assert.equal((await stored("asha@example.test")).fullName, "Asha Rao");
});

test("someone really gone from a complete list is still marked removed; blocked and pending people aren't", async () => {
  await User.create(userFields({ keycloakId: "kc-gone", email: "gone@example.test" }));
  await User.create(userFields({ keycloakId: "kc-blocked", email: "blocked@example.test", isBanned: true }));
  account("kc-blocked", "blocked@example.test", { enabled: false });
  account("kc-new", "new.hire@example.test", { waiting: true });

  await adminList();
  assert.equal((await stored("gone@example.test")).isDeleted, true);
  assert.equal((await stored("blocked@example.test")).isDeleted, false);
});
