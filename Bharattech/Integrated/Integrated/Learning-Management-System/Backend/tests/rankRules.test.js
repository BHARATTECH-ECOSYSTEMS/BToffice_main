const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

// Review 2026-10-26, tests area: who may change someone's role, block them or remove them, through the real
// /api/user routes. Only admins get past requireAdmin; an Admin only manages those below; nobody blocks or removes a
// Super Admin, and only a Super Admin makes one. A refusal changes nothing, here or in Keycloak.

const keycloak = { calls: [] };
class FakeKcAdminClient {
  constructor() {
    const note = (name) => async (...args) => {
      keycloak.calls.push(name);
      return name === "listRealmRoleMappings" ? [{ id: "role-Employee", name: "Employee" }] : args[0];
    };
    this.users = {
      findOne: note("findOne"),
      update: note("update"),
      del: note("del"),
      listRealmRoleMappings: note("listRealmRoleMappings"),
      addRealmRoleMappings: note("addRealmRoleMappings"),
      delRealmRoleMappings: note("delRealmRoleMappings"),
    };
    this.roles = { findOneByName: async ({ name }) => ({ id: `role-${name}`, name }), create: async () => {} };
  }
  async auth() {}
}
require("./helpers/fakeKeycloakAdmin").stubKeycloakAdminPackage(FakeKcAdminClient);

const User = require("../models/User");
const userRoutes = require("../routes/userRoutes");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

let server;
let base;

// The real router behind a stand-in for keycloakAuth (server.js puts the real one in front of /api/user).
before(async () => {
  await connectTestDb();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = JSON.parse(req.get("x-test-user"));
    next();
  });
  app.use("/api/user", userRoutes);
  await new Promise((resolve) => (server = app.listen(0, "127.0.0.1", resolve)));
  base = `http://127.0.0.1:${server.address().port}/api/user`;
});
beforeEach(async () => {
  await clearTestDb();
  keycloak.calls = [];
});
after(async () => {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  await disconnectTestDb();
});

const send = async (who, method, id, body) => {
  const res = await fetch(`${base}/${id}`, {
    method,
    headers: { "Content-Type": "application/json", "x-test-user": JSON.stringify({ id: String(who._id), role: who.role, fullName: who.fullName }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.status;
};
const people = async () => ({
  boss: await User.create(userFields({ role: "Superadmin", fullName: "Test Boss" })),
  boss2: await User.create(userFields({ role: "Superadmin", fullName: "Other Boss" })),
  admin: await User.create(userFields({ role: "Admin", fullName: "Test Admin" })),
  admin2: await User.create(userFields({ role: "Admin", fullName: "Other Admin" })),
  subadmin: await User.create(userFields({ role: "Subadmin", fullName: "Test Subadmin" })),
  asha: await User.create(userFields({ role: "Employee", fullName: "Asha Rao" })),
  intern: await User.create(userFields({ role: "Intern", fullName: "Test Intern" })),
});
const stored = async (person) => {
  const { role, isBanned, isDeleted } = await User.findById(person._id).lean();
  return { role, isBanned: Boolean(isBanned), isDeleted: Boolean(isDeleted) };
};
const untouched = (role) => ({ role, isBanned: false, isDeleted: false });

test("an Admin still changes and removes those below (the routes work, so the refusals below mean something)", async () => {
  const p = await people();
  assert.equal(await send(p.admin, "PUT", p.asha._id, { role: "Subadmin" }), 200);
  assert.equal((await stored(p.asha)).role, "Subadmin");
  assert.equal(await send(p.admin, "PATCH", p.intern._id, { isBanned: true }), 200);
  assert.equal((await stored(p.intern)).isBanned, true);
  assert.equal(await send(p.admin, "DELETE", p.asha._id), 200);
  assert.equal((await stored(p.asha)).isDeleted, true);
  assert.ok(keycloak.calls.includes("del"), "the removal reached Keycloak");
});

test("only admins get through: sub admins, employees and interns can't change or remove anyone", async () => {
  const p = await people();
  for (const who of [p.subadmin, p.asha, p.intern]) {
    assert.equal(await send(who, "PUT", p.intern._id, { role: "Admin" }), 403, who.role);
    assert.equal(await send(who, "PATCH", p.intern._id, { isBanned: true }), 403, who.role);
    assert.equal(await send(who, "DELETE", p.intern._id), 403, who.role);
  }
  assert.deepEqual(await stored(p.intern), untouched("Intern"));
  assert.deepEqual(keycloak.calls, []);
});

// the rank rules above would refuse them too, so a request alone can't tell when this first guard goes missing
test("the edit and remove routes keep requireAdmin in front of the rank rules", () => {
  const { requireAdmin } = require("../middlewares/keycloakAuth");
  const guarded = userRoutes.stack
    .filter((layer) => layer.route?.path === "/:id" && !layer.route.methods.get)
    .map((layer) => [Object.keys(layer.route.methods)[0], layer.route.stack[0].handle === requireAdmin]);
  assert.deepEqual(guarded.sort(), [["delete", true], ["patch", true], ["put", true]]);
});

test("an Admin can't change, block or remove a Super Admin", async () => {
  const p = await people();
  assert.equal(await send(p.admin, "PUT", p.boss._id, { role: "Employee" }), 403);
  assert.equal(await send(p.admin, "PATCH", p.boss._id, { isBanned: true }), 403);
  assert.equal(await send(p.admin, "DELETE", p.boss._id), 403);
  assert.deepEqual(await stored(p.boss), untouched("Superadmin"));
  assert.deepEqual(keycloak.calls, []);
});

test("an Admin can't make anyone a Super Admin, nor change or remove another Admin", async () => {
  const p = await people();
  assert.equal(await send(p.admin, "PUT", p.asha._id, { role: "Superadmin" }), 403);
  assert.equal(await send(p.admin, "PATCH", p.asha._id, { role: "Admin" }), 403);
  assert.equal(await send(p.admin, "PUT", p.admin2._id, { role: "Employee" }), 403);
  assert.equal(await send(p.admin, "DELETE", p.admin2._id), 403);
  assert.deepEqual(await stored(p.asha), untouched("Employee"));
  assert.deepEqual(await stored(p.admin2), untouched("Admin"));
  assert.deepEqual(keycloak.calls, []);
});

test("a Super Admin can't be blocked or removed, even by another Super Admin", async () => {
  const p = await people();
  assert.equal(await send(p.boss2, "PATCH", p.boss._id, { isBanned: true }), 403);
  assert.equal(await send(p.boss2, "DELETE", p.boss._id), 403);
  assert.deepEqual(await stored(p.boss), untouched("Superadmin"));
  assert.deepEqual(keycloak.calls, []);
});
