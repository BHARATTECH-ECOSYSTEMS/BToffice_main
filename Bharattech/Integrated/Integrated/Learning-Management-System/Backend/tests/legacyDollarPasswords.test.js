const { test, before, beforeEach, after, afterEach } = require("node:test");
const assert = require("node:assert/strict");

// Before step 16 the request cleaner deleted every "$" from what people typed, so a password chosen as "Pa$$word1"
// was saved in Keycloak as "Paword1", and signing in worked only because the typing was cut the same way. Now that
// passwords arrive as typed, such a person must still get in (owner's choice 2A), and their password is saved again
// as they type it.

// A stand-in for the Keycloak admin client, put in place before authController loads it. It records the calls.
const keycloak = { stored: "", calls: [], resetError: null };
class FakeKcAdminClient {
  constructor() {
    this.users = {
      resetPassword: async (args) => {
        keycloak.calls.push(["resetPassword", args]);
        if (keycloak.resetError) throw keycloak.resetError;
        keycloak.stored = args.credential.value;
      },
      logout: async (args) => keycloak.calls.push(["logout", args]),
      // what sign-in looks up when Keycloak says "not fully set up": an invite waiting for a new password
      find: async () => [{ id: "kc-asha", requiredActions: ["UPDATE_PASSWORD"] }],
    };
  }
  async auth() {
    keycloak.calls.push(["auth"]);
  }
}
require.cache[require.resolve("keycloak-admin")] = { id: "keycloak-admin", loaded: true, exports: { default: FakeKcAdminClient } };

const { keycloakLogin, keycloakChangePassword } = require("../controllers/authController");
const { connectTestDb, clearTestDb, disconnectTestDb } = require("./helpers/testDb");

before(connectTestDb);
after(disconnectTestDb);

const TYPED = "Pa$$word1";
const SAVED_BY_OLD_CLEANER = "Paword1";
const realFetch = global.fetch;
const realWarn = console.warn;
const realError = console.error;
let tries;
let logged;
let inviteNotFinished;
let accountDisabled;
beforeEach(async () => {
  await clearTestDb();
  Object.assign(keycloak, { stored: SAVED_BY_OLD_CLEANER, calls: [], resetError: null });
  tries = [];
  logged = [];
  inviteNotFinished = false;
  accountDisabled = false;
  // Keycloak's token endpoint: the backend checks a password by signing in with it
  global.fetch = async (_url, init) => {
    const password = new URLSearchParams(init.body).get("password");
    tries.push(password);
    if (accountDisabled) return { ok: false, json: async () => ({ error: "invalid_grant", error_description: "Account disabled" }) };
    if (password !== keycloak.stored) {
      return { ok: false, json: async () => ({ error: "invalid_grant", error_description: "Invalid user credentials" }) };
    }
    if (inviteNotFinished) return { ok: false, json: async () => ({ error: "invalid_grant", error_description: "Account is not fully set up" }) };
    const payload = Buffer.from(JSON.stringify({ sub: "kc-asha", email: "asha@example.test", preferred_username: "asha", realm_access: { roles: ["Employee"] } })).toString("base64url");
    return { ok: true, json: async () => ({ access_token: `h.${payload}.s`, refresh_token: "r", id_token: "i" }) };
  };
  console.warn = (...args) => logged.push(args.join(" "));
  console.error = (...args) => logged.push(args.join(" "));
});
afterEach(() => {
  global.fetch = realFetch;
  console.warn = realWarn;
  console.error = realError;
});

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
  await handler(req, res);
  return reply;
};
const signIn = (password) => call(keycloakLogin, { body: { username: "asha", password } });
const resets = () => keycloak.calls.filter(([name]) => name === "resetPassword").map(([, args]) => args);

test("a password saved without its $ still signs in, and is saved again as typed", async () => {
  const reply = await signIn(TYPED);
  assert.equal(reply.status, 200);
  assert.equal(reply.body.success, true);
  assert.deepEqual(tries, [TYPED, SAVED_BY_OLD_CLEANER]);
  assert.deepEqual(resets(), [{ realm: process.env.KEYCLOAK_REALM || "bharattech", id: "kc-asha", credential: { type: "password", value: TYPED, temporary: false } }]);
  // their new sign-in stays: no sessions are ended
  assert.equal(keycloak.calls.some(([name]) => name === "logout"), false);

  // from now on the password works as typed, first time
  tries = [];
  assert.equal((await signIn(TYPED)).status, 200);
  assert.deepEqual(tries, [TYPED]);
});

test("a wrong password with a $ still fails, after at most two tries", async () => {
  const reply = await signIn("Wr$ng-one");
  assert.equal(reply.status, 401);
  assert.equal(reply.body.message, "Invalid username or password");
  assert.deepEqual(tries, ["Wr$ng-one", "Wrng-one"]);
  assert.deepEqual(resets(), []);
});

test("a password without a $ is tried once", async () => {
  assert.equal((await signIn("wrong-one")).status, 401);
  assert.deepEqual(tries, ["wrong-one"]);
});

test("a password that's right as typed is never retried or saved again", async () => {
  keycloak.stored = TYPED;
  assert.equal((await signIn(TYPED)).status, 200);
  assert.deepEqual(tries, [TYPED]);
  assert.deepEqual(resets(), []);
});

test("an invite that isn't finished is answered as before, not retried", async () => {
  keycloak.stored = "Temp-Pass-1";
  inviteNotFinished = true;
  const reply = await signIn("Temp-Pass-1");
  assert.equal(reply.status, 403);
  assert.equal(reply.body.requiresPasswordChange, true);
  assert.deepEqual(tries, ["Temp-Pass-1"]);
});

test("only a wrong password is retried, not any other refusal (a switched-off account, say)", async () => {
  accountDisabled = true;
  assert.equal((await signIn(TYPED)).status, 401);
  assert.deepEqual(tries, [TYPED]);
});

test("if saving it again fails they're still signed in, and no password reaches the log", async () => {
  keycloak.resetError = new Error("Keycloak is down");
  const reply = await signIn(TYPED);
  assert.equal(reply.status, 200);
  assert.ok(logged.some((line) => /saved again|resave|as typed/i.test(line)), logged.join("\n"));
  assert.equal(logged.some((line) => line.includes(TYPED) || line.includes(SAVED_BY_OLD_CLEANER)), false);
});

test("Change password accepts a current password saved without its $ and sets the new one", async () => {
  const reply = await call(keycloakChangePassword, {
    body: { currentPassword: TYPED, newPassword: "New-Pa$$-2" },
    user: { keycloakId: "kc-asha", email: "asha@example.test", decoded: { preferred_username: "asha" } },
  });
  assert.equal(reply.status, 200);
  assert.deepEqual(tries, [TYPED, SAVED_BY_OLD_CLEANER]);
  // only the new password is set (no need to save the old one again first)
  assert.deepEqual(resets().map((r) => r.credential.value), ["New-Pa$$-2"]);
});

test("Change password still refuses a wrong current password", async () => {
  const reply = await call(keycloakChangePassword, {
    body: { currentPassword: "Wr$ng-one", newPassword: "New-Pa$$-2" },
    user: { keycloakId: "kc-asha", email: "asha@example.test", decoded: { preferred_username: "asha" } },
  });
  assert.equal(reply.status, 401);
  assert.deepEqual(resets(), []);
});
