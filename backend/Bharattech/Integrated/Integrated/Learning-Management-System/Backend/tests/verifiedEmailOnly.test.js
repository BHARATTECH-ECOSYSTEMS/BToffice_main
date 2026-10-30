const { test, before, beforeEach, afterEach, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// Review 2026-10-26 M13 and the sync takeover (owner's 4A): an older record was found by email at sign-in, in the
// admin sync and for certificates, and by username in the sync, even a removed person's. But Keycloak lets people
// change their own email (checked on the laptop: it then marks it not verified), and anyone could register: setting
// your email to a removed person's handed you their record (Employee ID, files, certificates). Now an email finds an
// older record only when Keycloak has verified it (our invites do), the sync never takes a record over by username
// (every record has its own Keycloak login, and a username can pass from one person to another), and an unverified
// email that belongs to a record is refused, not guessed at.

const { installFakeKeycloakAdmin } = require("./helpers/fakeKeycloakAdmin");
const realm = installFakeKeycloakAdmin();

const User = require("../models/User");
const Certificate = require("../models/Certificate");
const { getOrCreateUser } = require("../middlewares/keycloakAuth");
const { getUsers, forgetKeycloakList } = require("../controllers/userController");
const { keycloakLogin } = require("../controllers/authController");
const { myCertificates } = require("../controllers/certificateAccessController");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

before(connectTestDb);
beforeEach(async () => {
  await clearTestDb();
  Object.assign(realm, { accounts: [], passwords: new Map(), calls: [], next: 1 });
  forgetKeycloakList();
});
const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
});
after(disconnectTestDb);

const token = ({ sub, email, verified, username = email.split("@")[0] }) => ({ sub, email, email_verified: verified, name: "Some One", preferred_username: username, realm_access: { roles: ["Employee"] } });
const removed = (overrides) => User.create(userFields({ isDeleted: true, deletedAt: new Date("2026-09-01"), employeeId: "BT-0042", ...overrides }));
const quiet = async (fn) => {
  const [log, warn, error] = [console.log, console.warn, console.error];
  console.log = console.warn = console.error = () => {};
  try {
    return await fn();
  } finally {
    [console.log, console.warn, console.error] = [log, warn, error];
  }
};
const replyOf = async (handler, req) => {
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
  await quiet(() => handler(req, res));
  return reply;
};

// --- sign-in's record (getOrCreateUser)

test("an unverified email that is a removed person's doesn't bring their record back: it is refused", async () => {
  const old = await removed({ email: "asha@example.test", keycloakId: "kc-old" });
  await assert.rejects(getOrCreateUser(token({ sub: "kc-taker", email: "asha@example.test", verified: false })), (err) => err.code === "unverified-email");
  const after = await User.findById(old._id).lean();
  assert.equal(after.isDeleted, true);
  assert.equal(after.keycloakId, "kc-old");
  assert.equal(await User.countDocuments(), 1);
});

test("an unverified email that is a current person's doesn't take their record either", async () => {
  const someone = await User.create(userFields({ email: "ravi@example.test", keycloakId: "kc-ravi" }));
  await assert.rejects(getOrCreateUser(token({ sub: "kc-taker", email: "ravi@example.test", verified: false })), (err) => err.code === "unverified-email");
  assert.equal((await User.findById(someone._id).lean()).keycloakId, "kc-ravi");
});

test("a verified email (an admin's re-invite) brings the removed person's own record back, as before", async () => {
  const old = await removed({ email: "asha@example.test", keycloakId: "kc-old" });
  const user = await getOrCreateUser(token({ sub: "kc-new", email: "asha@example.test", verified: true }));
  assert.equal(String(user._id), String(old._id));
  assert.equal(user.isDeleted, false);
  assert.equal(user.employeeId, "BT-0042");
});

test("an unverified email nobody has still gets a new record", async () => {
  const user = await getOrCreateUser(token({ sub: "kc-new", email: "new.person@example.test", verified: false }));
  assert.equal(user.email, "new.person@example.test");
  assert.equal(user.keycloakId, "kc-new");
});

