const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");

// Review 2026-10-26 M9 (owner's 1A): a role change was saved here first and sent to Keycloak after. When Keycloak
// failed, the reply said it failed, yet the role here had changed, and the next sign-in quietly put Keycloak's old
// role back. Now Keycloak goes first, as for a name change or a block; if anything later fails, every Keycloak change
// made for that save is put back, so the two never disagree.

const kc = { roles: ["Employee"], name: { firstName: "Asha", lastName: "Rao" }, failRoles: false, failName: false, roleCalls: 0 };
class FakeKcAdminClient {
  constructor() {
    this.users = {
      findOne: async () => ({ id: "kc-asha", username: "asha", email: "asha@example.test", emailVerified: true, enabled: true, attributes: {}, ...kc.name }),
      update: async (_where, rep) => {
        if (kc.failName && rep.firstName !== "Asha") throw new Error("Keycloak is down");
        kc.name = { firstName: rep.firstName, lastName: rep.lastName };
      },
      // with Keycloak "down" for roles, even reading them fails, so any role call at all shows
      listRealmRoleMappings: async () => {
        kc.roleCalls += 1;
        if (kc.failRoles) throw new Error("Keycloak is down");
        return kc.roles.map((name) => ({ id: `role-${name}`, name }));
      },
      addRealmRoleMappings: async ({ roles }) => {
        kc.roleCalls += 1;
        if (kc.failRoles) throw new Error("Keycloak is down");
        kc.roles = [...kc.roles, ...roles.map((r) => r.name)];
      },
      delRealmRoleMappings: async ({ roles }) => {
        kc.roleCalls += 1;
        if (kc.failRoles) throw new Error("Keycloak is down");
        kc.roles = kc.roles.filter((name) => !roles.some((r) => r.name === name));
      },
    };
    this.roles = { findOneByName: async ({ name }) => ({ id: `role-${name}`, name }), create: async () => {} };
  }
  async auth() {}
}
require("./helpers/fakeKeycloakAdmin").stubKeycloakAdminPackage(FakeKcAdminClient);

const User = require("../models/User");
const { updateUser } = require("../controllers/userController");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

before(connectTestDb);
beforeEach(async () => {
  await clearTestDb();
  Object.assign(kc, { roles: ["Employee"], name: { firstName: "Asha", lastName: "Rao" }, failRoles: false, failName: false, roleCalls: 0 });
});
after(disconnectTestDb);

const edit = async (id, body) => {
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
    await updateUser({ params: { id: String(id) }, body, user: { id: "6a1f00000000000000000001", role: "Superadmin", fullName: "Boss" } }, res);
  } finally {
    [console.log, console.error] = [log, error];
  }
  return reply;
};
const asha = () => User.create(userFields({ keycloakId: "kc-asha", authProvider: "keycloak", fullName: "Asha Rao", role: "Employee" }));

test("when Keycloak can't take the new role, nothing changes here either, and the reply says so", async () => {
  const person = await asha();
  kc.failRoles = true;
  const reply = await edit(person._id, { role: "Admin" });
  assert.equal(reply.status, 502);
  assert.match(reply.body.message, /nothing was changed/i);
  assert.equal((await User.findById(person._id)).role, "Employee");
});

test("a role change reaches Keycloak and the record", async () => {
  const person = await asha();
  const reply = await edit(person._id, { role: "Admin" });
  assert.equal(reply.status, 200);
  assert.equal((await User.findById(person._id)).role, "Admin");
  assert.deepEqual(kc.roles, ["admin"]);
});

test("if the record can't be saved after Keycloak took the role, Keycloak's role is put back", async () => {
  const person = await asha();
  const reply = await edit(person._id, { role: "Admin", stream: "not-a-stream" });
  assert.equal(reply.status, 400);
  assert.equal((await User.findById(person._id)).role, "Employee");
  assert.deepEqual(kc.roles, ["Employee"]);
});

test("if the role fails after the new name went to Keycloak, the name is put back too", async () => {
  const person = await asha();
  kc.failRoles = true;
  const reply = await edit(person._id, { role: "Admin", fullName: "Asha Menon" });
  assert.equal(reply.status, 502);
  assert.deepEqual(kc.name, { firstName: "Asha", lastName: "Rao" });
  assert.equal((await User.findById(person._id)).fullName, "Asha Rao");
});

test("an unchanged role (the company form sends the whole form) doesn't ask Keycloak, so other edits still work", async () => {
  const person = await asha();
  kc.failRoles = true;
  const reply = await edit(person._id, { role: "Employee", team: "Design" });
  assert.equal(reply.status, 200);
  assert.equal(kc.roleCalls, 0);
  assert.equal((await User.findById(person._id)).team, "Design");
});
