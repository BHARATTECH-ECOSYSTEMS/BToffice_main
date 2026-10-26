const { test, before, beforeEach, after, afterEach } = require("node:test");
const assert = require("node:assert/strict");

// Owner's 5A (2026-10-25): the invite email has always said "expires in 12 hours", but nothing enforced it, so an
// emailed temporary password worked forever. Now each send is recorded; after 12 hours sign-in and "Set up your
// account" say the invite expired, an hourly check replaces the emailed password (so Keycloak's own sign-in page
// won't take it either), and "Send again" starts a fresh 12 hours. Invites sent before this have no record and are
// left as they were.

const nodemailer = require("nodemailer");
const mail = { sent: [] };
nodemailer.createTransport = () => ({ sendMail: async (message) => (mail.sent.push(message), { messageId: `test-${mail.sent.length}` }) });
process.env.SMTP_HOST = process.env.SMTP_HOST || "127.0.0.1";

const { installFakeKeycloakAdmin } = require("./helpers/fakeKeycloakAdmin");
const realm = installFakeKeycloakAdmin();

const User = require("../models/User");
const InviteSent = require("../models/InviteSent");
const invites = require("../controllers/inviteController");
const { keycloakLogin, acceptInvite } = require("../controllers/authController");
const { INVITE_HOURS, voidExpiredInvites } = require("../utils/inviteExpiry");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

const HOUR = 60 * 60 * 1000;
const realFetch = global.fetch;
// what Keycloak's token endpoint answers: "set up" (right temporary password), "wrong" or a working sign-in
let tokenAnswer = "set up";
const fakeToken = `x.${Buffer.from(JSON.stringify({ sub: "kc-1", preferred_username: "chosen.name", realm_access: { roles: ["Employee"] } })).toString("base64url")}.y`;

before(connectTestDb);
beforeEach(async () => {
  await clearTestDb();
  Object.assign(realm, { accounts: [], passwords: new Map(), calls: [], next: 1 });
  mail.sent = [];
  tokenAnswer = "set up";
  global.fetch = async () =>
    tokenAnswer === "ok"
      ? { ok: true, json: async () => ({ access_token: fakeToken, refresh_token: "r", expires_in: 300 }) }
      : { ok: false, json: async () => ({ error: "invalid_grant", error_description: tokenAnswer === "set up" ? "Account is not fully set up" : "Invalid user credentials" }) };
});
afterEach(() => {
  global.fetch = realFetch;
});
after(disconnectTestDb);

const call = async (handler, { body, params, role = "Admin" } = {}) => {
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
  const quiet = [console.log, console.error, console.warn];
  console.log = console.error = console.warn = () => {};
  try {
    await handler({ user: { id: "6a1f00000000000000000001", role }, body: body || {}, params: params || {} }, res);
  } finally {
    [console.log, console.error, console.warn] = quiet;
  }
  return reply;
};
const invite = (email = "new.hire@example.test") => call(invites.sendInvite, { body: { name: "New Hire", email, role: "Employee" } });
const age = (keycloakId, hours) => InviteSent.updateOne({ keycloakId }, { sentAt: new Date(Date.now() - hours * HOUR) });
const signIn = (username) => call(keycloakLogin, { body: { username, password: "Temp-Password-1" } });
const accept = (username) => call(acceptInvite, { body: { username, temporaryPassword: "Temp-Password-1", newPassword: "Brand-New-Pass-1", newUsername: "chosen.name" } });

test("the invite lasts 12 hours, as its email says", () => {
  assert.equal(INVITE_HOURS, 12);
});

test("sending an invite records when, and 'Send again' starts the 12 hours again", async () => {
  assert.equal((await invite()).status, 201);
  const [made] = realm.accounts;
  const first = await InviteSent.findOne({ keycloakId: made.id }).lean();
  assert.ok(first.sentAt instanceof Date);
  assert.equal(first.email, "new.hire@example.test");

  await age(made.id, 20);
  await InviteSent.updateOne({ keycloakId: made.id }, { voidedAt: new Date() });
  // "Send again" on a pending invite reuses its account
  const resent = await invite();
  assert.equal(resent.status, 200);
  assert.equal(resent.body.resent, true);
  const again = await InviteSent.findOne({ keycloakId: made.id }).lean();
  assert.ok(Date.now() - again.sentAt.getTime() < HOUR);
  assert.equal(again.voidedAt, undefined);
  assert.equal(await InviteSent.countDocuments(), 1);
});

test("within 12 hours the temporary password opens 'Set up your account'; after, sign-in says the invite expired", async () => {
  await invite();
  const [made] = realm.accounts;
  assert.equal((await signIn("new.hire@example.test")).body.requiresPasswordChange, true);

  await age(made.id, INVITE_HOURS + 1);
  for (const login of ["new.hire@example.test", "NEW.HIRE@example.test", made.username]) {
    const reply = await signIn(login);
    assert.equal(reply.status, 410, login);
    assert.equal(reply.body.code, "invite-expired");
    assert.match(reply.body.message, /expired/);
  }
});

