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
const LearningCourse = require("../models/LearningCourse");
const LearningEnrollment = require("../models/LearningEnrollment");
const Notification = require("../models/Notification");
const learningRoutes = require("../routes/learningRoutes");

let server;
let base;

// The real router behind a stand-in for keycloakAuth (server.js puts the real one in front of /api/learning): the
// test says who is signed in through req.user.
before(async () => {
  await connectTestDb();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = JSON.parse(req.get("x-test-user"));
    next();
  });
  app.use("/api/learning", learningRoutes);
  await new Promise((resolve) => (server = app.listen(0, "127.0.0.1", resolve)));
  base = `http://127.0.0.1:${server.address().port}/api/learning`;
});
beforeEach(async () => {
  await clearTestDb();
  await Promise.all(["courseThumbs.files", "courseThumbs.chunks"].map((c) => mongoose.connection.db.collection(c).deleteMany({})));
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
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed, type: res.headers.get("content-type"), headers: res.headers };
};
const upload = async (who, path, bytes, field = "thumbnail") => {
  const form = new FormData();
  form.append(field, new Blob([bytes]), "cover.png");
  const res = await fetch(base + path, { method: "PUT", headers: { "x-test-user": as(who) }, body: form });
  return { status: res.status, body: await res.json() };
};

const people = async () => ({
  superadmin: await User.create(userFields({ role: "Superadmin", fullName: "Sana Iyer" })),
  admin: await User.create(userFields({ role: "Admin", fullName: "Test Admin" })),
  subadmin: await User.create(userFields({ role: "Subadmin", fullName: "Test Subadmin" })),
  subadmin2: await User.create(userFields({ role: "Subadmin", fullName: "Other Subadmin" })),
  asha: await User.create(userFields({ role: "Employee", fullName: "Asha Rao" })),
  kabir: await User.create(userFields({ role: "Intern", fullName: "Kabir Das" })),
});

const VIDEO = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const draft = (overrides = {}) => ({
  title: "Docker for developers",
  description: ["Package, run and ship apps in containers.", "By the end you can containerise a project."],
  chapters: [
    { title: "Basics", lectures: [{ title: "What a container is", minutes: 12, videoUrl: VIDEO, preview: true }, { title: "Images", minutes: 20, videoUrl: "https://youtu.be/9bZkp7q19f0", preview: false }] },
    { title: "Compose", lectures: [{ title: "Several services", minutes: 30, videoUrl: "https://www.youtube.com/embed/kJQP7kiw5Fk", preview: false }] },
  ],
  ...overrides,
});
const publish = async (who, overrides) => send(who, "POST", "/courses", draft(overrides));
const lecturesOf = (course) => course.chapters.flatMap((c) => c.lectures);
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
const PNG = Buffer.concat([Buffer.from("89504e470d0a1a0a0000000d49484452", "hex"), Buffer.alloc(64, 1)]);

test("super admins, admins and sub admins publish courses; employees and interns can't", async () => {
  const p = await people();
  for (const who of [p.superadmin, p.admin, p.subadmin]) {
    const res = await publish(who, { title: `By ${who.fullName}` });
    assert.equal(res.status, 201, who.role);
    assert.equal(res.body.published, true);
    assert.equal(res.body.educator.name, who.fullName);
  }
  for (const who of [p.asha, p.kabir]) assert.equal((await publish(who)).status, 403, who.role);
  assert.equal(await LearningCourse.countDocuments(), 3);
});

test("a course needs a title, a description and chapters that each hold lectures", async () => {
  const { admin } = await people();
  const bad = [
    { title: "  " },
    { title: "x".repeat(121) },
    { description: [] },
    { description: ["   "] },
    { chapters: [] },
    { chapters: [{ title: "Empty", lectures: [] }] },
    { chapters: [{ title: "", lectures: [{ title: "A", minutes: 5, videoUrl: VIDEO }] }] },
    { chapters: "not a list" },
  ];
  for (const overrides of bad) {
    const res = await publish(admin, overrides);
    assert.equal(res.status, 400, JSON.stringify(overrides));
    assert.ok(res.body.message);
  }
  assert.equal(await LearningCourse.countDocuments(), 0);
});

