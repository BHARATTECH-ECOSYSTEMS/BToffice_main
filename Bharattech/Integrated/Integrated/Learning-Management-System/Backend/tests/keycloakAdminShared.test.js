const { test, before, beforeEach, after, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// Step 17 Part 3 (owner's 1A 2A): the backend has one Keycloak admin client and one admin login, shared by every
// request until shortly before its token runs out, on Keycloak's own admin package (the old `keycloak-admin` was
// renamed by Keycloak and pulled in an axios with a known hole). Before, signing in, finishing an invite, changing a
// password and sending an invite each logged in again on every call, and four controllers each made their own client.

/** A token whose exp claim is `seconds` from now; only exp is read. */
const tokenValidFor = (seconds) => `h.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds })).toString("base64url")}.s`;

const made = [];
const kc = { logins: 0, calls: [] };
class FakeKcAdminClient {
  constructor(settings) {
    made.push(settings);
    this.users = {
      find: async (args) => {
        kc.calls.push(["find", args]);
        return [];
      },
      resetPassword: async (args) => kc.calls.push(["resetPassword", args]),
      logout: async (args) => kc.calls.push(["logout", args]),
    };
    this.roles = {};
  }
  async auth(credentials) {
    kc.logins += 1;
    kc.credentials = credentials;
    this.accessToken = tokenValidFor(300);
  }
}
require("./helpers/fakeKeycloakAdmin").stubKeycloakAdminPackage(FakeKcAdminClient);

// everything that talks to Keycloak's admin API
const { keycloakChangePassword } = require("../controllers/authController");
const { listPendingInvites } = require("../controllers/inviteController");
require("../controllers/passwordResetController");
require("../controllers/userController");
require("../controllers/communityController");
require("../middlewares/keycloakAuth");
const { keycloakReply } = require("../utils/keycloakAdmin");
const { connectTestDb, clearTestDb, disconnectTestDb } = require("./helpers/testDb");

before(connectTestDb);
beforeEach(async () => {
  await clearTestDb();
  Object.assign(kc, { logins: 0, calls: [] });
});
after(disconnectTestDb);

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
});

/** Keycloak's token endpoint, which checks the current password: any password is right. */
const fakeTokenEndpoint = () => {
  global.fetch = async () => {
    const payload = Buffer.from(JSON.stringify({ sub: "kc-asha", email: "asha@example.test", realm_access: { roles: ["Employee"] } })).toString("base64url");
    return { ok: true, json: async () => ({ access_token: `h.${payload}.s`, refresh_token: "r" }) };
  };
};

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
const changePassword = (newPassword) =>
  call(keycloakChangePassword, {
    body: { currentPassword: "Old-Password-1", newPassword },
    user: { keycloakId: "kc-asha", email: "asha@example.test", decoded: { preferred_username: "asha" } },
  });

test("the backend makes one Keycloak admin client, whichever part loads it", () => {
  assert.equal(made.length, 1, `${made.length} clients were made`);
  assert.equal(made[0].realmName, process.env.KEYCLOAK_ADMIN_REALM || "master");
});

test("requests from different parts share one admin login while it is still good", async () => {
  fakeTokenEndpoint();

  assert.equal((await changePassword("New-Password-2")).status, 200);
  assert.equal((await changePassword("New-Password-3")).status, 200);
  assert.equal((await call(listPendingInvites, { user: { role: "Superadmin" } })).status, 200);

  assert.equal(kc.logins, 1);
  assert.equal(kc.calls.filter(([n]) => n === "resetPassword").length, 2);
  assert.equal(kc.credentials.grantType, "password");
});

test("Keycloak's status and reply are read from the admin client's errors", () => {
  // the admin client throws a NetworkError: the HTTP reply in `response`, its parsed body in `responseData`
  const refused = Object.assign(new Error("invalidPasswordMinLengthMessage"), {
    response: { status: 400 },
    responseData: { error_description: "Invalid password: minimum length 12." },
  });
  assert.deepEqual(keycloakReply(refused), { status: 400, data: { error_description: "Invalid password: minimum length 12." } });
  // Keycloak unreachable: no reply at all
  assert.deepEqual(keycloakReply(new Error("fetch failed")), { status: undefined, data: undefined });
  assert.deepEqual(keycloakReply(undefined), { status: undefined, data: undefined });
});

// Every file the running server loads, plus the scripts.
const BACKEND = path.resolve(__dirname, "..");
const filesIn = (dir) => fs.readdirSync(path.join(BACKEND, dir)).filter((f) => f.endsWith(".js")).map((f) => `${dir}/${f}`);
const serverFiles = () => ["server.js", ...["routes", "controllers", "middlewares", "utils"].flatMap(filesIn)];
const read = (file) => fs.readFileSync(path.join(BACKEND, file), "utf8");

test("only utils/keycloakAdmin.js loads the admin client or logs in with it", () => {
  for (const file of serverFiles().filter((f) => f !== "utils/keycloakAdmin.js")) {
    const text = read(file);
    assert.doesNotMatch(text, /keycloak-admin/, `${file} loads the admin package itself`);
    assert.doesNotMatch(text, /new KcAdminClient|\.auth\(\{/, `${file} makes its own client or login`);
  }
});

test("the old renamed package is gone, Keycloak's own one is used, also by the scripts", () => {
  const { dependencies } = JSON.parse(read("package.json"));
  assert.equal("keycloak-admin" in dependencies, false);
  assert.ok(dependencies["@keycloak/keycloak-admin-client"]);
  for (const file of filesIn("scripts")) assert.doesNotMatch(read(file), /require\(["']keycloak-admin["']\)/, file);
});
