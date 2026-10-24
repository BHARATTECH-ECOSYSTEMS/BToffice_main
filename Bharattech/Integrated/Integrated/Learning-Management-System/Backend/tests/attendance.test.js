const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

const User = require("../models/User");
const OfficeVisit = require("../models/OfficeVisit");
const attendanceRoutes = require("../routes/attendanceRoutes");
const { todayInIndia } = require("../utils/days");

let server;
let base;

// The real router behind a stand-in for keycloakAuth (server.js puts the real one in front of /api/attendance): the
// test says who is signed in through req.user.
before(async () => {
  await connectTestDb();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = JSON.parse(req.get("x-test-user"));
    next();
  });
  app.use("/api/attendance", attendanceRoutes);
  await new Promise((resolve) => (server = app.listen(0, "127.0.0.1", resolve)));
  base = `http://127.0.0.1:${server.address().port}/api/attendance`;
});
beforeEach(clearTestDb);
after(async () => {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  await disconnectTestDb();
});

const as = (p) => JSON.stringify({ id: String(p._id ?? p.id), role: p.role, email: p.email, fullName: p.fullName });
const send = async (who, method, path = "", body) => {
  const res = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", "x-test-user": as(who) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};

/** A day `n` days from today in India, as "YYYY-MM-DD". */
const day = (n) => {
  const [y, m, d] = todayInIndia().split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
/** A moment on an India day: at(day(-1), "09:30"). */
const at = (d, hhmm) => new Date(`${d}T${hhmm}:00+05:30`);
const iso = (d, hhmm) => at(d, hhmm).toISOString();

const people = async () => ({
  superadmin: await User.create(userFields({ role: "Superadmin", fullName: "Sana Iyer" })),
  admin: await User.create(userFields({ role: "Admin", fullName: "Test Admin" })),
  subadmin: await User.create(userFields({ role: "Subadmin", fullName: "Test Subadmin" })),
  asha: await User.create(userFields({ role: "Employee", fullName: "Asha Rao" })),
  kabir: await User.create(userFields({ role: "Intern", fullName: "Kabir Das" })),
});

/** A finished visit on an earlier day, made straight in the database. */
const pastVisit = (person, d, from, to, extra = {}) =>
  OfficeVisit.create({ user: person._id, day: d, inAt: at(d, from), outAt: to ? at(d, to) : null, open: !to, ...extra });

const todayOf = (body) => body.days.find((d) => d.day === body.today);

test("checking in starts a visit today in India and the person shows as in", async () => {
  const { asha } = await people();
  const res = await send(asha, "POST", "/check-in");
  assert.equal(res.status, 201);
  assert.equal(res.body.today, todayInIndia());
  assert.equal(res.body.inNow, true);
  const today = todayOf(res.body);
  assert.equal(today.visits.length, 1);
  assert.equal(today.visits[0].outAt, null);
  assert.ok(Date.now() - Date.parse(today.visits[0].inAt) < 10_000);
  const mine = await send(asha, "GET", "/me");
  assert.equal(mine.body.inNow, true);
});

test("checking in again while in is refused, also when two arrive at once", async () => {
  const { asha } = await people();
  const [a, b] = await Promise.all([send(asha, "POST", "/check-in"), send(asha, "POST", "/check-in")]);
  assert.deepEqual([a.status, b.status].sort(), [201, 409]);
  const again = await send(asha, "POST", "/check-in");
  assert.equal(again.status, 409);
  assert.match(again.body.message, /already checked in/i);
  assert.equal(await OfficeVisit.countDocuments({ user: asha._id }), 1);
});

test("checking out ends the visit; checking out when not in is refused", async () => {
  const { asha } = await people();
  const none = await send(asha, "POST", "/check-out");
  assert.equal(none.status, 409);
  assert.match(none.body.message, /not checked in/i);
  await send(asha, "POST", "/check-in");
  const out = await send(asha, "POST", "/check-out");
  assert.equal(out.status, 200);
  assert.equal(out.body.inNow, false);
  const visit = todayOf(out.body).visits[0];
  assert.ok(visit.outAt);
  assert.equal(visit.noCheckOut, false);
});

test("checking out ends only your own visit, and 'in now' is about you", async () => {
  const { asha, kabir } = await people();
  await send(kabir, "POST", "/check-in");
  const mine = await send(asha, "GET", "/me");
  assert.equal(mine.body.inNow, false);
  assert.equal((await send(asha, "POST", "/check-out")).status, 409);
  await send(asha, "POST", "/check-in");
  await send(asha, "POST", "/check-out");
  const his = await send(kabir, "GET", "/me");
  assert.equal(his.body.inNow, true);
  assert.equal(todayOf(his.body).visits[0].outAt, null);
});

test("joining again after leaving starts a second visit, and the day adds both up", async () => {
  const { asha } = await people();
  // two earlier visits today, made in the database so their lengths are known
  const today = todayInIndia();
  const now = Date.now();
  await OfficeVisit.create({ user: asha._id, day: today, inAt: new Date(now - 50 * 60000), outAt: new Date(now - 30 * 60000), open: false });
  await send(asha, "POST", "/check-in");
  await send(asha, "POST", "/check-out");
  const mine = await send(asha, "GET", "/me");
  const entry = todayOf(mine.body);
  assert.equal(entry.visits.length, 2);
  assert.ok(entry.minutes >= 20 && entry.minutes <= 21, `20 minutes, got ${entry.minutes}`);
});

test("a visit left open past midnight ends at the end of its own day, marked without a check-out", async () => {
  const { asha } = await people();
  const yesterday = day(-1);
  await pastVisit(asha, yesterday, "18:00", null);
  const mine = await send(asha, "GET", `/me?from=${yesterday}&to=${todayInIndia()}`);
  assert.equal(mine.status, 200);
  assert.equal(mine.body.inNow, false);
  const entry = mine.body.days.find((d) => d.day === yesterday);
  assert.equal(entry.noCheckOut, true);
  assert.equal(entry.visits[0].noCheckOut, true);
  assert.equal(entry.visits[0].outAt, new Date(`${yesterday}T23:59:59.999+05:30`).toISOString());
  assert.equal(entry.minutes, 6 * 60 - 1);
  // and they can start today as usual
  assert.equal((await send(asha, "POST", "/check-in")).status, 201);
});

test("every role can check in", async () => {
  const everyone = Object.values(await people());
  for (const person of everyone) assert.equal((await send(person, "POST", "/check-in")).status, 201, person.role);
});

test("an account without a stored record (demo) can't check in", async () => {
  const res = await send({ id: "demo-employee", role: "Employee", email: "demo@example.test", fullName: "Demo" }, "POST", "/check-in");
  assert.equal(res.status, 403);
});

test("my history shows only my own visits, newest day first, and asks for a sensible range", async () => {
  const { asha, kabir } = await people();
  await pastVisit(asha, day(-3), "09:00", "13:00");
  await pastVisit(asha, day(-1), "10:00", "11:30");
  await pastVisit(kabir, day(-1), "09:00", "17:00");
  const mine = await send(asha, "GET", `/me?from=${day(-7)}&to=${todayInIndia()}`);
  assert.deepEqual(mine.body.days.map((d) => [d.day, d.minutes]), [[day(-1), 90], [day(-3), 240]]);
  assert.equal((await send(asha, "GET", `/me?from=${day(-1)}&to=${day(-3)}`)).status, 400);
  assert.equal((await send(asha, "GET", `/me?from=${day(-500)}&to=${todayInIndia()}`)).status, 400);
  assert.equal((await send(asha, "GET", "/me?from=2026-02-30&to=2026-03-01")).status, 400);
});

test("managers see a day for every current staff member, including who isn't in", async () => {
  const { superadmin, admin, subadmin, asha, kabir } = await people();
  await send(asha, "POST", "/check-in");
  await pastVisit(kabir, todayInIndia(), "00:00", "00:01");
  for (const manager of [superadmin, admin, subadmin]) {
    const res = await send(manager, "GET", `/day?day=${todayInIndia()}`);
    assert.equal(res.status, 200, manager.role);
    assert.equal(res.body.inNow, 1);
    const byName = Object.fromEntries(res.body.people.map((p) => [p.name, p]));
    assert.equal(Object.keys(byName).length, 5);
    assert.equal(byName["Asha Rao"].inNow, true);
    assert.equal(byName["Kabir Das"].inNow, false);
    assert.equal(byName["Kabir Das"].minutes, 1);
    assert.equal(byName["Test Admin"].visits.length, 0);
    assert.ok(byName["Asha Rao"].employeeId);
  }
});

test("employees and interns can't see other people's attendance", async () => {
  const { asha, kabir, admin } = await people();
  for (const person of [asha, kabir]) {
    assert.equal((await send(person, "GET", `/day?day=${todayInIndia()}`)).status, 403);
    assert.equal((await send(person, "GET", `/people/${admin._id}`)).status, 403);
  }
});

test("a day must be a real day that isn't in the future", async () => {
  const { admin } = await people();
  assert.equal((await send(admin, "GET", "/day?day=2026-13-01")).status, 400);
  assert.equal((await send(admin, "GET", `/day?day=${day(1)}`)).status, 400);
});

test("someone who has left still shows on the days they were in", async () => {
  const { admin } = await people();
  const gone = await User.create(userFields({ role: "Employee", fullName: "Gone Person", isDeleted: true, leftOn: todayInIndia() }));
  await pastVisit(gone, day(-2), "09:00", "10:00");
  const then = await send(admin, "GET", `/day?day=${day(-2)}`);
  assert.ok(then.body.people.some((p) => p.name === "Gone Person"));
  const now = await send(admin, "GET", `/day?day=${todayInIndia()}`);
  assert.ok(!now.body.people.some((p) => p.name === "Gone Person"));
});

test("managers see one person's history; an unknown person is not found", async () => {
  const { subadmin, asha } = await people();
  await pastVisit(asha, day(-1), "09:00", "17:00");
  const res = await send(subadmin, "GET", `/people/${asha._id}?from=${day(-7)}&to=${todayInIndia()}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.person.name, "Asha Rao");
  assert.equal(res.body.person.canCorrect, false);
  assert.deepEqual(res.body.days.map((d) => d.minutes), [480]);
  assert.equal((await send(subadmin, "GET", "/people/0123456789abcdef01234567")).status, 404);
  assert.equal((await send(subadmin, "GET", "/people/nope")).status, 404);
});

test("an admin corrects a finished visit with a reason, and the change is logged", async () => {
  const { admin, asha } = await people();
  const visit = await pastVisit(asha, day(-1), "18:00", null);
  await send(asha, "GET", "/me"); // closes it at midnight
  const res = await send(admin, "PATCH", `/visits/${visit._id}`, { inAt: iso(day(-1), "09:00"), outAt: iso(day(-1), "17:30"), reason: "Forgot to check out; confirmed on chat" });
  assert.equal(res.status, 200);
  assert.equal(res.body.visit.inAt, iso(day(-1), "09:00"));
  assert.equal(res.body.visit.outAt, iso(day(-1), "17:30"));
  assert.equal(res.body.visit.noCheckOut, true);
  const [log] = res.body.visit.corrections;
  assert.equal(log.byName, "Test Admin");
  assert.equal(log.reason, "Forgot to check out; confirmed on chat");
  assert.equal(log.from.inAt, iso(day(-1), "18:00"));
  assert.equal(log.to.outAt, iso(day(-1), "17:30"));
  // the person sees it in their own history
  const mine = await send(asha, "GET", `/me?from=${day(-1)}&to=${day(-1)}`);
  assert.equal(mine.body.days[0].minutes, 510);
  assert.equal(mine.body.days[0].visits[0].corrections.length, 1);
});

test("only Super Admins and Admins correct, and an Admin can't correct a Super Admin", async () => {
  const { superadmin, admin, subadmin, asha } = await people();
  const ashaVisit = await pastVisit(asha, day(-1), "09:00", "17:00");
  const body = { inAt: iso(day(-1), "09:15"), outAt: iso(day(-1), "17:00"), reason: "Late bus" };
  assert.equal((await send(subadmin, "PATCH", `/visits/${ashaVisit._id}`, body)).status, 403);
  assert.equal((await send(asha, "PATCH", `/visits/${ashaVisit._id}`, body)).status, 403);
  const bossVisit = await pastVisit(superadmin, day(-1), "09:00", "17:00");
  assert.equal((await send(admin, "PATCH", `/visits/${bossVisit._id}`, body)).status, 403);
  const adminVisit = await pastVisit(admin, day(-1), "09:00", "17:00");
  assert.equal((await send(superadmin, "PATCH", `/visits/${adminVisit._id}`, body)).status, 200);
  assert.equal((await send(admin, "PATCH", `/visits/${adminVisit._id}`, body)).status, 200);
  // what an Admin may correct is what they're told
  const day1 = await send(admin, "GET", `/day?day=${day(-1)}`);
  const canCorrect = Object.fromEntries(day1.body.people.map((p) => [p.name, p.canCorrect]));
  assert.deepEqual([canCorrect["Sana Iyer"], canCorrect["Test Admin"], canCorrect["Asha Rao"]], [false, true, true]);
});

test("a correction needs a reason and times that make sense for that day", async () => {
  const { admin, asha } = await people();
  const d = day(-1);
  const visit = await pastVisit(asha, d, "14:00", "18:00");
  await pastVisit(asha, d, "09:00", "12:00");
  const fix = (body) => send(admin, "PATCH", `/visits/${visit._id}`, { inAt: iso(d, "14:00"), outAt: iso(d, "18:00"), reason: "Checked with the team", ...body });
  assert.equal((await fix({ reason: "" })).status, 400);
  assert.equal((await fix({ reason: "x".repeat(301) })).status, 400);
  assert.equal((await fix({ inAt: "not a time" })).status, 400);
  assert.equal((await fix({ inAt: iso(d, "18:00"), outAt: iso(d, "14:00") })).status, 400);
  assert.equal((await fix({ inAt: iso(day(-2), "23:00") })).status, 400);
  assert.equal((await fix({ outAt: iso(todayInIndia(), "00:30") })).status, 400);
  const overlap = await fix({ inAt: iso(d, "11:00") });
  assert.equal(overlap.status, 409);
  assert.equal((await fix({})).status, 200);
  assert.equal((await send(admin, "PATCH", "/visits/0123456789abcdef01234567", { reason: "x" })).status, 404);
});

test("a visit that is still going can't be corrected, and a correction can't end in the future", async () => {
  const { admin, asha } = await people();
  await send(asha, "POST", "/check-in");
  const open = await OfficeVisit.findOne({ user: asha._id, open: true });
  const res = await send(admin, "PATCH", `/visits/${open._id}`, { inAt: open.inAt.toISOString(), outAt: new Date(Date.now() + 3600_000).toISOString(), reason: "Early" });
  assert.equal(res.status, 409);
  await send(asha, "POST", "/check-out");
  const later = await send(admin, "PATCH", `/visits/${open._id}`, { inAt: open.inAt.toISOString(), outAt: new Date(Date.now() + 3600_000).toISOString(), reason: "Early" });
  assert.equal(later.status, 400);
});
