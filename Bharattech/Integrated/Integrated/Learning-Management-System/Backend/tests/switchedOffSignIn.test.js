const { test, before, beforeEach, afterEach, after } = require("node:test");
const assert = require("node:assert/strict");

// Review 2026-10-26 M8 (owner's 5A): someone blocked (or who left) typing their right password was told "details don't
// match", so they kept retrying into the lockout. Keycloak says "Account disabled" only when the password is right (a
// wrong one, or an unknown name, gets "Invalid user credentials": checked on the laptop's Keycloak), so saying the
// sign-in is switched off tells nothing to someone guessing.

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

test("the right password on a switched-off account says the sign-in is switched off", async () => {
  fakeTokenEndpoint("disabled");
  const reply = await signIn();
  assert.equal(reply.status, 403);
  assert.equal(reply.body.code, "switched-off");
  assert.equal(reply.body.message, "Your sign-in is switched off. Ask an admin if you think this is a mistake.");
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
