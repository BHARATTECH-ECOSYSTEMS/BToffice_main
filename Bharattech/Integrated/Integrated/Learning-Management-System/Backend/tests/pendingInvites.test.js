const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");

// Step 17 Part 2 (owner's 1A and 2A): the company dashboard's "Add user" (POST /api/admin/users) sends the same invite
// as the portal's "Add people" (before, it made a Keycloak account whose temporary password nobody was ever told), and
// Super Admins and Admins can see the invites nobody has accepted yet and cancel them.

// Emails are caught here instead of sent; the mailer asks nodemailer for a transport each time it sends.
const nodemailer = require("nodemailer");
const mail = { sent: [], fail: null };
nodemailer.createTransport = () => ({
  sendMail: async (message) => {
    if (mail.fail) throw mail.fail;
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
const inviteRoutes = require("../routes/inviteRoutes");
const { requireAdmin } = require("../middlewares/keycloakAuth");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

before(connectTestDb);
beforeEach(async () => {
  await clearTestDb();
  Object.assign(realm, { accounts: [], passwords: new Map(), calls: [], next: 1 });
  mail.sent = [];
  mail.fail = null;
});
after(disconnectTestDb);

const call = async (handler, role, { body, params } = {}) => {
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
    await handler({ user: { id: "6a1f00000000000000000001", role }, body: body || {}, params: params || {} }, res);
  } finally {
    [console.log, console.error] = [log, error];
  }
  return reply;
};
/** A Keycloak account as the invite flow leaves it, or as it is once someone has signed in. */
const account = (email, role, { waiting = true, at = Date.now() } = {}) => {
  const a = { id: `kc-${email}`, username: email.split("@")[0], email, firstName: email.split("@")[0], lastName: "", enabled: true, createdTimestamp: at, requiredActions: waiting ? ["UPDATE_PASSWORD"] : [], realmRoles: [role] };
  realm.accounts.push(a);
  return a;
};

// --- 1A: the company dashboard's "Add user" sends the invite ---

test("'Add user' invites: an account waiting for its first password, and an email with that password", async () => {
  const reply = await call(adminController.createUser, "Admin", { body: { name: "New Hire", email: "New.Hire@Example.test", role: "employee", status: "Active" } });
  assert.equal(reply.status, 201);
  assert.equal(reply.body.status, "Invited");
  assert.equal(reply.body.email, "new.hire@example.test");
  const [made] = realm.accounts;
  assert.deepEqual(made.requiredActions, ["UPDATE_PASSWORD"]);
  assert.equal(reply.body.id, made.id);
  const password = realm.passwords.get(made.id);
  assert.equal(password.temporary, true);
  const [message] = mail.sent;
  assert.equal(message.to, "new.hire@example.test");
  assert.ok(message.text.includes(password.value), "the email carries the temporary password that was set");
  // no record until they sign in, as with every invite
  assert.equal(await User.countDocuments(), 0);
});

test("'Add user' follows the invite's role rules", async () => {
  assert.equal((await call(adminController.createUser, "Admin", { body: { name: "Sub", email: "sub@example.test", role: "Subadmin" } })).status, 403);
  assert.equal((await call(adminController.createUser, "Admin", { body: { name: "Boss", email: "boss@example.test", role: "Admin" } })).status, 403);
  assert.deepEqual(realm.accounts, []);
  assert.equal((await call(adminController.createUser, "Superadmin", { body: { name: "Boss", email: "boss@example.test", role: "Admin" } })).status, 201);
});

test("'Add user' for an email someone already has is refused, and nobody's password changes", async () => {
  await User.create(userFields({ email: "asha@example.test", keycloakId: "kc-asha@example.test" }));
  account("asha@example.test", "Employee", { waiting: false });
  const reply = await call(adminController.createUser, "Admin", { body: { name: "Asha", email: "asha@example.test", role: "Employee" } });
  assert.equal(reply.status, 409);
  assert.equal(realm.passwords.size, 0);
  assert.deepEqual(mail.sent, []);
});

test("when the invite email can't be sent, 'Add user' says so plainly", async () => {
  mail.fail = new Error("421 smtp.internal.example busy (internal detail)");
  const reply = await call(adminController.createUser, "Admin", { body: { name: "New Hire", email: "new.hire@example.test", role: "Intern" } });
  assert.equal(reply.status, 500);
  assert.equal(reply.body.inviteEmailSent, false);
  assert.equal(JSON.stringify(reply.body).includes("internal detail"), false);
});

// --- 2A: invites nobody has accepted ---

test("pending invites are the accounts still waiting for their first password with no record yet, newest first", async () => {
  account("old.invite@example.test", "Employee", { at: Date.parse("2026-10-01T10:00:00Z") });
  account("new.invite@example.test", "Intern", { at: Date.parse("2026-10-20T10:00:00Z") });
  account("admin.invite@example.test", "admin");
  account("signed.in@example.test", "Employee", { waiting: false });
  await User.create(userFields({ email: "signed.in@example.test", keycloakId: "kc-signed.in@example.test" }));
  // an account that finished its set-up (made straight in Keycloak, say) but hasn't been to the portal yet isn't an invite
  account("set.up.elsewhere@example.test", "Employee", { waiting: false });
  // someone with a record who was sent a fresh temporary password isn't a new invite
  account("reinvited@example.test", "Employee");
  await User.create(userFields({ email: "reinvited@example.test", keycloakId: "kc-reinvited@example.test" }));

  const all = await call(invites.listPendingInvites, "Superadmin");
  assert.equal(all.status, 200);
  assert.deepEqual(all.body.map((p) => [p.email, p.role]), [
    ["admin.invite@example.test", "Admin"],
    ["new.invite@example.test", "Intern"],
    ["old.invite@example.test", "Employee"],
  ]);
  assert.equal(all.body[2].invitedAt, "2026-10-01T10:00:00.000Z");
  assert.ok(all.body.every((p) => p.id && p.name));

  // an Admin sees only the roles they may invite
  const theirs = await call(invites.listPendingInvites, "Admin");
  assert.deepEqual(theirs.body.map((p) => p.email), ["new.invite@example.test", "old.invite@example.test"]);
});

test("only Super Admins and Admins reach the pending invites", () => {
  for (const [method, path] of [["get", "/pending"], ["delete", "/pending/:id"]]) {
    const layer = inviteRoutes.stack.find((l) => l.route?.path === path && l.route.methods[method]);
    assert.ok(layer?.route.stack.some((s) => s.handle === requireAdmin), `${method} ${path}`);
  }
});

test("cancelling an invite deletes the unused account; anything else is refused", async () => {
  const waiting = account("new.invite@example.test", "Employee");
  const boss = account("admin.invite@example.test", "admin");
  const accepted = account("signed.in@example.test", "Employee", { waiting: false });
  const reinvited = account("reinvited@example.test", "Employee");
  await User.create(userFields({ email: "reinvited@example.test", keycloakId: reinvited.id }));

  assert.equal((await call(invites.cancelPendingInvite, "Admin", { params: { id: accepted.id } })).status, 409);
  assert.equal((await call(invites.cancelPendingInvite, "Admin", { params: { id: reinvited.id } })).status, 409);
  assert.equal((await call(invites.cancelPendingInvite, "Admin", { params: { id: boss.id } })).status, 403);
  assert.equal((await call(invites.cancelPendingInvite, "Admin", { params: { id: "kc-nobody" } })).status, 404);
  assert.deepEqual(realm.calls.filter(([what]) => what === "del"), []);

  const done = await call(invites.cancelPendingInvite, "Admin", { params: { id: waiting.id } });
  assert.equal(done.status, 200);
  assert.equal(realm.accounts.some((a) => a.id === waiting.id), false);
  assert.equal((await call(invites.cancelPendingInvite, "Superadmin", { params: { id: boss.id } })).status, 200);
});

test("sending an invite again keeps one pending invite, with a new temporary password", async () => {
  await call(invites.sendInvite, "Admin", { body: { name: "New Hire", email: "new.hire@example.test", role: "Employee" } });
  const first = realm.passwords.get(realm.accounts[0].id).value;
  await call(invites.sendInvite, "Admin", { body: { name: "New Hire", email: "new.hire@example.test", role: "Employee" } });
  const pending = await call(invites.listPendingInvites, "Admin");
  assert.equal(pending.body.length, 1);
  assert.notEqual(realm.passwords.get(realm.accounts[0].id).value, first);
  assert.equal(mail.sent.length, 2);
});
