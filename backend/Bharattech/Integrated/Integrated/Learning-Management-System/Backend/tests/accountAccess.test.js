const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");

// Gap audit group B, owner's 1A and 2A: blocking someone also switches their Keycloak account off (and unblocking
// back on), the same way "Mark as left" does; and an admin can email someone a password reset link from People. 3A:
// a username works wherever an email or Employee ID does, so "Forgot password?" takes one too.

// Emails are caught here instead of sent; the mailer asks nodemailer for a transport each time it sends.
const nodemailer = require("nodemailer");
const sent = [];
const mail = { fail: false };
nodemailer.createTransport = () => ({
  sendMail: async (message) => {
    if (mail.fail) throw new Error("mail server down");
    sent.push(message);
    return { messageId: `test-${sent.length}` };
  },
});
process.env.SMTP_HOST = process.env.SMTP_HOST || "127.0.0.1";

// A stand-in Keycloak admin client, in place before the controllers load it. It records every call.
const kc = { accounts: new Map(), calls: [], failUpdate: false };
class FakeKcAdminClient {
  constructor() {
    this.users = {
      findOne: async ({ id }) => (kc.accounts.has(id) ? { ...kc.accounts.get(id) } : null),
      update: async ({ id }, rep) => {
        kc.calls.push(["update", id, rep.enabled]);
        if (kc.failUpdate) throw new Error("Keycloak down");
        kc.accounts.set(id, { ...kc.accounts.get(id), ...rep });
      },
      logout: async ({ id }) => kc.calls.push(["logout", id]),
      resetPassword: async ({ id }) => kc.calls.push(["resetPassword", id]),
    };
  }
  async auth() {}
}
require("./helpers/fakeKeycloakAdmin").stubKeycloakAdminPackage(FakeKcAdminClient);

const User = require("../models/User");
const PasswordReset = require("../models/PasswordReset");
const { updateUser } = require("../controllers/userController");
const { requestPasswordReset, resetPassword, sendResetLinkFor } = require("../controllers/passwordResetController");
const userRoutes = require("../routes/userRoutes");
const { requireAdmin } = require("../middlewares/keycloakAuth");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

before(connectTestDb);
beforeEach(async () => {
  await clearTestDb();
  sent.length = 0;
  mail.fail = false;
  Object.assign(kc, { accounts: new Map(), calls: [], failUpdate: false });
});
after(disconnectTestDb);

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

/** A person with a Keycloak account that is switched on. */
const person = async (fields = {}) => {
  const user = await User.create(userFields(fields));
  if (user.keycloakId) {
    kc.accounts.set(user.keycloakId, { id: user.keycloakId, username: user.username, email: user.email, enabled: true, firstName: "Test", lastName: "Person", attributes: { team: ["Ops"] } });
  }
  return user;
};
const asActor = (user) => ({ id: String(user._id), role: user.role });
const edit = (actor, target, body) => call(updateUser, { user: asActor(actor), params: { id: String(target._id) }, body });
const sendLink = (actor, id) => call(sendResetLinkFor, { user: asActor(actor), params: { id: String(id) } });
const keycloakUpdates = () => kc.calls.filter(([what]) => what === "update");
const mailsTo = (email) => sent.filter((m) => m.to === email);
const tokenFrom = (email) => /reset-password\?token=([A-Za-z0-9_-]+)/.exec(mailsTo(email).at(-1).text)[1];

// --- 1A: blocking switches the sign-in off ---

test("blocking someone switches their Keycloak account off, ends their sessions and marks the record", async () => {
  const admin = await person({ role: "Admin" });
  const asha = await person({ role: "Employee" });

  const r = await edit(admin, asha, { isBanned: true });

  assert.equal(r.status, 200);
  assert.equal(r.body.status, "inactive");
  assert.equal((await User.findById(asha._id)).isBanned, true);
  assert.deepEqual(keycloakUpdates(), [["update", asha.keycloakId, false]]);
  assert.ok(kc.calls.some(([what, id]) => what === "logout" && id === asha.keycloakId));
  // the rest of the Keycloak account is sent back unchanged
  const account = kc.accounts.get(asha.keycloakId);
  assert.deepEqual({ username: account.username, email: account.email, attributes: account.attributes }, { username: asha.username, email: asha.email, attributes: { team: ["Ops"] } });
});

