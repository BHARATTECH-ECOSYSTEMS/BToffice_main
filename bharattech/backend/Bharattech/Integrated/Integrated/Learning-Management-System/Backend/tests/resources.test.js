const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const User = require("../models/User");
const Resource = require("../models/Resource");
const resourceRoutes = require("../routes/resource");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

let server;
let base;

// The real router behind a stand-in for keycloakAuth: the test says who is signed in through req.user.
before(async () => {
  await connectTestDb();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = JSON.parse(req.get("x-test-user"));
    next();
  });
  app.use("/api/resources", resourceRoutes);
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  base = `http://127.0.0.1:${server.address().port}/api/resources`;
});
beforeEach(clearTestDb);
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await disconnectTestDb();
});

const as = (person) => ({ id: String(person._id), role: person.role, keycloakId: person.keycloakId, email: person.email });

const send = async (who, method, path = "", body) => {
  const res = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", "x-test-user": JSON.stringify(as(who)) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
};

const people = async () => ({
  admin: await User.create(userFields({ role: "Admin" })),
  superadmin: await User.create(userFields({ role: "Superadmin" })),
  subadmin: await User.create(userFields({ role: "Subadmin" })),
  asha: await User.create(userFields({ role: "Employee", fullName: "Asha Rao" })),
  kabir: await User.create(userFields({ role: "Intern", fullName: "Kabir Das" })),
});

const link = (overrides = {}) => Resource.create({ title: "React documentation", link: "https://react.dev/learn", ...overrides });

// --- adding ---

test("an admin adds a web link, with spaces trimmed", async () => {
  const { admin } = await people();

  const res = await send(admin, "POST", "", { title: "  React docs ", link: " https://react.dev/learn " });

  assert.equal(res.status, 201);
  assert.equal(res.body.title, "React docs");
  assert.equal(res.body.link, "https://react.dev/learn");
  assert.equal(await Resource.countDocuments(), 1);
});

test("a superadmin can add links too", async () => {
  const { superadmin } = await people();
  assert.equal((await send(superadmin, "POST", "", { title: "Docs", link: "http://example.test/docs" })).status, 201);
});

test("only http and https links are accepted, so a saved link can never run code when opened", async () => {
  const { admin } = await people();

  for (const bad of ["javascript:alert(1)", "JavaScript:alert(1)", "data:text/html,<script>alert(1)</script>", "ftp://files.example.test", "react.dev", "not a link"]) {
    const res = await send(admin, "POST", "", { title: "Docs", link: bad });
    assert.equal(res.status, 400, bad);
    assert.match(res.body.message, /http/i, bad);
  }
  assert.equal(await Resource.countDocuments(), 0);
});

test("a name or address that is blank or too long is refused", async () => {
  const { admin } = await people();

  const cases = [
    { title: "   ", link: "https://react.dev" },
    { title: "Docs", link: "   " },
    { title: "x".repeat(121), link: "https://react.dev" },
    { title: "Docs", link: `https://example.test/${"a".repeat(2048)}` },
    { title: ["Docs"], link: "https://react.dev" },
  ];
  for (const body of cases) assert.equal((await send(admin, "POST", "", body)).status, 400, JSON.stringify(body).slice(0, 60));
  assert.equal(await Resource.countDocuments(), 0);
});

test("subadmins, employees and interns cannot add links", async () => {
  const { subadmin, asha, kabir } = await people();
  for (const who of [subadmin, asha, kabir]) {
    assert.equal((await send(who, "POST", "", { title: "Docs", link: "https://react.dev" })).status, 403, who.role);
  }
});

// --- assigning ---

test("an admin assigns a link to a person", async () => {
  const { admin, asha } = await people();
  const docs = await link();

  const res = await send(admin, "POST", `/${docs._id}/assign`, { userId: String(asha._id) });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.resource.assignedTo, [String(asha._id)]);
});

