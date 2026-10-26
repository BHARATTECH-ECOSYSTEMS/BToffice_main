const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");

// Review 2026-10-26 H3 (owner's 3A): a removed person's record keeps its username forever, and usernames are unique.
// Invites pick a username Keycloak doesn't have yet, so a new hire could get a removed person's old one; at their first
// sign-in the new record clashed with the removed one, and every request answered 401 "Auth failed". Now one shared
// helper moves the removed record's copy aside (the sync already did this on its own), and a username a current
// person holds gets a number added instead.

const keycloak = { users: [] };
class FakeKcAdminClient {
  constructor() {
    this.users = {
      find: async () => keycloak.users,
      count: async () => keycloak.users.length,
      listRealmRoleMappings: async () => [{ name: "Employee" }],
    };
  }
  async auth() {}
}
require("./helpers/fakeKeycloakAdmin").stubKeycloakAdminPackage(FakeKcAdminClient);

const User = require("../models/User");
const { getOrCreateUser } = require("../middlewares/keycloakAuth");
const { getUsers } = require("../controllers/userController");
const { moveRemovedRecordsAside, freeUsernameFor } = require("../utils/takenNames");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

before(connectTestDb);
beforeEach(async () => {
  await clearTestDb();
  keycloak.users = [];
});
after(disconnectTestDb);

/** The parts of a Keycloak access token getOrCreateUser reads. */
// invites verify the email (review M13: only a verified email finds an older record)
const token = ({ sub, email, username, name = "Asha Rao" }) => ({ sub, email, email_verified: true, name, preferred_username: username, realm_access: { roles: ["Employee"] } });
const removed = (overrides) => User.create(userFields({ isDeleted: true, deletedAt: new Date("2026-09-01"), ...overrides }));

test("a new hire with a removed person's old username gets a record at their first sign-in", async () => {
  const old = await removed({ username: "asha", email: "asha.old@example.test", keycloakId: "kc-old" });

  const user = await getOrCreateUser(token({ sub: "kc-new", email: "asha.new@example.test", username: "asha" }));

  assert.equal(user.username, "asha");
  assert.equal(user.email, "asha.new@example.test");
  assert.notEqual(String(user._id), String(old._id));
  const moved = await User.findById(old._id).lean();
  assert.equal(moved.isDeleted, true);
  assert.equal(moved.username, `deleted_${old._id}_asha`);
  // only what clashed moves: the removed person keeps their email, so they can still come back
  assert.equal(moved.email, "asha.old@example.test");
});

test("the removed person can still come back later by their email, with their own record", async () => {
  const old = await removed({ username: "asha", email: "asha.old@example.test", keycloakId: "kc-old", employeeId: "BT-0042" });
  await getOrCreateUser(token({ sub: "kc-new", email: "asha.new@example.test", username: "asha" }));

  const back = await getOrCreateUser(token({ sub: "kc-back", email: "asha.old@example.test", username: "asha.2" }));

  assert.equal(String(back._id), String(old._id));
  assert.equal(back.employeeId, "BT-0042");
  assert.equal(back.isDeleted, false);
});

test("a username a current person holds gets a number added, and the current person is left alone", async () => {
  const current = await User.create(userFields({ username: "ravi", email: "ravi.one@example.test", keycloakId: "kc-ravi-1" }));
  await User.create(userFields({ username: "ravi.2", email: "ravi.two@example.test", keycloakId: "kc-ravi-2" }));

  const user = await getOrCreateUser(token({ sub: "kc-ravi-3", email: "ravi.three@example.test", username: "ravi" }));

  assert.equal(user.username, "ravi.3");
  const kept = await User.findById(current._id).lean();
  assert.equal(kept.username, "ravi");
  assert.equal(kept.email, "ravi.one@example.test");
  assert.equal(kept.keycloakId, "kc-ravi-1");
});

test("the helper moves only removed records, and never the one being saved", async () => {
  const ghost = await removed({ username: "meera", email: "meera@example.test", keycloakId: "kc-ghost" });
  const live = await User.create(userFields({ username: "meera.live", email: "meera.live@example.test" }));
  const own = await removed({ username: "kabir", email: "kabir@example.test", keycloakId: "kc-kabir" });

  await moveRemovedRecordsAside({ email: "meera.live@example.test", username: "meera", keycloakId: "kc-someone" });
  await moveRemovedRecordsAside({ username: "kabir", keycloakId: "kc-kabir" });
  await moveRemovedRecordsAside({ username: "kabir", keycloakId: "kc-other", keepId: own._id });

  assert.equal((await User.findById(ghost._id).lean()).username, `deleted_${ghost._id}_meera`);
  assert.equal((await User.findById(ghost._id).lean()).email, "meera@example.test");
  assert.equal((await User.findById(live._id).lean()).email, "meera.live@example.test");
  assert.equal((await User.findById(own._id).lean()).username, "kabir");
});

test("a removed record whose email clashes has its email moved aside, its username kept", async () => {
  const ghost = await removed({ username: "old.name", email: "shared@example.test", keycloakId: "kc-ghost" });

  await moveRemovedRecordsAside({ email: "shared@example.test", username: "new.name", keycloakId: "kc-new" });

  const moved = await User.findById(ghost._id).lean();
  assert.equal(moved.email, `deleted+${ghost._id}+shared@example.test`);
  assert.equal(moved.username, "old.name");
});

test("freeUsernameFor gives the wanted name when nobody holds it", async () => {
  assert.equal(await freeUsernameFor("fresh.name", "kc-fresh"), "fresh.name");
});

test("the admin sync uses the same helper: a removed record's copy moves aside, and keeps its email", async () => {
  const ghost = await removed({ username: "asha", email: "asha.old@example.test", keycloakId: "kc-old" });
  await User.create(userFields({ username: "temp.asha", email: "asha.new@example.test", keycloakId: "kc-new" }));
  keycloak.users = [{ id: "kc-new", username: "asha", email: "asha.new@example.test", firstName: "Asha", lastName: "Rao", enabled: true }];

  let status = 200;
  await getUsers({ user: { role: "Admin" }, query: {} }, { status: (s) => ((status = s), { json: () => {} }), json: () => {} });

  assert.equal(status, 200);
  assert.equal((await User.findOne({ keycloakId: "kc-new" }).lean()).username, "asha");
  const moved = await User.findById(ghost._id).lean();
  assert.equal(moved.username, `deleted_${ghost._id}_asha`);
  assert.equal(moved.email, "asha.old@example.test");
});
