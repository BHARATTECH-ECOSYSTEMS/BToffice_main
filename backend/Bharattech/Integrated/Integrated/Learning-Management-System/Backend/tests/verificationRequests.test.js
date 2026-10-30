const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

// Emails are caught here instead of sent; `failMail` makes the next ones fail, as a dead mail server would.
const nodemailer = require("nodemailer");
const sent = [];
let failMail = false;
nodemailer.createTransport = () => ({
  sendMail: async (mail) => {
    if (failMail) throw new Error("mail server down");
    sent.push(mail);
    return { messageId: `test-${sent.length}` };
  },
});
process.env.SMTP_HOST = process.env.SMTP_HOST || "127.0.0.1";

const User = require("../models/User");
const Verification = require("../models/Verification");
const Notification = require("../models/Notification");
const verificationRoutes = require("../routes/verificationRoutes");
const verificationRequestRoutes = require("../routes/verificationRequestRoutes");
const { todayInIndia } = require("../utils/days");

let server;
let root;

// The public form route as server.js mounts it (no sign-in), and the admin routes behind a stand-in for keycloakAuth.
before(async () => {
  await connectTestDb();
  const app = express();
  app.use(express.json());
  app.use("/api/verification-requests", verificationRequestRoutes);
  app.use(
    "/api/verifications",
    (req, _res, next) => {
      req.user = JSON.parse(req.get("x-test-user"));
      next();
    },
    verificationRoutes
  );
  await new Promise((resolve) => (server = app.listen(0, "127.0.0.1", resolve)));
  root = `http://127.0.0.1:${server.address().port}/api`;
});
beforeEach(async () => {
  await clearTestDb();
  sent.length = 0;
  failMail = false;
});
after(async () => {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  await disconnectTestDb();
});

