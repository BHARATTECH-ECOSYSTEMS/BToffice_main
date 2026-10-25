import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import Course from "../models/Course.js";
import CourseProgress from "../models/CourseProgress.js";
import Purchase from "../models/Purchase.js";
import User from "../models/User.js";
import { startApp, stopApp, clearDatabase, tokenFor, call, sampleCourse } from "./helpers.js";

// Group C Part 5 (2026-10-26, owner's 5A): someone deleted and invited again gets a new sign-in account with the same
// email. The LMS used to fail every page for them (the old record still held the email). Now their courses,
// progress, ratings and the courses they teach move to the new account: the same person, nothing lost.

before(startApp);
after(stopApp);
beforeEach(clearDatabase);

const EMAIL = "kabir@example.test";
const content = [{ chapterId: "c1", chapterOrder: 1, chapterTitle: "Chapter 1", chapterContent: [{ lectureId: "l1", lectureOrder: 1, lectureTitle: "One", lectureDuration: 5, lectureUrl: "https://youtu.be/dQw4w9WgXcQ", isPreviewFree: true }] }];
const storedCourse = (educator, extra = {}) =>
  Course.create({ ...sampleCourse(), courseContent: content, courseThumbnail: "data:image/png;base64,AA==", isPublished: true, educator, ...extra });

/** Kabir's old account: enrolled, one lecture done, a rating, and a course he teaches. */
async function oldKabir() {
  await User.create({ _id: "educator-1", name: "Asha Rao", email: "asha@example.test" });
  const learning = await storedCourse("educator-1", { enrolledStudents: ["kc-old", "someone-else"], courseRatings: [{ userId: "kc-old", rating: 4 }, { userId: "someone-else", rating: 2 }] });
  const teaching = await storedCourse("kc-old");
  await User.create({ _id: "kc-old", name: "Kabir Das", email: EMAIL, enrolledCourses: [learning._id] });
  await Purchase.create({ userId: "kc-old", courseId: learning._id, amount: 0, status: "completed" });
  await CourseProgress.create({ userId: "kc-old", courseId: String(learning._id), lectureCompleted: ["l1"], completed: true });
  return { learning, teaching };
}
const newKabir = (roles = ["Employee"]) => tokenFor({ sub: "kc-new", email: EMAIL, name: "Kabir Das", roles });

test("a re-invited person's next visit works and keeps their courses", async () => {
  const { learning } = await oldKabir();
  const res = await call("GET", "/api/user/enrolled-courses", { token: newKabir() });
  assert.equal(res.status, 200);
  assert.deepEqual(res.data.data.enrolledCourses.map((c) => String(c._id)), [String(learning._id)]);
});

test("their progress, enrollment record and rating move to the new account; nobody else's change", async () => {
  const { learning } = await oldKabir();
  await call("GET", "/api/user/profile", { token: newKabir() });

  const progress = await call("POST", "/api/user/get-course-progress", { token: newKabir(), json: { courseId: String(learning._id) } });
  assert.deepEqual(progress.data.data.progressData.lectureCompleted, ["l1"]);
  assert.equal(await Purchase.countDocuments({ userId: "kc-new" }), 1);
  assert.equal(await Purchase.countDocuments({ userId: "kc-old" }), 0);
  const course = await Course.findById(learning._id).lean();
  assert.deepEqual(course.enrolledStudents.sort(), ["kc-new", "someone-else"]);
  assert.deepEqual(course.courseRatings.map((r) => [r.userId, r.rating]).sort(), [["kc-new", 4], ["someone-else", 2]]);
});

test("the old record is gone and the new one has the email", async () => {
  await oldKabir();
  await call("GET", "/api/user/profile", { token: newKabir() });
  assert.equal(await User.findById("kc-old"), null);
  assert.equal((await User.findById("kc-new")).email, EMAIL);
  assert.equal(await User.countDocuments({ email: EMAIL }), 1);
});

test("the courses they teach move with them", async () => {
  const { teaching } = await oldKabir();
  const res = await call("GET", "/api/educator/courses", { token: newKabir(["Subadmin"]) });
  assert.equal(res.status, 200);
  assert.equal((await Course.findById(teaching._id).lean()).educator, "kc-new");
  assert.deepEqual(res.data.data.courses.map((c) => String(c._id)), [String(teaching._id)]);
});

test("a move cut short is finished on the next visit", async () => {
  const { learning } = await oldKabir();
  // as if the server stopped after making the new record but before moving anything else
  const old = await User.findById("kc-old");
  await User.updateOne({ _id: "kc-old" }, { email: "moved-kc-old@bharattech.local", movedTo: "kc-new" });
  await User.create({ _id: "kc-new", name: "Kabir Das", email: EMAIL, enrolledCourses: old.enrolledCourses });

  await call("GET", "/api/user/profile", { token: newKabir() });

  assert.equal(await User.findById("kc-old"), null);
  assert.equal(await Purchase.countDocuments({ userId: "kc-new" }), 1);
  assert.deepEqual((await Course.findById(learning._id).lean()).enrolledStudents.sort(), ["kc-new", "someone-else"]);
});

test("a move cut short before the new record was made still keeps every course", async () => {
  const { learning } = await oldKabir();
  // as if the server stopped right after the old record gave up its email
  await User.updateOne({ _id: "kc-old" }, { email: "moved-kc-old@bharattech.local", movedTo: "kc-new" });

  const res = await call("GET", "/api/user/enrolled-courses", { token: newKabir() });

  assert.deepEqual(res.data.data.enrolledCourses.map((c) => String(c._id)), [String(learning._id)]);
  assert.equal((await User.findById("kc-new")).email, EMAIL);
  assert.equal(await User.findById("kc-old"), null);
});

test("someone with a different email is never merged into another person", async () => {
  await oldKabir();
  await call("GET", "/api/user/profile", { token: tokenFor({ sub: "kc-other", email: "meera@example.test", name: "Meera Iyer" }) });
  assert.ok(await User.findById("kc-old"));
  assert.equal(await Purchase.countDocuments({ userId: "kc-old" }), 1);
});
