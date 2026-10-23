const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

// Emails are caught here instead of sent; the mailer asks nodemailer for a transport each time it sends.
const nodemailer = require("nodemailer");
const sent = [];
nodemailer.createTransport = () => ({ sendMail: async (mail) => (sent.push(mail), { messageId: `test-${sent.length}` }) });
process.env.SMTP_HOST = process.env.SMTP_HOST || "127.0.0.1";

const User = require("../models/User");
const CalendarEvent = require("../models/CalendarEvent");
const Notification = require("../models/Notification");
const eventRoutes = require("../routes/eventRoutes");
const { todayInIndia } = require("../controllers/eventController");

let server;
let base;

// The real router behind a stand-in for keycloakAuth (server.js puts the real one in front of /api/events): the test
// says who is signed in through req.user.
before(async () => {
  await connectTestDb();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = JSON.parse(req.get("x-test-user"));
    next();
  });
  app.use("/api/events", eventRoutes);
  await new Promise((resolve) => (server = app.listen(0, "127.0.0.1", resolve)));
  base = `http://127.0.0.1:${server.address().port}/api/events`;
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

const people = async () => ({
  superadmin: await User.create(userFields({ role: "Superadmin", fullName: "Sana Iyer" })),
  admin: await User.create(userFields({ role: "Admin", fullName: "Test Admin" })),
  subadmin: await User.create(userFields({ role: "Subadmin", fullName: "Test Subadmin" })),
  subadmin2: await User.create(userFields({ role: "Subadmin", fullName: "Other Subadmin" })),
  asha: await User.create(userFields({ role: "Employee", fullName: "Asha Rao" })),
  kabir: await User.create(userFields({ role: "Intern", fullName: "Kabir Das" })),
});

const meeting = (overrides = {}) => ({ title: "Team sync", kind: "meeting", date: day(3), time: "10:00", ...overrides });
const notesOf = (person) => Notification.find({ userId: person._id }).lean();
/** Emails are sent after the reply; wait for them to arrive (or for nothing more to come). */
const settle = async () => {
  let last = -1;
  while (last !== sent.length) {
    last = sent.length;
    await new Promise((r) => setTimeout(r, 150));
  }
};
const mailsTo = (person) => sent.filter((m) => m.to === person.email);

// --- who may do what ---

test("super admins, admins and sub admins add events; employees and interns can't", async () => {
  const p = await people();
  for (const who of [p.superadmin, p.admin, p.subadmin]) {
    const res = await send(who, "POST", "", meeting({ title: `By ${who.fullName}` }));
    assert.equal(res.status, 201, who.role);
    assert.equal(res.body.addedBy, who.fullName);
  }
  for (const who of [p.asha, p.kabir]) assert.equal((await send(who, "POST", "", meeting())).status, 403, who.role);
  assert.equal(await CalendarEvent.countDocuments(), 3);
});

test("admins change and cancel any event; a sub admin only their own", async () => {
  const p = await people();
  const byAdmin = (await send(p.admin, "POST", "", meeting())).body;
  const bySub = (await send(p.subadmin, "POST", "", meeting({ title: "Sub's training", kind: "training" }))).body;

  assert.equal((await send(p.subadmin, "PATCH", `/${byAdmin.id}`, { title: "Hijacked" })).status, 403);
  assert.equal((await send(p.subadmin, "DELETE", `/${byAdmin.id}`)).status, 403);
  assert.equal((await send(p.subadmin2, "PATCH", `/${bySub.id}`, { title: "Not mine" })).status, 403);
  assert.equal((await send(p.asha, "PATCH", `/${bySub.id}`, { title: "Nope" })).status, 403);
  assert.equal((await send(p.asha, "DELETE", `/${bySub.id}`)).status, 403);

  assert.equal((await send(p.subadmin, "PATCH", `/${bySub.id}`, { title: "Sub's training, moved" })).status, 200);
  assert.equal((await send(p.superadmin, "PATCH", `/${byAdmin.id}`, { time: "11:30" })).status, 200);
  assert.equal((await send(p.admin, "DELETE", `/${bySub.id}`)).status, 200);
  assert.equal((await CalendarEvent.findById(byAdmin.id)).time, "11:30");
  assert.equal(await CalendarEvent.countDocuments(), 1);
});

