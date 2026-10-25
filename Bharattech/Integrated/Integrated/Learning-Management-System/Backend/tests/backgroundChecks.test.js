const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

// Emails are caught here instead of sent.
const nodemailer = require("nodemailer");
const sent = [];
nodemailer.createTransport = () => ({ sendMail: async (mail) => (sent.push(mail), { messageId: `test-${sent.length}` }) });
process.env.SMTP_HOST = process.env.SMTP_HOST || "127.0.0.1";

const User = require("../models/User");
const Verification = require("../models/Verification");
const verificationRoutes = require("../routes/verificationRoutes");
const idDocumentRoutes = require("../routes/idDocumentRoutes");
const { deleteDueIdDocuments } = require("../utils/leaverDocuments");

/*
 * The employee checks beyond Aadhaar and PAN: education certificates and a previous employer's letter (PDF uploads),
 * "This is my first job" and "Not applicable" for previous employment. References stays a plain tick.
 */

let server;
let root;

// The real routers behind a stand-in for keycloakAuth (server.js signs everyone in first).
before(async () => {
  await connectTestDb();
  const app = express();
  app.use(express.json());
  const signIn = (req, _res, next) => {
    req.user = JSON.parse(req.get("x-test-user"));
    next();
  };
  app.use("/api/verifications", signIn, verificationRoutes);
  app.use("/api/verification-documents", signIn, idDocumentRoutes);
  await new Promise((resolve) => (server = app.listen(0, "127.0.0.1", resolve)));
  root = `http://127.0.0.1:${server.address().port}/api`;
});
beforeEach(async () => {
  await clearTestDb();
  // the file store's own collections aren't models, so clearTestDb doesn't reach them
  await Promise.all(["idDocuments.files", "idDocuments.chunks"].map((name) => mongoose.connection.db.collection(name).deleteMany({})));
  sent.length = 0;
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
const PDF = Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n");
const upload = async (who, kind, file = PDF) => {
  const form = new FormData();
  form.append("file", new Blob([file], { type: "application/pdf" }), `${kind}.pdf`);
  const res = await fetch(`${root}/verification-documents/mine/${kind}`, { method: "PUT", headers: header(who), body: form });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};
const download = (who, path) => fetch(`${root}/verification-documents${path}`, { headers: header(who) });
const storedFiles = () => mongoose.connection.db.collection("idDocuments.files").find().toArray();
const tick = (who, id, check, done = true) => call(who, "PATCH", `/verifications/${id}/checks`, { check, done });
const skip = (who, id, check, reason) => call(who, "POST", `/verifications/${id}/not-applicable`, reason === undefined ? { check } : { check, reason });
const firstJob = (who, value) => call(who, "PUT", "/verification-documents/mine/first-job", { firstJob: value });
const logOf = async (id) => (await Verification.findById(id).lean()).log.map((e) => `${e.by}: ${e.text}`);

const people = async () => ({
  superadmin: await User.create(userFields({ role: "Superadmin", fullName: "Sana Iyer" })),
  admin: await User.create(userFields({ role: "Admin", fullName: "Test Admin" })),
  subadmin: await User.create(userFields({ role: "Subadmin", fullName: "Test Subadmin" })),
  asha: await User.create(userFields({ role: "Employee", fullName: "Asha Rao" })),
  kabir: await User.create(userFields({ role: "Intern", fullName: "Kabir Das" })),
});
const startFor = async (p, person) => {
  const res = await call(p.admin, "POST", "/verifications", { kind: "employee", personId: String(person._id) });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.id;
};

/* ── Education ── */

test("education: the employee uploads up to 3 PDFs, each in its own slot, each logged by name", async () => {
  const p = await people();
  const id = await startFor(p, p.asha);
  for (const kind of ["degree", "marksheet", "class12"]) assert.equal((await upload(p.asha, kind)).status, 200, kind);
  const mine = (await call(p.asha, "GET", "/verification-documents/mine")).body;
  assert.deepEqual(mine.documents.map((d) => d.kind), ["degree", "marksheet", "class12"]);
  assert.equal((await storedFiles()).length, 3);
  assert.deepEqual((await logOf(id)).slice(-3), ["Asha Rao: Uploaded the Degree certificate", "Asha Rao: Uploaded the Final marksheet", "Asha Rao: Uploaded the Class 12 marksheet"]);
  // a fourth slot doesn't exist
  assert.equal((await upload(p.asha, "diploma")).status, 400);
  assert.equal((await storedFiles()).length, 3);
});

test("education can be ticked once at least one certificate is there, not before", async () => {
  const p = await people();
  const id = await startFor(p, p.asha);
  const early = await tick(p.admin, id, "education");
  assert.equal(early.status, 409);
  assert.match(early.body.message, /at least one/i);
  await upload(p.asha, "aadhaar");
  assert.equal((await tick(p.admin, id, "education")).status, 409, "an Aadhaar isn't an education certificate");
  await upload(p.asha, "class12");
  assert.equal((await tick(p.admin, id, "education")).status, 200);
});

test("admins open an education file and the opening is logged; a sub admin can't", async () => {
  const p = await people();
  const id = await startFor(p, p.asha);
  await upload(p.asha, "marksheet");
  const res = await download(p.admin, `/${id}/marksheet/file`);
  assert.equal(res.status, 200);
  assert.ok(Buffer.from(await res.arrayBuffer()).equals(PDF));
  assert.equal((await logOf(id)).at(-1), "Test Admin: Opened the Final marksheet");
  assert.equal((await download(p.subadmin, `/${id}/marksheet/file`)).status, 403);
  assert.equal((await download(p.asha, "/mine/marksheet/file")).status, 200, "their own");
});

/* ── Previous employment ── */

test("previous employment: the letter is an upload, and the check waits for it", async () => {
  const p = await people();
  const id = await startFor(p, p.asha);
  const early = await tick(p.admin, id, "employment");
  assert.equal(early.status, 409);
  assert.match(early.body.message, /letter/i);
  assert.equal((await upload(p.asha, "experience")).status, 200);
  assert.equal((await logOf(id)).at(-1), "Asha Rao: Uploaded the Relieving or experience letter");
  assert.equal((await tick(p.admin, id, "employment")).status, 200);
});

test("\"This is my first job\" marks previous employment not applicable, and can be undone by the employee", async () => {
  const p = await people();
  const id = await startFor(p, p.asha);
  const said = await firstJob(p.asha, true);
  assert.equal(said.status, 200, JSON.stringify(said.body));
  assert.deepEqual(said.body.notApplicable, [{ check: "employment", byYou: true }]);
  const saved = await Verification.findById(id).lean();
  assert.ok(saved.done.includes("employment"), "it counts toward verifying");
  assert.deepEqual(saved.notApplicable.map((n) => [n.check, n.byEmployee, n.by]), [["employment", true, "Asha Rao"]]);
  assert.equal((await logOf(id)).at(-1), "Asha Rao: Said this is their first job");
  assert.equal((await firstJob(p.asha, true)).status, 200, "saying it twice changes nothing");
  assert.equal((await Verification.findById(id).lean()).notApplicable.length, 1);

  // with it marked, a letter would contradict it
  const letter = await upload(p.asha, "experience");
  assert.equal(letter.status, 409);
  assert.match(letter.body.message, /first job/i);
  assert.equal((await storedFiles()).length, 0);

  const undone = await firstJob(p.asha, false);
  assert.equal(undone.status, 200);
  assert.deepEqual(undone.body.notApplicable, []);
  const back = await Verification.findById(id).lean();
  assert.ok(!back.done.includes("employment"));
  assert.equal((await logOf(id)).at(-1), "Asha Rao: Said it isn't their first job after all");
  assert.equal((await upload(p.asha, "experience")).status, 200, "now the letter can go up");
});

test("\"first job\" is refused once a letter is uploaded, before HR asks, after a decision, or when it isn't yes or no", async () => {
  const p = await people();
  assert.equal((await firstJob(p.asha, true)).status, 409, "nothing asked for yet");
  const id = await startFor(p, p.asha);
  assert.equal((await firstJob(p.asha, "yes")).status, 400);
  await upload(p.asha, "experience");
  const res = await firstJob(p.asha, true);
  assert.equal(res.status, 409);
  assert.match(res.body.message, /letter/i);
  await call(p.admin, "POST", `/verifications/${id}/decision`, { status: "rejected", note: "Incomplete" });
  assert.equal((await firstJob(p.asha, false)).status, 409);
});

test("the employee can't undo a not-applicable that HR set", async () => {
  const p = await people();
  const id = await startFor(p, p.asha);
  assert.equal((await skip(p.admin, id, "employment", "Joined straight from college")).status, 200);
  const mine = (await call(p.asha, "GET", "/verification-documents/mine")).body;
  assert.deepEqual(mine.notApplicable, [{ check: "employment", byYou: false }], "they see it, without HR's reason");
  const res = await firstJob(p.asha, false);
  assert.equal(res.status, 409);
  assert.match(res.body.message, /HR marked/);
  assert.ok((await Verification.findById(id).lean()).done.includes("employment"));
});

/* ── References: a plain tick ── */

test("references is a plain tick: nothing to provide, nothing stored, and it can't be skipped", async () => {
  const p = await people();
  const id = await startFor(p, p.asha);
  assert.equal((await tick(p.admin, id, "references")).status, 200);
  assert.equal((await tick(p.admin, id, "references", false)).status, 200);
  // there's no references form: the name is just an unknown file kind
  assert.equal((await call(p.asha, "PUT", "/verification-documents/mine/references", { references: [] })).status, 400);
  assert.equal((await skip(p.admin, id, "references", "Fresher")).status, 400);
  const saved = await Verification.findById(id).lean();
  assert.ok(!("references" in saved), "no references field");
  assert.deepEqual(saved.notApplicable, []);
  assert.ok(!("references" in (await call(p.asha, "GET", "/verification-documents/mine")).body));
});

/* ── Not applicable ── */

test("HR marks previous employment not applicable with a reason: it counts, and it's logged", async () => {
  const p = await people();
  const id = await startFor(p, p.asha);
  const res = await skip(p.admin, id, "employment", "  Joined straight   from college ");
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.ok(res.body.done.includes("employment"));
  assert.equal(res.body.notApplicable.length, 1);
  const [na] = res.body.notApplicable;
  assert.deepEqual([na.check, na.reason, na.by, na.byEmployee], ["employment", "Joined straight from college", "Test Admin", false]);
  assert.ok(!Number.isNaN(Date.parse(na.at)));
  assert.equal((await logOf(id)).at(-1), "Test Admin: Marked Previous employment not applicable: Joined straight from college");
});

test("not applicable needs a reason, a check that may be skipped, a pending employee request and an admin", async () => {
  const p = await people();
  const id = await startFor(p, p.asha);
  const company = await call(p.admin, "POST", "/verifications", { kind: "company", company: "Northwind Ltd", registration: "U1", contactEmail: "a@northwind.example" });
  const refused = [
    [await skip(p.admin, id, "employment"), 400],
    [await skip(p.admin, id, "employment", "   "), 400],
    [await skip(p.admin, id, "employment", "x".repeat(301)), 400],
    [await skip(p.admin, id, "education", "No degree"), 400],
    [await skip(p.admin, id, "aadhaar", "Lost it"), 400],
    [await skip(p.admin, id, "pan", "Lost it"), 400],
    [await skip(p.admin, company.body.id, "employment", "Why not"), 400],
    [await skip(p.subadmin, id, "employment", "Why not"), 403],
    [await skip(p.asha, id, "employment", "Why not"), 403],
    [await skip(p.admin, "not-an-id", "employment", "Why not"), 404],
  ];
  for (const [res, status] of refused) {
    assert.equal(res.status, status, JSON.stringify(res.body));
    assert.ok(res.body.message);
  }
  const saved = await Verification.findById(id).lean();
  assert.deepEqual([saved.done, saved.notApplicable], [[], []]);

  assert.equal((await skip(p.superadmin, id, "employment", "Fresher")).status, 200);
  assert.equal((await skip(p.admin, id, "employment", "Again")).status, 409, "already marked");
  await call(p.admin, "POST", `/verifications/${id}/decision`, { status: "rejected", note: "Incomplete" });
  const decided = await skip(p.admin, id, "employment", "Fresher");
  assert.equal(decided.status, 409);
  assert.match(decided.body.message, /decided/, "refused for being decided, not as a clash");
});

test("unticking a not-applicable check clears it, so it needs the letter or a new reason again", async () => {
  const p = await people();
  const id = await startFor(p, p.asha);
  await skip(p.admin, id, "employment", "Fresher");
  const res = await tick(p.admin, id, "employment", false);
  assert.equal(res.status, 200);
  assert.deepEqual([res.body.done, res.body.notApplicable], [[], []]);
  assert.equal((await tick(p.admin, id, "employment")).status, 409, "no letter, no reason");
});

test("ticking a check that's already marked not applicable is fine: it's counted already", async () => {
  const p = await people();
  const id = await startFor(p, p.asha);
  await skip(p.admin, id, "employment", "Fresher");
  const again = await tick(p.admin, id, "employment");
  assert.equal(again.status, 200, JSON.stringify(again.body));
  assert.equal(again.body.notApplicable.length, 1, "the mark stays");
});

test("a request is verified with every check ticked or not applicable", async () => {
  const p = await people();
  const id = await startFor(p, p.asha);
  for (const kind of ["aadhaar", "pan", "degree"]) await upload(p.asha, kind);
  for (const check of ["aadhaar", "pan", "education", "references"]) assert.equal((await tick(p.admin, id, check)).status, 200, check);
  assert.equal((await call(p.admin, "POST", `/verifications/${id}/decision`, { status: "verified" })).status, 409, "previous employment still open");
  await firstJob(p.asha, true);
  const verified = await call(p.admin, "POST", `/verifications/${id}/decision`, { status: "verified" });
  assert.equal(verified.status, 200, JSON.stringify(verified.body));
  assert.equal(verified.body.status, "verified");
});

/* ── Removal ── */

test("deleting a pending request deletes every uploaded file with it", async () => {
  const p = await people();
  const id = await startFor(p, p.asha);
  for (const kind of ["aadhaar", "degree", "experience"]) await upload(p.asha, kind);
  assert.equal((await storedFiles()).length, 3);
  assert.equal((await call(p.admin, "DELETE", `/verifications/${id}`)).status, 200);
  assert.equal((await storedFiles()).length, 0);
  assert.equal(await Verification.countDocuments(), 0);
});

test("60 days after someone leaves, every upload is deleted, and it's logged once", async () => {
  const p = await people();
  const id = await startFor(p, p.asha);
  for (const kind of ["pan", "class12", "experience"]) await upload(p.asha, kind);
  await User.updateOne({ _id: p.asha._id }, { $set: { isDeleted: true, deletedAt: new Date(), leftOn: "2025-12-31" } });

  assert.equal(await deleteDueIdDocuments({ today: "2026-03-01" }), 1);
  const after = await Verification.findById(id).lean();
  assert.deepEqual(after.documents, []);
  assert.equal(after.log.at(-1).text, "Deleted the uploaded documents automatically, 60 days after they left");
  assert.equal((await storedFiles()).length, 0);
  assert.equal(await deleteDueIdDocuments({ today: "2026-03-01" }), 0, "nothing left to do");
});

test("the employee is asked for every upload when HR opens their verification", async () => {
  const p = await people();
  await startFor(p, p.asha);
  const mail = sent.find((m) => m.to === p.asha.email);
  assert.match(mail.text, /education/i);
  assert.match(mail.text, /letter/i);
  assert.ok(!/references/i.test(mail.text), "references aren't asked for");
});