test("assigning someone who doesn't exist, or was deleted, is refused", async () => {
  const { admin } = await people();
  const gone = await User.create(userFields({ isDeleted: true, deletedAt: new Date() }));
  const docs = await link();

  const nobody = await send(admin, "POST", `/${docs._id}/assign`, { userId: "64b000000000000000000000" });
  const deleted = await send(admin, "POST", `/${docs._id}/assign`, { userId: String(gone._id) });

  assert.equal(nobody.status, 404);
  assert.equal(deleted.status, 404);
  assert.deepEqual((await Resource.findById(docs._id)).assignedTo, []);
});

test("a malformed person or link id gets a clear 400, not a server error", async () => {
  const { admin, asha } = await people();
  const docs = await link();

  assert.equal((await send(admin, "POST", `/${docs._id}/assign`, { userId: "not-an-id" })).status, 400);
  assert.equal((await send(admin, "POST", "/not-an-id/assign", { userId: String(asha._id) })).status, 400);
});

test("assigning to a link that no longer exists is a 404", async () => {
  const { admin, asha } = await people();
  const res = await send(admin, "POST", "/64b000000000000000000000/assign", { userId: String(asha._id) });
  assert.equal(res.status, 404);
});

test("only admins and superadmins can assign", async () => {
  const { subadmin, asha } = await people();
  const docs = await link();
  assert.equal((await send(subadmin, "POST", `/${docs._id}/assign`, { userId: String(asha._id) })).status, 403);
});

// --- removing a person from a link ---

test("an admin removes one person from a link and the others stay", async () => {
  const { admin, asha, kabir } = await people();
  const docs = await link({ assignedTo: [asha._id, kabir._id] });

  const res = await send(admin, "DELETE", `/${docs._id}/assign/${asha._id}`);

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.resource.assignedTo, [String(kabir._id)]);
  assert.deepEqual((await Resource.findById(docs._id)).assignedTo.map(String), [String(kabir._id)]);
});

test("removing someone also works after their account was deleted", async () => {
  const { admin } = await people();
  const gone = await User.create(userFields({ isDeleted: true, deletedAt: new Date() }));
  const docs = await link({ assignedTo: [gone._id] });

  const res = await send(admin, "DELETE", `/${docs._id}/assign/${gone._id}`);

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.resource.assignedTo, []);
});

test("removing a person: unknown link is 404, malformed ids are 400, non-admins get 403", async () => {
  const { admin, subadmin, asha } = await people();
  const docs = await link({ assignedTo: [asha._id] });

  assert.equal((await send(admin, "DELETE", `/64b000000000000000000000/assign/${asha._id}`)).status, 404);
  assert.equal((await send(admin, "DELETE", `/${docs._id}/assign/not-an-id`)).status, 400);
  assert.equal((await send(subadmin, "DELETE", `/${docs._id}/assign/${asha._id}`)).status, 403);
  assert.equal((await Resource.findById(docs._id)).assignedTo.length, 1);
});

// --- who sees what (the backend's existing rule, kept) ---

test("people see links assigned to them plus links assigned to nobody, never someone else's", async () => {
  const { asha, kabir } = await people();
  await link({ title: "For everyone" });
  await link({ title: "Asha only", assignedTo: [asha._id] });
  await link({ title: "Kabir only", assignedTo: [kabir._id] });

  const titles = (await send(asha, "GET")).body.map((r) => r.title).sort();

  assert.deepEqual(titles, ["Asha only", "For everyone"]);
});

test("admins see every link", async () => {
  const { admin, asha } = await people();
  await link({ title: "For everyone" });
  await link({ title: "Asha only", assignedTo: [asha._id] });

  assert.equal((await send(admin, "GET")).body.length, 2);
});

// --- deleting ---

test("an admin deletes a link; others cannot", async () => {
  const { admin, subadmin } = await people();
  const docs = await link();

  assert.equal((await send(subadmin, "DELETE", `/delete/${docs._id}`)).status, 403);
  assert.equal((await send(admin, "DELETE", `/delete/${docs._id}`)).status, 200);
  assert.equal(await Resource.countDocuments(), 0);
});

test("deleting with a malformed id is a 400, not a server error", async () => {
  const { admin } = await people();
  assert.equal((await send(admin, "DELETE", "/delete/not-an-id")).status, 400);
});
