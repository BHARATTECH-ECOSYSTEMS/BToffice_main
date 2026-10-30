const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const User = require("../models/User");
const { getOrCreateUser } = require("../middlewares/keycloakAuth");
const { getDirectory } = require("../controllers/userController");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

before(connectTestDb);
beforeEach(clearTestDb);
after(disconnectTestDb);

/** The parts of a Keycloak access token getOrCreateUser reads. */
const token = ({ sub, email, role = "Employee", name = "Asha Rao" }) => ({
  sub,
  email,
  name,
  preferred_username: email.split("@")[0],
  // invites verify the email (review M13: only a verified email finds an older record)
  email_verified: true,
  realm_access: { roles: [role] },
});

const directoryEmails = async () => {
  let body;
  await getDirectory({ user: { role: "Admin" } }, { status: () => ({ json: () => {} }), json: (b) => (body = b) });
  return body.map((p) => p.email);
};

test("someone deleted and invited again gets their old record back, linked to their new login", async () => {
  const old = await User.create(
    userFields({ email: "asha.rao@example.test", keycloakId: "kc-old", stream: "hr", team: "People Ops", isDeleted: true, deletedAt: new Date("2026-09-01") })
  );

  const user = await getOrCreateUser(token({ sub: "kc-new", email: "asha.rao@example.test" }));

  assert.equal(String(user._id), String(old._id));
  const saved = await User.findById(old._id);
  assert.equal(saved.isDeleted, false);
  assert.equal(saved.deletedAt, null);
  assert.equal(saved.keycloakId, "kc-new");
  // the same person keeps their employee ID and details
  assert.equal(saved.employeeId, "BT-0001");
  assert.equal(saved.stream, "hr");
  assert.equal(saved.team, "People Ops");
  assert.equal(await User.countDocuments(), 1);
});

test("once restored, they are back in the directory", async () => {
  await User.create(userFields({ email: "asha.rao@example.test", keycloakId: "kc-old", isDeleted: true, deletedAt: new Date() }));
  assert.deepEqual(await directoryEmails(), []);

  await getOrCreateUser(token({ sub: "kc-new", email: "asha.rao@example.test" }));

  assert.deepEqual(await directoryEmails(), ["asha.rao@example.test"]);
});

test("a record found by email but linked to an older login is relinked to the current one", async () => {
  const record = await User.create(userFields({ email: "kabir@example.test", keycloakId: "kc-before" }));

  await getOrCreateUser(token({ sub: "kc-after", email: "kabir@example.test" }));

  assert.equal((await User.findById(record._id)).keycloakId, "kc-after");
});

test("someone already linked is found as before and left as they are", async () => {
  const record = await User.create(userFields({ email: "meera@example.test", keycloakId: "kc-1", team: "Field Ops" }));

  const user = await getOrCreateUser(token({ sub: "kc-1", email: "meera@example.test" }));

  assert.equal(String(user._id), String(record._id));
  const saved = await User.findById(record._id);
  assert.equal(saved.keycloakId, "kc-1");
  assert.equal(saved.team, "Field Ops");
  assert.equal(saved.isDeleted, false);
});

test("a brand-new person still gets a new record with the next employee ID", async () => {
  await User.create(userFields());

  const user = await getOrCreateUser(token({ sub: "kc-fresh", email: "new.joiner@example.test", role: "Intern" }));

  assert.equal(user.employeeId, "BT-0002");
  assert.equal(user.role, "Intern");
  assert.equal(await User.countDocuments(), 2);
});
