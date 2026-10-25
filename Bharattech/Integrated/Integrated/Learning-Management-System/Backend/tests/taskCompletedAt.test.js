const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Task = require("../models/Task");
const taskRoutes = require("../routes/taskRoutes");
// Owner's 3A (2026-10-25): a task remembers when it was finished (completedAt), whichever way it got to "completed",
// and forgets it if it is reopened. Old tasks have none.
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

test("a task marked completed remembers when, and the reply carries it", async () => {
  const { admin, asha } = await people();
  const task = await taskFor(asha, admin);
  assert.equal((await send(asha, "GET", `/${task._id}`)).body.completedAt, null);

  const before = Date.now();
  const res = await send(asha, "PATCH", `/${task._id}/status`, { status: "completed" });

  assert.equal(res.status, 200);
  const at = Date.parse(res.body.completedAt);
  assert.ok(at >= before - 1000 && at <= Date.now() + 1000, "completedAt is the moment it was finished");
  assert.equal(Date.parse((await send(asha, "GET", `/${task._id}`)).body.completedAt), at);
});

test("handing in work, the edit form and the company app's status words all set it", async () => {
  const { admin, asha } = await people();
  const handedIn = await taskFor(asha, admin);
  const edited = await taskFor(asha, admin);
  const companyApp = await taskFor(asha, admin);

  assert.equal((await upload(asha, `/${handedIn._id}/submission`, PNG, "work.png", { notes: "Done" })).status, 200);
  assert.equal((await send(admin, "PATCH", `/${edited._id}`, { status: "completed" })).status, 200);
  assert.equal((await send(asha, "PATCH", `/${companyApp._id}`, { status: "Completed", fileUrl: null })).status, 200);

  for (const t of [handedIn, edited, companyApp]) assert.ok((await Task.findById(t._id)).completedAt instanceof Date);
});

test("saving a finished task again keeps the first finish time; reopening it clears the time", async () => {
  const { admin, asha } = await people();
  const task = await taskFor(asha, admin);
  await send(asha, "PATCH", `/${task._id}/status`, { status: "completed" });
  const first = (await Task.findById(task._id)).completedAt.getTime();

  await new Promise((r) => setTimeout(r, 20));
  await send(admin, "PATCH", `/${task._id}`, { title: "Write the onboarding notes (v2)" });
  await send(asha, "PATCH", `/${task._id}/status`, { status: "completed" });
  assert.equal((await Task.findById(task._id)).completedAt.getTime(), first);

  await send(asha, "PATCH", `/${task._id}/status`, { status: "in-progress" });
  assert.equal((await Task.findById(task._id)).completedAt, undefined);
  assert.equal((await send(asha, "GET", `/${task._id}`)).body.completedAt, null);
});

test("a task created already completed gets its time; one created open has none", async () => {
  const { admin, asha } = await people();

  const done = await send(admin, "POST", "", { title: "Already done", assignedTo: String(asha._id), status: "completed" });
  const open = await send(admin, "POST", "", { title: "Still to do", assignedTo: String(asha._id) });

  assert.equal(done.status, 201);
  assert.ok(done.body.completedAt);
  assert.equal(open.body.completedAt, null);
});
