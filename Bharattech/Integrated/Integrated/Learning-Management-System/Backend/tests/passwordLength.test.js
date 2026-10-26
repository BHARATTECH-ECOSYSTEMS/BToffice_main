const { test, before, beforeEach, afterEach, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// Review 2026-10-26 M11 (owner's 6A): only "Forgot password" checked a new password's length (8 to 128). Finishing an
// invite and Change password passed any length to Keycloak, whose realm may have no rule at all. Now all three check
// the same rule, with the same words, before Keycloak is asked anything.

const { installFakeKeycloakAdmin } = require("./helpers/fakeKeycloakAdmin");
const realm = installFakeKeycloakAdmin();
const { fakeTokenEndpoint, restore } = require("./helpers/fakeTokenEndpoint");

const { acceptInvite, keycloakChangePassword, PASSWORD_MIN, PASSWORD_MAX } = require("../controllers/authController");
const { connectTestDb, clearTestDb, disconnectTestDb } = require("./helpers/testDb");

before(connectTestDb);
beforeEach(async () => {
  await clearTestDb();
  Object.assign(realm, { accounts: [], passwords: new Map(), calls: [], next: 1 });
  realm.accounts.push({ id: "kc-1", username: "asha", email: "asha@example.test", enabled: true, requiredActions: ["UPDATE_PASSWORD"], realmRoles: ["Employee"] });
});
afterEach(restore);
after(disconnectTestDb);

const call = async (handler, req) => {
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
  const [log, error, warn] = [console.log, console.error, console.warn];
  console.log = console.error = console.warn = () => {};
  try {
    await handler(req, res);
  } finally {
    [console.log, console.error, console.warn] = [log, error, warn];
  }
  return reply;
};
const accept = (newPassword) =>
  call(acceptInvite, { body: { username: "asha", temporaryPassword: "Temp-Pass-1", newPassword, newUsername: "asha.rao" } });
const change = (newPassword) =>
  call(keycloakChangePassword, { body: { currentPassword: "Current-Pass-1", newPassword }, user: { keycloakId: "kc-1", email: "asha@example.test", decoded: { preferred_username: "asha" } } });

const WORDS = `Choose a password of 8 to 128 characters.`;
const SHORT = "Abc-123";
const LONG = "A".repeat(129);

test("the rule is 8 to 128 characters", () => {
  assert.equal(PASSWORD_MIN, 8);
  assert.equal(PASSWORD_MAX, 128);
});

for (const [name, run] of [["finishing an invite", accept], ["Change password", change]]) {
  test(`${name}: too short or too long is refused with the rule's words, and Keycloak isn't asked`, async () => {
    const asked = fakeTokenEndpoint("ok");
    for (const pw of [SHORT, LONG]) {
      const reply = await run(pw);
      assert.equal(reply.status, 400, `${pw.length} characters`);
      assert.equal(reply.body.message, WORDS);
    }
    assert.deepEqual(asked, []);
    assert.deepEqual(realm.calls.filter(([what]) => what !== "find"), []);
  });

  test(`${name}: exactly 8 and exactly 128 characters are fine`, async () => {
    for (const pw of ["Abcd-123", "B".repeat(128)]) {
      fakeTokenEndpoint(name === "finishing an invite" ? "set up" : "ok", "ok");
      realm.accounts[0].requiredActions = ["UPDATE_PASSWORD"];
      realm.accounts[0].username = "asha";
      const reply = await run(pw);
      assert.equal(reply.status, 200, `${pw.length} characters: ${JSON.stringify(reply.body)}`);
    }
  });
}

test("Forgot password's reset uses the same rule, not its own copy", () => {
  const reset = fs.readFileSync(path.join(__dirname, "..", "controllers", "passwordResetController.js"), "utf8");
  assert.match(reset, /passwordLengthProblem/);
  assert.doesNotMatch(reset, /const PASSWORD_MIN = /);
});
