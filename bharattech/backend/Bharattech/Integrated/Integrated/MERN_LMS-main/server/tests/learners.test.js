import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Course from "../models/Course.js";
import CourseProgress from "../models/CourseProgress.js";
import User from "../models/User.js";
import { UPLOAD_DIR } from "../configs/multer.js";
import { startApp, stopApp, clearDatabase, tokenFor, call, courseForm, sampleCourse } from "./helpers.js";

// Group C Part 1 (2026-10-26 gap audit): people show with their real names, kept up to date; progress needs an
// enrollment and real lectures, and a course is marked completed when every lecture is done; public course pages
// don't list who enrolled; a refused cover upload leaves no file behind.

before(startApp);
after(stopApp);
beforeEach(clearDatabase);

const twoLectures = () =>
  sampleCourse({
    courseContent: [
      {
        chapterTitle: "Chapter 1",
        chapterContent: [
          { lectureTitle: "One", lectureDuration: 5, lectureUrl: "https://youtu.be/dQw4w9WgXcQ", isPreviewFree: true },
          { lectureTitle: "Two", lectureDuration: 5, lectureUrl: "https://youtu.be/dQw4w9WgXcQ", isPreviewFree: false },
        ],
      },
    ],
  });
const makeCourse = async (educator = tokenFor({ sub: "educator-1", roles: ["Admin"], name: "Asha Rao" })) => {
  const res = await call("POST", "/api/educator/add-course", { token: educator, form: courseForm(twoLectures()) });
  assert.equal(res.status, 201);
  return String(res.data.data._id);
};
const enroll = (token, courseId) => call("POST", "/api/user/purchase", { token, json: { courseId } });
const mark = (token, courseId, lectureId) => call("POST", "/api/user/update-course-progress", { token, json: { courseId, lectureId } });

test("a person shows with the name from their sign-in, not their username", async () => {
  await call("GET", "/api/user/profile", { token: tokenFor({ sub: "p1", name: "Kabir Das", preferred_username: "kabir.d" }) });
  assert.equal((await User.findById("p1")).name, "Kabir Das");
});

test("a renamed person's new name replaces the old one on their next visit", async () => {
  await call("GET", "/api/user/profile", { token: tokenFor({ sub: "p1", name: "Kabir Das" }) });
  await call("GET", "/api/user/profile", { token: tokenFor({ sub: "p1", name: "Kabir Dasgupta" }) });
  assert.equal((await User.findById("p1")).name, "Kabir Dasgupta");
});

test("an educator's courses show their real name, and it follows a rename", async () => {
  const courseId = await makeCourse();
  const page = await call("GET", `/api/courses/${courseId}`);
  assert.equal(page.data.data.course.educator.name, "Asha Rao");
  await call("GET", "/api/educator/courses", { token: tokenFor({ sub: "educator-1", roles: ["Admin"], name: "Asha Rao-Iyer" }) });
  assert.equal((await call("GET", `/api/courses/${courseId}`)).data.data.course.educator.name, "Asha Rao-Iyer");
});

test("a token without a name keeps the name already on file", async () => {
  assert.equal((await call("GET", "/api/user/profile", { token: tokenFor({ sub: "p1", name: "Kabir Das" }) })).status, 200);
  // the nameless visit must work, or a kept name would only mean the visit failed
  assert.equal((await call("GET", "/api/user/profile", { token: tokenFor({ sub: "p1", name: undefined }) })).status, 200);
  assert.equal((await User.findById("p1")).name, "Kabir Das");
});

test("lectures can be marked done only in a course you're enrolled in", async () => {
  const courseId = await makeCourse();
  const student = tokenFor({ sub: "s1" });
  const refused = await mark(student, courseId, "lecture-1-1");
  assert.equal(refused.status, 403);
  assert.match(refused.data.message, /enroll/i);
  assert.equal(await CourseProgress.countDocuments(), 0);
  assert.equal((await enroll(student, courseId)).status, 200);
  assert.equal((await mark(student, courseId, "lecture-1-1")).status, 200);
});

test("only the course's own lectures can be marked done", async () => {
  const courseId = await makeCourse();
  const student = tokenFor({ sub: "s1" });
  await enroll(student, courseId);
  const made_up = await mark(student, courseId, "lecture-9-9");
  assert.equal(made_up.status, 400);
  assert.equal(await CourseProgress.countDocuments(), 0);
  assert.equal((await mark(student, "64b000000000000000000000", "lecture-1-1")).status, 404);
});

test("a course is marked completed once every lecture is done, not before", async () => {
  const courseId = await makeCourse();
  const student = tokenFor({ sub: "s1" });
  await enroll(student, courseId);
  const first = await mark(student, courseId, "lecture-1-1");
  assert.equal(first.data.completed, false);
  assert.equal((await CourseProgress.findOne({ userId: "s1" })).completed, false);
  // marking the same lecture again doesn't count twice
  await mark(student, courseId, "lecture-1-1");
  assert.equal((await CourseProgress.findOne({ userId: "s1" })).completed, false);
  const last = await mark(student, courseId, "lecture-1-2");
  assert.equal(last.data.completed, true);
  assert.equal((await CourseProgress.findOne({ userId: "s1" })).completed, true);
});

test("public course pages say how many enrolled and the ratings, but not who", async () => {
  const courseId = await makeCourse();
  const student = tokenFor({ sub: "s1" });
  await enroll(student, courseId);
  await call("POST", "/api/user/add-rating", { token: student, json: { courseId, rating: 4 } });

  const one = (await call("GET", `/api/courses/${courseId}`)).data.data.course;
  assert.equal(one.enrolledStudents, undefined);
  assert.equal(one.enrolledCount, 1);
  assert.deepEqual(one.courseRatings, [{ rating: 4 }]);
  const all = (await call("GET", "/api/courses/all")).data.data.courses[0];
  assert.deepEqual(all.courseRatings, [{ rating: 4 }]);
  assert.equal(all.enrolledStudents, undefined);
});

test("a cover over 5 MB is refused with a plain message, and no uploaded file is left behind", async () => {
  const before = fs.existsSync(UPLOAD_DIR) ? fs.readdirSync(UPLOAD_DIR).length : 0;
  const big = new FormData();
  big.append("courseData", JSON.stringify(twoLectures()));
  big.append("image", new Blob([Buffer.alloc(5 * 1024 * 1024 + 1)], { type: "image/png" }), "big.png");
  const res = await call("POST", "/api/educator/add-course", { token: tokenFor({ roles: ["Admin"] }), form: big });
  assert.equal(res.status, 400);
  assert.match(res.data.message, /5 MB/);
  assert.equal(fs.readdirSync(UPLOAD_DIR).length, before);
});

test("a course refused for its content leaves no uploaded cover behind", async () => {
  const before = fs.existsSync(UPLOAD_DIR) ? fs.readdirSync(UPLOAD_DIR).length : 0;
  const res = await call("POST", "/api/educator/add-course", { token: tokenFor({ roles: ["Admin"] }), form: courseForm(sampleCourse({ courseTitle: "" })) });
  assert.equal(res.status, 400);
  assert.equal(fs.readdirSync(UPLOAD_DIR).length, before);
  assert.equal(await Course.countDocuments(), 0);
});