test("unblocking switches the Keycloak account back on", async () => {
  const admin = await person({ role: "Superadmin" });
  const asha = await person({ role: "Employee", isBanned: true });
  kc.accounts.get(asha.keycloakId).enabled = false;

  const r = await edit(admin, asha, { isBanned: false });

  assert.equal(r.status, 200);
  assert.equal((await User.findById(asha._id)).isBanned, false);
  assert.deepEqual(keycloakUpdates(), [["update", asha.keycloakId, true]]);
  assert.equal(kc.calls.some(([what]) => what === "logout"), false);
});

test("when Keycloak can't switch the account, nothing is changed", async () => {
  const admin = await person({ role: "Admin" });
  const asha = await person({ role: "Employee" });
  kc.failUpdate = true;

  const r = await edit(admin, asha, { isBanned: true });

  assert.equal(r.status, 502);
  assert.match(r.body.message, /nothing was changed/i);
  assert.equal((await User.findById(asha._id)).isBanned, false);
});

test("when the record can't be saved after the switch, the Keycloak account is switched back", async () => {
  const admin = await person({ role: "Admin" });
  const asha = await person({ role: "Employee" });

  // a stream that doesn't exist makes the save fail after Keycloak was already switched off
  const r = await edit(admin, asha, { isBanned: true, stream: "no-such-stream" });

  assert.equal(r.status, 400);
  assert.equal((await User.findById(asha._id)).isBanned, false);
  assert.deepEqual(keycloakUpdates(), [
    ["update", asha.keycloakId, false],
    ["update", asha.keycloakId, true],
  ]);
  assert.equal(kc.accounts.get(asha.keycloakId).enabled, true);
});

test("the company form sends isBanned with every save: an unchanged value doesn't touch Keycloak", async () => {
  const admin = await person({ role: "Admin" });
  const asha = await person({ role: "Employee" });

  const r = await edit(admin, asha, { isBanned: false, team: "Ops" });

  assert.equal(r.status, 200);
  assert.deepEqual(keycloakUpdates(), []);
});

test("isBanned must be true or false", async () => {
  const admin = await person({ role: "Admin" });
  const asha = await person({ role: "Employee" });

  for (const value of ["yes", "true", 1, null]) {
    const r = await edit(admin, asha, { isBanned: value });
    assert.equal(r.status, 400, String(value));
  }
  assert.equal((await User.findById(asha._id)).isBanned, false);
  assert.deepEqual(keycloakUpdates(), []);
});

test("an Admin can't block another Admin, and nobody can block a Super Admin; Keycloak is never asked", async () => {
  const admin = await person({ role: "Admin" });
  const otherAdmin = await person({ role: "Admin" });
  const superadmin = await person({ role: "Superadmin" });
  const otherSuper = await person({ role: "Superadmin" });

  assert.equal((await edit(admin, otherAdmin, { isBanned: true })).status, 403);
  assert.equal((await edit(superadmin, otherSuper, { isBanned: true })).status, 403);
  assert.deepEqual(keycloakUpdates(), []);
});

test("someone whose Keycloak account is already gone is still blocked", async () => {
  const admin = await person({ role: "Admin" });
  const gone = await User.create(userFields({ role: "Employee" }));

  const r = await edit(admin, gone, { isBanned: true });

  assert.equal(r.status, 200);
  assert.equal((await User.findById(gone._id)).isBanned, true);
  assert.deepEqual(keycloakUpdates(), []);
});

// --- 2A: an admin sends a reset link ---

test("POST /api/user/:id/reset-link is for admins", () => {
  const layer = userRoutes.stack.find((l) => l.route?.path === "/:id/reset-link" && l.route.methods.post);
  assert.ok(layer, "route missing");
  assert.ok(layer.route.stack.some((s) => s.handle === requireAdmin));
  assert.ok(layer.route.stack.some((s) => s.handle === sendResetLinkFor));
});

test("an admin's reset link goes to the person's work email, says who asked, is recorded and works", async () => {
  const admin = await person({ role: "Admin", fullName: "Ravi Admin" });
  const asha = await person({ role: "Employee", fullName: "Asha Rao" });

  const r = await sendLink(admin, asha._id);

  assert.equal(r.status, 200);
  assert.match(r.body.message, /work email/i);
  assert.equal(mailsTo(asha.email).length, 1);
  assert.match(mailsTo(asha.email)[0].text, /an admin/i);
  const [link] = await PasswordReset.find({ user: asha._id }).lean();
  assert.equal(String(link.requestedBy), String(admin._id));

  const used = await call(resetPassword, { body: { token: tokenFrom(asha.email), newPassword: "Brand-New-Pass-1" } });
  assert.equal(used.status, 200);
  assert.ok(kc.calls.some(([what, id]) => what === "resetPassword" && id === asha.keycloakId));
});

