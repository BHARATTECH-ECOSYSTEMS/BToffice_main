import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import Course from "../models/Course.js";
import CourseProgress from "../models/CourseProgress.js";
import Purchase from "../models/Purchase.js";
import User from "../models/User.js";
import { startApp, stopApp, clearDatabase, tokenFor, call, sampleCourse } from "./helpers.js";

// Review 2026-10-26 M12: when a re-invited person's move to their new account was cut short and they used a course
// before the next visit finished it, the new account already had that course's progress (or enrollment). Moving the
// old one onto it broke the one-per-person-per-course rule, so every visit answered 500 from then on. Now the two
// are combined: lectures done from both, one enrollment, one rating (the newer one).

before(startApp);
after(stopApp);
beforeEach(clearDatabase);

const EMAIL = "kabir@example.test";
const lecture = (lectureId, lectureOrder) => ({ lectureId, lectureOrder, lectureTitle: lectureId, lectureDuration: 5, lectureUrl: "https://youtu.be/dQw4w9WgXcQ", isPreviewFree: true });
const content = [{ chapterId: "c1", chapterOrder: 1, chapterTitle: "Chapter 1", chapterContent: [lecture("l1", 1), lecture("l2", 2), lecture("l3", 3)] }];
const newKabir = () => tokenFor({ sub: "kc-new", email: EMAIL, name: "Kabir Das" });

/** A move cut short after the new record was made, and the new account used the same course in the meantime. */
async function cutShortThenUsed({ newCompleted = false } = {}) {
  await User.create({ _id: "educator-1", name: "Asha Rao", email: "asha@example.test" });
  const course = await Course.create({
    ...sampleCourse(),
    courseContent: content,
    courseThumbnail: "data:image/png;base64,AA==",
    isPublished: true,
    educator: "educator-1",
    enrolledStudents: ["kc-old", "kc-new", "someone-else"],
    courseRatings: [{ userId: "kc-old", rating: 2 }, { userId: "kc-new", rating: 5 }, { userId: "someone-else", rating: 3 }],
  });
  await User.create({ _id: "kc-old", name: "Kabir Das", email: `moved-kc-old@bharattech.local`, movedTo: "kc-new", enrolledCourses: [course._id] });
  await User.create({ _id: "kc-new", name: "Kabir Das", email: EMAIL, enrolledCourses: [course._id] });
  await Purchase.create({ userId: "kc-old", courseId: course._id, amount: 0, status: "completed" });
  await Purchase.create({ userId: "kc-new", courseId: course._id, amount: 0, status: "completed" });
  await CourseProgress.create({ userId: "kc-old", courseId: String(course._id), lectureCompleted: ["l1", "l2"], completed: false });
  await CourseProgress.create({ userId: "kc-new", courseId: String(course._id), lectureCompleted: ["l2", "l3"], completed: newCompleted });
  return course;
}

test("the next visit works, and the move is finished", async () => {
  await cutShortThenUsed();
  const res = await call("GET", "/api/user/profile", { token: newKabir() });
  assert.equal(res.status, 200);
  assert.equal(await User.findById("kc-old"), null);
  // and keeps working
  assert.equal((await call("GET", "/api/user/enrolled-courses", { token: newKabir() })).status, 200);
});

test("lectures done on either account count, in one progress record", async () => {
  const course = await cutShortThenUsed();
  await call("GET", "/api/user/profile", { token: newKabir() });
  const records = await CourseProgress.find({ courseId: String(course._id) }).lean();
  assert.equal(records.length, 1);
  assert.equal(records[0].userId, "kc-new");
  assert.deepEqual([...records[0].lectureCompleted].sort(), ["l1", "l2", "l3"]);
  assert.equal(records[0].completed, true, "all three lectures are done between them");
});

test("a course finished on either account stays finished", async () => {
  const course = await cutShortThenUsed({ newCompleted: true });
  // between them only l1 and l3 are done (the course was changed after it was finished, say): finished still counts
  await CourseProgress.updateOne({ userId: "kc-new" }, { $set: { lectureCompleted: ["l3"] } });
  await CourseProgress.updateOne({ userId: "kc-old" }, { $set: { lectureCompleted: ["l1"] } });
  await call("GET", "/api/user/profile", { token: newKabir() });
  assert.equal((await CourseProgress.findOne({ userId: "kc-new", courseId: String(course._id) }).lean()).completed, true);
});

test("one enrollment record and one place on the course, nobody else's changed", async () => {
  const course = await cutShortThenUsed();
  await call("GET", "/api/user/profile", { token: newKabir() });
  assert.equal(await Purchase.countDocuments({ userId: "kc-new" }), 1);
  assert.equal(await Purchase.countDocuments({ userId: "kc-old" }), 0);
  const stored = await Course.findById(course._id).lean();
  assert.deepEqual([...stored.enrolledStudents].sort(), ["kc-new", "someone-else"]);
});

test("one rating each: the new account's stays, the old one goes", async () => {
  const course = await cutShortThenUsed();
  await call("GET", "/api/user/profile", { token: newKabir() });
  const stored = await Course.findById(course._id).lean();
  assert.deepEqual(stored.courseRatings.map((r) => [r.userId, r.rating]).sort(), [["kc-new", 5], ["someone-else", 3]]);
});
