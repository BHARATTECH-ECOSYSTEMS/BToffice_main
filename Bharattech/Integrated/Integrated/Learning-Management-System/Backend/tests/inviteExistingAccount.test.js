const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");

// Review 2026-10-26 C1 (owner's 1A): an invite looked only at the role being invited, never at the account that
// already had the email, so an Admin could "invite" a Super Admin's email as an Employee and demote, rename and reset
// them, or switch a blocked person back on. Now an email that already has an account is refused, except an invite
// nobody has accepted yet ("Send again"), and then the inviter's role must also allow the role that invite carries.

const nodemailer = require("nodemailer");
const mail = { sent: [] };
nodemailer.createTransport = () => ({
  sendMail: async (message) => {
    mail.sent.push(message);
    return { messageId: `test-${mail.sent.length}` };
  },
});
process.env.SMTP_HOST = process.env.SMTP_HOST || "127.0.0.1";

const { installFakeKeycloakAdmin } = require("./helpers/fakeKeycloakAdmin");
const realm = installFakeKeycloakAdmin();

const User = require("../models/User");
const adminController = require("../controllers/adminController");
const invites = require("../controllers/inviteController");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

before(connectTestDb);
beforeEach(async () => {
  await clearTestDb();
  Object.assign(realm, { accounts: [], passwords: new Map(), calls: [], next: 1 });
  mail.sent = [];
});
after(disconnectTestDb);

const call = async (handler, role, body) => {
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
  const [log, error] = [console.log, console.error];
  console.log = console.error = () => {};
  try {
    await handler({ user: { id: "6a1f00000000000000000001", role }, body, params: {} }, res);
  } finally {
    [console.log, console.error] = [log, error];
  }
  return reply;
};
const invite = (actorRole, email, role = "Employee", name = "Asha Rao") => call(invites.sendInvite, actorRole, { name, email, role });

/** A Keycloak account: `waiting` = an invite nobody has accepted yet. */
const account = (email, realmRole, { waiting = false, enabled = true } = {}) => {
  const a = { id: `kc-${email}`, username: "asha.rao", email, firstName: "Asha", lastName: "Rao", enabled, createdTimestamp: Date.now(), requiredActions: waiting ? ["UPDATE_PASSWORD"] : [], realmRoles: [realmRole] };
  realm.accounts.push(a);
  return a;
};
const snapshot = (a) => JSON.parse(JSON.stringify(realm.accounts.find((x) => x.id === a.id)));
/** Nothing about the account changed: no rename, role, password, sign-in switch or email. */
const untouched = (a, before) => {
  assert.deepEqual(snapshot(a), before);
  assert.equal(realm.passwords.size, 0);
  assert.deepEqual(realm.calls.filter(([what]) => what !== "find"), []);
  assert.deepEqual(mail.sent, []);
};

test("an Admin can't invite a Super Admin's email: refused, and the Super Admin keeps their role, name and password", async () => {
  const boss = account("boss@example.test", "Super-admin");
  await User.create(userFields({ email: "boss@example.test", keycloakId: boss.id, role: "Superadmin" }));
  const before = snapshot(boss);

  const reply = await invite("Admin", "boss@example.test", "Employee", "Someone Else");
  assert.equal(reply.status, 409);
  assert.equal(reply.body.code, "has-account");
  untouched(boss, before);
});

test("the company dashboard's 'Add user' is refused the same way", async () => {
  const boss = account("boss@example.test", "Super-admin");
  await User.create(userFields({ email: "boss@example.test", keycloakId: boss.id, role: "Superadmin" }));
  const before = snapshot(boss);

  const reply = await call(adminController.createUser, "Admin", { name: "Someone Else", email: "boss@example.test", role: "employee" });
  assert.equal(reply.status, 409);
  untouched(boss, before);
});

test("inviting a blocked person's email doesn't switch their sign-in back on", async () => {
  const blocked = account("blocked@example.test", "Employee", { enabled: false });
  await User.create(userFields({ email: "blocked@example.test", keycloakId: blocked.id, isBanned: true }));
  const before = snapshot(blocked);

  assert.equal((await invite("Superadmin", "blocked@example.test")).status, 409);
  untouched(blocked, before);
});

test("an account in use is refused even for a Super Admin, and even without a record here yet", async () => {
  // made straight in Keycloak, say, and never been to the portal
  const elsewhere = account("elsewhere@example.test", "Employee");
  const before = snapshot(elsewhere);

  assert.equal((await invite("Superadmin", "elsewhere@example.test")).status, 409);
  untouched(elsewhere, before);
});

test("someone with a record whose account waits for a new password isn't a pending invite", async () => {
  const reset = account("reset@example.test", "Employee", { waiting: true });
  await User.create(userFields({ email: "reset@example.test", keycloakId: reset.id }));
  const before = snapshot(reset);

  assert.equal((await invite("Admin", "reset@example.test")).status, 409);
  untouched(reset, before);
});

test("the email is matched whatever its capitals", async () => {
  const boss = account("boss@example.test", "Super-admin");
  const before = snapshot(boss);

  assert.equal((await invite("Admin", "Boss@Example.TEST")).status, 409);
  untouched(boss, before);
});

test("'Send again' still works for an invite nobody has accepted: a new temporary password, same account", async () => {
  const waiting = account("new.hire@example.test", "Employee", { waiting: true });

  const reply = await invite("Admin", "new.hire@example.test");
  assert.equal(reply.status, 200);
  assert.equal(reply.body.resent, true);
  assert.equal(realm.accounts.length, 1);
  assert.equal(realm.passwords.get(waiting.id).temporary, true);
  assert.equal(mail.sent.length, 1);
});

test("an Admin can't send again an invite for a role they can't invite, even asking for a lower role", async () => {
  const pendingBoss = account("pending.boss@example.test", "Super-admin", { waiting: true });
  const before = snapshot(pendingBoss);

  const reply = await invite("Admin", "pending.boss@example.test", "Employee");
  assert.equal(reply.status, 403);
  untouched(pendingBoss, before);
});

test("a Super Admin may send again a pending invite with a different role", async () => {
  const waiting = account("new.hire@example.test", "Employee", { waiting: true });

  assert.equal((await invite("Superadmin", "new.hire@example.test", "Admin")).status, 200);
  assert.deepEqual(realm.accounts.find((a) => a.id === waiting.id).realmRoles, ["admin"]);
});

test("a switched-off invite isn't pending, so it isn't switched on", async () => {
  const off = account("off@example.test", "Employee", { waiting: true, enabled: false });
  const before = snapshot(off);

  assert.equal((await invite("Superadmin", "off@example.test")).status, 409);
  untouched(off, before);
});

test("someone removed from People (their account was deleted) can be invited again", async () => {
  await User.create(userFields({ email: "returning@example.test", isDeleted: true, deletedAt: new Date() }));

  const reply = await invite("Admin", "returning@example.test");
  assert.equal(reply.status, 200);
  assert.equal(realm.accounts.length, 1);
  assert.equal(mail.sent.length, 1);
});

test("a brand-new email is invited as before", async () => {
  const reply = await invite("Admin", "brand.new@example.test");
  assert.equal(reply.status, 201);
  assert.equal(realm.accounts.length, 1);
});
