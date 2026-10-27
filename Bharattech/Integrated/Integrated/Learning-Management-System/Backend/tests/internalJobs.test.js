const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const mongoose = require("mongoose");

// Emails are caught here instead of sent; `mail.failFor` makes one address fail, `mail.down` makes mail unusable.
const nodemailer = require("nodemailer");
const mail = { sent: [], failFor: new Set(), down: false };
nodemailer.createTransport = () => {
  if (mail.down) throw new Error("Invite email is not configured. Set EMAIL_USER and EMAIL_PASS.");
  return {
    sendMail: async (message) => {
      if (mail.failFor.has(message.to)) throw new Error(`550 mailbox ${message.to} unavailable`);
      mail.sent.push(message);
      return { messageId: `test-${mail.sent.length}` };
    },
  };
};
process.env.SMTP_HOST = process.env.SMTP_HOST || "127.0.0.1";

// A stand-in for the Keycloak admin client, put in place before the controllers load it.
const kc = { updates: [], calls: 0, missing: new Set(), updateError: null };
class FakeKcAdminClient {
  constructor() {
    this.users = {
      findOne: async ({ id }) => ((kc.calls += 1), kc.missing.has(id) ? null : { id, username: `user-${id}`, email: `${id}@example.test`, emailVerified: true, enabled: false, firstName: "Asha", lastName: "Rao", attributes: {} }),
      update: async (where, rep) => {
        kc.calls += 1;
        if (kc.updateError) throw kc.updateError;
        kc.updates.push([where.id, rep]);
      },
      logout: async () => void (kc.calls += 1),
    };
  }
  async auth() {}
}
require("./helpers/fakeKeycloakAdmin").stubKeycloakAdminPackage(FakeKcAdminClient);

const User = require("../models/User");
const InternalJob = require("../models/InternalJob");
const JobApplication = require("../models/JobApplication");
const communityRoutes = require("../routes/communityRoutes");
const { todayInIndia } = require("../utils/days");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

let server;
let root;

