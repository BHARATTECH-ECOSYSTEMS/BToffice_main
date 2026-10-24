const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");

// Step 17 Part 2 (account lifecycle), owner's 1A, 4A, 5A and 7A: the routes that could only make accounts nobody can
// sign in with are gone, a work email or username isn't edited in the database alone, saving your phones sends Keycloak
// the rest of your account back so nothing is wiped, and accounts no longer default to accessLevel "Full Admin".

// A stand-in Keycloak admin client, in place before userController loads it.
const keycloak = { account: null, updates: [] };
class FakeKcAdminClient {
  constructor() {
    this.users = {
      findOne: async () => keycloak.account,
      update: async (where, rep) => keycloak.updates.push({ where, rep }),
    };
  }
  async auth() {}
}
require.cache[require.resolve("keycloak-admin")] = { id: "keycloak-admin", loaded: true, exports: { default: FakeKcAdminClient } };

const User = require("../models/User");
const userController = require("../controllers/userController");
const adminController = require("../controllers/adminController");
const userRoutes = require("../routes/userRoutes");
const adminRoutes = require("../routes/adminRoutes");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

before(connectTestDb);
beforeEach(async () => {
  await clearTestDb();
  keycloak.account = null;
  keycloak.updates = [];
});
after(disconnectTestDb);

const reply = () => {
  const r = { status: 200, body: undefined };
  r.res = {
    status(code) {
      r.status = code;
      return r.res;
    },
    json(value) {
      r.body = value;
      return r.res;
    },
  };
  return r;
};
const routesOf = (router) => router.stack.filter((l) => l.route).map((l) => `${Object.keys(l.route.methods)[0].toUpperCase()} ${l.route.path}`);

test("the routes that made accounts nobody could sign in with are gone", () => {
  assert.equal(routesOf(userRoutes).includes("POST /add-user"), false);
  assert.equal(routesOf(adminRoutes).some((r) => r.includes("signup-requests")), false);
  assert.equal("createUser" in userController, false);
  for (const name of ["getSignupRequests", "approveSignupRequest"]) assert.equal(name in adminController, false, name);
  // the company dashboard's "Add user" stays
  assert.ok(routesOf(adminRoutes).includes("POST /users"));
});

test("a work email or username can't be changed through the edit route", () => {
  assert.deepEqual(userController.pickEditableFields({ email: "new@example.test", username: "newname", team: "Ops" }), { team: "Ops" });
});

test("saving your phones sends Keycloak the rest of your account back, so nothing is wiped", async () => {
  const me = await User.create(userFields({ keycloakId: "kc-asha", authProvider: "keycloak", fullName: "Asha Rao" }));
  keycloak.account = { id: "kc-asha", username: "asha", email: "asha@example.test", emailVerified: true, enabled: true, firstName: "Asha", lastName: "Rao", attributes: { team: ["Ops"] } };
  const r = reply();
  await userController.updateCurrentUser({ user: { keycloakId: me.keycloakId }, body: { phone: "+91 90000 00001", workPhone: "" } }, r.res);
  assert.equal(r.status, 200);
  const [{ rep }] = keycloak.updates;
  assert.deepEqual(
    { username: rep.username, email: rep.email, emailVerified: rep.emailVerified, enabled: rep.enabled, firstName: rep.firstName, lastName: rep.lastName },
    { username: "asha", email: "asha@example.test", emailVerified: true, enabled: true, firstName: "Asha", lastName: "Rao" },
  );
  assert.deepEqual(rep.attributes, { team: ["Ops"], phone: ["+91 90000 00001"], workPhone: [""] });
});

test("a new account has no accessLevel unless one is given", async () => {
  const user = await User.create(userFields({ role: "Employee" }));
  assert.equal(user.accessLevel, undefined);
});