const call = async (method, path, body, who) => {
  const res = await fetch(root + path, {
    method,
    headers: { "Content-Type": "application/json", ...(who ? { "x-test-user": JSON.stringify({ id: String(who._id), role: who.role, email: who.email, fullName: who.fullName }) } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};
const submit = (body) => call("POST", "/verification-requests", body);
/** Emails go after the reply; wait for them to arrive (or for nothing more to come). */
const settle = async () => {
  let last = -1;
  while (last !== sent.length) {
    last = sent.length;
    await new Promise((r) => setTimeout(r, 150));
  }
};

const month = (back) => {
  const [y, m] = todayInIndia().split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 - back, 1));
  return d.toISOString().slice(0, 7);
};
const form = (overrides = {}) => ({
  requesterCompany: "Acme Hiring Pvt Ltd",
  requesterName: "Riya Sen",
  requesterEmail: "Riya.Sen@Acme.Example",
  candidate: "Asha Rao",
  designation: "Software Engineer",
  employeeId: "bt-0001",
  from: month(30),
  to: month(2),
  consent: true,
  ...overrides,
});

const people = async () => ({
  superadmin: await User.create(userFields({ role: "Superadmin", fullName: "Sana Iyer" })),
  admin: await User.create(userFields({ role: "Admin", fullName: "Test Admin" })),
  oldAdmin: await User.create(userFields({ role: "Admin", fullName: "Gone Admin", isDeleted: true })),
  subadmin: await User.create(userFields({ role: "Subadmin", fullName: "Test Subadmin" })),
  employee: await User.create(userFields({ role: "Employee", fullName: "Kabir Das" })),
});
const listAs = async (who) => (await call("GET", "/verifications?kind=employment", undefined, who)).body;

test("the website's form needs no sign-in, files the request and answers with a reference", async () => {
  await people();
  const first = await submit(form());
  assert.equal(first.status, 201, JSON.stringify(first.body));
  assert.equal(first.body.reference, "VR-0001");
  assert.equal((await submit(form({ candidate: "Kabir Das" }))).body.reference, "VR-0002");

  const saved = await Verification.findOne({ reference: "VR-0001" }).lean();
  assert.equal(saved.kind, "employment");
  assert.equal(saved.status, "pending");
  assert.deepEqual(
    [saved.requesterCompany, saved.requesterName, saved.requesterEmail, saved.candidate, saved.designation, saved.givenEmployeeId, saved.fromMonth, saved.toMonth],
    ["Acme Hiring Pvt Ltd", "Riya Sen", "riya.sen@acme.example", "Asha Rao", "Software Engineer", "BT-0001", month(30), month(2)]
  );
  assert.ok(saved.consentAt instanceof Date, "when consent was given is kept");
  assert.equal(saved.openedByName, "Riya Sen (Acme Hiring Pvt Ltd)");
  assert.deepEqual(saved.log.map((e) => [e.by, e.text]), [["Riya Sen (Acme Hiring Pvt Ltd)", "Sent the request from the website"]]);
  // still working here: no month they left
  const current = await submit(form({ to: "" }));
  assert.equal(current.status, 201);
  assert.equal((await Verification.findOne({ reference: current.body.reference }).lean()).toMonth, "");
});

test("a form with a missing or bad field is refused with a reason, and nothing is saved or sent", async () => {
  await people();
  const bad = [
    form({ requesterCompany: " " }),
    form({ requesterCompany: "x".repeat(121) }),
    form({ requesterName: "" }),
    form({ requesterEmail: "not-an-email" }),
    form({ candidate: "" }),
    form({ candidate: "x".repeat(81) }),
    form({ designation: "" }),
    form({ employeeId: "BT 0001; drop" }),
    form({ from: "" }),
    form({ from: "2024-13" }),
    form({ from: "March 2024" }),
    form({ from: month(-2) }),
    form({ to: month(-1) }),
    form({ from: month(2), to: month(5) }),
    form({ consent: false }),
    form({ consent: "yes" }),
    { ...form(), consent: undefined },
  ];
  for (const body of bad) {
    const res = await submit(body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.ok(res.body.message);
  }
  await settle();
  assert.equal(await Verification.countDocuments(), 0);
  assert.equal(sent.length, 0);
  assert.equal(await Notification.countDocuments(), 0);
});

test("a filled-in hidden field (a bot) gets a calm answer, and nothing is saved, sent or noted", async () => {
  await people();
  const res = await submit(form({ website: "https://spam.example" }));
  assert.equal(res.status, 202);
  assert.equal(res.body.reference, undefined);
  await settle();
  assert.equal(await Verification.countDocuments(), 0);
  assert.equal(sent.length, 0);
  assert.equal(await Notification.countDocuments(), 0);
});

// Review 2026-10-26 M14: anyone can send the form with any address, so a receipt that repeated the form's text let
// people send their own words (a link, say) from the company's address. The receipt now says only our words and the
// reference, and one address gets at most 3 receipts a day.
test("the requester is emailed a receipt with the reference, and none of the text the form sent", async () => {
  await people();
  const { body } = await submit(form({ requesterName: "Click https://evil.example now", candidate: "Visit evil.example", designation: "Pay at evil.example" }));
  await settle();
  const mails = sent.filter((m) => m.to === "riya.sen@acme.example");
  assert.equal(mails.length, 1);
  assert.match(mails[0].subject, /VR-0001/);
  assert.match(mails[0].text, new RegExp(body.reference));
  for (const part of [mails[0].subject, mails[0].text, mails[0].html]) assert.ok(!part.includes("evil"), `nothing the form sent: ${part}`);
});

test("an address gets at most 3 receipts a day; later requests are still filed, and say no receipt went", async () => {
  await people();
  const replies = [];
  for (let i = 0; i < 4; i++) replies.push(await submit(form()));
  await settle();
  assert.deepEqual(replies.map((r) => r.status), [201, 201, 201, 201]);
  assert.equal(sent.filter((m) => m.to === "riya.sen@acme.example").length, 3);
  const fourth = await Verification.findOne({ reference: replies[3].body.reference });
  assert.ok(fourth.log.some((l) => l.text === "No receipt sent: this address already got 3 today"), JSON.stringify(fourth.log));
  // another address still gets its own
  await submit(form({ requesterEmail: "someone@other.example" }));
  await settle();
  assert.equal(sent.filter((m) => m.to === "someone@other.example").length, 1);
});

test("every current Super Admin and Admin gets a bell note, nobody else, and no admin email", async () => {
  const p = await people();
  const { body } = await submit(form());
  const [saved] = await Verification.find({ reference: body.reference }).lean();
  const notes = await Notification.find().lean();
  assert.deepEqual(notes.map((n) => String(n.userId)).sort(), [String(p.superadmin._id), String(p.admin._id)].sort());
  for (const note of notes) {
    assert.equal(note.kind, "verification");
    assert.match(note.title, /VR-0001/);
    assert.match(note.title, /Asha Rao/);
    assert.match(note.detail, /Acme Hiring/);
    assert.equal(note.link, `/portal/verification/requests?file=${saved._id}`);
  }
  await settle();
  assert.deepEqual(sent.map((m) => m.to), ["riya.sen@acme.example"], "only the receipt");
});

test("admins see the request with a lead from the directory: Employee ID first, then the exact name", async () => {
  const p = await people();
  const asha = await User.create(userFields({ role: "Employee", fullName: "Asha Rao", joinedOn: "2023-04-03" }));
  await submit(form({ employeeId: asha.employeeId, candidate: "Someone Else" }));
  await submit(form({ employeeId: "", candidate: "  asha RAO " }));
  const former = await User.create(userFields({ role: "Intern", fullName: "Meera Pillai", isDeleted: true }));
  await submit(form({ employeeId: "", candidate: "Meera Pillai" }));
  await submit(form({ employeeId: "", candidate: "A.*" }));
  await submit(form({ employeeId: "BT-9999", candidate: "Nobody Here" }));

  const list = await listAs(p.admin);
  assert.equal(list.length, 5);
  const byCandidate = Object.fromEntries(list.map((v) => [v.candidate.trim(), v]));
  const ashaLead = { name: "Asha Rao", employeeId: asha.employeeId, role: "Employee", joinedOn: "2023-04-03", current: true };
  assert.deepEqual(byCandidate["Someone Else"].directoryMatch, ashaLead, "by Employee ID");
  assert.deepEqual(byCandidate["asha RAO"].directoryMatch, ashaLead, "by name, any case");
  assert.deepEqual(byCandidate["Meera Pillai"].directoryMatch, { name: "Meera Pillai", employeeId: former.employeeId, role: "Intern", joinedOn: "", current: false }, "people who left still worked here");
  assert.equal(byCandidate["A.*"].directoryMatch, null, "a name is matched as written, not as a pattern");
  assert.equal(byCandidate["Nobody Here"].directoryMatch, null);

  const v = byCandidate["Someone Else"];
  assert.deepEqual(
    [v.kind, v.reference, v.requesterCompany, v.requesterName, v.requesterEmail, v.designation, v.employeeId, v.from, v.to, v.answerEmailed],
    ["employment", "VR-0001", "Acme Hiring Pvt Ltd", "Riya Sen", "riya.sen@acme.example", "Software Engineer", asha.employeeId, month(30), month(2), false]
  );
  assert.ok(!Number.isNaN(Date.parse(v.consentAt)));
  assert.equal((await call("GET", "/verifications?kind=employment", undefined, p.subadmin)).status, 403);
  assert.equal((await call("GET", "/verifications?kind=employment", undefined, p.employee)).status, 403);
});

test("requests from other companies only come in through the form, not from the admin side", async () => {
  const p = await people();
  const res = await call("POST", "/verifications", { kind: "employment", ...form() }, p.admin);
  assert.equal(res.status, 400);
  assert.match(res.body.message, /website/, "refused for the right reason");
  assert.equal(await Verification.countDocuments(), 0);
});

test("verifying emails the requester a yes about the details they sent, never the admin's note", async () => {
  const p = await people();
  const { body } = await submit(form());
  const [{ id }] = await listAs(p.admin);
  for (const check of ["record", "dates", "designation", "consent"]) {
    assert.equal((await call("PATCH", `/verifications/${id}/checks`, { check, done: true }, p.admin)).status, 200, check);
  }
  sent.length = 0;
  const decided = await call("POST", `/verifications/${id}/decision`, { status: "verified", note: "Checked against the HR file, internal note" }, p.admin);
  assert.equal(decided.status, 200);
  assert.equal(decided.body.answerEmailed, true);
  assert.equal(decided.body.log.at(-1).text, "Emailed the answer to riya.sen@acme.example");
  assert.equal(sent.length, 1);
  const [mail] = sent;
  assert.equal(mail.to, "riya.sen@acme.example");
  assert.match(mail.subject, new RegExp(body.reference));
  assert.match(mail.text, /we confirm the details you sent/i);
  assert.match(mail.text, /Asha Rao/);
  assert.match(mail.text, /Software Engineer/);
  for (const part of [mail.text, mail.html]) assert.ok(!part.includes("internal note"), "the note stays inside");
});

test("rejecting emails a plain 'couldn't confirm'; reopening sends nothing; a new decision answers again", async () => {
  const p = await people();
  await submit(form());
  const [{ id }] = await listAs(p.admin);
  sent.length = 0;
  const rejected = await call("POST", `/verifications/${id}/decision`, { status: "rejected", note: "Left in 2021, dates are wrong" }, p.admin);
  assert.equal(rejected.status, 200);
  assert.equal(sent.length, 1);
  assert.match(sent[0].text, /couldn.t confirm the details you sent/i);
  for (const part of [sent[0].text, sent[0].html]) assert.ok(!part.includes("2021"), "nothing from the note or our records");

  const reopened = await call("POST", `/verifications/${id}/decision`, { status: "pending" }, p.superadmin);
  assert.equal(reopened.body.answerEmailed, false);
  assert.equal(sent.length, 1, "reopening emails nobody");
  await call("POST", `/verifications/${id}/decision`, { status: "rejected", note: "Still wrong" }, p.superadmin);
  assert.equal(sent.length, 2);
});

test("after reopening, an answer that then fails isn't shown as emailed because of the earlier one", async () => {
  const p = await people();
  await submit(form());
  const [{ id }] = await listAs(p.admin);
  assert.equal((await call("POST", `/verifications/${id}/decision`, { status: "rejected", note: "No record" }, p.admin)).body.answerEmailed, true);
  await call("POST", `/verifications/${id}/decision`, { status: "pending" }, p.admin);
  failMail = true;
  const again = await call("POST", `/verifications/${id}/decision`, { status: "rejected", note: "Still no record" }, p.admin);
  assert.equal(again.body.answerEmailed, false);
});

test("an answer email that fails doesn't undo the decision, and the file says to reply by hand", async () => {
  const p = await people();
  await submit(form());
  const [{ id }] = await listAs(p.admin);
  failMail = true;
  const decided = await call("POST", `/verifications/${id}/decision`, { status: "rejected", note: "No record" }, p.admin);
  assert.equal(decided.status, 200);
  assert.equal(decided.body.status, "rejected");
  assert.equal(decided.body.answerEmailed, false);
  assert.match(decided.body.log.at(-1).text, /couldn.t email the answer/i);
});

test("company and employee decisions email nobody outside", async () => {
  const p = await people();
  const company = await call("POST", "/verifications", { kind: "company", company: "Northwind Ltd", registration: "U1", contactEmail: "a@northwind.example" }, p.admin);
  const employee = await call("POST", "/verifications", { kind: "employee", personId: String(p.employee._id) }, p.admin);
  assert.equal(company.status, 201);
  assert.equal(employee.status, 201);
  sent.length = 0;
  // each decision must go through, or "nobody was emailed" proves nothing
  for (const id of [company.body.id, employee.body.id]) {
    const decided = await call("POST", `/verifications/${id}/decision`, { status: "rejected", note: "No" }, p.admin);
    assert.equal(decided.status, 200);
    assert.equal(decided.body.status, "rejected");
  }
  await settle();
  assert.equal(sent.length, 0);
});

test("deleting a pending request takes its bell notes with it", async () => {
  const p = await people();
  await submit(form());
  const [{ id }] = await listAs(p.admin);
  assert.equal(await Notification.countDocuments({ refId: id }), 2);
  assert.equal((await call("DELETE", `/verifications/${id}`, undefined, p.admin)).status, 200);
  assert.equal(await Notification.countDocuments({ refId: id }), 0);
});
