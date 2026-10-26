const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const User = require("../models/User");
const { getDirectory, getUserById } = require("../controllers/userController");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

before(connectTestDb);
beforeEach(clearTestDb);
after(disconnectTestDb);

const call = async (controller, req) => {
  const res = {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  await controller(req, res);
  return { status: res.statusCode, body: res.body };
};

const asEmployee = { user: { role: "Employee" } };

test("the directory lists everyone with only the details a colleague may see", async () => {
  const person = await User.create(
    userFields({
      fullName: "Asha Rao",
      email: "asha.rao@example.test",
      role: "Subadmin",
      stream: "hr",
      team: "People Ops",
      joinedOn: "2024-03-01",
      phone: "+91 98765 00001",
      workPhone: "+91 80 4000 0001",
      password: "a-bcrypt-hash",
      tokens: [{ token: "a-session-token" }],
    })
  );

  const { status, body } = await call(getDirectory, asEmployee);

  assert.equal(status, 200);
  assert.deepEqual(body, [
    {
      id: String(person._id),
      employeeId: "BT-0001",
      name: "Asha Rao",
      email: "asha.rao@example.test",
      role: "Subadmin",
      phone: "+91 98765 00001",
      workPhone: "+91 80 4000 0001",
      stream: "hr",
      team: "People Ops",
      joinedOn: "2024-03-01",
      status: "active",
    },
  ]);
});

test("passwords, sessions and Keycloak IDs never leave the backend", async () => {
  await User.create(userFields({ password: "a-bcrypt-hash", tokens: [{ token: "a-session-token" }] }));

  const { body } = await call(getDirectory, asEmployee);
  const sent = JSON.stringify(body);

  for (const secret of ["a-bcrypt-hash", "a-session-token", "kc-test-", "password", "tokens", "keycloakId"]) {
    assert.ok(!sent.includes(secret), `${secret} was sent`);
  }
});

test("deleted people are left out, and the list is in name order", async () => {
  await User.create(userFields({ fullName: "Zoya Khan" }));
  await User.create(userFields({ fullName: "Arjun Mehta" }));
  await User.create(userFields({ fullName: "Gone Person", isDeleted: true, deletedAt: new Date() }));

  const { body } = await call(getDirectory, asEmployee);

  assert.deepEqual(body.map((p) => p.name), ["Arjun Mehta", "Zoya Khan"]);
});

test("someone who hides their phone shows no phone numbers", async () => {
  await User.create(userFields({ phone: "+91 98765 00002", workPhone: "+91 80 4000 0002", privacySettings: { showPhone: false } }));

  const [person] = (await call(getDirectory, asEmployee)).body;

  assert.equal(person.phone, undefined);
  assert.equal(person.workPhone, undefined);
});

test("a phone only kept in Keycloak's phoneNumber still shows", async () => {
  await User.create(userFields({ phoneNumber: "+91 90000 00003" }));
  assert.equal((await call(getDirectory, asEmployee)).body[0].phone, "+91 90000 00003");
});

test("a banned account is listed as inactive", async () => {
  await User.create(userFields({ isBanned: true }));
  assert.equal((await call(getDirectory, asEmployee)).body[0].status, "inactive");
});

test("a person with no name yet is listed by username", async () => {
  await User.create(userFields({ fullName: "", username: "new.joiner" }));
  assert.equal((await call(getDirectory, asEmployee)).body[0].name, "new.joiner");
});

// 2026-10-26, owner's 1-1A: Super Admins and Admins manage accounts, so they still see numbers someone hid from
// colleagues, marked as hidden (1-2A); sub admins, employees and interns don't.
test("Super Admins and Admins still see a hidden phone, marked as hidden; nobody else sees it", async () => {
  await User.create(userFields({ phone: "+91 98765 00002", workPhone: "+91 80 4000 0002", privacySettings: { showPhone: false } }));
  for (const role of ["Superadmin", "Admin", "super-admin"]) {
    const [person] = (await call(getDirectory, { user: { role } })).body;
    assert.deepEqual([person.phone, person.workPhone, person.phoneHidden], ["+91 98765 00002", "+91 80 4000 0002", true], role);
  }
  for (const role of ["Subadmin", "Employee", "Intern", undefined]) {
    const [person] = (await call(getDirectory, { user: { role } })).body;
    assert.deepEqual([person.phone, person.workPhone, person.phoneHidden], [undefined, undefined, undefined], String(role));
  }
});

test("a phone that isn't hidden carries no hidden mark, for admins either", async () => {
  await User.create(userFields({ phone: "+91 98765 00004" }));
  const [person] = (await call(getDirectory, { user: { role: "Admin" } })).body;
  assert.equal(person.phone, "+91 98765 00004");
  assert.equal("phoneHidden" in person, false);
});

test("one person's record follows the same rule", async () => {
  const hidden = await User.create(userFields({ phone: "+91 98765 00005", privacySettings: { showPhone: false } }));
  const one = async (role) => (await call(getUserById, { user: { role }, params: { id: String(hidden._id) } })).body;
  assert.deepEqual([(await one("Admin")).phone, (await one("Admin")).phoneHidden], ["+91 98765 00005", true]);
  assert.deepEqual([(await one("Subadmin")).phone, (await one("Subadmin")).phoneHidden], ["", undefined]);
});