test("each lecture needs a name, 1 to 600 whole minutes and a YouTube address", async () => {
  const { admin } = await people();
  const lecture = (l) => ({ chapters: [{ title: "Only", lectures: [{ title: "A", minutes: 5, videoUrl: VIDEO, ...l }] }] });
  const bad = [
    { title: "" },
    { minutes: 0 },
    { minutes: 601 },
    { minutes: 2.5 },
    { minutes: "ten" },
    { videoUrl: "" },
    { videoUrl: "javascript:alert(1)" },
    { videoUrl: "http://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    { videoUrl: "https://vimeo.com/123456" },
    { videoUrl: "https://www.youtube.com/watch?v=short" },
    { videoUrl: "https://evil.example/youtube.com/watch?v=dQw4w9WgXcQ" },
    { videoUrl: "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ" },
  ];
  for (const l of bad) assert.equal((await publish(admin, lecture(l))).status, 400, JSON.stringify(l));
  assert.equal((await publish(admin, lecture({ minutes: 600 }))).status, 201);
});

test("only what the form allows is saved: no choosing the educator, the dates or someone's progress", async () => {
  const { admin, asha } = await people();
  const res = await publish(admin, { educator: String(asha._id), published: false, createdAt: "2001-01-01", students: 99 });

  assert.equal(res.status, 201);
  const stored = await LearningCourse.findById(res.body.id).lean();
  assert.equal(String(stored.educator), String(admin._id));
  assert.equal(stored.published, true);
  assert.ok(stored.createdAt.getFullYear() > 2001);
});

test("everyone signed in sees live courses; lecture links only when they may watch", async () => {
  const { subadmin, asha } = await people();
  const { body: course } = await publish(subadmin);

  const list = await send(asha, "GET", "/courses");
  assert.equal(list.status, 200);
  assert.equal(list.body.length, 1);
  const seen = list.body[0];
  assert.equal(seen.canChange, false);
  assert.equal(seen.mine.enrolled, false);
  assert.deepEqual(lecturesOf(seen).map((l) => l.videoUrl), [VIDEO, "", ""]);
  assert.deepEqual(lecturesOf(seen).map((l) => l.preview), [true, false, false]);
  assert.deepEqual(lecturesOf(seen).map((l) => l.minutes), [12, 20, 30]);

  // the educator always sees them
  const own = await send(subadmin, "GET", `/courses/${course.id}`);
  assert.equal(own.body.canChange, true);
  assert.ok(lecturesOf(own.body).every((l) => l.videoUrl));
});

test("enrolling is free, happens once, and opens every lecture", async () => {
  const { admin, asha } = await people();
  const { body: course } = await publish(admin);

  const first = await send(asha, "POST", `/courses/${course.id}/enroll`);
  const again = await send(asha, "POST", `/courses/${course.id}/enroll`);

  assert.equal(first.status, 200);
  assert.equal(again.status, 200);
  assert.equal(await LearningEnrollment.countDocuments({ course: course.id }), 1);
  assert.equal(first.body.mine.enrolled, true);
  assert.ok(first.body.mine.enrolledAt);
  assert.ok(lecturesOf(first.body).every((l) => l.videoUrl));
  assert.equal(first.body.students, 1);
});

test("a course that isn't live can't be enrolled in or seen, except by whoever may change it", async () => {
  const { admin, subadmin, asha } = await people();
  const { body: course } = await publish(subadmin);
  assert.equal((await send(subadmin, "PATCH", `/courses/${course.id}`, { published: false })).status, 200);

  assert.equal((await send(asha, "GET", "/courses")).body.length, 0);
  assert.equal((await send(asha, "GET", `/courses/${course.id}`)).status, 404);
  assert.equal((await send(asha, "POST", `/courses/${course.id}/enroll`)).status, 404);
  assert.equal((await send(subadmin, "GET", "/courses")).body[0].published, false);
  assert.equal((await send(admin, "GET", `/courses/${course.id}`)).status, 200);
  for (const bad of ["not-an-id", "6ad8bc3dd430c9b545aa2899"]) assert.equal((await send(asha, "GET", `/courses/${bad}`)).status, 404);
});

test("lectures are marked done and undone only by people enrolled, and only lectures of that course", async () => {
  const { admin, asha, kabir } = await people();
  const { body: course } = await publish(admin);
  const [l1, l2] = lecturesOf(course);
  const { body: other } = await publish(admin, { title: "Other" });

  assert.equal((await send(asha, "PUT", `/courses/${course.id}/lectures/${l1.id}`, { done: true })).status, 403);
  await send(asha, "POST", `/courses/${course.id}/enroll`);
  await send(asha, "PUT", `/courses/${course.id}/lectures/${l1.id}`, { done: true });
  const twice = await send(asha, "PUT", `/courses/${course.id}/lectures/${l2.id}`, { done: true });
  assert.deepEqual(twice.body.mine.completed.sort(), [l1.id, l2.id].sort());
  const undone = await send(asha, "PUT", `/courses/${course.id}/lectures/${l1.id}`, { done: false });
  assert.deepEqual(undone.body.mine.completed, [l2.id]);

  assert.equal((await send(asha, "PUT", `/courses/${course.id}/lectures/${lecturesOf(other)[0].id}`, { done: true })).status, 404);
  assert.equal((await send(asha, "PUT", `/courses/${course.id}/lectures/nope`, { done: true })).status, 404);
  assert.equal((await send(asha, "PUT", `/courses/${course.id}/lectures/${l1.id}`, { done: "yes" })).status, 400);
  // someone else's progress is their own
  await send(kabir, "POST", `/courses/${course.id}/enroll`);
  assert.deepEqual((await send(kabir, "GET", `/courses/${course.id}`)).body.mine.completed, []);
});

test("only people enrolled rate a course, 1 to 5 whole stars, once each (a new rating replaces theirs)", async () => {
  const { admin, asha, kabir, subadmin } = await people();
  const { body: course } = await publish(admin);

  assert.equal((await send(asha, "PUT", `/courses/${course.id}/rating`, { stars: 5 })).status, 403);
  await send(asha, "POST", `/courses/${course.id}/enroll`);
  await send(kabir, "POST", `/courses/${course.id}/enroll`);
  // enrolled without rating: counts as a student, not as a rating
  await send(subadmin, "POST", `/courses/${course.id}/enroll`);
  for (const stars of [0, 6, 3.5, "5"]) assert.equal((await send(asha, "PUT", `/courses/${course.id}/rating`, { stars })).status, 400, String(stars));
  await send(asha, "PUT", `/courses/${course.id}/rating`, { stars: 2 });
  await send(asha, "PUT", `/courses/${course.id}/rating`, { stars: 5 });
  const res = await send(kabir, "PUT", `/courses/${course.id}/rating`, { stars: 4 });

  assert.equal(res.body.mine.rating, 4);
  assert.deepEqual(res.body.rating, { average: 4.5, count: 2 });
});

test("educators change and delete their own courses; admins and super admins any", async () => {
  const p = await people();
  const { body: course } = await publish(p.subadmin);

  assert.equal((await send(p.subadmin2, "PATCH", `/courses/${course.id}`, { title: "Mine now" })).status, 403);
  assert.equal((await send(p.asha, "PATCH", `/courses/${course.id}`, { title: "Mine now" })).status, 403);
  assert.equal((await send(p.subadmin2, "DELETE", `/courses/${course.id}`)).status, 403);
  assert.equal((await send(p.subadmin, "PATCH", `/courses/${course.id}`, { title: "Docker, again" })).body.title, "Docker, again");
  assert.equal((await send(p.admin, "PATCH", `/courses/${course.id}`, { title: "Docker 2" })).body.title, "Docker 2");
  assert.equal((await send(p.superadmin, "DELETE", `/courses/${course.id}`)).status, 200);
  assert.equal(await LearningCourse.countDocuments(), 0);
  assert.equal((await send(p.admin, "DELETE", `/courses/${course.id}`)).status, 404);
});

test("editing keeps the ids of lectures that stay, so people's progress survives; removed lectures leave it", async () => {
  const { admin, asha } = await people();
  const { body: course } = await publish(admin);
  const [l1, l2, l3] = lecturesOf(course);
  await send(asha, "POST", `/courses/${course.id}/enroll`);
  for (const l of [l1, l2, l3]) await send(asha, "PUT", `/courses/${course.id}/lectures/${l.id}`, { done: true });

  // keep the first chapter (lecture 2 renamed), drop the second, add a new lecture
  const chapters = [
    {
      id: course.chapters[0].id,
      title: "Basics, revised",
      lectures: [l1, { ...l2, title: "Images, revised" }, { title: "Volumes", minutes: 8, videoUrl: VIDEO, preview: false }],
    },
  ];
  const res = await send(admin, "PATCH", `/courses/${course.id}`, { chapters });

  assert.equal(res.status, 200);
  const after = lecturesOf(res.body);
  assert.deepEqual(after.slice(0, 2).map((l) => l.id), [l1.id, l2.id]);
  assert.equal(after[1].title, "Images, revised");
  assert.ok(after[2].id && ![l1.id, l2.id, l3.id].includes(after[2].id));
  assert.equal(res.body.chapters[0].id, course.chapters[0].id);
  assert.deepEqual((await send(asha, "GET", `/courses/${course.id}`)).body.mine.completed.sort(), [l1.id, l2.id].sort());
  // an id that isn't one of this course's is treated as a new lecture, not trusted
  const forged = await send(admin, "PATCH", `/courses/${course.id}`, { chapters: [{ title: "X", lectures: [{ id: "6ad8bc3dd430c9b545aa2899", title: "Y", minutes: 1, videoUrl: VIDEO }] }] });
  assert.notEqual(lecturesOf(forged.body)[0].id, "6ad8bc3dd430c9b545aa2899");
});

test("deleting a course removes its enrollments, its cover and its notes", async () => {
  const { admin, asha } = await people();
  const { body: course } = await publish(admin);
  await send(asha, "POST", `/courses/${course.id}/enroll`);
  await upload(admin, `/courses/${course.id}/thumbnail`, PNG);
  assert.equal((await notesOf(asha)).length, 1);

  await send(admin, "DELETE", `/courses/${course.id}`);

  assert.equal(await LearningEnrollment.countDocuments(), 0);
  assert.equal(await mongoose.connection.db.collection("courseThumbs.files").countDocuments(), 0);
  assert.equal((await notesOf(asha)).length, 0);
});

test("a new course leaves a note for everyone but its educator, and emails them unless Course updates is off", async () => {
  const { admin, asha, kabir, subadmin } = await people();
  await User.updateOne({ _id: kabir._id }, { mutedNotifications: ["courses"] });
  await User.updateOne({ _id: subadmin._id }, { isBanned: true });

  const { body: course } = await publish(admin);
  await settle();

  const [note] = await notesOf(asha);
  assert.equal(note.kind, "course");
  assert.equal(note.title, "New course: Docker for developers");
  assert.equal(note.link, `/portal/lms/course/${course.id}`);
  assert.equal((await notesOf(kabir)).length, 1);
  assert.equal((await notesOf(admin)).length, 0);
  assert.equal((await notesOf(subadmin)).length, 0);
  assert.equal(mailsTo(asha).length, 1);
  assert.equal(mailsTo(kabir).length, 0);
  assert.equal(mailsTo(admin).length, 0);
});

test("only going live tells people: edits don't, unpublishing removes the note, republishing tells them again", async () => {
  const { admin, asha } = await people();
  const { body: course } = await publish(admin);
  await settle();
  sent.length = 0;

  await send(admin, "PATCH", `/courses/${course.id}`, { title: "Docker, revised" });
  await settle();
  assert.equal(sent.length, 0);

  await send(admin, "PATCH", `/courses/${course.id}`, { published: false });
  assert.equal((await notesOf(asha)).length, 0);

  await send(admin, "PATCH", `/courses/${course.id}`, { published: true });
  await settle();
  const notes = await notesOf(asha);
  assert.equal(notes.length, 1);
  assert.equal(notes[0].title, "New course: Docker, revised");
  assert.equal(mailsTo(asha).length, 1);
});

test("a course name with HTML in it is escaped in the email", async () => {
  const { admin, asha } = await people();
  await publish(admin, { title: "<b>R&D</b> basics" });
  await settle();

  const [mail] = mailsTo(asha);
  assert.match(mail.html, /&lt;b&gt;R&amp;D&lt;\/b&gt; basics/);
  assert.doesNotMatch(mail.html, /<b>R&D/);
});

test("educators see who enrolled in their courses; admins in every course; others nobody", async () => {
  const p = await people();
  const { body: mine } = await publish(p.subadmin, { title: "Sub admin's" });
  const { body: theirs } = await publish(p.subadmin2, { title: "Other's" });
  await send(p.asha, "POST", `/courses/${mine.id}/enroll`);
  await send(p.kabir, "POST", `/courses/${theirs.id}/enroll`);

  const own = await send(p.subadmin, "GET", "/students");
  assert.equal(own.status, 200);
  assert.deepEqual(own.body.map((s) => [s.courseTitle, s.person.name]), [["Sub admin's", "Asha Rao"]]);
  assert.equal(own.body[0].person.email, p.asha.email);
  assert.ok(own.body[0].enrolledAt);
  assert.deepEqual(Object.keys(own.body[0].person).sort(), ["email", "id", "name"]);

  assert.equal((await send(p.admin, "GET", "/students")).body.length, 2);
  assert.equal((await send(p.asha, "GET", "/students")).status, 403);
});

test("an educator uploads a PNG, JPG or WebP cover up to 2 MB; anyone signed in sees it", async () => {
  const { admin, subadmin2, asha } = await people();
  const { body: course } = await publish(admin);

  assert.equal((await upload(subadmin2, `/courses/${course.id}/thumbnail`, PNG)).status, 403);
  assert.equal((await upload(admin, `/courses/${course.id}/thumbnail`, Buffer.from("<svg onload=alert(1)>"))).status, 400);
  assert.equal((await upload(admin, `/courses/${course.id}/thumbnail`, Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]))).status, 413);
  const ok = await upload(admin, `/courses/${course.id}/thumbnail`, PNG);
  assert.equal(ok.status, 200);
  assert.match(ok.body.thumbnail, new RegExp(`^/api/learning/courses/${course.id}/thumbnail\\?v=[0-9a-f]{24}$`));

  const res = await fetch(`${base}/courses/${course.id}/thumbnail`, { headers: { "x-test-user": as(asha) } });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "image/png");
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.ok(Buffer.from(await res.arrayBuffer()).equals(PNG));

  // a new cover replaces the old one; removing it leaves none
  await upload(admin, `/courses/${course.id}/thumbnail`, PNG);
  assert.equal(await mongoose.connection.db.collection("courseThumbs.files").countDocuments(), 1);
  const removed = await send(admin, "DELETE", `/courses/${course.id}/thumbnail`);
  assert.equal(removed.body.thumbnail, "");
  assert.equal(await mongoose.connection.db.collection("courseThumbs.files").countDocuments(), 0);
});

test("a person who is removed shows as a former educator instead of breaking the list", async () => {
  const { subadmin, asha } = await people();
  await publish(subadmin);
  await User.updateOne({ _id: subadmin._id }, { isDeleted: true });

  const [course] = (await send(asha, "GET", "/courses")).body;
  assert.equal(course.educator.name, "");
});