test("everyone signed in sees the events, with whether they may change each one", async () => {
  const p = await people();
  await send(p.admin, "POST", "", meeting());
  await send(p.subadmin, "POST", "", meeting({ title: "Holiday", kind: "holiday", date: day(5), time: "" }));

  const seenBy = async (who) => (await send(who, "GET", `?from=${day(0)}&to=${day(30)}`)).body;
  const forAsha = await seenBy(p.asha);
  assert.deepEqual(forAsha.map((e) => [e.title, e.canChange]), [["Team sync", false], ["Holiday", false]]);
  assert.deepEqual(Object.keys(forAsha[0]).sort(), ["addedBy", "canChange", "date", "id", "kind", "time", "title"]);
  assert.deepEqual((await seenBy(p.subadmin)).map((e) => e.canChange), [false, true]);
  assert.deepEqual((await seenBy(p.admin)).map((e) => e.canChange), [true, true]);
});

test("the list covers only the dates asked for, and at most about 13 months", async () => {
  const p = await people();
  await send(p.admin, "POST", "", meeting({ date: day(2) }));
  await send(p.admin, "POST", "", meeting({ title: "Later", date: day(60) }));

  assert.deepEqual((await send(p.asha, "GET", `?from=${day(0)}&to=${day(10)}`)).body.map((e) => e.title), ["Team sync"]);
  assert.equal((await send(p.asha, "GET", `?from=${day(0)}&to=${day(500)}`)).status, 400);
  assert.equal((await send(p.asha, "GET", `?from=nope&to=${day(10)}`)).status, 400);
  assert.equal((await send(p.asha, "GET", `?from=${day(10)}&to=${day(0)}`)).status, 400);
});

// --- what an event may be ---

test("an event needs a name, a known type and a real date that isn't past; the time is optional", async () => {
  const { admin } = await people();
  // impossible days in the future, so they're refused for being impossible, not for being past
  const nextYear = Number(day(0).slice(0, 4)) + 1;
  const bad = [
    { title: "" },
    { title: "   " },
    { title: "x".repeat(81) },
    { kind: "party" },
    { date: `${nextYear}-02-30` },
    { date: `${nextYear}-13-01` },
    { date: "tomorrow" },
    { date: day(-1) },
    { time: "25:00" },
    { time: "9am" },
    { title: 42 },
  ];
  for (const change of bad) assert.equal((await send(admin, "POST", "", meeting(change))).status, 400, JSON.stringify(change));
  assert.equal(await CalendarEvent.countDocuments(), 0);

  const today = await send(admin, "POST", "", meeting({ title: "  Today’s stand-up ", date: day(0), time: "" }));
  assert.equal(today.status, 201);
  assert.deepEqual([today.body.title, today.body.time], ["Today’s stand-up", ""]);
  // a name is saved as written, not as HTML
  const amp = await send(admin, "POST", "", meeting({ title: "Q&A <with> R&D" }));
  assert.equal(amp.body.title, "Q&A <with> R&D");
});

test("an event can't be moved into the past, and a missing one answers 404", async () => {
  const { admin } = await people();
  const ev = (await send(admin, "POST", "", meeting())).body;
  assert.equal((await send(admin, "PATCH", `/${ev.id}`, { date: day(-2) })).status, 400);
  assert.equal((await send(admin, "PATCH", "/64b7f0f0f0f0f0f0f0f0f0f1", { title: "Ghost" })).status, 404);
  assert.equal((await send(admin, "DELETE", "/not-an-id")).status, 404);
});

// --- the bell and emails ---

