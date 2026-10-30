const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Task = require("../models/Task");
const taskRoutes = require("../routes/taskRoutes");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

let server;
let base;

// The real router behind a stand-in for keycloakAuth (server.js puts the real one in front of /api/tasks): the test
// says who is signed in through req.user.
before(async () => {
  await connectTestDb();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = JSON.parse(req.get("x-test-user"));
    next();
  });
  app.use("/api/tasks", taskRoutes);
  await new Promise((resolve) => (server = app.listen(0, "127.0.0.1", resolve)));
  base = `http://127.0.0.1:${server.address().port}/api/tasks`;
});
beforeEach(async () => {
  await clearTestDb();
  // GridFS makes its collections itself, so the shared clean-up (Mongoose's collections) doesn't empty them
  await Promise.all(["taskFiles.files", "taskFiles.chunks"].map((c) => mongoose.connection.db.collection(c).deleteMany({})));
});
after(async () => {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  await disconnectTestDb();
});

const as = (person) => JSON.stringify({ id: String(person._id), role: person.role, keycloakId: person.keycloakId, email: person.email });

const send = async (who, method, path = "", body) => {
  const res = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", "x-test-user": as(who) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};

const upload = async (who, path, file, fileName, fields = {}) => {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  form.append("file", new Blob([file]), fileName);
  const res = await fetch(base + path, { method: "POST", headers: { "x-test-user": as(who) }, body: form });
  return { status: res.status, body: await res.json() };
};

const people = async () => ({
  superadmin: await User.create(userFields({ role: "Superadmin" })),
  admin: await User.create(userFields({ role: "Admin" })),
  subadmin: await User.create(userFields({ role: "Subadmin" })),
  asha: await User.create(userFields({ role: "Employee", fullName: "Asha Rao" })),
  kabir: await User.create(userFields({ role: "Intern", fullName: "Kabir Das" })),
});

const taskFor = (assignee, by, overrides = {}) =>
  Task.create({ title: "Write the onboarding notes", assignedTo: assignee._id, assignedBy: by._id, assignedEmail: assignee.email, assignedRole: assignee.role, ...overrides });

const PDF = Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n");
const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
const storedFiles = () => mongoose.connection.db.collection("taskFiles.files").countDocuments();

// --- creating ---

test("an admin gives an employee a task with a description, priority and due date", async () => {
  const { admin, asha } = await people();

  const res = await send(admin, "POST", "", { title: "  Write the onboarding notes ", description: "Two pages.", assignedTo: String(asha._id), priority: "High", dueDate: "2026-10-30" });

  assert.equal(res.status, 201);
  assert.equal(res.body.title, "Write the onboarding notes");
  assert.equal(res.body.description, "Two pages.");
  assert.equal(res.body.priority, "High");
  assert.equal(res.body.status, "pending");
  assert.equal(res.body.createdBy, "admin");
  assert.equal(res.body.dueDate.slice(0, 10), "2026-10-30");
  assert.equal(res.body.assignedTo.fullName, "Asha Rao");
});

test("a superadmin's task counts as an admin's, not a sub admin's", async () => {
  const { superadmin, kabir } = await people();

  const res = await send(superadmin, "POST", "", { title: "Field visit report", assignedTo: String(kabir._id) });

  assert.equal(res.status, 201);
  assert.equal(res.body.createdBy, "admin");
});

test("a sub admin can give tasks", async () => {
  const { subadmin, asha } = await people();

  const res = await send(subadmin, "POST", "", { title: "Field visit report", assignedTo: String(asha._id) });

  assert.equal(res.status, 201);
  assert.equal(res.body.createdBy, "subadmin");
});

test("employees and interns can't create tasks, and nothing is saved", async () => {
  const { asha, kabir } = await people();

  for (const who of [asha, kabir]) {
    const res = await send(who, "POST", "", { title: "Do my work for me", assignedTo: String(kabir._id) });
    assert.equal(res.status, 403);
  }
  assert.equal(await Task.countDocuments(), 0);
});

test("tasks go only to employees and interns", async () => {
  const { admin, subadmin, superadmin } = await people();

  for (const target of [admin, subadmin, superadmin]) {
    const res = await send(admin, "POST", "", { title: "Review", assignedTo: String(target._id) });
    assert.equal(res.status, 400);
  }
  assert.equal(await Task.countDocuments(), 0);
});

test("a deleted person can't be given a task", async () => {
  const { admin } = await people();
  const gone = await User.create(userFields({ role: "Employee", isDeleted: true }));

  const res = await send(admin, "POST", "", { title: "Review", assignedTo: String(gone._id) });

  assert.equal(res.status, 400);
});

test("a task needs a sensible title, status, priority and due date", async () => {
  const { admin, asha } = await people();
  const to = String(asha._id);

  for (const body of [
    { title: "   ", assignedTo: to },
    { title: "x".repeat(201), assignedTo: to },
    { title: "Review", assignedTo: to, status: "finished" },
    { title: "Review", assignedTo: to, priority: "Urgent!!" },
    { title: "Review", assignedTo: to, dueDate: "next week" },
    { title: "Review", assignedTo: to, description: "x".repeat(5001) },
    { title: "Review", assignedTo: "not-an-id" },
  ]) {
    const res = await send(admin, "POST", "", body);
    assert.equal(res.status, 400, JSON.stringify(body).slice(0, 80));
  }
  assert.equal(await Task.countDocuments(), 0);
});

// --- seeing ---

test("people see only the tasks given to them", async () => {
  const { admin, asha, kabir } = await people();
  await taskFor(asha, admin, { title: "Asha's task" });
  await taskFor(kabir, admin, { title: "Kabir's task" });

  const res = await send(asha, "GET");

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.map((t) => t.title), ["Asha's task"]);
});

