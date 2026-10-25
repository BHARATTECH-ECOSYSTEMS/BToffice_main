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
const Notification = require("../models/Notification");
const verificationRoutes = require("../routes/verificationRoutes");
const idDocumentRoutes = require("../routes/idDocumentRoutes");

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
const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
const upload = async (who, kind, file = PDF, { fileName = `${kind} scan.pdf`, type = "application/pdf", field = "file" } = {}) => {
  const form = new FormData();
  if (file) form.append(field, new Blob([file], { type }), fileName);
  const res = await fetch(`${root}/verification-documents/mine/${kind}`, { method: "PUT", headers: header(who), body: form });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};
const download = (who, path) => fetch(`${root}/verification-documents${path}`, { headers: header(who) });
const storedFiles = () => mongoose.connection.db.collection("idDocuments.files").find().toArray();

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

test("opening an employee's verification tells them in the bell and by email; a company request tells nobody", async () => {
  const p = await people();
  const id = await startFor(p, p.asha);
  const notes = await Notification.find({ userId: p.asha._id }).lean();
  assert.equal(notes.length, 1);
  assert.deepEqual([notes[0].kind, notes[0].link, notes[0].refId], ["verification", "/portal/profile?docs=1", id]);
  assert.match(notes[0].title, /HR started your verification/);
  assert.match(notes[0].detail, /Aadhaar and PAN/);
  const mail = sent.filter((m) => m.to === p.asha.email);
  assert.equal(mail.length, 1);
  assert.match(mail[0].text, /Aadhaar and PAN/);
  assert.ok(!/switch these emails off/i.test(mail[0].text), "there's no switch for this kind, so the email doesn't offer one");
  assert.equal(await Notification.countDocuments({ userId: { $ne: p.asha._id } }), 0, "nobody else is told");

  sent.length = 0;
  await call(p.admin, "POST", "/verifications", { kind: "company", company: "Northwind Ltd", registration: "U1", contactEmail: "a@northwind.example" });
  assert.equal(await Notification.countDocuments(), 1);
  assert.equal(sent.length, 0);
});

test("an employee sees their own pending verification, with nothing uploaded yet; others see none", async () => {
  const p = await people();
  const nothing = { request: null, documents: [], notApplicable: [] };
  assert.deepEqual((await call(p.asha, "GET", "/verification-documents/mine")).body, nothing);
  const id = await startFor(p, p.asha);
  const mine = await call(p.asha, "GET", "/verification-documents/mine");
  assert.equal(mine.status, 200);
  assert.deepEqual([mine.body.request.id, mine.body.request.status, mine.body.documents], [id, "pending", []]);
  assert.deepEqual((await call(p.kabir, "GET", "/verification-documents/mine")).body, nothing);
});

test("the employee uploads a PDF: it's stored, listed and logged under their name", async () => {
  const p = await people();
  const id = await startFor(p, p.asha);
  const res = await upload(p.asha, "aadhaar");
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.documents.length, 1);
  const [doc] = res.body.documents;
  assert.deepEqual([doc.kind, doc.fileName, doc.size], ["aadhaar", "aadhaar scan.pdf", PDF.length]);
  assert.ok(!Number.isNaN(Date.parse(doc.uploadedAt)));
  assert.ok(!("fileId" in doc), "the store's own id isn't handed out");
  const files = await storedFiles();
  assert.equal(files.length, 1);
  assert.deepEqual([files[0].metadata.kind, files[0].metadata.verificationId], ["aadhaar", id]);
  const saved = await Verification.findById(id).lean();
  assert.deepEqual(saved.log.at(-1).by, "Asha Rao");
  assert.equal(saved.log.at(-1).text, "Uploaded the Aadhaar card");
});

test("an uploaded file's name is only for showing: no folders, and not too long", async () => {
  const p = await people();
  await startFor(p, p.asha);
  const foldered = await upload(p.asha, "aadhaar", PDF, { fileName: "../../uploads\secret/aadhaar final.pdf" });
  assert.equal(foldered.status, 200);
  assert.equal(foldered.body.documents[0].fileName, "aadhaar final.pdf");
  // older browsers sent the whole Windows path
  const windows = await upload(p.asha, "aadhaar", PDF, { fileName: "C:\\Users\\me\\aadhaar final.pdf" });
  assert.equal(windows.body.documents[0].fileName, "aadhaar final.pdf");
  const long = await upload(p.asha, "pan", PDF, { fileName: `${"p".repeat(300)}.pdf` });
  assert.equal(long.body.documents.find((d) => d.kind === "pan").fileName.length, 120);
});

test("an upload that isn't right is refused, and nothing is stored", async () => {
  const p = await people();
  assert.equal((await upload(p.asha, "aadhaar")).status, 409, "nothing was asked for yet");
  await startFor(p, p.asha);
  const refused = [
    [await upload(p.asha, "passport"), 400],
    [await upload(p.asha, "pan", PNG, { fileName: "pan.pdf" }), 400],
    [await upload(p.asha, "pan", Buffer.alloc(1024 * 1024 + 1, 0x25)), 413],
    [await upload(p.asha, "pan", null), 400],
    [await upload(p.asha, "pan", PDF, { field: "pdf" }), 400],
  ];
  for (const [res, status] of refused) {
    assert.equal(res.status, status, JSON.stringify(res.body));
    assert.ok(res.body.message);
  }
  assert.equal((await storedFiles()).length, 0);
});

test("uploading again replaces the file: the old one is deleted at once, and the log says replaced", async () => {
  const p = await people();
  const id = await startFor(p, p.asha);
  await upload(p.asha, "pan");
  const second = await upload(p.asha, "pan", Buffer.concat([PDF, Buffer.from("% second\n")]), { fileName: "pan new.pdf" });
  assert.equal(second.status, 200);
  assert.deepEqual(second.body.documents.map((d) => d.fileName), ["pan new.pdf"]);
  assert.equal((await storedFiles()).length, 1);
  assert.equal((await Verification.findById(id).lean()).log.at(-1).text, "Replaced the PAN card");
});