test("a new link makes the older one stop working", async () => {
  const admin = await person({ role: "Admin" });
  const asha = await person({ role: "Employee" });
  await PasswordReset.create({ user: asha._id, tokenHash: "older", expiresAt: new Date(Date.now() + 60_000), createdAt: new Date(Date.now() - 10 * 60_000) });

  assert.equal((await sendLink(admin, asha._id)).status, 200);

  assert.ok((await PasswordReset.findOne({ tokenHash: "older" })).cancelledAt);
});

test("when the email can't be sent, the new link is dropped and the older one keeps working", async () => {
  const admin = await person({ role: "Admin" });
  const asha = await person({ role: "Employee" });
  await PasswordReset.create({ user: asha._id, tokenHash: "older", expiresAt: new Date(Date.now() + 60_000), createdAt: new Date(Date.now() - 10 * 60_000) });
  mail.fail = true;

  const r = await sendLink(admin, asha._id);

  assert.equal(r.status, 502);
  const links = await PasswordReset.find({ user: asha._id }).lean();
  assert.deepEqual(links.map((l) => [l.tokenHash, l.cancelledAt ?? null]), [["older", null]]);
});

test("the same limits as Forgot password: not twice within 2 minutes, and they count each other", async () => {
  const admin = await person({ role: "Admin" });
  const asha = await person({ role: "Employee" });

  await call(requestPasswordReset, { body: { login: asha.email } });
  await new Promise((resolve) => setTimeout(resolve, 50));
  const r = await sendLink(admin, asha._id);

  assert.equal(r.status, 429);
  assert.match(r.body.message, /recently/i);
  assert.equal(mailsTo(asha.email).length, 1);
});

test("who may send a link: an Admin for those below them, a Super Admin for anyone", async () => {
  const admin = await person({ role: "Admin" });
  const otherAdmin = await person({ role: "Admin" });
  const superadmin = await person({ role: "Superadmin" });

  assert.equal((await sendLink(admin, otherAdmin._id)).status, 403);
  assert.equal(mailsTo(otherAdmin.email).length, 0);
  assert.equal((await sendLink(superadmin, otherAdmin._id)).status, 200);
  assert.equal(mailsTo(otherAdmin.email).length, 1);
});

test("no link for a blocked person, someone without a sign-in account, someone who left or an unknown id", async () => {
  const admin = await person({ role: "Superadmin" });
  const blocked = await person({ role: "Employee", isBanned: true });
  const noAccount = await person({ role: "Employee", authProvider: "local", password: "a-stored-hash" });
  const left = await person({ role: "Employee", isDeleted: true });

  const refusedBlocked = await sendLink(admin, blocked._id);
  assert.equal(refusedBlocked.status, 409);
  assert.match(refusedBlocked.body.message, /unblock/i);
  assert.equal((await sendLink(admin, noAccount._id)).status, 409);
  assert.equal((await sendLink(admin, left._id)).status, 404);
  assert.equal((await sendLink(admin, "not-an-id")).status, 404);
  assert.equal((await sendLink(admin, "64b7f0f0f0f0f0f0f0f0f0f1")).status, 404);
  assert.equal(sent.length, 0);
});

// --- 3A: a username works too ---

test("Forgot password takes a username as well as an email or Employee ID", async () => {
  const asha = await person({ role: "Employee", username: "asha.rao" });

  await call(requestPasswordReset, { body: { login: "  Asha.Rao " } });
  await new Promise((resolve) => setTimeout(resolve, 50));

  assert.equal(mailsTo(asha.email).length, 1);
});

test("when a username is also someone's email, the email's owner gets the link", async () => {
  const asha = await person({ role: "Employee", email: "asha@example.test" });
  const other = await person({ role: "Employee", username: "asha@example.test" });

  await call(requestPasswordReset, { body: { login: "asha@example.test" } });

  assert.equal(mailsTo(asha.email).length, 1);
  assert.equal(mailsTo(other.email).length, 0);
});
