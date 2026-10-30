const { test, before, beforeEach, after, afterEach } = require("node:test");
const assert = require("node:assert/strict");

// A stand-in for the Keycloak admin client, put in place before authController loads it. It records the calls.
const admin = { calls: [], resetError: null, logoutError: null };
class FakeKcAdminClient {
  constructor() {
    this.users = {
      resetPassword: async (args) => {
        admin.calls.push(["resetPassword", args]);
        if (admin.resetError) throw admin.resetError;
      },
      logout: async (args) => {
        admin.calls.push(["logout", args]);
        if (admin.logoutError) throw admin.logoutError;
      },
    };
  }
  async auth() {
    admin.calls.push(["auth"]);
  }
}
require("./helpers/fakeKeycloakAdmin").stubKeycloakAdminPackage(FakeKcAdminClient);

const { keycloakChangePassword } = require("../controllers/authController");
const { connectTestDb, clearTestDb, disconnectTestDb } = require("./helpers/testDb");

before(connectTestDb);
beforeEach(async () => {
  await clearTestDb();
  Object.assign(admin, { calls: [], resetError: null, logoutError: null });
});
after(disconnectTestDb);

const CURRENT = "Old-Password-1";
const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
});

/** Keycloak's token endpoint, which the backend uses to check the current password. */
const fakeTokenEndpoint = () => {
  global.fetch = async (_url, init) => {
    const form = new URLSearchParams(init.body);
    if (form.get("password") !== CURRENT) {
      return { ok: false, json: async () => ({ error: "invalid_grant", error_description: "Invalid user credentials" }) };
    }
    const payload = Buffer.from(JSON.stringify({ sub: "kc-asha", email: "asha@example.test", realm_access: { roles: ["Employee"] } })).toString("base64url");
    return { ok: true, json: async () => ({ access_token: `h.${payload}.s`, refresh_token: "r" }) };
  };
};

const change = async (body) => {
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
  const req = { body, user: { keycloakId: "kc-asha", email: "asha@example.test", decoded: { preferred_username: "asha" } } };
  await keycloakChangePassword(req, res);
  return reply;
};

/** How Keycloak's admin API answers when the new password breaks the realm's password rules (the admin client's
 * NetworkError: the HTTP reply in `response`, its parsed body in `responseData`). */
const keycloakRefusal = () =>
  Object.assign(new Error("invalidPasswordMinLengthMessage"), {
    response: { status: 400 },
    responseData: { error: "invalidPasswordMinLengthMessage", error_description: "Invalid password: minimum length 12." },
  });

test("the right current password sets the new one and signs the person out everywhere", async () => {
  fakeTokenEndpoint();

  const reply = await change({ currentPassword: CURRENT, newPassword: "New-Password-2" });

  assert.equal(reply.status, 200);
  assert.equal(reply.body.success, true);
  const reset = admin.calls.find(([name]) => name === "resetPassword")[1];
  assert.deepEqual(reset.credential, { type: "password", value: "New-Password-2", temporary: false });
  assert.equal(reset.id, "kc-asha");
  const logout = admin.calls.find(([name]) => name === "logout");
  assert.ok(logout, "every session should be ended");
  assert.equal(logout[1].id, "kc-asha");
  // the password is set before the sessions end
  assert.ok(admin.calls.findIndex(([n]) => n === "resetPassword") < admin.calls.findIndex(([n]) => n === "logout"));
});

test("a wrong current password changes nothing", async () => {
  fakeTokenEndpoint();

  const reply = await change({ currentPassword: "not-it", newPassword: "New-Password-2" });

  assert.equal(reply.status, 401);
  assert.equal(reply.body.message, "Current password is incorrect");
  assert.deepEqual(admin.calls.filter(([n]) => n !== "auth"), []);
});

test("a new password Keycloak refuses comes back as a 400 with Keycloak's reason", async () => {
  fakeTokenEndpoint();
  admin.resetError = keycloakRefusal();

  const reply = await change({ currentPassword: CURRENT, newPassword: "short-pw" });

  assert.equal(reply.status, 400);
  assert.equal(reply.body.message, "Invalid password: minimum length 12.");
  assert.equal(admin.calls.some(([n]) => n === "logout"), false);
});

test("an unexpected failure says so plainly, without internal details", async () => {
  fakeTokenEndpoint();
  admin.resetError = new Error("connect ECONNREFUSED 10.0.0.5:8080");

  const reply = await change({ currentPassword: CURRENT, newPassword: "New-Password-2" });

  assert.equal(reply.status, 500);
  assert.deepEqual(reply.body, { message: "Failed to change password" });
});

test("if ending the sessions fails, the password change still counts", async () => {
  fakeTokenEndpoint();
  admin.logoutError = new Error("timeout");

  const reply = await change({ currentPassword: CURRENT, newPassword: "New-Password-2" });

  assert.equal(reply.status, 200);
  assert.equal(reply.body.success, true);
  assert.equal(reply.body.signedOutEverywhere, false);
});

test("both passwords are required", async () => {
  fakeTokenEndpoint();
  assert.equal((await change({ currentPassword: CURRENT })).status, 400);
  assert.equal((await change({ newPassword: "New-Password-2" })).status, 400);
});
