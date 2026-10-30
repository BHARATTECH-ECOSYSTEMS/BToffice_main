const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");

// Emails are caught here instead of sent; the mailer asks nodemailer for a transport each time it sends.
const nodemailer = require("nodemailer");
const sent = [];
nodemailer.createTransport = () => ({ sendMail: async (mail) => (sent.push(mail), { messageId: `test-${sent.length}` }) });
// the mailer reads its settings when it loads; any SMTP host makes it use the transport above
process.env.SMTP_HOST = process.env.SMTP_HOST || "127.0.0.1";

// A stand-in for the Keycloak admin client, put in place before the controllers load it. It records the calls.
const kc = { calls: [], resetError: null };
class FakeKcAdminClient {
  constructor() {
    this.users = {
      resetPassword: async (args) => {
        kc.calls.push(["resetPassword", args]);
        if (kc.resetError) throw kc.resetError;
      },
      logout: async (args) => kc.calls.push(["logout", args]),
    };
  }
  async auth() {}
}
require("./helpers/fakeKeycloakAdmin").stubKeycloakAdminPackage(FakeKcAdminClient);

const User = require("../models/User");
const PasswordReset = require("../models/PasswordReset");
const ResetLink = require("../models/ResetLink");
const { requestPasswordReset, resetPassword, RESET_LINK_MINUTES, SAME_REPLY } = require("../controllers/passwordResetController");
const resetLinkRoutes = require("../routes/resetLinkRoutes");
const { generateResetLink, getResetLinksByRole } = require("../controllers/resetLinkController");
const { requireAdmin } = require("../middlewares/keycloakAuth");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

before(connectTestDb);
beforeEach(async () => {
  await clearTestDb();
  sent.length = 0;
  Object.assign(kc, { calls: [], resetError: null });
});
after(disconnectTestDb);

const call = async (handler, body, extra = {}) => {
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
  await handler({ body, ...extra }, res);
  return reply;
};

const ask = (login) => call(requestPasswordReset, { login });
const reset = (token, newPassword = "Brand-New-Pass-1") => call(resetPassword, { token, newPassword });
const mailsTo = (email) => sent.filter((m) => m.to === email);
/** The token in the newest reset email to `email`. */
const tokenFrom = (email) => {
  const mail = mailsTo(email).at(-1);
  return /reset-password\?token=([A-Za-z0-9_-]+)/.exec(mail.text)[1];
};
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const asha = () => User.create(userFields({ fullName: "Asha Rao", email: "asha@example.test", role: "Employee" }));

// --- asking for a link ---

test("an email or an Employee ID gets a link that's sent to the account's email", async () => {
  const person = await asha();

  const byEmail = await ask("  ASHA@example.test ");
  assert.equal(byEmail.status, 200);
  assert.deepEqual(byEmail.body, { message: SAME_REPLY });
  assert.equal(mailsTo("asha@example.test").length, 1);
  assert.match(mailsTo("asha@example.test")[0].text, /#\/reset-password\?token=/);
  assert.match(mailsTo("asha@example.test")[0].text, new RegExp(`${RESET_LINK_MINUTES} minutes`));

  await PasswordReset.updateMany({}, { $set: { createdAt: new Date(Date.now() - 5 * 60_000) } });
  const byId = await ask(person.employeeId.toLowerCase().replace("-", ""));
  assert.deepEqual(byId.body, { message: SAME_REPLY });
  assert.equal(mailsTo("asha@example.test").length, 2);
});

test("the reply is the same for unknown, blocked and deleted accounts, and they get no email", async () => {
  await User.create(userFields({ email: "blocked@example.test", isBanned: true }));
  await User.create(userFields({ email: "gone@example.test", isDeleted: true }));

  for (const login of ["nobody@example.test", "BT-9999", "blocked@example.test", "gone@example.test", "", "not an email"]) {
    const reply = await ask(login);
    assert.equal(reply.status, 200, login);
    assert.deepEqual(reply.body, { message: SAME_REPLY }, login);
  }
  assert.equal(sent.length, 0);
  assert.equal(await PasswordReset.countDocuments(), 0);
});

test("only a scrambled copy of the token is stored, never the token itself", async () => {
  await asha();
  await ask("asha@example.test");
  const token = tokenFrom("asha@example.test");
  const [stored] = await PasswordReset.find().lean();

  assert.ok(token.length >= 43, "at least 32 random bytes");
  assert.equal(stored.tokenHash, sha256(token));
  assert.doesNotMatch(JSON.stringify(stored), new RegExp(token));
});

test("one link every 2 minutes, and at most 5 an hour, per account", async () => {
  await asha();
  await ask("asha@example.test");
  await ask("asha@example.test");
  assert.equal(mailsTo("asha@example.test").length, 1, "a second ask within 2 minutes sends nothing");

  for (let i = 0; i < 6; i++) {
    await PasswordReset.updateMany({}, { $set: { createdAt: new Date(Date.now() - (3 + i) * 60_000) } });
    const reply = await ask("asha@example.test");
    assert.deepEqual(reply.body, { message: SAME_REPLY });
  }
  assert.equal(mailsTo("asha@example.test").length, 5);
});

// --- using a link ---

test("a link sets the new password in Keycloak, ends every session and says so by email", async () => {
  const person = await asha();
  await ask("asha@example.test");

  const reply = await reset(tokenFrom("asha@example.test"));

  assert.equal(reply.status, 200);
  assert.equal(reply.body.success, true);
  const [, args] = kc.calls.find(([name]) => name === "resetPassword");
  assert.equal(args.id, person.keycloakId);
  assert.deepEqual(args.credential, { type: "password", value: "Brand-New-Pass-1", temporary: false });
  assert.ok(kc.calls.some(([name, a]) => name === "logout" && a.id === person.keycloakId));
  const changed = mailsTo("asha@example.test").at(-1);
  assert.match(changed.subject, /password was changed/i);
  assert.doesNotMatch(changed.text, /Brand-New-Pass-1/);
});

test("a link works only once, even when used twice at the same moment", async () => {
  await asha();
  await ask("asha@example.test");
  const token = tokenFrom("asha@example.test");

  const replies = await Promise.all([reset(token), reset(token)]);
  assert.deepEqual(replies.map((r) => r.status).sort(), [200, 400]);
  assert.equal(kc.calls.filter(([name]) => name === "resetPassword").length, 1);
  assert.equal((await reset(token)).status, 400);
});

test("a link stops working after 30 minutes", async () => {
  await asha();
  await ask("asha@example.test");
  await PasswordReset.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });

  const reply = await reset(tokenFrom("asha@example.test"));
  assert.equal(reply.status, 400);
  assert.match(reply.body.message, /expired or was already used/);
  assert.equal(reply.body.code, "link-gone");
  assert.equal(kc.calls.length, 0);
});