before(async () => {
  await connectTestDb();
  const app = express();
  app.use(express.json());
  app.use("/api/community", (req, _res, next) => ((req.user = JSON.parse(req.get("x-test-user"))), next()), communityRoutes);
  await new Promise((resolve) => (server = app.listen(0, "127.0.0.1", resolve)));
  root = `http://127.0.0.1:${server.address().port}/api/community`;
});
beforeEach(async () => {
  await clearTestDb();
  Object.assign(mail, { sent: [], failFor: new Set(), down: false });
  Object.assign(kc, { updates: [], calls: 0, missing: new Set(), updateError: null });
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

/** "YYYY-MM-DD" n days after `day` (n may be negative). */
const daysAfter = (day, n) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const today = todayInIndia();

const people = async () => ({
  superadmin: await User.create(userFields({ role: "Superadmin", fullName: "Sana Iyer" })),
  admin: await User.create(userFields({ role: "Admin", fullName: "Test Admin" })),
  subadmin: await User.create(userFields({ role: "Subadmin", fullName: "Test Subadmin" })),
  staff: await User.create(userFields({ role: "Employee", fullName: "Asha Staff", stream: "tech" })),
  intern: await User.create(userFields({ role: "Intern", fullName: "Kabir Das" })),
});
const member = (overrides = {}) =>
  User.create(userFields({ role: "Employee", stream: "tech", isDeleted: true, deletedAt: new Date(), leftOn: "2026-06-30", joinedOn: "2023-04-03", ...overrides }));

const FRONTEND = {
  stream: "tech",
  title: "  Frontend Engineer ",
  about: " Build the portal's screens with the product team. ",
  location: " Kanpur ",
  mode: "hybrid",
  experience: " 1+ year ",
  openings: 2,
  closes: daysAfter(today, 20),
  criteria: ["Worked with us for at least a year", "  ", " Comfortable with React & TypeScript "],
  check: " A 45-minute online test on React. ",
  applyEmail: " HR@Bharattech.Example ",
};
const post = (who, body = FRONTEND) => call(who, "POST", "/jobs", body);
const postJob = async (p, body) => {
  const res = await post(p.admin, body);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.job;
};
const addApplicant = (who, job, person) => call(who, "POST", `/jobs/${job.id}/applicants`, { personId: String(person._id) });
const move = (who, job, app, from, to, extra = {}) => call(who, "POST", `/jobs/${job.id}/applicants/${app.id}/stage`, { from, to, ...extra });
const applicantOf = (job, person) => job.applicants.find((a) => a.personId === String(person._id));

/* ── Posting ── */

test("an admin posts a job: it's saved cleaned up, and each member of that stream with a personal email gets one email", async () => {
  const p = await people();
  await member({ personalEmail: "neha.home@example.net" });
  await member({ personalEmail: "tanvi.home@example.net" });
  await member(); // no personal email
  await member({ stream: "finance", personalEmail: "farah.home@example.net" });
  await User.create(userFields({ role: "Employee", stream: "tech", isDeleted: true, deletedAt: new Date(), personalEmail: "deleted.only@example.net" }));

  const res = await post(p.admin);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const { job } = res.body;
  assert.deepEqual(
    { ...job, id: undefined, postedOn: undefined },
    {
      id: undefined,
      stream: "tech",
      title: "Frontend Engineer",
      about: "Build the portal's screens with the product team.",
      location: "Kanpur",
      mode: "hybrid",
      experience: "1+ year",
      openings: 2,
      closes: FRONTEND.closes,
      criteria: ["Worked with us for at least a year", "Comfortable with React & TypeScript"],
      check: "A 45-minute online test on React.",
      applyEmail: "hr@bharattech.example",
      postedBy: "Test Admin",
      postedOn: undefined,
      open: true,
      emailed: 2,
      failed: 0,
      applicants: [],
    }
  );
  assert.deepEqual(mail.sent.map((m) => m.to).sort(), ["neha.home@example.net", "tanvi.home@example.net"]);
  const [m] = mail.sent;
  assert.equal(m.cc, undefined);
  assert.equal(m.bcc, undefined);
  assert.match(m.subject, /Frontend Engineer/);
  for (const part of ["Build the portal's screens", "Kanpur", "Hybrid", "1+ year", "Openings: 2", "Comfortable with React & TypeScript", "A 45-minute online test", "hr@bharattech.example", "reply and ask"]) {
    assert.ok(m.text.includes(part), part);
  }
  assert.ok(m.html.includes("React &amp; TypeScript"), "typed text is escaped in the HTML");
  assert.ok(!JSON.stringify(res.body).includes("@example.net"), "no member's address goes back");
});

test("every field of a posting is checked, and a refusal says what to fix", async () => {
  const p = await people();
  const refused = [
    [{ title: "" }, /role/i],
    [{ title: "x".repeat(121) }, /120/],
    [{ about: " " }, /involves/i],
    [{ about: "x".repeat(1001) }, /1000/],
    [{ location: "" }, /based/i],
    [{ experience: "" }, /experience/i],
    [{ mode: "anywhere" }, /work mode/i],
    [{ stream: "sales" }, /stream/i],
    [{ openings: 0 }, /1 to 50/],
    [{ openings: 51 }, /1 to 50/],
    [{ openings: 1.5 }, /1 to 50/],
    [{ closes: daysAfter(today, -1) }, /passed/i],
    [{ closes: "2026-02-30" }, /date/i],
    [{ criteria: ["  "] }, /who can apply/i],
    [{ criteria: Array.from({ length: 11 }, (_, i) => `Line ${i}`) }, /10/],
    [{ criteria: ["x".repeat(201)] }, /200/],
    [{ check: "" }, /knowledge check/i],
    [{ applyEmail: "hr at bharattech" }, /email/i],
  ];
  for (const [change, pattern] of refused) {
    const res = await post(p.admin, { ...FRONTEND, ...change });
    assert.equal(res.status, 400, JSON.stringify(change).slice(0, 60));
    assert.match(res.body.message, pattern);
  }
  assert.equal(await InternalJob.countDocuments(), 0);
  // no apply-by date means until it's filled; today is fine
  assert.equal((await post(p.admin, { ...FRONTEND, closes: "" })).body.job.closes, "");
  assert.equal((await post(p.admin, { ...FRONTEND, closes: today })).status, 201);
});

test("only Super Admins and Admins post and run jobs; Sub Admins see postings without applicants; employees see none", async () => {
  const p = await people();
  const someone = await member({ personalEmail: "neha.home@example.net" });
  const job = await postJob(p);
  await addApplicant(p.admin, job, someone);
  for (const who of [p.subadmin, p.staff, p.intern]) {
    assert.equal((await post(who)).status, 403, `post ${who.role}`);
    assert.equal((await call(who, "PATCH", `/jobs/${job.id}`, { open: false })).status, 403, `close ${who.role}`);
    assert.equal((await call(who, "DELETE", `/jobs/${job.id}`)).status, 403, `delete ${who.role}`);
    assert.equal((await addApplicant(who, job, someone)).status, 403, `add ${who.role}`);
  }
  assert.equal((await post(p.superadmin)).status, 201);

  const forSub = (await call(p.subadmin, "GET", "/jobs")).body;
  assert.equal(forSub.length, 2);
  assert.ok(forSub.every((j) => !("applicants" in j)), "sub admins don't see who applied");
  const forAdmin = (await call(p.admin, "GET", "/jobs")).body;
  assert.deepEqual(forAdmin.map((j) => j.applicants.length).sort(), [0, 1]);
  for (const who of [p.staff, p.intern]) assert.equal((await call(who, "GET", "/jobs")).status, 403, who.role);
});

test("closing and reopening; a posting past its apply-by date reads as closed", async () => {
  const p = await people();
  const job = await postJob(p);
  assert.equal((await call(p.admin, "PATCH", `/jobs/${job.id}`, { open: false })).body.job.open, false);
  assert.equal((await call(p.admin, "PATCH", `/jobs/${job.id}`, { open: true })).body.job.open, true);
  assert.equal((await call(p.admin, "PATCH", `/jobs/${job.id}`, { open: "yes" })).status, 400);
  await InternalJob.updateOne({ _id: job.id }, { $set: { closes: daysAfter(today, -1) } });
  assert.equal((await call(p.admin, "GET", "/jobs")).body[0].open, false);
});

/* ── Applicants ── */

test("only a member of the job's stream can be added, once, and only while the job is open", async () => {
  const p = await people();
  const job = await postJob(p);
  const neha = await member({ fullName: "Neha Kapoor", personalEmail: "neha.home@example.net" });
  const res = await addApplicant(p.admin, job, neha);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const applicant = applicantOf(res.body.job, neha);
  assert.deepEqual([applicant.name, applicant.stage, applicant.hasPersonalEmail], ["Neha Kapoor", "applied", true]);
  assert.ok(!JSON.stringify(res.body).includes("neha.home"), "the address isn't sent back");

  assert.equal((await addApplicant(p.admin, job, neha)).status, 409, "twice");
  assert.equal((await addApplicant(p.admin, job, await member({ stream: "finance" }))).status, 400, "another stream");
  assert.equal((await addApplicant(p.admin, job, p.staff)).status, 400, "still works here");
  assert.equal((await addApplicant(p.admin, job, await User.create(userFields({ role: "Employee", stream: "tech", isDeleted: true, deletedAt: new Date() })))).status, 400, "deleted, not left");
  assert.equal((await call(p.admin, "POST", `/jobs/${job.id}/applicants`, { personId: "nope" })).status, 400);
  assert.equal((await call(p.admin, "POST", `/jobs/${new mongoose.Types.ObjectId()}/applicants`, { personId: String(neha._id) })).status, 404);

  assert.equal((await call(p.admin, "PATCH", `/jobs/${job.id}`, { open: false })).status, 200);
  assert.equal((await addApplicant(p.admin, job, await member())).status, 409, "closed");
  // reopened for real, so the next refusal is the date's, not the closed switch's again (both say "closed")
  assert.equal((await call(p.admin, "PATCH", `/jobs/${job.id}`, { open: true })).status, 200);
  assert.equal((await InternalJob.findById(job.id)).open, true);
  await InternalJob.updateOne({ _id: job.id }, { $set: { closes: daysAfter(today, -1) } });
  assert.equal((await addApplicant(p.admin, job, await member())).status, 409, "past its apply-by date");
  assert.equal(await JobApplication.countDocuments(), 1);
});

test("an application moves one step at a time, along the allowed road only", async () => {
  const p = await people();
  const job = await postJob(p);
  const neha = await member({ personalEmail: "neha.home@example.net" });
  let app = applicantOf((await addApplicant(p.admin, job, neha)).body.job, neha);

  for (const to of ["checking", "rejoined", "applied", "nonsense"]) assert.equal((await move(p.admin, job, app, "applied", to)).status, to === "nonsense" ? 400 : 409, `applied → ${to}`);
  for (const who of [p.subadmin, p.staff]) assert.equal((await move(who, job, app, "applied", "eligible")).status, 403, who.role);

  const res = await move(p.admin, job, app, "applied", "eligible");
  assert.equal(res.status, 200, JSON.stringify(res.body));
  app = applicantOf(res.body.job, neha);
  assert.equal(app.stage, "eligible");
  assert.equal((await move(p.admin, job, app, "applied", "declined")).status, 409, "the page's stage is out of date");
  assert.equal((await move(p.admin, job, app, "eligible", "rejoined")).status, 409, "the check comes first");
});

test("two admins moving the same application at once: one wins, the other is told it changed", async () => {
  const p = await people();
  const job = await postJob(p);
  const neha = await member({ personalEmail: "neha.home@example.net" });
  const app = applicantOf((await addApplicant(p.admin, job, neha)).body.job, neha);
  const results = await Promise.all([move(p.admin, job, app, "applied", "eligible"), move(p.superadmin, job, app, "applied", "declined")]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
});

test("the knowledge check is emailed to their personal email; the stage changes only once it has gone", async () => {
  const p = await people();
  const job = await postJob(p);
  const neha = await member({ personalEmail: "neha.home@example.net" });
  let app = applicantOf((await addApplicant(p.admin, job, neha)).body.job, neha);
  app = applicantOf((await move(p.admin, job, app, "applied", "eligible")).body.job, neha);
  mail.sent = [];

  assert.match((await move(p.admin, job, app, "eligible", "checking", { instructions: " " })).body.message, /instructions|link/i);
  assert.equal((await move(p.admin, job, app, "eligible", "checking", { instructions: "x".repeat(1001) })).status, 400);

  mail.failFor.add("neha.home@example.net");
  const failed = await move(p.admin, job, app, "eligible", "checking", { instructions: "https://tests.example.com/react?id=7&lang=en" });
  assert.equal(failed.status, 502);
  assert.equal((await JobApplication.findById(app.id).lean()).stage, "eligible", "nothing changed");

  mail.failFor.clear();
  const sent = await move(p.admin, job, app, "eligible", "checking", { instructions: "https://tests.example.com/react?id=7&lang=en" });
  assert.equal(sent.status, 200);
  assert.equal(sent.body.emailed, true);
  assert.equal(applicantOf(sent.body.job, neha).stage, "checking");
  assert.deepEqual(mail.sent.map((m) => m.to), ["neha.home@example.net"]);
  assert.ok(mail.sent[0].text.includes("https://tests.example.com/react?id=7&lang=en"));
  assert.match(mail.sent[0].subject, /knowledge check/i);
});

test("without a personal email there's nowhere to send the check", async () => {
  const p = await people();
  const job = await postJob(p);
  const vikram = await member();
  let app = applicantOf((await addApplicant(p.admin, job, vikram)).body.job, vikram);
  assert.equal(app.hasPersonalEmail, false);
  app = applicantOf((await move(p.admin, job, app, "applied", "eligible")).body.job, vikram);
  const res = await move(p.admin, job, app, "eligible", "checking", { instructions: "https://tests.example.com" });
  assert.equal(res.status, 400);
  assert.match(res.body.message, /personal email/i);
});

test("'not this time' is told kindly, with no reason, and a failed email doesn't undo it", async () => {
  const p = await people();
  const job = await postJob(p);
  const neha = await member({ personalEmail: "neha.home@example.net" });
  const app = applicantOf((await addApplicant(p.admin, job, neha)).body.job, neha);
  mail.sent = [];
  const res = await move(p.admin, job, app, "applied", "declined");
  assert.equal(res.status, 200);
  assert.equal(res.body.emailed, true);
  assert.equal(applicantOf(res.body.job, neha).stage, "declined");
  const [m] = mail.sent;
  assert.equal(m.to, "neha.home@example.net");
  assert.ok(m.text.includes("Frontend Engineer"));
  assert.match(m.text, /not this time/i);
  assert.ok(!/criteria|knowledge check/i.test(m.text), "no reason given");

  const kabir = await member({ personalEmail: "kabir.home@example.net" });
  const second = applicantOf((await addApplicant(p.admin, job, kabir)).body.job, kabir);
  mail.down = true;
  const unsent = await move(p.admin, job, second, "applied", "declined");
  assert.equal(unsent.status, 200);
  assert.equal(unsent.body.emailed, false);
  assert.equal((await JobApplication.findById(second.id).lean()).stage, "declined");
});

/* ── Rejoining ── */

const toChecking = async (p, job, person) => {
  let app = applicantOf((await addApplicant(p.admin, job, person)).body.job, person);
  app = applicantOf((await move(p.admin, job, app, "applied", "eligible")).body.job, person);
  return applicantOf((await move(p.admin, job, app, "eligible", "checking", { instructions: "https://tests.example.com" })).body.job, person);
};

test("passing brings them back: same Employee ID, sign-in on again, join date today, and a welcome email", async () => {
  const p = await people();
  const job = await postJob(p);
  const neha = await member({ fullName: "Neha Kapoor", email: "neha.kapoor@example.test", personalEmail: "neha.home@example.net" });
  const app = await toChecking(p, job, neha);
  mail.sent = [];
  kc.updates = [];

  const res = await move(p.admin, job, app, "checking", "rejoined");
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.deepEqual([res.body.emailed, res.body.needsInvite], [true, false]);
  assert.equal(applicantOf(res.body.job, neha).stage, "rejoined");

  const saved = await User.findById(neha._id).lean();
  assert.deepEqual([saved.isDeleted, saved.leftOn, saved.deletedAt, saved.joinedOn, saved.employeeId], [false, undefined, null, today, neha.employeeId]);
  assert.equal(saved.personalEmail, "neha.home@example.net");
  assert.equal(kc.updates.length, 1);
  assert.equal(kc.updates[0][1].enabled, true);
  assert.equal(kc.updates[0][1].username, `user-${neha.keycloakId}`, "the rest of the account is kept");

  const [m] = mail.sent;
  assert.equal(m.to, "neha.home@example.net");
  assert.match(m.subject, /welcome back/i);
  for (const part of ["neha.kapoor@example.test", neha.employeeId, "Forgot password"]) assert.ok(m.text.includes(part), part);
});

test("when Keycloak can't switch the account on, nothing changes; an account that's gone still rejoins and needs an invite", async () => {
  const p = await people();
  const job = await postJob(p);
  const neha = await member({ personalEmail: "neha.home@example.net" });
  const app = await toChecking(p, job, neha);
  kc.updateError = new Error("socket hang up");
  assert.equal((await move(p.admin, job, app, "checking", "rejoined")).status, 502);
  assert.equal((await JobApplication.findById(app.id).lean()).stage, "checking");
  const still = await User.findById(neha._id).lean();
  assert.deepEqual([still.isDeleted, still.joinedOn], [true, "2023-04-03"]);

  kc.updateError = null;
  kc.missing.add(neha.keycloakId);
  const res = await move(p.admin, job, app, "checking", "rejoined");
  assert.equal(res.status, 200);
  assert.equal(res.body.needsInvite, true);
  assert.equal((await User.findById(neha._id).lean()).isDeleted, false);
});

test("a failed welcome email doesn't undo the rejoin", async () => {
  const p = await people();
  const job = await postJob(p);
  const neha = await member({ personalEmail: "neha.home@example.net" });
  const app = await toChecking(p, job, neha);
  mail.failFor.add("neha.home@example.net");
  const res = await move(p.admin, job, app, "checking", "rejoined");
  assert.equal(res.status, 200);
  assert.equal(res.body.emailed, false);
  assert.equal((await User.findById(neha._id).lean()).isDeleted, false);
});

test("an Admin can't rejoin someone who was an Admin; a Super Admin can", async () => {
  const p = await people();
  const job = await postJob(p);
  const former = await member({ role: "Admin", personalEmail: "former.admin@example.net" });
  const app = await toChecking(p, job, former);
  assert.equal((await move(p.admin, job, app, "checking", "rejoined")).status, 403);
  assert.equal((await move(p.superadmin, job, app, "checking", "rejoined")).status, 200);
});

/* ── Deleting ── */

test("deleting a job removes it and its applications, and never undoes a rejoin", async () => {
  const p = await people();
  const job = await postJob(p);
  const neha = await member({ personalEmail: "neha.home@example.net" });
  const app = await toChecking(p, job, neha);
  await move(p.admin, job, app, "checking", "rejoined");
  assert.equal((await call(p.admin, "DELETE", `/jobs/${job.id}`)).status, 200);
  assert.equal(await InternalJob.countDocuments(), 0);
  assert.equal(await JobApplication.countDocuments(), 0);
  assert.equal((await User.findById(neha._id).lean()).isDeleted, false);
  assert.equal((await call(p.admin, "DELETE", `/jobs/${job.id}`)).status, 404);
  assert.equal((await call(p.admin, "DELETE", "/jobs/nope")).status, 400);
});

test("a failed posting email is counted, and the log never names the address", async () => {
  const p = await people();
  await member({ personalEmail: "neha.home@example.net" });
  await member({ personalEmail: "tanvi.home@example.net" });
  mail.failFor.add("tanvi.home@example.net");
  const logged = [];
  const original = console.error;
  console.error = (...args) => logged.push(args.map(String).join(" "));
  let res;
  try {
    res = await post(p.admin);
  } finally {
    console.error = original;
  }
  assert.deepEqual([res.body.job.emailed, res.body.job.failed], [1, 1]);
  assert.ok(logged.length >= 1);
  assert.ok(!logged.some((line) => line.includes("@")), logged.join(" | "));
});

/* ── Review 2026-10-26 low list (owner's 5A and the welcome email) ── */

test("two clicks sending the knowledge check at once: it is emailed once", async () => {
  const p = await people();
  const job = await postJob(p);
  const neha = await member({ personalEmail: "neha.home@example.net" });
  let app = applicantOf((await addApplicant(p.admin, job, neha)).body.job, neha);
  app = applicantOf((await move(p.admin, job, app, "applied", "eligible")).body.job, neha);
  mail.sent = [];
  const body = { instructions: "https://tests.example.com/react" };
  const results = await Promise.all([move(p.admin, job, app, "eligible", "checking", body), move(p.superadmin, job, app, "eligible", "checking", body)]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal(mail.sent.filter((m) => m.to === "neha.home@example.net").length, 1);
});

test("when the knowledge check can't be emailed, the step is put back for the next try", async () => {
  const p = await people();
  const job = await postJob(p);
  const neha = await member({ personalEmail: "neha.home@example.net" });
  let app = applicantOf((await addApplicant(p.admin, job, neha)).body.job, neha);
  app = applicantOf((await move(p.admin, job, app, "applied", "eligible")).body.job, neha);
  mail.failFor.add("neha.home@example.net");
  assert.equal((await move(p.admin, job, app, "eligible", "checking", { instructions: "https://tests.example.com/react" })).status, 502);
  assert.equal((await JobApplication.findById(app.id).lean()).stage, "eligible");
  mail.failFor.clear();
  assert.equal((await move(p.admin, job, app, "eligible", "checking", { instructions: "https://tests.example.com/react" })).status, 200);
});

test("someone whose sign-in is gone is told an invite is coming, not to use their old password", async () => {
  const p = await people();
  const job = await postJob(p);
  const neha = await member({ personalEmail: "neha.home@example.net" });
  const app = await toChecking(p, job, neha);
  kc.missing.add(neha.keycloakId);
  mail.sent = [];
  const res = await move(p.admin, job, app, "checking", "rejoined");
  assert.equal(res.body.needsInvite, true);
  const [m] = mail.sent;
  assert.match(m.subject, /welcome back/i);
  assert.ok(!/old password|Forgot password/i.test(m.text), m.text);
  assert.match(m.text, /invite/i);
});

test("the welcome email never prints 'undefined' for a missing Employee ID", async () => {
  const p = await people();
  const job = await postJob(p);
  const neha = await member({ personalEmail: "neha.home@example.net" });
  await User.collection.updateOne({ _id: neha._id }, { $unset: { employeeId: 1 } });
  const app = await toChecking(p, job, neha);
  mail.sent = [];
  await move(p.admin, job, app, "checking", "rejoined");
  const [m] = mail.sent;
  for (const part of [m.text, m.html]) assert.ok(!part.includes("undefined"), part);
  assert.ok(m.text.includes(neha.email), "the work email is still there");
});
