const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");

// Security report 2026-10-28 lead 20 (owner's G5A): the sign-in reply took the person's role from the app's client
// roles too, while a demotion in People changes realm roles only. Only realm roles count now, as on every request.
const { installFakeKeycloakAdmin } = require("./helpers/fakeKeycloakAdmin");
installFakeKeycloakAdmin();
const { keycloakLogin } = require("../controllers/authController");
const { connectTestDb, disconnectTestDb } = require("./helpers/testDb");

before(connectTestDb);
after(async () => {
  global.fetch = realFetch;
  await disconnectTestDb();
});
const realFetch = global.fetch;

test("the sign-in reply's role comes from realm roles only", async () => {
  const claims = { sub: "kc-mixed", preferred_username: "mixed", realm_access: { roles: ["Employee"] }, resource_access: { "lms-client": { roles: ["admin"] } } };
  global.fetch = async () => ({ ok: true, json: async () => ({ access_token: `x.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.y`, refresh_token: "r", expires_in: 300 }) });
  const reply = {};
  const res = { status: (code) => ((reply.status = code), res), json: (body) => ((reply.body = body), res) };

  await keycloakLogin({ body: { username: "mixed", password: "Right-Pass-1" } }, res);

  assert.equal(reply.body.user.role, "EMPLOYEE");
});
