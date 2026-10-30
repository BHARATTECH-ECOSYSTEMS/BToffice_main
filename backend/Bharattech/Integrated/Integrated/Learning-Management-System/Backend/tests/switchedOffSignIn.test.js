const { test, before, beforeEach, afterEach, after } = require("node:test");
const assert = require("node:assert/strict");

// Review 2026-10-26 M8 (owner's 5A) told a switched-off account so, trusting Keycloak to say "Account disabled" only for
// a right password. Security report 2026-10-28 lead 3 (owner's F3A): Keycloak 24.0.5, the company's, says it for a WRONG
// password too (checked on the laptop's Docker Keycloak 24.0.5), so anyone could find who is blocked or has left. Sign-in
// now gives a switched-off account the same answer as a wrong password.

const { installFakeKeycloakAdmin } = require("./helpers/fakeKeycloakAdmin");
const realm = installFakeKeycloakAdmin();
const { fakeTokenEndpoint, restore } = require("./helpers/fakeTokenEndpoint");

const { keycloakLogin } = require("../controllers/authController");
const { connectTestDb, clearTestDb, disconnectTestDb } = require("./helpers/testDb");

before(connectTestDb);
beforeEach(async () => {
  await clearTestDb();
  Object.assign(realm, { accounts: [], passwords: new Map(), calls: [], next: 1 });
});
afterEach(restore);
after(disconnectTestDb);

const signIn = async (password = "Right-Pass-1") => {
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
  const [log, warn] = [console.log, console.warn];
  console.log = console.warn = () => {};
  try {
    await keycloakLogin({ body: { username: "asha", password } }, res);
  } finally {
    [console.log, console.warn] = [log, warn];
  }
  return reply;
};

test("a switched-off account gets the same answer as a wrong password, whatever password was typed", async () => {
  fakeTokenEndpoint("wrong");
  const wrong = await signIn("not-it");
  fakeTokenEndpoint("disabled");
  const switchedOff = await signIn();

  assert.equal(switchedOff.status, 401);
  assert.deepEqual(switchedOff.body, wrong.body);
});

test("a wrong password still gets the usual answer", async () => {
  fakeTokenEndpoint("wrong");
  const reply = await signIn("not-it");
  assert.equal(reply.status, 401);
  assert.equal(reply.body.code, undefined);
});

test("only Keycloak's exact words count: a temporary lockout isn't taken for a switched-off account", async () => {
  global.fetch = async () => ({ ok: false, json: async () => ({ error: "invalid_grant", error_description: "Account temporarily disabled" }) });
  const reply = await signIn();
  assert.notEqual(reply.body.code, "switched-off");
});