test("a new link cancels the older ones", async () => {
  await asha();
  await ask("asha@example.test");
  const first = tokenFrom("asha@example.test");
  await PasswordReset.updateMany({}, { $set: { createdAt: new Date(Date.now() - 5 * 60_000) } });
  await ask("asha@example.test");
  const second = tokenFrom("asha@example.test");

  assert.notEqual(first, second);
  const old = await reset(first);
  assert.deepEqual([old.status, old.body.code], [400, "link-gone"]);
  assert.equal((await reset(second)).status, 200);
});

test("a made-up token, a short password or a missing field changes nothing", async () => {
  await asha();
  await ask("asha@example.test");
  const token = tokenFrom("asha@example.test");

  assert.equal((await reset("x".repeat(43))).status, 400);
  assert.equal((await reset(token, "short")).status, 400);
  assert.equal((await call(resetPassword, { token })).status, 400);
  assert.equal((await call(resetPassword, {})).status, 400);
  assert.equal(kc.calls.length, 0);
  // the link still works after those
  assert.equal((await reset(token)).status, 200);
});

test("a password Keycloak refuses is explained, and the link can be used again", async () => {
  await asha();
  await ask("asha@example.test");
  const token = tokenFrom("asha@example.test");
  // the admin client's NetworkError: the HTTP reply in `response`, its parsed body in `responseData`
  kc.resetError = Object.assign(new Error("invalidPasswordMinLengthMessage"), {
    response: { status: 400 },
    responseData: { error: "invalidPasswordMinLengthMessage", error_description: "Invalid password: minimum length 12." },
  });

  const refused = await reset(token);
  assert.equal(refused.status, 400);
  assert.equal(refused.body.message, "Invalid password: minimum length 12.");

  kc.resetError = null;
  assert.equal((await reset(token, "A-Much-Longer-Password-1")).status, 200);
});

test("when Keycloak is down, the link stays usable and no internal text is sent", async () => {
  await asha();
  await ask("asha@example.test");
  const token = tokenFrom("asha@example.test");
  kc.resetError = new Error("connect ECONNREFUSED 127.0.0.1:8080");

  const reply = await reset(token);
  assert.equal(reply.status, 502);
  assert.doesNotMatch(JSON.stringify(reply.body), /ECONNREFUSED|127\.0\.0\.1/);

  kc.resetError = null;
  assert.equal((await reset(token)).status, 200);
});

// --- the company's older admin reset links ---

test("listing the old reset links is for admins only", () => {
  const layer = resetLinkRoutes.stack.find((l) => l.route?.path === "/" && l.route.methods.get);
  assert.ok(layer.route.stack.some((s) => s.handle === requireAdmin));
});

test("old reset links get an unguessable token", async () => {
  const reply = await call(generateResetLink, { userEmail: "asha@example.test", userRole: "Employee" }, { user: { id: "64b7f0f0f0f0f0f0f0f0f0f1" } });
  assert.equal(reply.status, 201);
  const { resetToken } = await ResetLink.findOne().lean();
  assert.match(resetToken, /^[A-Za-z0-9_-]{43,}$/);
});

test("the old reset-link routes don't send internal error text", async () => {
  // an unknown role fails the model's checks inside the handler
  const made = await call(generateResetLink, { userEmail: "asha@example.test", userRole: "Pilot" }, { user: { id: "64b7f0f0f0f0f0f0f0f0f0f1" } });
  assert.equal(made.status, 500);
  assert.equal(made.body.error, undefined);
  // a role pattern that breaks the database query
  const listed = await call(getResetLinksByRole, undefined, { query: { role: "(" } });
  assert.equal(listed.body?.error, undefined);
});
