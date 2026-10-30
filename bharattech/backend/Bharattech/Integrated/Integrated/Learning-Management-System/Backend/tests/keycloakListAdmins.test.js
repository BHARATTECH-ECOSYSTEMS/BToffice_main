const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");

// Review 2026-10-26 M15 (owner's 3A): GET /api/user/keycloak-users (the company's People page asks every 30 seconds)
// answered anyone signed in, with every account's email, and each answer cost one Keycloak call per account. Now staff
// get an empty list without Keycloak being asked (the company page then shows nothing extra, and no error), and admins
// share one copy for 30 seconds, dropped as soon as an admin changes or removes someone.

const keycloak = { users: [], finds: 0, findError: null };
class FakeKcAdminClient {
  constructor() {
    this.users = {
      find: async () => {
        keycloak.finds += 1;
        if (keycloak.findError) throw keycloak.findError;
        return keycloak.users;
      },
      count: async () => keycloak.users.length,
      listRealmRoleMappings: async () => [{ name: "Employee" }],
      findOne: async ({ id }) => keycloak.users.find((u) => u.id === id) || null,
      update: async () => {},
      del: async () => {},
    };
  }
  async auth() {}
}
require("./helpers/fakeKeycloakAdmin").stubKeycloakAdminPackage(FakeKcAdminClient);

const User = require("../models/User");
const { getKeycloakUsers, updateUser, forgetKeycloakList, KEYCLOAK_LIST_MS } = require("../controllers/userController");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

before(connectTestDb);
beforeEach(async () => {
  await clearTestDb();
  Object.assign(keycloak, { users: [{ id: "kc-asha", username: "asha", email: "asha@example.test", firstName: "Asha", lastName: "Rao", enabled: true, attributes: {} }], finds: 0, findError: null });
  forgetKeycloakList();
});
after(disconnectTestDb);

const call = async (handler, role, extra = {}) => {
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
    await handler({ user: { id: "6a1f00000000000000000001", role }, query: {}, ...extra }, res);
  } finally {
    [console.log, console.error] = [log, error];
  }
  return reply;
};
const realNow = Date.now;
const at = (ms) => {
  Date.now = () => ms;
};

test("staff get an empty list, and Keycloak isn't asked", async () => {
  for (const role of ["Employee", "Intern", "Subadmin"]) {
    const reply = await call(getKeycloakUsers, role);
    assert.equal(reply.status, 200, role);
    assert.deepEqual(reply.body, [], role);
  }
  assert.equal(keycloak.finds, 0);
});

test("admins share one copy for 30 seconds, then Keycloak is asked again", async () => {
  try {
    at(1_000_000);
    assert.equal((await call(getKeycloakUsers, "Admin")).body[0].email, "asha@example.test");
    at(1_000_000 + KEYCLOAK_LIST_MS - 1);
    await call(getKeycloakUsers, "Superadmin");
    assert.equal(keycloak.finds, 1);
    at(1_000_000 + KEYCLOAK_LIST_MS);
    await call(getKeycloakUsers, "Admin");
    assert.equal(keycloak.finds, 2);
  } finally {
    Date.now = realNow;
  }
});

test("a failed answer isn't shared: the next request asks Keycloak again", async () => {
  keycloak.findError = new Error("connect ECONNREFUSED");
  assert.equal((await call(getKeycloakUsers, "Admin")).status, 500);
  keycloak.findError = null;
  assert.equal((await call(getKeycloakUsers, "Admin")).status, 200);
  assert.equal(keycloak.finds, 2);
});

test("an admin's change to someone drops the copy, so the list shows it at once", async () => {
  await call(getKeycloakUsers, "Admin");
  const asha = await User.create(userFields({ keycloakId: "kc-asha", authProvider: "keycloak", fullName: "Asha Rao" }));
  assert.equal((await call(updateUser, "Superadmin", { params: { id: String(asha._id) }, body: { team: "Design" } })).status, 200);
  await call(getKeycloakUsers, "Admin");
  assert.equal(keycloak.finds, 2);
});

test("the shared copy is 30 seconds", () => {
  assert.equal(KEYCLOAK_LIST_MS, 30 * 1000);
});
