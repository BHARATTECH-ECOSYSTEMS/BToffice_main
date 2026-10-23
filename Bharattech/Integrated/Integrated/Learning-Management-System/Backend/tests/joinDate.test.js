const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

// A stand-in for the Keycloak admin client, put in place before userController loads it (PATCH /me syncs phones).
class FakeKcAdminClient {
  constructor() {
    this.users = { findOne: async ({ id }) => ({ id, attributes: {} }), update: async () => {} };
  }
  async auth() {}
}
require.cache[require.resolve("keycloak-admin")] = { id: "keycloak-admin", loaded: true, exports: { default: FakeKcAdminClient } };

const User = require("../models/User");
const { updateUser, updateCurrentUser, getCurrentUser, getDirectory, getUserById } = require("../controllers/userController");
const { todayInIndia } = require("../utils/days");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

let server;
let base;

// The real handlers behind a stand-in for keycloakAuth: the test says who is signed in through x-test-user.
before(async () => {
  await connectTestDb();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = JSON.parse(req.get("x-test-user"));
    next();
  });
  app.get("/me", getCurrentUser);
  app.patch("/me", updateCurrentUser);
  app.get("/directory", getDirectory);
  app.get("/:id", getUserById);
  app.patch("/:id", updateUser);
  await new Promise((resolve) => (server = app.listen(0, "127.0.0.1", resolve)));
  base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(clearTestDb);
after(async () => {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  await disconnectTestDb();
});

const as = (p) => JSON.stringify({ id: String(p._id), role: p.role, keycloakId: p.keycloakId, email: p.email });

const send = async (who, method, path, body) => {
  const res = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", "x-test-user": as(who) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};

const people = async () => ({
  superadmin: await User.create(userFields({ role: "Superadmin" })),
  admin: await User.create(userFields({ role: "Admin" })),
  employee: await User.create(userFields({ role: "Employee" })),
});

const storedJoinDate = async (person) => (await User.findById(person._id).lean()).joinedOn;

// a year from today in India, the furthest ahead a join date may be
const aYearAhead = () => {
  const today = todayInIndia();
  return `${Number(today.slice(0, 4)) + 1}${today.slice(4)}`;
};

test("an admin sets someone's join date, and it is kept as the day they picked", async () => {
  const { admin, employee } = await people();

  const res = await send(admin, "PATCH", `/${employee._id}`, { joinedOn: "2024-03-01" });

  assert.equal(res.status, 200);
  assert.equal(res.body.joinedOn, "2024-03-01");
  assert.equal(await storedJoinDate(employee), "2024-03-01");
});

test("a join date that isn't a real day in YYYY-MM-DD is refused and nothing changes", async () => {
  const { admin, employee } = await people();
  await User.updateOne({ _id: employee._id }, { joinedOn: "2024-03-01" });

  for (const joinedOn of ["2026-02-30", "01/03/2024", "2024-3-1", "yesterday", 20240301]) {
    const res = await send(admin, "PATCH", `/${employee._id}`, { joinedOn });
    assert.equal(res.status, 400, `${joinedOn} should be refused`);
    assert.match(res.body.message, /join date/i);
  }
  assert.equal(await storedJoinDate(employee), "2024-03-01");
});

test("a join date before 1990 or more than a year ahead is refused as a typo", async () => {
  const { admin, employee } = await people();

  assert.equal((await send(admin, "PATCH", `/${employee._id}`, { joinedOn: "1989-12-31" })).status, 400);
  assert.equal((await send(admin, "PATCH", `/${employee._id}`, { joinedOn: "2999-01-01" })).status, 400);
  assert.equal(await storedJoinDate(employee), undefined);

  // the edges themselves are fine: someone may be set up now for a start date up to a year away
  assert.equal((await send(admin, "PATCH", `/${employee._id}`, { joinedOn: "1990-01-01" })).status, 200);
  assert.equal((await send(admin, "PATCH", `/${employee._id}`, { joinedOn: aYearAhead() })).status, 200);
  assert.equal(await storedJoinDate(employee), aYearAhead());
});

test("an admin clears a wrong join date with an empty value", async () => {
  const { admin, employee } = await people();
  await User.updateOne({ _id: employee._id }, { joinedOn: "2024-03-01" });

  for (const joinedOn of ["", null]) {
    await User.updateOne({ _id: employee._id }, { joinedOn: "2024-03-01" });
    const res = await send(admin, "PATCH", `/${employee._id}`, { joinedOn });
    assert.equal(res.status, 200);
    assert.equal(res.body.joinedOn, undefined);
    assert.equal(await storedJoinDate(employee), undefined);
  }
});

test("an Admin can't set a Super Admin's join date", async () => {
  const { admin, superadmin } = await people();

  const res = await send(admin, "PATCH", `/${superadmin._id}`, { joinedOn: "2024-03-01" });

  assert.equal(res.status, 403);
  assert.equal(await storedJoinDate(superadmin), undefined);
});

test("nobody sets their own join date through their profile", async () => {
  const { employee } = await people();

  const res = await send(employee, "PATCH", "/me", { joinedOn: "2024-03-01", phone: "+91 1" });

  assert.equal(res.status, 200);
  assert.equal(await storedJoinDate(employee), undefined);
});

test("the join date reaches the person's own profile, the directory and the colleague view", async () => {
  const { admin, employee } = await people();
  await User.updateOne({ _id: employee._id }, { joinedOn: "2024-03-01" });

  const me = await send(employee, "GET", "/me");
  const directory = await send(admin, "GET", "/directory");
  const colleague = await send(admin, "GET", `/${employee._id}`);

  assert.equal(me.body.joinedOn, "2024-03-01");
  assert.equal(directory.body.find((p) => p.id === String(employee._id)).joinedOn, "2024-03-01");
  assert.equal(directory.body.find((p) => p.id === String(admin._id)).joinedOn, undefined);
  assert.equal(colleague.body.joinedOn, "2024-03-01");
});

test("a new account records when it was created", async () => {
  const before = Date.now();
  const person = await User.create(userFields());

  assert.ok(person.createdAt instanceof Date);
  assert.ok(person.createdAt.getTime() >= before - 1000);
  assert.ok(person.updatedAt instanceof Date);
});
