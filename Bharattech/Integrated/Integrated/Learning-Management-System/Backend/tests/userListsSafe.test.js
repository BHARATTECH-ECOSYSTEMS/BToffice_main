const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");

// Step 17 Part 1 (owner's 2A): GET /api/user and GET /api/user/keycloak-users stay open to everyone signed in (the
// company's People page reads both, for every role), but are made safe: only an admin's request syncs from Keycloak,
// the sync never marks people removed from an incomplete list, phones follow each person's "show my phone", and no
// internal error text reaches the caller.

// A stand-in Keycloak admin client, in place before userController loads it. Tests set what Keycloak "has".
const keycloak = { users: [], total: null, roles: {}, findError: null, finds: 0 };
class FakeKcAdminClient {
  constructor() {
    this.users = {
      find: async () => {
        keycloak.finds += 1;
        if (keycloak.findError) throw keycloak.findError;
        return keycloak.users;
      },
      count: async () => keycloak.total ?? keycloak.users.length,
      listRealmRoleMappings: async ({ id }) => (keycloak.roles[id] || ["Employee"]).map((name) => ({ name })),
    };
  }
  async auth() {}
}
require.cache[require.resolve("keycloak-admin")] = { id: "keycloak-admin", loaded: true, exports: { default: FakeKcAdminClient } };

const User = require("../models/User");
const { getUsers, getKeycloakUsers } = require("../controllers/userController");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

before(connectTestDb);
beforeEach(async () => {
  await clearTestDb();
  Object.assign(keycloak, { users: [], total: null, roles: {}, findError: null, finds: 0 });
});
after(disconnectTestDb);

const call = async (handler, role) => {
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
  await handler({ user: { id: "6a1f00000000000000000001", role }, query: {} }, res);
  return reply;
};
const kcUser = (id, email, attributes = {}) => ({ id, username: email.split("@")[0], email, firstName: email.split("@")[0], lastName: "", enabled: true, attributes });
const quiet = async (fn) => {
  const real = console.error;
  console.error = () => {};
  try {
    return await fn();
  } finally {
    console.error = real;
  }
};

const twoPeople = async () => {
  await User.create(userFields({ keycloakId: "kc-asha", email: "asha@example.test", fullName: "Asha Rao" }));
  await User.create(userFields({ keycloakId: "kc-ravi", email: "ravi@example.test", fullName: "Ravi Menon" }));
};

test("an employee's list comes from the stored records: Keycloak isn't asked and nobody is changed", async () => {
  await twoPeople();
  keycloak.users = [kcUser("kc-asha", "asha@example.test")];
  for (const role of ["Employee", "Intern", "Subadmin"]) {
    const reply = await call(getUsers, role);
    assert.equal(reply.status, 200, role);
    assert.deepEqual(reply.body.map((p) => p.name).sort(), ["Asha Rao", "Ravi Menon"], role);
  }
  assert.equal(keycloak.finds, 0);
  assert.equal(await User.countDocuments({ isDeleted: true }), 0);
});

test("an admin's list syncs from Keycloak, and someone gone from a complete list is marked removed", async () => {
  await twoPeople();
  keycloak.users = [kcUser("kc-asha", "asha@example.test")];
  const reply = await call(getUsers, "Admin");
  assert.equal(reply.status, 200);
  assert.equal(keycloak.finds, 1);
  assert.equal((await User.findOne({ keycloakId: "kc-ravi" })).isDeleted, true);
});

test("when Keycloak has more people than it sent back, nobody is marked removed", async () => {
  await twoPeople();
  keycloak.users = [kcUser("kc-asha", "asha@example.test")];
  keycloak.total = 1500;
  await call(getUsers, "Superadmin");
  assert.equal((await User.findOne({ keycloakId: "kc-ravi" })).isDeleted, false);
});

test("the Keycloak list shows a phone only when its owner allows it", async () => {
  await User.create(userFields({ keycloakId: "kc-asha", email: "asha@example.test", privacySettings: { showPhone: false } }));
  await User.create(userFields({ keycloakId: "kc-ravi", email: "ravi@example.test" }));
  keycloak.users = [kcUser("kc-asha", "asha@example.test", { phone: ["+91 90000 00001"], workPhone: ["+91 80 1"] }), kcUser("kc-ravi", "ravi@example.test", { phone: ["+91 90000 00002"] })];
  const reply = await call(getKeycloakUsers, "Employee");
  assert.equal(reply.status, 200);
  const byEmail = Object.fromEntries(reply.body.map((p) => [p.email, p]));
  assert.deepEqual([byEmail["asha@example.test"].phone, byEmail["asha@example.test"].workPhone], ["", ""]);
  assert.equal(byEmail["ravi@example.test"].phone, "+91 90000 00002");
});

test("when Keycloak fails, the reply carries no internal error text", async () => {
  keycloak.findError = new Error("connect ECONNREFUSED 10.0.0.7:8443 (internal detail)");
  const reply = await quiet(() => call(getKeycloakUsers, "Employee"));
  assert.equal(reply.status, 500);
  assert.equal(JSON.stringify(reply.body).includes("internal detail"), false, JSON.stringify(reply.body));
});