test("signing in with such an account says so, instead of signing in to a portal that refuses every page", async () => {
  await removed({ email: "asha@example.test", keycloakId: "kc-old" });
  const claims = { sub: "kc-taker", email: "asha@example.test", email_verified: false, preferred_username: "taker", realm_access: { roles: ["Employee"] } };
  global.fetch = async () => ({ ok: true, json: async () => ({ access_token: `x.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.y`, refresh_token: "r" }) });
  const reply = await replyOf(keycloakLogin, { body: { username: "taker", password: "Some-Pass-1" } });
  assert.equal(reply.status, 403);
  assert.equal(reply.body.code, "unverified-email");
});

test("every signed-in request refuses it the same way (keycloakAuth)", () => {
  const auth = fs.readFileSync(path.join(__dirname, "..", "middlewares", "keycloakAuth.js"), "utf8");
  assert.match(auth, /if \(keycloakErr\.code === UNVERIFIED_EMAIL\.code\) return res\.status\(403\)\.json\(UNVERIFIED_EMAIL\);/);
});

// --- the admin sync (GET /api/user)

const account = (id, email, { verified = true, username = email.split("@")[0] } = {}) =>
  realm.accounts.push({ id, username, email, emailVerified: verified, firstName: "Some", lastName: "One", enabled: true, requiredActions: [], realmRoles: ["Employee"] });
const adminList = () => replyOf(getUsers, { user: { id: "6a1f00000000000000000001", role: "Admin" }, query: {} });

test("the sync doesn't hand a removed person's record to an account with their email unverified", async () => {
  const old = await removed({ email: "asha@example.test", keycloakId: "kc-old" });
  account("kc-taker", "asha@example.test", { verified: false });
  assert.equal((await adminList()).status, 200);
  const after = await User.findById(old._id).lean();
  assert.deepEqual([after.isDeleted, after.keycloakId, after.email], [true, "kc-old", "asha@example.test"]);
  assert.equal(await User.countDocuments({ keycloakId: "kc-taker" }), 0);
});

test("the sync doesn't hand a removed person's record to an account with their old username", async () => {
  const old = await removed({ username: "asha", email: "asha.old@example.test", keycloakId: "kc-old" });
  account("kc-new", "asha.new@example.test", { username: "asha" });
  await adminList();
  const after = await User.findById(old._id).lean();
  assert.deepEqual([after.isDeleted, after.keycloakId, after.email], [true, "kc-old", "asha.old@example.test"]);
  assert.equal((await User.findOne({ keycloakId: "kc-new" }).lean()).email, "asha.new@example.test");
});

test("nor a current person's record to an account that now has their old username", async () => {
  const ravi = await User.create(userFields({ username: "ravi", email: "ravi@example.test", keycloakId: "kc-ravi" }));
  // the other account comes first in Keycloak's list, before Ravi's own renames his record
  account("kc-other", "other@example.test", { username: "ravi" });
  account("kc-ravi", "ravi@example.test", { username: "ravi.menon" });
  await adminList();
  const after = await User.findById(ravi._id).lean();
  assert.deepEqual([after.keycloakId, after.email], ["kc-ravi", "ravi@example.test"]);
  // the other account gets a record of its own, with a number added while Ravi's still holds the name
  assert.equal((await User.findOne({ keycloakId: "kc-other" }).lean()).username, "ravi.2");
});

test("a verified email still brings a removed person's own record back in the sync", async () => {
  const old = await removed({ email: "asha@example.test", keycloakId: "kc-old" });
  account("kc-new", "asha@example.test", { verified: true });
  await adminList();
  const after = await User.findById(old._id).lean();
  assert.deepEqual([after.isDeleted, after.keycloakId], [false, "kc-new"]);
});

// --- certificates

test("certificates aren't found by an unverified email", async () => {
  const old = await removed({ email: "asha@example.test", keycloakId: "kc-old" });
  const me = await User.create(userFields({ email: "taker@example.test", keycloakId: "kc-taker" }));
  await Certificate.create({ userId: old._id, title: "Old certificate", certificateNumber: "C-1", issuedAt: new Date() }).catch(async () =>
    Certificate.collection.insertOne({ userId: old._id, title: "Old certificate", certificateNumber: "C-1", issuedAt: new Date() })
  );
  const decoded = { sub: "kc-taker", email: "asha@example.test", email_verified: false };
  const reply = await replyOf(myCertificates, { user: { id: String(me._id), keycloakId: "kc-taker", email: "asha@example.test", decoded } });
  assert.equal(reply.status, 200);
  assert.equal(reply.body.count, 0);
});