test("an expired invite can't be finished: nothing is changed in Keycloak", async () => {
  await invite();
  const [made] = realm.accounts;
  const emailed = realm.passwords.get(made.id);
  await age(made.id, INVITE_HOURS + 1);

  const reply = await accept("new.hire@example.test");

  assert.equal(reply.status, 410);
  assert.equal(realm.passwords.get(made.id), emailed);
  assert.deepEqual(realm.accounts[0].requiredActions, ["UPDATE_PASSWORD"]);
});

test("finishing an invite in time forgets it; cancelling one forgets it too", async () => {
  await invite();
  const [made] = realm.accounts;
  tokenAnswer = "ok";
  // acceptInvite checks the temporary password first ("set up" proves it), then signs in with the new one
  let first = true;
  global.fetch = async () => {
    const setUp = first;
    first = false;
    return setUp
      ? { ok: false, json: async () => ({ error: "invalid_grant", error_description: "Account is not fully set up" }) }
      : { ok: true, json: async () => ({ access_token: fakeToken, refresh_token: "r", expires_in: 300 }) };
  };
  assert.equal((await accept("new.hire@example.test")).status, 200);
  assert.equal(await InviteSent.countDocuments({ keycloakId: made.id }), 0);

  await invite("other@example.test");
  const other = realm.accounts.find((a) => a.email === "other@example.test");
  assert.equal((await call(invites.cancelPendingInvite, { params: { id: other.id } })).status, 200);
  assert.equal(await InviteSent.countDocuments(), 0);
});

test("the hourly check replaces only expired invites' emailed passwords, and only for accounts still waiting", async () => {
  await invite("late@example.test");
  await invite("fresh@example.test");
  await invite("done@example.test");
  const [late, fresh, done] = realm.accounts;
  await age(late.id, INVITE_HOURS + 1);
  await age(done.id, INVITE_HOURS + 1);
  done.requiredActions = []; // finished on Keycloak's own page
  // an older invite from before this change: no record, left alone
  realm.accounts.push({ id: "kc-legacy", username: "legacy", email: "legacy@example.test", enabled: true, createdTimestamp: Date.now() - 48 * HOUR, requiredActions: ["UPDATE_PASSWORD"], realmRoles: ["Employee"] });
  const emailed = new Map(realm.accounts.map((a) => [a.id, realm.passwords.get(a.id)]));

  const voided = await voidExpiredInvites();

  assert.equal(voided, 1);
  const replaced = realm.passwords.get(late.id);
  assert.notEqual(replaced.value, emailed.get(late.id).value);
  assert.equal(replaced.temporary, true);
  assert.deepEqual(realm.accounts.find((a) => a.id === late.id).requiredActions, ["UPDATE_PASSWORD"]);
  assert.ok((await InviteSent.findOne({ keycloakId: late.id })).voidedAt);
  assert.equal(realm.passwords.get(fresh.id), emailed.get(fresh.id));
  assert.equal(realm.passwords.get(done.id), emailed.get(done.id));
  assert.equal(await InviteSent.countDocuments({ keycloakId: done.id }), 0);
  assert.equal(realm.passwords.get("kc-legacy"), undefined);

  // a second run finds nothing new to do
  assert.equal(await voidExpiredInvites(), 0);
  // the emailed password is now wrong at Keycloak, and sign-in still explains why
  tokenAnswer = "wrong";
  assert.equal((await signIn("late@example.test")).status, 410);
});

test("a wrong password for an invite still in time, or for someone with no invite, stays a plain refusal", async () => {
  await invite();
  tokenAnswer = "wrong";
  assert.equal((await signIn("new.hire@example.test")).status, 401);
  assert.equal((await signIn("nobody@example.test")).status, 401);
});

test("pending invites say when each was last sent and whether it has expired", async () => {
  await invite("late@example.test");
  await invite("fresh@example.test");
  const [late] = realm.accounts;
  await age(late.id, INVITE_HOURS + 1);

  const reply = await call(invites.listPendingInvites);

  const byEmail = Object.fromEntries(reply.body.map((p) => [p.email, p]));
  assert.equal(byEmail["late@example.test"].expired, true);
  assert.equal(byEmail["fresh@example.test"].expired, false);
  assert.ok(Date.now() - Date.parse(byEmail["late@example.test"].invitedAt) > INVITE_HOURS * HOUR);
});

test("someone who already has a record isn't sent a fresh password, so no invite clock starts for them", async () => {
  await User.create(userFields({ email: "back@example.test", keycloakId: "kc-1" }));
  realm.accounts.push({ id: "kc-1", username: "back", email: "back@example.test", enabled: true, createdTimestamp: Date.now(), requiredActions: [], realmRoles: ["Employee"] });
  assert.equal((await invite("back@example.test")).status, 409);
  assert.equal(await InviteSent.countDocuments(), 0);
});
