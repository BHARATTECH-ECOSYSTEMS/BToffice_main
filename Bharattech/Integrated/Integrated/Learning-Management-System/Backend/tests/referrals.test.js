const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const mongoose = require("mongoose");

// Emails are caught here instead of sent; `mail.failFor` makes one address fail, `mail.down` makes mail unusable.
const nodemailer = require("nodemailer");
const mail = { sent: [], failFor: new Set(), down: false };
nodemailer.createTransport = () => {
  if (mail.down) throw new Error("Invite email is not configured. Set EMAIL_USER and EMAIL_PASS.");
  return {
    sendMail: async (message) => {
      if (mail.failFor.has(message.to)) throw new Error(`550 mailbox ${message.to} unavailable`);
      mail.sent.push(message);
      return { messageId: `test-${mail.sent.length}` };
    },
  };
};
process.env.SMTP_HOST = process.env.SMTP_HOST || "127.0.0.1";

// The community controller loads the Keycloak admin client; these tests never reach Keycloak.
class FakeKcAdminClient {
  constructor() {
    this.users = {};
  }
  async auth() {}
}
require("./helpers/fakeKeycloakAdmin").stubKeycloakAdminPackage(FakeKcAdminClient);

const User = require("../models/User");
const Referral = require("../models/Referral");
const communityRoutes = require("../routes/communityRoutes");
const { todayInIndia } = require("../utils/days");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

let server;
let root;

before(async () => {
  await connectTestDb();
  const app = express();
  app.use(express.json());
  app.use("/api/community", (req, _res, next) => ((req.user = JSON.parse(req.get("x-test-user"))), next()), communityRoutes);
  await new Promise((resolve) => (server = app.listen(0, "127.0.0.1", resolve)));
  root = `http://127.0.0.1:${server.address().port}/api/community`;
});
beforeEach(async () => {
  await clearTestDb();
  Object.assign(mail, { sent: [], failFor: new Set(), down: false });
});
after(async () => {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  await disconnectTestDb();
});

