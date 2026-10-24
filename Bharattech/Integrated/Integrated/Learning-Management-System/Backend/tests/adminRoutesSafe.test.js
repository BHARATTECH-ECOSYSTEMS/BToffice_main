const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");

// Step 17 Part 1 (owner's 3A and 4A): the admin dashboard needs an admin, setup-realm answers without internal error
// text, a certificate is never issued in the name of an account that isn't the signed-in admin's (nor creates one),
// and /certificates/test-auth is gone. ("Add user", POST /api/admin/users, sends the invite since Part 2: its role
// rules and plain errors are tested against the real invite code in tests/pendingInvites.test.js.)

// A stand-in for the realm script, put in place before the routes load it.
const realm = { error: null };
require.cache[require.resolve("../scripts/setupKeycloakRealm")] = {
  id: "setupKeycloakRealm",
  loaded: true,
  exports: {
    setupKeycloakRealm: async () => {
      if (realm.error) throw realm.error;
      return { success: true };
    },
  },
};

const User = require("../models/User");
const Certificate = require("../models/Certificate");
const adminRoutes = require("../routes/adminRoutes");
const certificateRoutes = require("../routes/certificateRoutes");
const { requireAdmin } = require("../middlewares/keycloakAuth");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

before(connectTestDb);
beforeEach(async () => {
  await clearTestDb();
  realm.error = null;
});
after(disconnectTestDb);

const reply = () => {
  const r = { status: 200, body: undefined };
  r.res = {
    status(code) {
      r.status = code;
      return r.res;
    },
    json(value) {
      r.body = value;
      return r.res;
    },
  };
  return r;
};
const quiet = async (fn) => {
  const [log, error] = [console.log, console.error];
  console.log = console.error = () => {};
  try {
    return await fn();
  } finally {
    [console.log, console.error] = [log, error];
  }
};
/** The handlers a router runs for one route, in order. */
const handlersOf = (router, method, path) => router.stack.find((l) => l.route?.path === path && l.route.methods[method])?.route.stack.map((s) => s.handle);

test("the admin dashboard needs an admin", () => {
  assert.ok(handlersOf(adminRoutes, "get", "/dashboard").includes(requireAdmin));
});

test("a failed realm setup answers without internal error text", async () => {
  realm.error = Object.assign(new Error("ECONNREFUSED 10.0.0.7 (internal detail)"), { response: { data: { errorMessage: "admin token for master realm (internal detail)" } } });
  const handlers = handlersOf(adminRoutes, "post", "/setup-realm");
  const r = reply();
  await quiet(() => handlers[handlers.length - 1]({ user: { role: "Superadmin" } }, r.res));
  assert.equal(r.status, 500);
  assert.equal(JSON.stringify(r.body).includes("internal detail"), false, JSON.stringify(r.body));
});

test("a certificate isn't issued when the signed-in admin has no record, and no Admin record is made", async () => {
  await User.create(userFields({ role: "Admin", fullName: "Oldest Admin" }));
  const recipient = await User.create(userFields({ role: "Employee" }));
  const handlers = handlersOf(certificateRoutes, "post", "/generate");
  const r = reply();
  const stranger = { id: "6a1f00000000000000000099", keycloakId: "kc-nobody", email: "nobody@example.test", role: "Admin", fullName: "Nobody" };
  await quiet(() => handlers[handlers.length - 1]({ user: stranger, body: { userId: String(recipient._id), title: "Internship" } }, r.res));
  assert.equal(r.status, 403);
  assert.equal(await Certificate.countDocuments(), 0);
  assert.equal(await User.countDocuments({ role: "Admin" }), 1);
});

test("the test-auth debug route is gone", () => {
  assert.equal(handlersOf(certificateRoutes, "get", "/test-auth"), undefined);
});
