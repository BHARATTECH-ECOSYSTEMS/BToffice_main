const { test, before, beforeEach, after, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const User = require("../models/User");
const { keycloakLogin } = require("../controllers/authController");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

before(connectTestDb);
beforeEach(clearTestDb);
after(disconnectTestDb);

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
});

const PASSWORD = "Correct-Horse-7";

/**
 * Stands in for Keycloak's token endpoint: it knows one login (email + PASSWORD) and records every username it
 * was asked about, so the tests can see what the backend actually sent.
 */
const fakeKeycloak = (knownEmail) => {
  const asked = [];
  global.fetch = async (_url, init) => {
    const form = new URLSearchParams(init.body);
    asked.push(form.get("username"));
    if (form.get("username") !== knownEmail || form.get("password") !== PASSWORD) {
      return { ok: false, json: async () => ({ error: "invalid_grant", error_description: "Invalid user credentials" }) };
    }
    const payload = Buffer.from(
      JSON.stringify({ sub: "kc-asha", email: knownEmail, given_name: "Asha", family_name: "Rao", realm_access: { roles: ["Employee"] } })
    ).toString("base64url");
    return { ok: true, json: async () => ({ access_token: `h.${payload}.s`, refresh_token: "r", id_token: "i" }) };
  };
  return asked;
};

const signIn = async (username, password = PASSWORD) => {
  const reply = { status: 200, body: undefined };
  const res = {
    status(code) {
      reply.status = code;
      return res;
    },
    json(body) {
      reply.body = body;
      return res;
    },
  };
  await keycloakLogin({ body: { username, password } }, res);
  return reply;
};

const asha = () => User.create(userFields({ email: "asha.rao@example.test", keycloakId: "kc-asha" }));

test("an Employee ID signs in as the person it belongs to", async () => {
  const person = await asha();
  const asked = fakeKeycloak("asha.rao@example.test");

  const reply = await signIn(person.employeeId);

  assert.equal(person.employeeId, "BT-0001");
  assert.equal(reply.status, 200);
  assert.equal(reply.body.success, true);
  assert.equal(reply.body.user.email, "asha.rao@example.test");
  assert.deepEqual(asked, ["asha.rao@example.test"]);
});

test("the ID works in lower case, without the dash, and with spaces around it", async () => {
  await asha();
  const asked = fakeKeycloak("asha.rao@example.test");

  for (const typed of ["bt-0001", "BT0001", "bt0001", "  BT-0001 "]) {
    assert.equal((await signIn(typed)).status, 200, typed);
  }
  assert.deepEqual(asked, Array(4).fill("asha.rao@example.test"));
});

test("an ID with a wrong password gets the usual wrong-password reply", async () => {
  await asha();
  fakeKeycloak("asha.rao@example.test");

  const reply = await signIn("BT-0001", "not-it");

  assert.equal(reply.status, 401);
  assert.deepEqual(reply.body, { message: "Invalid username or password" });
});

test("an ID nobody has gets exactly the wrong-password reply, after Keycloak is still asked", async () => {
  await asha();
  const asked = fakeKeycloak("asha.rao@example.test");

  const unknown = await signIn("BT-0099");
  const wrongPassword = await signIn("BT-0001", "not-it");

  assert.equal(unknown.status, wrongPassword.status);
  assert.deepEqual(unknown.body, wrongPassword.body);
  // asking Keycloak either way keeps the reply time the same, so timing doesn't reveal which IDs exist
  assert.equal(asked.length, 2);
  assert.equal(asked[0], "BT-0099");
});

test("a deleted person's ID no longer signs in", async () => {
  await User.create(userFields({ email: "asha.rao@example.test", keycloakId: "kc-asha", isDeleted: true, deletedAt: new Date() }));
  const asked = fakeKeycloak("asha.rao@example.test");

  const reply = await signIn("BT-0001");

  assert.equal(reply.status, 401);
  assert.deepEqual(asked, ["BT-0001"]);
});

test("signing in with an email is unchanged", async () => {
  await asha();
  const asked = fakeKeycloak("asha.rao@example.test");

  const reply = await signIn("asha.rao@example.test");

  assert.equal(reply.status, 200);
  assert.deepEqual(asked, ["asha.rao@example.test"]);
});