test("the employee and admins can open a file; nobody else can; every admin opening is logged", async () => {
  const p = await people();
  const id = await startFor(p, p.asha);
  await upload(p.asha, "aadhaar");

  const own = await download(p.asha, "/mine/aadhaar/file");
  assert.equal(own.status, 200);
  assert.ok(Buffer.from(await own.arrayBuffer()).equals(PDF));
  assert.equal(own.headers.get("content-type"), "application/pdf");
  assert.equal(own.headers.get("x-content-type-options"), "nosniff");
  assert.match(own.headers.get("cache-control"), /no-store/);

  const before = (await Verification.findById(id).lean()).log.length;
  for (const who of [p.admin, p.superadmin]) {
    const res = await download(who, `/${id}/aadhaar/file`);
    assert.equal(res.status, 200, who.fullName);
    assert.ok(Buffer.from(await res.arrayBuffer()).equals(PDF));
  }
  const log = (await Verification.findById(id).lean()).log.slice(before).map((e) => `${e.by}: ${e.text}`);
  assert.deepEqual(log, ["Test Admin: Opened the Aadhaar card", "Sana Iyer: Opened the Aadhaar card"]);

  for (const who of [p.subadmin, p.kabir]) assert.equal((await download(who, `/${id}/aadhaar/file`)).status, 403, who.fullName);
  assert.equal((await download(p.kabir, "/mine/aadhaar/file")).status, 404, "Kabir has no file of his own");
  assert.equal((await download(p.admin, `/${id}/pan/file`)).status, 404, "not uploaded");
  assert.equal((await download(p.admin, "/not-an-id/aadhaar/file")).status, 404);
  assert.equal((await download(p.admin, `/${id}/passport/file`)).status, 400);
  assert.equal((await Verification.findById(id).lean()).log.length, before + 2, "refused and missing opens aren't logged as opened");
});

test("admins see the uploads on the request, and can tick Aadhaar and PAN only once they're there", async () => {
  const p = await people();
  const id = await startFor(p, p.asha);
  const early = await call(p.admin, "PATCH", `/verifications/${id}/checks`, { check: "aadhaar", done: true });
  assert.equal(early.status, 409);
  assert.match(early.body.message, /upload/i);

  await upload(p.asha, "aadhaar");
  await upload(p.asha, "pan");
  const [listed] = (await call(p.admin, "GET", "/verifications?kind=employee")).body;
  assert.deepEqual(listed.documents.map((d) => [d.kind, d.size]), [["aadhaar", PDF.length], ["pan", PDF.length]]);
  for (const d of listed.documents) assert.ok(!("fileId" in d));

  // education and previous employment wait for their own uploads (tests/backgroundChecks.test.js)
  await upload(p.asha, "degree");
  await upload(p.asha, "experience");
  for (const check of ["aadhaar", "pan", "education", "employment", "references"]) {
    assert.equal((await call(p.admin, "PATCH", `/verifications/${id}/checks`, { check, done: true })).status, 200, check);
  }
  const verified = await call(p.admin, "POST", `/verifications/${id}/decision`, { status: "verified" });
  assert.equal(verified.status, 200);
  assert.equal(verified.body.status, "verified");
});

test("once decided, the files stay and can be opened, but can't be replaced until it's reopened", async () => {
  const p = await people();
  const id = await startFor(p, p.asha);
  await upload(p.asha, "aadhaar");
  await call(p.admin, "POST", `/verifications/${id}/decision`, { status: "rejected", note: "PAN missing" });
  assert.equal((await upload(p.asha, "aadhaar")).status, 409);
  assert.equal((await download(p.asha, "/mine/aadhaar/file")).status, 200);
  assert.equal((await download(p.admin, `/${id}/aadhaar/file`)).status, 200);
  const mine = (await call(p.asha, "GET", "/verification-documents/mine")).body;
  assert.deepEqual([mine.request.status, mine.documents.length], ["rejected", 1], "the decided request and its files still show");
  await call(p.admin, "POST", `/verifications/${id}/decision`, { status: "pending" });
  assert.equal((await upload(p.asha, "pan")).status, 200, "reopened: uploads work again");
});

test("deleting a pending request deletes its files and the employee's bell note", async () => {
  const p = await people();
  const id = await startFor(p, p.asha);
  await upload(p.asha, "aadhaar");
  await upload(p.asha, "pan");
  assert.equal((await storedFiles()).length, 2);
  assert.equal((await call(p.admin, "DELETE", `/verifications/${id}`)).status, 200);
  assert.equal((await storedFiles()).length, 0);
  assert.equal(await Notification.countDocuments({ refId: id }), 0);
  assert.deepEqual((await call(p.asha, "GET", "/verification-documents/mine")).body, { request: null, documents: [], notApplicable: [] });
});

test("a file name is cleaned on its own too: either slash is a folder, control characters and quotes go", () => {
  const { cleanFileName } = require("../controllers/idDocumentController");
  assert.equal(cleanFileName("C:\\Users\\me\\pan.pdf", "pan"), "pan.pdf");
  assert.equal(cleanFileName("../../etc/pan.pdf", "pan"), "pan.pdf");
  assert.equal(cleanFileName('pa"n\u0007.pdf', "pan"), "pan.pdf");
  assert.equal(cleanFileName("folder/", "aadhaar"), "aadhaar.pdf", "nothing left: a plain name instead");
  assert.equal(cleanFileName(undefined, "pan"), "pan.pdf");
});
