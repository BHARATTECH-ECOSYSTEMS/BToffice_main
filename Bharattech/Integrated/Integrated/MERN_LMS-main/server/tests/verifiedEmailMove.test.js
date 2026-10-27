import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import Course from "../models/Course.js";
import Purchase from "../models/Purchase.js";
import User from "../models/User.js";
import { startApp, stopApp, clearDatabase, tokenFor, call, sampleCourse } from "./helpers.js";

// Review 2026-10-26 M13 (owner's 4A), the LMS's side: a new account's first visit moved an older record's courses,
// progress and ratings to it whenever the emails matched (Group C Part 5, for re-invited people). But anyone can change
// their own email in Keycloak, which then marks it not verified. Now only a verified email (our invites verify it)
// moves anything; an unverified one that another record holds gets a record of its own, with a stand-in email.

before(startApp);
after(stopApp);
beforeEach(clearDatabase);

const EMAIL = "kabir@example.test";

const content = [{ chapterId: "c1", chapterOrder: 1, chapterTitle: "Chapter 1", chapterContent: [{ lectureId: "l1", lectureOrder: 1, lectureTitle: "One", lectureDuration: 5, lectureUrl: "https://youtu.be/dQw4w9WgXcQ", isPreviewFree: true }] }];

async function kabirsRecord() {
  const course = await Course.create({ ...sampleCourse(), courseContent: content, courseThumbnail: "data:image/png;base64,AA==", isPublished: true, educator: "educator-1", enrolledStudents: ["kc-old"] });
  await User.create({ _id: "kc-old", name: "Kabir Das", email: EMAIL, enrolledCourses: [course._id] });
  await Purchase.create({ userId: "kc-old", courseId: course._id, amount: 0, status: "completed" });
  return course;
}

test("an unverified email doesn't move someone else's courses to a new account", async () => {
  const course = await kabirsRecord();
  const taker = tokenFor({ sub: "kc-taker", email: EMAIL, email_verified: false });

  const res = await call("GET", "/api/user/enrolled-courses", { token: taker });
  assert.equal(res.status, 200);
  assert.deepEqual(res.data.data.enrolledCourses, []);

  const old = await User.findById("kc-old").lean();
  assert.equal(old.email, EMAIL);
  assert.deepEqual(old.enrolledCourses.map(String), [String(course._id)]);
  assert.equal(await Purchase.countDocuments({ userId: "kc-taker" }), 0);
  assert.deepEqual((await Course.findById(course._id).lean()).enrolledStudents, ["kc-old"]);
  assert.equal((await User.findById("kc-taker").lean()).email, "kc-taker@bharattech.local");
});

test("a verified email (a re-invite) still moves them, as before", async () => {
  const course = await kabirsRecord();
  const res = await call("GET", "/api/user/enrolled-courses", { token: tokenFor({ sub: "kc-new", email: EMAIL, email_verified: true }) });
  assert.equal(res.status, 200);
  assert.deepEqual(res.data.data.enrolledCourses.map((c) => String(c._id)), [String(course._id)]);
  assert.equal(await User.findById("kc-old"), null);
});

test("a live account's stored email follows its sign-in, so its old email can't pull its courses to another account", async () => {
  // security report 2026-10-28 lead 12 (owner's G6A)
  const taught = await Course.create({ ...sampleCourse(), courseContent: content, courseThumbnail: "data:image/png;base64,AA==", isPublished: true, educator: "kc-a", enrolledStudents: [] });
  await User.create({ _id: "kc-a", name: "A", email: "a@example.test", enrolledCourses: [] });

  // A's email was changed (by an admin); A's next visit carries the new one
  assert.equal((await call("GET", "/api/user/profile", { token: tokenFor({ sub: "kc-a", email: "a2@example.test", email_verified: true }) })).status, 200);
  assert.equal((await User.findById("kc-a").lean()).email, "a2@example.test");

  // a new account with A's old email takes nothing of A's
  await call("GET", "/api/user/profile", { token: tokenFor({ sub: "kc-b", email: "a@example.test", email_verified: true }) });
  assert.equal((await Course.findById(taught._id).lean()).educator, "kc-a");
  assert.ok(await User.findById("kc-a"));
});

test("an email another record already holds isn't taken over by a visit; the record keeps its own", async () => {
  await User.create({ _id: "kc-a", name: "A", email: "a@example.test", enrolledCourses: [] });
  await User.create({ _id: "kc-c", name: "C", email: "c@example.test", enrolledCourses: [] });
  assert.equal((await call("GET", "/api/user/profile", { token: tokenFor({ sub: "kc-a", email: "c@example.test", email_verified: true }) })).status, 200);
  assert.equal((await User.findById("kc-a").lean()).email, "a@example.test");
  assert.equal((await User.findById("kc-c").lean()).email, "c@example.test");
});
