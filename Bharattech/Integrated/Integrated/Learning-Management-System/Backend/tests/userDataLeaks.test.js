const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const User = require("../models/User");
const {
  getUserById,
  getCurrentUser,
  updateUser,
  createUser,
  publicUser,
  stripSensitive,
  pickEditableFields,
  canCreateRole,
} = require("../controllers/userController");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

before(connectTestDb);
beforeEach(clearTestDb);
after(disconnectTestDb);

// a response object the handlers can write to, so a controller can be called without the router/auth in front of it
const mockRes = () => {
  const r = { statusCode: 200, body: undefined };
  r.status = (c) => ((r.statusCode = c), r);
  r.json = (b) => ((r.body = b), r);
  return r;
};

const SECRETS = ["password", "tokens", "keycloakId", "resetToken", "__v"];
const leaks = (obj) => SECRETS.filter((k) => obj && Object.prototype.hasOwnProperty.call(obj, k));

const withSecrets = (overrides = {}) =>
  userFields({
    authProvider: "local",
    password: "$2b$10$abcdefghijklmnopqrstuv",
    tokens: [{ token: "a-real-access-token" }],
    phone: "+91 90000 00000",
    stream: "tech",
    team: "Platform",
    ...overrides,
  });

// --- the serializer (unit) ---

test("publicUser keeps the fields colleagues may see and never the secret ones", () => {
  const out = publicUser({ _id: "6a1f00000000000000000001", fullName: "Asha Rao", email: "asha@x.test", role: "Employee", phone: "+91 1", stream: "tech", team: "Platform", password: "x", tokens: [{ token: "t" }], keycloakId: "kc", resetToken: "r" });
  assert.deepEqual(leaks(out), []);
  assert.equal(out.name, "Asha Rao");
  assert.equal(out.email, "asha@x.test");
  assert.equal(out.role, "Employee");
  assert.equal(out.stream, "tech");
  assert.equal(out.status, "active");
});

test("publicUser hides a phone when the person turned phone sharing off", () => {
  const shown = publicUser({ _id: "1", phone: "+91 5", privacySettings: { showPhone: true } });
  const hidden = publicUser({ _id: "1", phone: "+91 5", privacySettings: { showPhone: false } });
  assert.equal(shown.phone, "+91 5");
  assert.ok(!hidden.phone);
});

test("stripSensitive (used for your own /me) drops secrets but keeps your profile, including isBanned", () => {
  const out = stripSensitive({ toObject: () => ({ fullName: "Me", email: "me@x.test", role: "Admin", stream: "hr", isBanned: false, password: "x", tokens: [{ token: "t" }], keycloakId: "kc", __v: 0 }) });
  assert.deepEqual(leaks(out), []);
  assert.equal(out.fullName, "Me");
  assert.equal(out.stream, "hr");
  assert.equal(out.isBanned, false);
});

// --- the edit allow-list (unit) ---

test("pickEditableFields keeps editable profile fields and drops the dangerous ones", () => {
  const out = pickEditableFields({
    fullName: "New Name", stream: "finance", team: "Ops", role: "Admin", phone: "+91 2", privacySettings: { showEmail: false },
    password: "hack", tokens: [{ token: "forged" }], keycloakId: "other", isDeleted: true, _id: "elsewhere", employeeId: "BT-9999", authProvider: "local", accessLevel: "Full Admin",
  });
  assert.deepEqual(Object.keys(out).sort(), ["fullName", "phone", "privacySettings", "role", "stream", "team"]);
});

test("pickEditableFields keeps isBanned, so an admin can still block an account through the edit route", () => {
  assert.deepEqual(pickEditableFields({ isBanned: true }), { isBanned: true });
});

// --- who an admin may create (unit) ---

test("an Admin can't create an Admin or Superadmin; a Superadmin can create any role", () => {
  assert.equal(canCreateRole("Admin", "Employee"), true);
  assert.equal(canCreateRole("Admin", "Subadmin"), true);
  assert.equal(canCreateRole("Admin", "Admin"), false);
  assert.equal(canCreateRole("Admin", "Superadmin"), false);
  assert.equal(canCreateRole("Superadmin", "Admin"), true);
  assert.equal(canCreateRole("Subadmin", "Employee"), false);
});

// --- the handlers, called directly (DB, no Keycloak needed for local accounts) ---

test("GET a colleague by id returns their safe details, not their password or tokens", async () => {
  const user = await User.create(withSecrets({ fullName: "Asha Rao" }));
  const res = mockRes();
  await getUserById({ params: { id: String(user._id) }, user: { id: "x", role: "Employee" } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(leaks(res.body), []);
  assert.equal(res.body.name, "Asha Rao");
});

test("GET /me returns your own profile without the password or tokens", async () => {
  const user = await User.create(withSecrets({ email: "me@example.test" }));
  const res = mockRes();
  await getCurrentUser({ user: { keycloakId: user.keycloakId, email: user.email } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(leaks(res.body), []);
  assert.equal(res.body.email, "me@example.test");
});

test("the edit route ignores forbidden fields in the body and never echoes secrets", async () => {
  const user = await User.create(withSecrets({ fullName: "Before" }));
  const res = mockRes();
  await updateUser(
    { params: { id: String(user._id) }, user: { role: "Admin" }, body: { fullName: "After", password: "hacked", tokens: [{ token: "forged" }], keycloakId: "other", isDeleted: true } },
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.deepEqual(leaks(res.body), []);
  const saved = await User.findById(user._id).select("+password");
  assert.equal(saved.fullName, "After");
  assert.notEqual(saved.password, "hacked");
  assert.equal(saved.tokens.length, 1);
  assert.equal(saved.tokens[0].token, "a-real-access-token");
  assert.equal(saved.isDeleted, false);
  assert.equal(String(saved.keycloakId), String(user.keycloakId));
});

// add-user (a database-only account nobody could sign in with) was removed in step 17 Part 2; adding a person goes
// through the invite (tests/accountLifecycle.test.js, tests/pendingInvites.test.js).
test("add-user is gone", () => {
  assert.equal(createUser, undefined);
});