test("the team's task list is for admins and sub admins only, and sub admins see every task", async () => {
  const { admin, subadmin, asha, kabir } = await people();
  await taskFor(asha, admin);
  await taskFor(kabir, subadmin);

  assert.equal((await send(asha, "GET", "/assigned")).status, 403);
  assert.equal((await send(kabir, "GET", "/assigned")).status, 403);
  const res = await send(subadmin, "GET", "/assigned");
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 2);
});

test("one task opens only for the person doing it and for managers", async () => {
  const { admin, subadmin, asha, kabir } = await people();
  const task = await taskFor(asha, admin);

  assert.equal((await send(asha, "GET", `/${task._id}`)).status, 200);
  assert.equal((await send(subadmin, "GET", `/${task._id}`)).status, 200);
  assert.equal((await send(kabir, "GET", `/${task._id}`)).status, 404);
  assert.equal((await send(asha, "GET", "/not-an-id")).status, 404);
});

test("task replies carry only names, emails and roles of the people on it", async () => {
  const { admin, asha } = await people();
  const task = await taskFor(asha, admin);

  const res = await send(asha, "GET", `/${task._id}`);

  assert.deepEqual(Object.keys(res.body.assignedTo).sort(), ["_id", "email", "fullName", "role"]);
  assert.deepEqual(Object.keys(res.body.assignedBy).sort(), ["_id", "email", "fullName", "role"]);
});

// --- updating ---

test("the person doing a task moves its status along", async () => {
  const { admin, asha } = await people();
  const task = await taskFor(asha, admin);

  const res = await send(asha, "PATCH", `/${task._id}/status`, { status: "in-progress" });

  assert.equal(res.status, 200);
  assert.equal((await Task.findById(task._id)).status, "in-progress");
});

test("the company app's status words (\"In Progress\", \"Completed\") are understood", async () => {
  const { admin, asha } = await people();
  const task = await taskFor(asha, admin);

  assert.equal((await send(asha, "PATCH", `/${task._id}`, { status: "In Progress", fileUrl: null })).status, 200);
  assert.equal((await Task.findById(task._id)).status, "in-progress");
  assert.equal((await send(asha, "PATCH", `/${task._id}`, { status: "Completed", fileUrl: null })).status, 200);
  assert.equal((await Task.findById(task._id)).status, "completed");
});

test("a made-up status is refused and the task is left as it was", async () => {
  const { admin, asha } = await people();
  const task = await taskFor(asha, admin);

  assert.equal((await send(asha, "PATCH", `/${task._id}/status`, { status: "whatever" })).status, 400);
  assert.equal((await send(asha, "PATCH", `/${task._id}`, { status: "whatever" })).status, 400);
  assert.equal((await Task.findById(task._id)).status, "pending");
});

test("the person doing a task can't rewrite it", async () => {
  const { admin, asha } = await people();
  const task = await taskFor(asha, admin);

  const res = await send(asha, "PATCH", `/${task._id}`, { title: "Nothing to do" });

  assert.equal(res.status, 403);
  assert.equal((await Task.findById(task._id)).title, "Write the onboarding notes");
});

test("someone else's task can't be touched", async () => {
  const { admin, asha, kabir } = await people();
  const task = await taskFor(asha, admin);

  assert.equal((await send(kabir, "PATCH", `/${task._id}/status`, { status: "completed" })).status, 404);
  assert.equal((await send(kabir, "PATCH", `/${task._id}`, { status: "completed" })).status, 404);
  assert.equal((await Task.findById(task._id)).status, "pending");
});

