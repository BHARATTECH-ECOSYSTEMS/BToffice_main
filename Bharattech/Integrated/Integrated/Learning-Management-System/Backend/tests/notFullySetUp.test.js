const { test, before, beforeEach, after, afterEach } = require("node:test");
const assert = require("node:assert/strict");

// Step 17 Part 2 (owner's 6A): Keycloak answers "Account is not fully set up" for any unfinished step on an account
// (a new password to choose, but also a missing last name or an email to verify). Only the first is the invite's
// "Set up your account"; anything else is an admin's to finish, so sign-in says that and logs which step it is.

const keycloak = { accounts: [], finds: [] };
class FakeKcAdminClient {
  constructor() {
    this.users = {
      find: async (query) => {
        keycloak.finds.push(query);
        return keycloak.accounts.filter((a) => (query.username ? a.username === query.username : a.email === query.email));
      },
    };
  }
  async auth() {}
}
require.cache[require.resolve("keycloak-admin")] = { id: "keycloak-admin", loaded: true, exports: { default: FakeKcAdminClient } };

const { keycloakLogin } = require("../controllers/authController");
const { connectTestDb, clearTestDb, disconnectTestDb } = require("./helpers/testDb");

before(connectTestDb);
after(disconnectTestDb);

const realFetch = global.fetch;
const realWarn = console.warn;
let logged;
beforeEach(async () => {
  await clearTestDb();
  keycloak.accounts = [];
  keycloak.finds = [];
  logged = [];
  // Keycloak's token endpoint: the password is right, the account isn't finished
  global.fetch = async () => ({ ok: false, json: async () => ({ error: "invalid_grant", error_description: "Account is not fully set up" }) });
  console.warn = (...args) => logged.push(args.join(" "));
});
afterEach(() => {
  global.fetch = realFetch;
  console.warn = realWarn;
});

const signIn = async (username) => {
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
  await keycloakLogin({ body: { username, password: "Right-Password-1" } }, res);
  return reply;
};

test("an invite still waiting for a new password opens 'Set up your account'", async () => {
  keycloak.accounts = [{ id: "kc-new", username: "new.hire", email: "new.hire@example.test", requiredActions: ["UPDATE_PASSWORD"] }];
  const reply = await signIn("new.hire@example.test");
  assert.equal(reply.status, 403);
  assert.equal(reply.body.requiresPasswordChange, true);
});

test("any other unfinished step asks for an admin, and the log says which", async () => {
  keycloak.accounts = [{ id: "kc-one", username: "oneword", email: "oneword@example.test", requiredActions: ["UPDATE_PROFILE"] }];
  const reply = await signIn("oneword");
  assert.equal(reply.status, 403);
  assert.equal(reply.body.requiresPasswordChange, undefined);
  assert.match(reply.body.message, /isn.t fully set up.*admin/i);
  assert.ok(logged.some((line) => line.includes("UPDATE_PROFILE")), logged.join("\n"));
});

test("a password step alongside another still counts as the invite's", async () => {
  keycloak.accounts = [{ id: "kc-both", username: "both", email: "both@example.test", requiredActions: ["VERIFY_EMAIL", "UPDATE_PASSWORD"] }];
  assert.equal((await signIn("both@example.test")).body.requiresPasswordChange, true);
});

test("when the account can't be looked up, the answer is the admin one, not a new password", async () => {
  const reply = await signIn("ghost@example.test");
  assert.equal(reply.status, 403);
  assert.equal(reply.body.requiresPasswordChange, undefined);
});
