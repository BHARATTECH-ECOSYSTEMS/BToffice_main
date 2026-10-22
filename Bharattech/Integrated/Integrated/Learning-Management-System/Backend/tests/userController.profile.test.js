const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const User = require("../models/User");
const { updateUser, getCurrentUser } = require("../controllers/userController");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

before(connectTestDb);
beforeEach(clearTestDb);
after(disconnectTestDb);

/** Calls a controller the way Express would and returns the status and JSON it answered with. */
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

const asAdmin = { role: "Admin" };

test("an admin can set a person's stream and team", async () => {
  const person = await User.create(userFields());

  const { status } = await call(updateUser, { params: { id: String(person._id) }, body: { stream: "hr", team: "People Ops" }, user: asAdmin });

  assert.equal(status, 200);
  const saved = await User.findById(person._id);
  assert.equal(saved.stream, "hr");
  assert.equal(saved.team, "People Ops");
});

test("an edit can't change someone's employee ID, and the rest of the edit still applies", async () => {
  const person = await User.create(userFields());

  const { status } = await call(updateUser, { params: { id: String(person._id) }, body: { employeeId: "BT-9999", team: "Platform" }, user: asAdmin });

  assert.equal(status, 200);
  const saved = await User.findById(person._id);
  assert.equal(saved.employeeId, "BT-0001");
  assert.equal(saved.team, "Platform");
});

test("an edit with a stream that doesn't exist is refused as bad input and changes nothing", async () => {
  const person = await User.create(userFields({ stream: "tech" }));

  const { status, body } = await call(updateUser, { params: { id: String(person._id) }, body: { stream: "sales" }, user: asAdmin });

  assert.equal(status, 400);
  assert.match(body.message, /stream/);
  assert.equal((await User.findById(person._id)).stream, "tech");
});

test("your own profile includes your employee ID, stream and team", async () => {
  // a local account, so the controller doesn't ask Keycloak for phone numbers
  const person = await User.create(userFields({ authProvider: "local", password: "unused-hash", stream: "finance", team: "Payroll" }));

  const { status, body } = await call(getCurrentUser, { user: { keycloakId: person.keycloakId, email: person.email } });

  assert.equal(status, 200);
  assert.equal(body.employeeId, "BT-0001");
  assert.equal(body.stream, "finance");
  assert.equal(body.team, "Payroll");
});