test("the company app's 'done, here's my file' update keeps the file link", async () => {
  const { admin, asha } = await people();
  const task = await taskFor(asha, admin);

  const res = await send(asha, "PATCH", `/${task._id}`, { status: "completed", fileUrl: "https://drive.example.test/report.pdf" });

  assert.equal(res.status, 200);
  const saved = await Task.findById(task._id);
  assert.equal(saved.status, "completed");
  assert.equal(saved.submissions.length, 1);
  assert.equal(saved.submissions[0].fileUrl, "https://drive.example.test/report.pdf");
});

test("the company app's status update without a file still works", async () => {
  const { admin, asha } = await people();
  const task = await taskFor(asha, admin);

  const res = await send(asha, "PATCH", `/${task._id}`, { status: "in-progress", fileUrl: null });

  assert.equal(res.status, 200);
  assert.equal((await Task.findById(task._id)).submissions.length, 0);
});

test("only web links are kept as files, never javascript: or other schemes", async () => {
  const { admin, asha } = await people();
  const task = await taskFor(asha, admin);

  for (const fileUrl of ["javascript:alert(1)", "data:text/html,hi", "file:///etc/passwd"]) {
    assert.equal((await send(asha, "PATCH", `/${task._id}`, { status: "completed", fileUrl })).status, 400);
    assert.equal((await send(asha, "POST", `/${task._id}/submission`, { fileUrl })).status, 400);
    assert.equal((await send(admin, "POST", `/${task._id}/upload`, { fileUrl })).status, 400);
  }
  const saved = await Task.findById(task._id);
  assert.equal(saved.submissions.length, 0);
  assert.equal(saved.projectFile?.url ?? null, null);
});

test("a superadmin edits any task", async () => {
  const { superadmin, subadmin, asha } = await people();
  const task = await taskFor(asha, subadmin);

  const res = await send(superadmin, "PATCH", `/${task._id}`, { title: "Rewritten", priority: "Low", dueDate: "2026-11-02", status: "in-progress" });

  assert.equal(res.status, 200);
  const saved = await Task.findById(task._id);
  assert.equal(saved.title, "Rewritten");
  assert.equal(saved.priority, "Low");
  assert.equal(saved.status, "in-progress");
});

test("a sub admin edits their own tasks but not an admin's", async () => {
  const { admin, subadmin, asha } = await people();
  const own = await taskFor(asha, subadmin);
  const admins = await taskFor(asha, admin);

  assert.equal((await send(subadmin, "PATCH", `/${own._id}`, { title: "Mine" })).status, 200);
  assert.equal((await send(subadmin, "PATCH", `/${admins._id}`, { title: "Theirs" })).status, 403);
  assert.equal((await Task.findById(admins._id)).title, "Write the onboarding notes");
});

test("a task can't be handed to an admin", async () => {
  const { admin, asha } = await people();
  const task = await taskFor(asha, admin);

  assert.equal((await send(admin, "PATCH", `/${task._id}`, { assignedTo: String(admin._id) })).status, 400);
  assert.equal(String((await Task.findById(task._id)).assignedTo), String(asha._id));
});

test("handing a task to someone else updates who it's for", async () => {
  const { admin, asha, kabir } = await people();
  const task = await taskFor(asha, admin);

  const res = await send(admin, "PATCH", `/${task._id}`, { assignedTo: String(kabir._id) });

  assert.equal(res.status, 200);
  const saved = await Task.findById(task._id);
  assert.equal(saved.assignedEmail, kabir.email);
  assert.equal(saved.assignedRole, "Intern");
});

// --- deleting ---

test("a superadmin deletes any task", async () => {
  const { superadmin, subadmin, asha } = await people();
  const task = await taskFor(asha, subadmin);

  assert.equal((await send(superadmin, "DELETE", `/${task._id}`)).status, 200);
  assert.equal(await Task.countDocuments(), 0);
});

test("a sub admin deletes their own tasks only; employees delete none", async () => {
  const { admin, subadmin, asha } = await people();
  const own = await taskFor(asha, subadmin);
  const admins = await taskFor(asha, admin);

  assert.equal((await send(subadmin, "DELETE", `/${admins._id}`)).status, 403);
  assert.equal((await send(asha, "DELETE", `/${own._id}`)).status, 403);
  assert.equal((await send(subadmin, "DELETE", `/${own._id}`)).status, 200);
  assert.equal(await Task.countDocuments(), 1);
});

// --- files ---