const header = (p) => ({ "x-test-user": JSON.stringify({ id: String(p._id), role: p.role, email: p.email, fullName: p.fullName }) });
const call = async (who, method, path, body) => {
  const res = await fetch(root + path, { method, headers: { "Content-Type": "application/json", ...header(who) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};
const share = (who, body) => call(who, "POST", "/referrals", body);
const list = (who) => call(who, "GET", "/referrals");

const people = async () => ({
  superadmin: await User.create(userFields({ role: "Superadmin", fullName: "Sana Iyer" })),
  admin: await User.create(userFields({ role: "Admin", fullName: "Test Admin" })),
  subadmin: await User.create(userFields({ role: "Subadmin", fullName: "Test Subadmin" })),
  asha: await User.create(userFields({ role: "Employee", fullName: "Asha Rao", stream: "tech", personalEmail: "asha.staff@example.net" })),
  kabir: await User.create(userFields({ role: "Intern", fullName: "Kabir Das" })),
});
const member = (stream, personalEmail) =>
  User.create(userFields({ role: "Employee", stream, isDeleted: true, deletedAt: new Date(), leftOn: "2026-06-30", ...(personalEmail ? { personalEmail } : {}) }));

const GO = { stream: "tech", title: "  Backend Engineer (Go) ", company: " Northwind Logistics ", link: "https://northwind.example.com/careers?team=platform&level=2", note: " Ask for Meghna. " };

test("an admin shares a referral: it's saved, and each member of that stream with a personal email gets one email", async () => {
  const p = await people();
  await member("tech", "neha.home@example.net");
  await member("tech", "tanvi.home@example.net");
  await member("tech"); // no personal email
  await member("finance", "farah.home@example.net"); // another stream
  await User.create(userFields({ role: "Employee", stream: "tech", isDeleted: true, deletedAt: new Date(), personalEmail: "deleted.only@example.net" })); // deleted, not left

  const res = await share(p.admin, GO);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const { referral } = res.body;
  assert.deepEqual(
    { ...referral, id: undefined, sharedOn: undefined },
    { id: undefined, stream: "tech", title: "Backend Engineer (Go)", company: "Northwind Logistics", link: GO.link, note: "Ask for Meghna.", sharedBy: "Test Admin", sharedOn: undefined, emailed: 2, failed: 0 }
  );
  assert.ok(!Number.isNaN(Date.parse(referral.sharedOn)));
  const saved = await Referral.findById(referral.id).lean();
  assert.deepEqual([saved.emailed, saved.failed, String(saved.sharedBy)], [2, 0, String(p.admin._id)]);

  assert.deepEqual(mail.sent.map((m) => m.to).sort(), ["neha.home@example.net", "tanvi.home@example.net"]);
  for (const m of mail.sent) {
    assert.equal(m.cc, undefined);
    assert.equal(m.bcc, undefined);
  }
  assert.ok(!JSON.stringify(res.body).includes("@example.net"), "no member's address goes back to the page");
});

test("the email says what the role is, where to apply, and how to stop these emails; typed text is escaped", async () => {
  const p = await people();
  await member("tech", "neha.home@example.net");
  await share(p.admin, { ...GO, note: "R&D team <b>urgent</b>" });
  const [m] = mail.sent;
  assert.match(m.subject, /Backend Engineer \(Go\) at Northwind Logistics/);
  for (const part of ["Backend Engineer (Go)", "Northwind Logistics", "R&D team <b>urgent</b>", GO.link, "reply and ask"]) assert.ok(m.text.includes(part), part);
  assert.ok(m.html.includes("R&amp;D team &lt;b&gt;urgent&lt;/b&gt;"), "the note is escaped in the HTML");
  assert.ok(!m.html.includes("<b>urgent"), "nothing typed becomes HTML");
  assert.ok(m.html.includes(GO.link.replace(/&/g, "&amp;")), "the link is in the HTML, escaped");
});

test("a note's line breaks reach the email, in the text and in the HTML (step 16)", async () => {
  const p = await people();
  await member("tech", "neha.home@example.net");
  await share(p.admin, { ...GO, note: "Ask for Meghna.\nMention <the portal>\r\nBefore Friday" });
  const [m] = mail.sent;
  assert.ok(m.text.includes("Ask for Meghna.\nMention <the portal>\r\nBefore Friday"));
  assert.ok(m.html.includes("Ask for Meghna.<br>Mention &lt;the portal&gt;<br>Before Friday"), m.html);
});

test("Super Admins share too; Sub Admins, employees and interns can't, and nothing is saved or sent", async () => {
  const p = await people();
  await member("tech", "neha.home@example.net");
  for (const who of [p.subadmin, p.asha, p.kabir]) {
    const res = await share(who, GO);
    assert.equal(res.status, 403, who.role);
  }
  assert.equal(await Referral.countDocuments(), 0);
  assert.equal(mail.sent.length, 0);
  assert.equal((await share(p.superadmin, GO)).status, 201);
});

test("every field is checked, and a refusal says what to fix", async () => {
  const p = await people();
  const refused = [
    [{ ...GO, title: "  " }, /role/i],
    [{ ...GO, company: "" }, /company/i],
    [{ ...GO, title: "x".repeat(121) }, /120/],
    [{ ...GO, company: "x".repeat(121) }, /120/],
    [{ ...GO, note: "x".repeat(501) }, /500/],
    [{ ...GO, stream: "sales" }, /stream/i],
    [{ ...GO, link: "javascript:alert(1)" }, /http/],
    [{ ...GO, link: "ftp://northwind.example.com" }, /http/],
    [{ ...GO, link: "northwind.example.com" }, /http/],
    [{ ...GO, link: `https://example.com/${"x".repeat(2048)}` }, /2048/],
    [{ ...GO, title: 42 }, /role/i],
  ];
  for (const [body, pattern] of refused) {
    const res = await share(p.admin, body);
    assert.equal(res.status, 400, JSON.stringify(body).slice(0, 80));
    assert.match(res.body.message, pattern);
  }
  assert.equal(await Referral.countDocuments(), 0);
  // the link and the note are optional
  const plain = await share(p.admin, { stream: "hr", title: "HR Generalist", company: "Contoso" });
  assert.equal(plain.status, 201);
  assert.deepEqual([plain.body.referral.link, plain.body.referral.note], ["", ""]);
});

test("with nobody to email it's still shared, and says so", async () => {
  const p = await people();
  await member("tech");
  const res = await share(p.admin, GO);
  assert.equal(res.status, 201);
  assert.deepEqual([res.body.referral.emailed, res.body.referral.failed], [0, 0]);
  assert.equal(mail.sent.length, 0);
});

test("one email that fails doesn't stop the others, is counted, and the log never names the address", async () => {
  const p = await people();
  for (const address of ["a.home@example.net", "b.home@example.net", "c.home@example.net"]) await member("tech", address);
  mail.failFor.add("b.home@example.net");
  const logged = [];
  const original = console.error;
  console.error = (...args) => logged.push(args.map(String).join(" "));
  let res;
  try {
    res = await share(p.admin, GO);
  } finally {
    console.error = original;
  }
  assert.equal(res.status, 201);
  assert.deepEqual([res.body.referral.emailed, res.body.referral.failed], [2, 1]);
  assert.equal(mail.sent.length, 2);
  assert.ok(logged.length >= 1, "the failure is logged");
  assert.ok(!logged.some((line) => line.includes("@")), `no address in the log: ${logged.join(" | ")}`);
});

test("with no mail settings the referral is still saved, and every email counts as failed", async () => {
  const p = await people();
  await member("tech", "neha.home@example.net");
  await member("tech", "tanvi.home@example.net");
  mail.down = true;
  const res = await share(p.admin, GO);
  assert.equal(res.status, 201);
  assert.deepEqual([res.body.referral.emailed, res.body.referral.failed], [0, 2]);
  assert.equal(await Referral.countDocuments(), 1);
});

test("Super Admins, Admins and Sub Admins see the referrals, newest first; employees and interns don't", async () => {
  const p = await people();
  await share(p.admin, { stream: "finance", title: "Accounts Executive", company: "Contoso" });
  await share(p.superadmin, GO);
  for (const who of [p.superadmin, p.admin, p.subadmin]) {
    const res = await list(who);
    assert.equal(res.status, 200, who.role);
    assert.deepEqual(res.body.map((r) => [r.title, r.sharedBy]), [["Backend Engineer (Go)", "Sana Iyer"], ["Accounts Executive", "Test Admin"]]);
  }
  for (const who of [p.asha, p.kabir]) assert.equal((await list(who)).status, 403, who.role);
});

test("Super Admins and Admins remove a referral; nobody else can", async () => {
  const p = await people();
  const { id } = (await share(p.admin, GO)).body.referral;
  for (const who of [p.subadmin, p.asha]) assert.equal((await call(who, "DELETE", `/referrals/${id}`)).status, 403, who.role);
  assert.equal((await call(p.admin, "DELETE", "/referrals/not-an-id")).status, 400);
  assert.equal((await call(p.admin, "DELETE", `/referrals/${new mongoose.Types.ObjectId()}`)).status, 404);
  assert.equal(await Referral.countDocuments(), 1);
  assert.equal((await call(p.superadmin, "DELETE", `/referrals/${id}`)).status, 200);
  assert.equal(await Referral.countDocuments(), 0);
  assert.deepEqual((await list(p.admin)).body, []);
});

test("the stream counts from the person's community, today's leavers included", async () => {
  const p = await people();
  await User.create(userFields({ role: "Employee", stream: "tech", isDeleted: true, deletedAt: new Date(), leftOn: todayInIndia(), personalEmail: "today.home@example.net" }));
  await share(p.admin, GO);
  assert.deepEqual(mail.sent.map((m) => m.to), ["today.home@example.net"]);
});
