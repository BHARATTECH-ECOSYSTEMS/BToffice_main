const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

// Review 2026-10-26 low list, "who may change what" (owner's 3A and 4A): an Admin could change a Super Admin's
// personal email once they had left; an invite with a role nobody knows quietly made an Employee; and a certificate
// could be issued to someone blocked or removed, with a title of any length.

const nodemailer = require("nodemailer");
nodemailer.createTransport = () => ({ sendMail: async () => ({ messageId: "test" }) });
process.env.SMTP_HOST = process.env.SMTP_HOST || "127.0.0.1";

const { installFakeKeycloakAdmin } = require("./helpers/fakeKeycloakAdmin");
const realm = installFakeKeycloakAdmin();

const User = require("../models/User");
const Certificate = require("../models/Certificate");
const { sendInvite } = require("../controllers/inviteController");
const { setMemberPersonalEmail } = require("../controllers/communityController");
const certificateRoutes = require("../routes/certificateRoutes");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

let server;
let root;
before(async () => {
  await connectTestDb();
  const app = express();
  app.use(express.json());
  app.use("/api/certificates", (req, _res, next) => ((req.user = JSON.parse(req.get("x-test-user"))), next()), certificateRoutes);
  await new Promise((resolve) => (server = app.listen(0, "127.0.0.1", resolve)));
  root = `http://127.0.0.1:${server.address().port}/api`;
});
beforeEach(async () => {
  await clearTestDb();
  Object.assign(realm, { accounts: [], passwords: new Map(), calls: [], next: 1 });
});
after(async () => {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  await disconnectTestDb();
});

/** Runs a controller with a stand-in request and answer; console noise is kept quiet. */
const run = async (handler, req) => {
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
    await handler({ body: {}, params: {}, ...req }, res);
  } finally {
    [console.log, console.error, console.warn] = quiet;
  }
  return reply;
};

const issue = async (who, body) => {
  const res = await fetch(`${root}/certificates/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-test-user": JSON.stringify({ id: String(who._id), role: who.role, email: who.email }) },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
};

const leftMember = (overrides) => User.create(userFields({ isDeleted: true, deletedAt: new Date(), leftOn: "2026-06-30", stream: "tech", ...overrides }));

test("an Admin can't change a left Super Admin's personal email; a Super Admin can, and an Admin can for those below", async () => {
  const admin = await User.create(userFields({ role: "Admin" }));
  const superadmin = await User.create(userFields({ role: "Superadmin" }));
  const leftBoss = await leftMember({ role: "Superadmin" });
  const leftStaff = await leftMember({ role: "Employee" });
  const asAdmin = { id: String(admin._id), role: "Admin" };

  const refused = await run(setMemberPersonalEmail, { user: asAdmin, params: { userId: String(leftBoss._id) }, body: { personalEmail: "boss.home@example.net" } });
  assert.equal(refused.status, 403);
  assert.equal((await User.findById(leftBoss._id).lean()).personalEmail ?? "", "");

  const bySuper = await run(setMemberPersonalEmail, { user: { id: String(superadmin._id), role: "Superadmin" }, params: { userId: String(leftBoss._id) }, body: { personalEmail: "boss.home@example.net" } });
  assert.equal(bySuper.status, 200);
  const forStaff = await run(setMemberPersonalEmail, { user: asAdmin, params: { userId: String(leftStaff._id) }, body: { personalEmail: "staff.home@example.net" } });
  assert.equal(forStaff.status, 200);
});

test("an invite with a role nobody knows is refused, and no account is made", async () => {
  for (const role of ["Admn", "owner", ""]) {
    const res = await run(sendInvite, { user: { id: "6a1f00000000000000000001", role: "Superadmin" }, body: { name: "New Hire", email: "new.hire@example.test", role } });
    assert.equal(res.status, 400, `role ${JSON.stringify(role)}`);
    assert.match(res.body.message, /pick a role/i);
  }
  assert.deepEqual(realm.accounts, []);
  // the known names, in any case, still work
  assert.equal((await run(sendInvite, { user: { id: "6a1f00000000000000000001", role: "Superadmin" }, body: { name: "New Hire", email: "new.hire@example.test", role: "sub admin" } })).status, 201);
});

test("no certificate for someone blocked or removed, and none with an overlong title", async () => {
  const admin = await User.create(userFields({ role: "Admin" }));
  const blocked = await User.create(userFields({ isBanned: true }));
  const removed = await User.create(userFields({ isDeleted: true, deletedAt: new Date() }));
  const asha = await User.create(userFields({ fullName: "Asha Rao" }));

  const toBlocked = await issue(admin, { userId: String(blocked._id), title: "Course Completion" });
  assert.equal(toBlocked.status, 409);
  assert.match(toBlocked.body.message, /blocked/i);
  const toRemoved = await issue(admin, { userId: String(removed._id), title: "Course Completion" });
  assert.equal(toRemoved.status, 409);
  assert.match(toRemoved.body.message, /removed/i);
  const long = await issue(admin, { userId: String(asha._id), title: "x".repeat(121) });
  assert.equal(long.status, 400);
  assert.match(long.body.message, /120/);
  assert.equal(await Certificate.countDocuments(), 0);
});