test("a manager attaches a project document; the person doing the task downloads it byte for byte", async () => {
  const { admin, asha } = await people();
  const task = await taskFor(asha, admin);

  const res = await upload(admin, `/${task._id}/upload`, PDF, "brief.pdf");

  assert.equal(res.status, 200);
  assert.equal(res.body.projectFile.fileName, "brief.pdf");
  const file = await fetch(base + res.body.projectFile.url.replace("/api/tasks", ""), { headers: { "x-test-user": as(asha) } });
  assert.equal(file.status, 200);
  assert.equal(file.headers.get("content-type"), "application/pdf");
  assert.match(file.headers.get("content-disposition"), /^attachment;/);
  assert.equal(file.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(Buffer.from(await file.arrayBuffer()), PDF);
});

test("a task's files don't open for someone who can't see the task", async () => {
  const { admin, asha, kabir } = await people();
  const task = await taskFor(asha, admin);
  const { body } = await upload(admin, `/${task._id}/upload`, PDF, "brief.pdf");

  const file = await fetch(base + body.projectFile.url.replace("/api/tasks", ""), { headers: { "x-test-user": as(kabir) } });

  assert.equal(file.status, 404);
});

test("only PDF, Word, Excel, PowerPoint, image and ZIP files are kept, judged by their content", async () => {
  const { admin, asha } = await people();
  const task = await taskFor(asha, admin);

  for (const [file, name] of [
    [Buffer.from("MZ\x90\x00 not a document"), "setup.exe"],
    [Buffer.from("just text pretending"), "fake.pdf"],
    [PDF, "brief.png"],
    [Buffer.from("<script>alert(1)</script>"), "page.html"],
  ]) {
    const res = await upload(admin, `/${task._id}/upload`, file, name);
    assert.equal(res.status, 400, name);
  }
  assert.equal(await storedFiles(), 0);
  assert.equal((await upload(admin, `/${task._id}/upload`, PNG, "diagram.png")).status, 200);
});

test("a file over 20 MB is refused", async () => {
  const { admin, asha } = await people();
  const task = await taskFor(asha, admin);

  const res = await upload(admin, `/${task._id}/upload`, Buffer.concat([PDF, Buffer.alloc(20 * 1024 * 1024)]), "huge.pdf");

  assert.equal(res.status, 413);
  assert.match(res.body.message, /20 MB/);
  assert.equal(await storedFiles(), 0);
});

test("only managers who may change the task attach its document", async () => {
  const { admin, subadmin, asha } = await people();
  const task = await taskFor(asha, admin);

  assert.equal((await upload(asha, `/${task._id}/upload`, PDF, "brief.pdf")).status, 403);
  assert.equal((await upload(subadmin, `/${task._id}/upload`, PDF, "brief.pdf")).status, 403);
  assert.equal(await storedFiles(), 0);
});

test("a new project document replaces the old one's stored file", async () => {
  const { admin, asha } = await people();
  const task = await taskFor(asha, admin);
  assert.equal((await upload(admin, `/${task._id}/upload`, PDF, "brief.pdf")).status, 200);

  // the new one must really be taken, or one stored file would only be the old one left alone
  const replaced = await upload(admin, `/${task._id}/upload`, PNG, "brief-v2.png");
  assert.equal(replaced.status, 200);
  assert.equal(replaced.body.projectFile.fileName, "brief-v2.png");

  assert.equal(await storedFiles(), 1);
});

test("the person doing a task submits their work as a file, and the task is done", async () => {
  const { admin, asha } = await people();
  const task = await taskFor(asha, admin);

  const res = await upload(asha, `/${task._id}/submission`, PDF, "report.pdf", { notes: "First draft" });

  assert.equal(res.status, 200);
  assert.equal(res.body.status, "completed");
  assert.equal(res.body.submissions.length, 1);
  assert.equal(res.body.submissions[0].fileName, "report.pdf");
  assert.equal(res.body.submissions[0].notes, "First draft");
  const file = await fetch(base + res.body.submissions[0].fileUrl.replace("/api/tasks", ""), { headers: { "x-test-user": as(admin) } });
  assert.deepEqual(Buffer.from(await file.arrayBuffer()), PDF);
});

test("nobody else submits work on someone's task", async () => {
  const { admin, asha, kabir } = await people();
  const task = await taskFor(asha, admin);

  assert.equal((await upload(kabir, `/${task._id}/submission`, PDF, "report.pdf")).status, 404);
  assert.equal((await upload(admin, `/${task._id}/submission`, PDF, "report.pdf")).status, 403);
  assert.equal(await storedFiles(), 0);
});

test("deleting a task deletes its stored files too", async () => {
  const { admin, asha } = await people();
  const task = await taskFor(asha, admin);
  assert.equal((await upload(admin, `/${task._id}/upload`, PDF, "brief.pdf")).status, 200);
  assert.equal((await upload(asha, `/${task._id}/submission`, PNG, "photo.png")).status, 200);
  assert.equal(await storedFiles(), 2, "there are files to delete");

  assert.equal((await send(admin, "DELETE", `/${task._id}`)).status, 200);

  assert.equal(await storedFiles(), 0);
});
