const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

const User = require("../models/User");
const Verification = require("../models/Verification");
const verificationRoutes = require("../routes/verificationRoutes");

let server;
let base;

// The real router behind a stand-in for keycloakAuth (server.js puts the real one in front of /api/verifications):
// the test says who is signed in through req.user.
before(async () => {
  await connectTestDb();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = JSON.parse(req.get("x-test-user"));
    next();
  });
  app.use("/api/verifications", verificationRoutes);
  await new Promise((resolve) => (server = app.listen(0, "127.0.0.1", resolve)));
  base = `http://127.0.0.1:${server.address().port}/api/verifications`;
});
beforeEach(clearTestDb);
after(async () => {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  await disconnectTestDb();
});

const as = (p) => JSON.stringify({ id: String(p._id), role: p.role, email: p.email, fullName: p.fullName });
const send = async (who, method, path = "", body) => {
  const res = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", "x-test-user": as(who) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};

const people = async () => ({
  superadmin: await User.create(userFields({ role: "Superadmin", fullName: "Sana Iyer" })),
  admin: await User.create(userFields({ role: "Admin", fullName: "Test Admin" })),
  subadmin: await User.create(userFields({ role: "Subadmin", fullName: "Test Subadmin" })),
  asha: await User.create(userFields({ role: "Employee", fullName: "Asha Rao", team: "Platform" })),
  kabir: await User.create(userFields({ role: "Intern", fullName: "Kabir Das" })),
});

const northwind = (overrides = {}) => ({
  kind: "company",
  company: "Northwind Logistics Pvt Ltd",
  registration: "u12345mh2020ptc000001",
  contactEmail: "Accounts@Northwind.Example.com",
  website: "https://northwind.example.com",
  ...overrides,
});
const COMPANY_CHECKS = ["registration", "tax", "address", "bank", "director"];
const open = async (who, body = northwind()) => {
  const res = await send(who, "POST", "", body);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body;
};
const tick = (who, id, check, done = true) => send(who, "PATCH", `/${id}/checks`, { check, done });
const decide = (who, id, status, note) => send(who, "POST", `/${id}/decision`, note === undefined ? { status } : { status, note });

test("only Super Admins and Admins use HR OPS: everyone else is refused on every route", async () => {
  const p = await people();
  const request = await open(p.admin);
  for (const who of [p.subadmin, p.asha, p.kabir]) {
    const calls = [
      await send(who, "GET", "?kind=company"),
      await send(who, "POST", "", northwind({ company: "Someone Else Ltd" })),
      await tick(who, request.id, "tax"),
      await decide(who, request.id, "rejected", "No"),
      await send(who, "DELETE", `/${request.id}`),
    ];
    assert.deepEqual(calls.map((c) => c.status), [403, 403, 403, 403, 403], who.fullName);
  }
  const still = await Verification.findById(request.id).lean();
  assert.deepEqual([still.status, still.done], ["pending", []]);
  assert.equal((await send(p.superadmin, "GET", "?kind=company")).status, 200);
});

test("a company request opens pending with clean fields, who opened it and the first log entry", async () => {
  const p = await people();
  const made = await open(p.admin);
  assert.equal(made.kind, "company");
  assert.equal(made.status, "pending");
  assert.deepEqual(made.done, []);
  assert.equal(made.company, "Northwind Logistics Pvt Ltd");
  assert.equal(made.registration, "U12345MH2020PTC000001");
  assert.equal(made.contactEmail, "accounts@northwind.example.com");
  assert.equal(made.website, "https://northwind.example.com/");
  assert.equal(made.openedBy, "Test Admin");
  assert.ok(!Number.isNaN(Date.parse(made.openedAt)));
  assert.equal(made.decidedBy, "");
  assert.equal(made.decidedAt, null);
  assert.equal(made.log.length, 1);
  assert.deepEqual([made.log[0].by, made.log[0].text], ["Test Admin", "Opened the request"]);
  assert.ok(!Number.isNaN(Date.parse(made.log[0].at)));
  // the website is optional
  const bare = await open(p.admin, northwind({ company: "Bare Co", website: "" }));
  assert.equal(bare.website, "");
});

test("a company request with a missing or bad field is refused, and nothing is saved", async () => {
  const p = await people();
  const bad = [
    northwind({ company: "  " }),
    northwind({ company: "x".repeat(121) }),
    northwind({ registration: "" }),
    northwind({ registration: "CIN <script>" }),
    northwind({ registration: "A".repeat(41) }),
    northwind({ contactEmail: "not-an-email" }),
    northwind({ website: "javascript:alert(1)" }),
    northwind({ website: "ftp://northwind.example.com" }),
    { ...northwind(), kind: "shipping" },
  ];
  for (const body of bad) {
    const res = await send(p.admin, "POST", "", body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.ok(res.body.message, "a reason the admin can act on");
  }
  assert.equal(await Verification.countDocuments(), 0);
});

test("one pending request per company: the same name again is refused until the first is decided", async () => {
  const p = await people();
  const first = await open(p.admin);
  const again = await send(p.superadmin, "POST", "", northwind({ company: "  NORTHWIND logistics pvt ltd " }));
  assert.equal(again.status, 409);
  for (const c of COMPANY_CHECKS) await tick(p.admin, first.id, c);
  assert.equal((await decide(p.admin, first.id, "verified")).status, 200);
  assert.equal((await send(p.superadmin, "POST", "", northwind())).status, 201, "a decided request doesn't block a new one");
});

test("an employee request is for a real, current person who isn't an admin, one pending at a time", async () => {
  const p = await people();
  const made = await open(p.admin, { kind: "employee", personId: String(p.asha._id) });
  assert.equal(made.kind, "employee");
  assert.deepEqual(
    { ...made.person, id: undefined, employeeId: undefined },
    { id: undefined, name: "Asha Rao", email: p.asha.email, role: "Employee", team: "Platform", employeeId: undefined, removed: false }
  );
  assert.equal(made.person.id, String(p.asha._id));
  // nothing private about the person comes back
  for (const field of ["password", "keycloakId", "tokens", "personalEmail"]) assert.ok(!(field in made.person), field);

  assert.equal((await send(p.admin, "POST", "", { kind: "employee", personId: String(p.asha._id) })).status, 409, "one pending per person");
  assert.equal((await send(p.admin, "POST", "", { kind: "employee", personId: String(p.kabir._id) })).status, 201, "an intern can be verified");
  assert.equal((await send(p.admin, "POST", "", { kind: "employee", personId: String(p.subadmin._id) })).status, 201, "a sub admin can be verified");
  for (const target of [p.admin, p.superadmin]) assert.equal((await send(p.admin, "POST", "", { kind: "employee", personId: String(target._id) })).status, 400, target.fullName);
  assert.equal((await send(p.admin, "POST", "", { kind: "employee", personId: "6ad8bc3dd430c9b545aa2a01" })).status, 400, "unknown person");
  assert.equal((await send(p.admin, "POST", "", { kind: "employee", personId: "not-an-id" })).status, 400);
  const gone = await User.create(userFields({ fullName: "Gone Person", isDeleted: true }));
  assert.equal((await send(p.admin, "POST", "", { kind: "employee", personId: String(gone._id) })).status, 400, "removed person");
});

test("the list shows one kind, newest first; a bad kind is refused", async () => {
  const p = await people();
  const a = await open(p.admin, northwind({ company: "Alpha Ltd" }));
  await new Promise((r) => setTimeout(r, 15));
  const b = await open(p.admin, northwind({ company: "Beta Ltd" }));
  await open(p.admin, { kind: "employee", personId: String(p.asha._id) });
  const companies = await send(p.superadmin, "GET", "?kind=company");
  assert.equal(companies.status, 200);
  assert.deepEqual(companies.body.map((v) => v.id), [b.id, a.id]);
  const employees = await send(p.superadmin, "GET", "?kind=employee");
  assert.deepEqual(employees.body.map((v) => v.person.name), ["Asha Rao"]);
  assert.equal((await send(p.admin, "GET", "?kind=everything")).status, 400);
  assert.equal((await send(p.admin, "GET", "")).status, 400);
});

test("ticking and unticking a check is saved and logged with the check's name", async () => {
  const p = await people();
  const { id } = await open(p.admin);
  const ticked = await tick(p.superadmin, id, "tax");
  assert.equal(ticked.status, 200);
  assert.deepEqual(ticked.body.done, ["tax"]);
  assert.equal((await tick(p.admin, id, "tax")).body.done.length, 1, "ticking twice doesn't count twice");
  const unticked = await tick(p.admin, id, "tax", false);
  assert.deepEqual(unticked.body.done, []);
  const texts = unticked.body.log.map((e) => `${e.by}: ${e.text}`);
  assert.deepEqual(texts, ["Test Admin: Opened the request", "Sana Iyer: Checked GST / tax registration", "Test Admin: Checked GST / tax registration", "Test Admin: Unchecked GST / tax registration"]);
});

test("only the request's own checks can be ticked, with a yes or no", async () => {
  const p = await people();
  const company = await open(p.admin);
  assert.equal((await tick(p.admin, company.id, "education")).status, 400, "an employee check on a company");
  assert.equal((await tick(p.admin, company.id, "anything")).status, 400);
  assert.equal((await send(p.admin, "PATCH", `/${company.id}/checks`, { check: "tax", done: "yes" })).status, 400);
  const employee = await open(p.admin, { kind: "employee", personId: String(p.asha._id) });
  // its own check, so not a 400: it waits for the employee's upload (tests/backgroundChecks.test.js)
  assert.equal((await tick(p.admin, employee.id, "education")).status, 409);
  assert.equal((await tick(p.admin, employee.id, "registration")).status, 400, "a company check on an employee");
});

test("Aadhaar and PAN wait for the employee's upload, so an employee request can't be verified yet", async () => {
  const p = await people();
  const { id } = await open(p.admin, { kind: "employee", personId: String(p.asha._id) });
  for (const check of ["aadhaar", "pan"]) {
    const res = await tick(p.admin, id, check);
    assert.equal(res.status, 409, check);
    assert.match(res.body.message, /upload/i);
  }
  for (const check of ["education", "employment", "references"]) await tick(p.admin, id, check);
  assert.equal((await decide(p.admin, id, "verified")).status, 409);
  // it can still be rejected, with a reason
  assert.equal((await decide(p.admin, id, "rejected", "References didn't answer")).status, 200);
});

test("verifying needs every check ticked; a rejection needs a note; both record who and when", async () => {
  const p = await people();
  const { id } = await open(p.admin);
  for (const c of COMPANY_CHECKS.slice(0, 4)) await tick(p.admin, id, c);
  const early = await decide(p.admin, id, "verified");
  assert.equal(early.status, 409);
  assert.equal((await Verification.findById(id).lean()).status, "pending");

  assert.equal((await decide(p.admin, id, "rejected")).status, 400, "no note");
  assert.equal((await decide(p.admin, id, "rejected", "   ")).status, 400, "blank note");
  assert.equal((await decide(p.admin, id, "rejected", "x".repeat(1001))).status, 400, "note too long");
  const rejected = await decide(p.superadmin, id, "rejected", "  Bank letter is for another company  ");
  assert.equal(rejected.status, 200);
  assert.deepEqual([rejected.body.status, rejected.body.note, rejected.body.decidedBy], ["rejected", "Bank letter is for another company", "Sana Iyer"]);
  assert.ok(!Number.isNaN(Date.parse(rejected.body.decidedAt)));
  assert.equal(rejected.body.log.at(-1).text, "Rejected");

  const reopened = await decide(p.admin, id, "pending");
  assert.deepEqual([reopened.body.status, reopened.body.decidedBy, reopened.body.decidedAt], ["pending", "", null]);
  assert.equal(reopened.body.log.at(-1).text, "Reopened");
  assert.equal(reopened.body.note, "Bank letter is for another company", "the last note stays to read");

  await tick(p.admin, id, "director");
  const verified = await decide(p.admin, id, "verified", "All five on file");
  assert.equal(verified.status, 200);
  assert.deepEqual([verified.body.status, verified.body.decidedBy, verified.body.note], ["verified", "Test Admin", "All five on file"]);
  assert.equal(verified.body.log.at(-1).text, "Marked verified");
});

test("a decided request is closed: no ticks, no second decision, until it's reopened", async () => {
  const p = await people();
  const { id } = await open(p.admin);
  await decide(p.admin, id, "rejected", "Wrong documents");
  assert.equal((await tick(p.admin, id, "tax")).status, 409);
  assert.equal((await decide(p.admin, id, "rejected", "Again")).status, 409);
  assert.equal((await decide(p.admin, id, "verified")).status, 409);
  const pending = await open(p.admin, northwind({ company: "Other Ltd" }));
  assert.equal((await decide(p.admin, pending.id, "pending")).status, 409, "reopening needs a decision to undo");
  assert.equal((await decide(p.admin, pending.id, "approved", "x")).status, 400, "not a status");
});

test("only a pending request can be deleted; a decided one is kept as the record", async () => {
  const p = await people();
  const pending = await open(p.admin);
  const decided = await open(p.admin, northwind({ company: "Decided Ltd" }));
  await decide(p.admin, decided.id, "rejected", "Not a real company");

  const kept = await send(p.superadmin, "DELETE", `/${decided.id}`);
  assert.equal(kept.status, 409);
  assert.ok(await Verification.exists({ _id: decided.id }));

  assert.equal((await send(p.admin, "DELETE", `/${pending.id}`)).status, 200);
  assert.equal(await Verification.exists({ _id: pending.id }), null);
  assert.equal((await send(p.admin, "DELETE", `/${pending.id}`)).status, 404);
  assert.equal((await send(p.admin, "DELETE", "/not-an-id")).status, 404);
  assert.equal((await tick(p.admin, "6ad8bc3dd430c9b545aa2a01", "tax")).status, 404);
});

test("a person removed after their request was opened shows as removed; the request and log stay", async () => {
  const p = await people();
  const { id } = await open(p.admin, { kind: "employee", personId: String(p.asha._id) });
  await User.updateOne({ _id: p.asha._id }, { isDeleted: true });
  const [listed] = (await send(p.admin, "GET", "?kind=employee")).body;
  assert.equal(listed.id, id);
  assert.equal(listed.person.removed, true);
  assert.equal(listed.log.length, 1);
  await User.deleteOne({ _id: p.asha._id });
  const [gone] = (await send(p.admin, "GET", "?kind=employee")).body;
  assert.equal(gone.person.removed, true, "a record deleted outright reads as removed too");
});

test("two admins ticking different checks at the same moment both count", async () => {
  const p = await people();
  const { id } = await open(p.admin);
  const results = await Promise.all(COMPANY_CHECKS.map((c, i) => tick(i % 2 ? p.admin : p.superadmin, id, c)));
  assert.ok(results.every((r) => r.status === 200));
  const saved = await Verification.findById(id).lean();
  assert.deepEqual([...saved.done].sort(), [...COMPANY_CHECKS].sort());
  assert.equal(saved.log.length, 1 + COMPANY_CHECKS.length);
});

test("two admins opening the same company or person at the same moment make one request, not two", async () => {
  const p = await people();
  const companies = await Promise.all([send(p.admin, "POST", "", northwind()), send(p.superadmin, "POST", "", northwind())]);
  assert.deepEqual(companies.map((r) => r.status).sort(), [201, 409]);
  const employees = await Promise.all([
    send(p.admin, "POST", "", { kind: "employee", personId: String(p.asha._id) }),
    send(p.superadmin, "POST", "", { kind: "employee", personId: String(p.asha._id) }),
  ]);
  assert.deepEqual(employees.map((r) => r.status).sort(), [201, 409]);
  assert.equal(await Verification.countDocuments(), 2);
});