test("a new event leaves a note for everyone but whoever added it, and emails them", async () => {
  const p = await people();
  await User.create(userFields({ role: "Employee", isBanned: true, email: "blocked@example.test" }));
  await User.create(userFields({ role: "Employee", isDeleted: true, email: "gone@example.test" }));

  const ev = (await send(p.admin, "POST", "", meeting())).body;
  await settle();

  for (const who of [p.superadmin, p.subadmin, p.subadmin2, p.asha, p.kabir]) {
    const notes = await notesOf(who);
    assert.equal(notes.length, 1, who.fullName);
    assert.equal(notes[0].kind, "event");
    assert.equal(notes[0].title, "New event: Team sync");
    assert.match(notes[0].detail, /Meeting · .*10:00 · By Test Admin/);
    assert.equal(notes[0].refId, ev.id);
    assert.equal(mailsTo(who).length, 1, who.fullName);
  }
  assert.equal((await notesOf(p.admin)).length, 0);
  assert.equal(mailsTo(p.admin).length, 0);
  assert.equal(sent.filter((m) => /blocked|gone/.test(m.to)).length, 0);
  assert.equal(await Notification.countDocuments({ userId: { $nin: Object.values(p).map((x) => x._id) } }), 0);
});

test("a change replaces the older note with one that says what changed", async () => {
  const p = await people();
  const ev = (await send(p.admin, "POST", "", meeting())).body;
  await send(p.subadmin, "PATCH", `/${ev.id}`, { time: "14:00" }).then((r) => assert.equal(r.status, 403));
  const changed = await send(p.superadmin, "PATCH", `/${ev.id}`, { date: day(4), time: "14:00" });
  assert.equal(changed.status, 200);
  await settle();

  const notes = await notesOf(p.asha);
  assert.equal(notes.length, 1);
  assert.equal(notes[0].title, "Event changed: Team sync");
  assert.match(notes[0].detail, /14:00 · By Sana Iyer/);
  // the admin who made the event gets the change; the super admin who made it doesn't
  assert.equal((await notesOf(p.admin)).length, 1);
  assert.equal((await notesOf(p.superadmin)).length, 0);
});

test("cancelling leaves one 'cancelled' note per person and emails them", async () => {
  const p = await people();
  const ev = (await send(p.admin, "POST", "", meeting())).body;
  await send(p.admin, "PATCH", `/${ev.id}`, { title: "Team sync (moved)" });
  await settle();
  sent.length = 0;

  assert.equal((await send(p.admin, "DELETE", `/${ev.id}`)).status, 200);
  await settle();

  const notes = await notesOf(p.asha);
  assert.deepEqual(notes.map((n) => n.title), ["Event cancelled: Team sync (moved)"]);
  assert.equal(mailsTo(p.asha).length, 1);
  assert.match(mailsTo(p.asha)[0].subject, /Event cancelled/);
  assert.equal(await CalendarEvent.countDocuments(), 0);
});

test("with the Events switch off there's no email, but the note is still there", async () => {
  const p = await people();
  await User.updateOne({ _id: p.asha._id }, { $set: { mutedNotifications: ["events"] } });

  await send(p.admin, "POST", "", meeting());
  await settle();

  assert.equal((await notesOf(p.asha)).length, 1);
  assert.equal(mailsTo(p.asha).length, 0);
  assert.equal(mailsTo(p.kabir).length, 1);
});

test("nobody is told about an event that is already over", async () => {
  const p = await people();
  const past = await CalendarEvent.create({ title: "Last week's sync", kind: "meeting", date: day(-7), time: "", createdBy: p.admin._id });

  assert.equal((await send(p.admin, "DELETE", `/${past._id}`)).status, 200);
  await settle();
  assert.equal(await Notification.countDocuments(), 0);
  assert.equal(sent.length, 0);
});

test("a name with HTML in it is escaped in the email", async () => {
  const p = await people();
  await send(p.admin, "POST", "", meeting({ title: "<b>Party</b> & cake" }));
  await settle();
  const mail = mailsTo(p.asha)[0];
  assert.doesNotMatch(mail.html, /<b>Party<\/b>/);
  assert.match(mail.html, /&lt;b&gt;Party&lt;\/b&gt; &amp; cake/);
});
