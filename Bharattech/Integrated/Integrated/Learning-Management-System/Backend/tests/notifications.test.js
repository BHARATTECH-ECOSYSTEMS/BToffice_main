const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

// Emails are caught here instead of sent; the mailer asks nodemailer for a transport each time it sends.
const nodemailer = require("nodemailer");
const sent = [];
nodemailer.createTransport = () => ({ sendMail: async (mail) => (sent.push(mail), { messageId: `test-${sent.length}` }) });
process.env.SMTP_HOST = process.env.SMTP_HOST || "127.0.0.1";

const User = require("../models/User");
const Task = require("../models/Task");
const Policy = require("../models/Policy");
const Notification = require("../models/Notification");
const taskRoutes = require("../routes/taskRoutes");
const notificationRoutes = require("../routes/notificationRoutes");
const { notifyCertificateIssued, notifyPolicyPublished } = require("../utils/notify");

let server;
let base;

before(async () => {
  await connectTestDb();
  const app = express();
  app.use(express.json());
  // stand-in for keycloakAuth (server.js puts the real one in front of both routers)
  app.use((req, _res, next) => {
    req.user = JSON.parse(req.get("x-test-user"));
    next();
  });
  app.use("/api/tasks", taskRoutes);
  app.use("/api/notifications", notificationRoutes);
  await new Promise((resolve) => (server = app.listen(0, "127.0.0.1", resolve)));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
beforeEach(async () => {
  await clearTestDb();
  sent.length = 0;
});
after(async () => {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  await disconnectTestDb();
});

const as = (p) => JSON.stringify({ id: String(p._id), role: p.role, email: p.email, fullName: p.fullName });
const send = async (who, method, path, body) => {
  const res = await fetch(base + path, { method, headers: { "Content-Type": "application/json", "x-test-user": as(who) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};
const people = async () => ({
  admin: await User.create(userFields({ role: "Admin", fullName: "Test Admin" })),
  subadmin: await User.create(userFields({ role: "Subadmin", fullName: "Test Subadmin" })),
  asha: await User.create(userFields({ role: "Employee", fullName: "Asha Rao" })),
  kabir: await User.create(userFields({ role: "Intern", fullName: "Kabir Das" })),
});
const notesOf = async (who) => (await send(who, "GET", "/notifications")).body;
const mailsTo = (person) => sent.filter((m) => m.to === person.email);

// --- the hooks: tasks ---

test("giving a task leaves a note for the person and emails them", async () => {
  const { admin, asha } = await people();

  await send(admin, "POST", "/tasks", { title: "Write the onboarding notes", assignedTo: String(asha._id), dueDate: "2026-10-30" });

  const { notes, unread } = await notesOf(asha);
  assert.equal(unread, 1);
  assert.equal(notes[0].kind, "task");
  assert.match(notes[0].title, /Write the onboarding notes/);
  assert.equal(notes[0].link, "/portal");
  assert.equal(mailsTo(asha).length, 1);
  assert.match(mailsTo(asha)[0].subject, /Write the onboarding notes/);
});

test("someone who switched task emails off still gets the note, but no email", async () => {
  const { admin, asha } = await people();
  await User.updateOne({ _id: asha._id }, { mutedNotifications: ["tasks"] });

  await send(admin, "POST", "/tasks", { title: "Quiet task", assignedTo: String(asha._id) });

  assert.equal((await notesOf(asha)).unread, 1);
  assert.equal(mailsTo(asha).length, 0);
});

test("a blocked account gets no email", async () => {
  const { admin } = await people();
  const blocked = await User.create(userFields({ role: "Employee", isBanned: true }));

  await send(admin, "POST", "/tasks", { title: "Task", assignedTo: String(blocked._id) });

  assert.equal(mailsTo(blocked).length, 0);
});

test("handing in work tells whoever gave the task", async () => {
  const { subadmin, asha } = await people();
  const { body: task } = await send(subadmin, "POST", "/tasks", { title: "Field visit report", assignedTo: String(asha._id) });

  await send(asha, "PATCH", `/tasks/${task._id}`, { status: "completed", fileUrl: "https://drive.example.test/report.pdf" });

  const { notes } = await notesOf(subadmin);
  assert.equal(notes.length, 1);
  assert.equal(notes[0].kind, "work-handed-in");
  assert.match(notes[0].title, /Field visit report/);
  assert.match(notes[0].detail, /Asha Rao/);
});

test("handing a task to someone else tells the new person; changing it tells the person doing it", async () => {
  const { admin, asha, kabir } = await people();
  const { body: task } = await send(admin, "POST", "/tasks", { title: "Review", assignedTo: String(asha._id) });

  await send(admin, "PATCH", `/tasks/${task._id}`, { assignedTo: String(kabir._id) });
  await send(admin, "PATCH", `/tasks/${task._id}`, { dueDate: "2026-11-05" });

  const kabirs = (await notesOf(kabir)).notes.map((n) => n.kind);
  assert.deepEqual(kabirs, ["task-update", "task"]);
});

test("a status change by the person doing the task notifies nobody", async () => {
  const { admin, asha } = await people();
  const { body: task } = await send(admin, "POST", "/tasks", { title: "Review", assignedTo: String(asha._id) });

  await send(asha, "PATCH", `/tasks/${task._id}/status`, { status: "in-progress" });

  assert.equal((await notesOf(admin)).notes.length, 0);
  assert.equal((await notesOf(asha)).notes.length, 1);
});

test("deleting a task removes its notes", async () => {
  const { admin, asha } = await people();
  const { body: task } = await send(admin, "POST", "/tasks", { title: "Review", assignedTo: String(asha._id) });

  await send(admin, "DELETE", `/tasks/${task._id}`);

  assert.equal((await notesOf(asha)).notes.length, 0);
});

test("the email escapes the task's title and links into the portal", async () => {
  const { admin, asha } = await people();

  await send(admin, "POST", "/tasks", { title: "<script>alert(1)</script>", assignedTo: String(asha._id) });

  const [mail] = mailsTo(asha);
  assert.doesNotMatch(mail.html, /<script>/);
  assert.match(mail.html, /&lt;script&gt;/);
  assert.match(mail.html, /href="[^"]*\/#\/portal"/);
});

// --- the hooks: certificates and policies (helpers the routes call) ---

test("issuing a certificate leaves a note for its person and emails them", async () => {
  const { admin, asha } = await people();
  const certificate = { _id: new mongoose.Types.ObjectId(), title: "Course Completion" };

  await notifyCertificateIssued({ certificate, recipient: asha, issuer: admin });

  const { notes } = await notesOf(asha);
  assert.equal(notes[0].kind, "certificate");
  assert.match(notes[0].title, /Course Completion/);
  assert.equal(notes[0].link, "/portal/certificates");
  assert.equal(mailsTo(asha).length, 1);
});

test("publishing a policy emails employees and interns, not managers", async () => {
  const { admin, subadmin, asha, kabir } = await people();
  await User.updateOne({ _id: kabir._id }, { mutedNotifications: ["policies"] });
  const policy = await Policy.create({ name: "Leave Policy", pages: 4, category: "Policies", pdfName: "leave.pdf", storedFileName: "x.pdf", pdfUrl: "/x", uploadedBy: "Admin" });

  await notifyPolicyPublished(policy);

  assert.equal(mailsTo(asha).length, 1);
  assert.equal(mailsTo(kabir).length, 0);
  assert.equal(mailsTo(admin).length + mailsTo(subadmin).length, 0);
});

// --- policies to review: a live to-do ---

test("employees see each policy they haven't accepted; accepting it removes the note", async () => {
  const { asha } = await people();
  const policy = await Policy.create({ name: "Leave Policy", pages: 4, category: "Policies", pdfName: "leave.pdf", storedFileName: "x.pdf", pdfUrl: "/x", uploadedBy: "Admin" });

  const first = await notesOf(asha);
  assert.equal(first.notes.length, 1);
  assert.equal(first.notes[0].kind, "policy");
  assert.equal(first.notes[0].link, "/portal/policy");

  await Policy.updateOne({ _id: policy._id }, { $push: { acceptedBy: { userId: String(asha._id), acceptedAt: new Date() } } });
  assert.equal((await notesOf(asha)).notes.length, 0);
});

test("a policy note keeps its read state and isn't duplicated however often the bell asks", async () => {
  const { asha } = await people();
  await Policy.create({ name: "Leave Policy", pages: 4, category: "Policies", pdfName: "leave.pdf", storedFileName: "x.pdf", pdfUrl: "/x", uploadedBy: "Admin" });
  const [note] = (await notesOf(asha)).notes;

  await send(asha, "POST", `/notifications/${note.id}/read`);
  await Promise.all([notesOf(asha), notesOf(asha), notesOf(asha)]);

  const after = await notesOf(asha);
  assert.equal(after.notes.length, 1);
  assert.equal(after.notes[0].read, true);
  assert.equal(after.unread, 0);
});

test("managers get no policy to-dos", async () => {
  const { admin } = await people();
  await Policy.create({ name: "Leave Policy", pages: 4, category: "Policies", pdfName: "leave.pdf", storedFileName: "x.pdf", pdfUrl: "/x", uploadedBy: "Admin" });

  assert.equal((await notesOf(admin)).notes.length, 0);
});

// --- reading ---

test("people see only their own notes, newest first", async () => {
  const { admin, asha, kabir } = await people();
  await send(admin, "POST", "/tasks", { title: "First", assignedTo: String(asha._id) });
  await send(admin, "POST", "/tasks", { title: "Second", assignedTo: String(asha._id) });
  await send(admin, "POST", "/tasks", { title: "Kabir's", assignedTo: String(kabir._id) });

  const titles = (await notesOf(asha)).notes.map((n) => n.title);
  assert.equal(titles.length, 2);
  assert.match(titles[0], /Second/);
});

test("marking one note read, and someone else's can't be touched", async () => {
  const { admin, asha, kabir } = await people();
  await send(admin, "POST", "/tasks", { title: "One", assignedTo: String(asha._id) });
  const [note] = (await notesOf(asha)).notes;

  assert.equal((await send(kabir, "POST", `/notifications/${note.id}/read`)).status, 404);
  assert.equal((await send(asha, "POST", `/notifications/${note.id}/read`)).status, 200);
  assert.equal((await notesOf(asha)).unread, 0);
  assert.equal((await send(asha, "POST", "/notifications/not-an-id/read")).status, 404);
});

test("mark all read touches only your own notes", async () => {
  const { admin, asha, kabir } = await people();
  await send(admin, "POST", "/tasks", { title: "A", assignedTo: String(asha._id) });
  await send(admin, "POST", "/tasks", { title: "K", assignedTo: String(kabir._id) });

  await send(asha, "POST", "/notifications/read-all");

  assert.equal((await notesOf(asha)).unread, 0);
  assert.equal((await notesOf(kabir)).unread, 1);
});

test("the bell shows the latest 50 notes", async () => {
  const { asha } = await people();
  await Notification.insertMany(Array.from({ length: 60 }, (_, i) => ({ userId: asha._id, kind: "task", title: `T${i}`, link: "/portal", refId: `r${i}` })));

  assert.equal((await notesOf(asha)).notes.length, 50);
});

test("notes are removed automatically after 90 days", () => {
  const ttl = Notification.schema.indexes().find(([fields, opts]) => fields.createdAt === 1 && opts.expireAfterSeconds);
  assert.ok(ttl, "a TTL index on createdAt");
  assert.equal(ttl[1].expireAfterSeconds, 90 * 24 * 60 * 60);
});

// --- email switches ---

test("email switches are saved on the account; unknown kinds are refused", async () => {
  const { asha } = await people();

  assert.deepEqual((await send(asha, "GET", "/notifications/prefs")).body, { muted: [] });
  assert.equal((await send(asha, "PATCH", "/notifications/prefs", { muted: ["tasks", "policies"] })).status, 200);
  assert.deepEqual((await send(asha, "GET", "/notifications/prefs")).body, { muted: ["tasks", "policies"] });
  assert.equal((await send(asha, "PATCH", "/notifications/prefs", { muted: ["everything"] })).status, 400);
  assert.equal((await send(asha, "PATCH", "/notifications/prefs", { muted: "tasks" })).status, 400);
});
