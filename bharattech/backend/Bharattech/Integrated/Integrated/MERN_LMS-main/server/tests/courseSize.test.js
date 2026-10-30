import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { startApp, stopApp, clearDatabase, tokenFor, call, courseForm, sampleCourse } from "./helpers.js";
import { courseSize } from "../utils/lectures.js";

// LMS redesign (2026-10-26, owner's 4A): course cards show how many lessons a course has and how long it is, so the
// course list carries those two numbers, still without the lecture list itself.

before(startApp);
after(stopApp);
beforeEach(clearDatabase);

const educator = () => tokenFor({ sub: "educator-1", roles: ["Admin"], name: "Asha Rao" });
const lecture = (lectureTitle, lectureDuration) => ({ lectureTitle, lectureDuration, lectureUrl: "https://youtu.be/dQw4w9WgXcQ", isPreviewFree: false });

test("a course's size counts every lecture in every chapter and adds up their minutes", () => {
  const course = {
    courseContent: [
      { chapterContent: [{ lectureDuration: 20 }, { lectureDuration: 15 }] },
      { chapterContent: [{ lectureDuration: 30 }] },
      { chapterContent: [] },
    ],
  };
  assert.deepEqual(courseSize(course), { lectureCount: 3, totalMinutes: 65 });
});

test("a course without lectures, or a lecture without a length, counts as nothing", () => {
  assert.deepEqual(courseSize({}), { lectureCount: 0, totalMinutes: 0 });
  assert.deepEqual(courseSize({ courseContent: [{ chapterContent: [{}] }] }), { lectureCount: 1, totalMinutes: 0 });
});

test("the course list gives each course's lesson count and length, but not its lectures", async () => {
  await call("POST", "/api/educator/add-course", {
    token: educator(),
    form: courseForm(sampleCourse({ courseTitle: "Basics", courseContent: [{ chapterTitle: "One", chapterContent: [lecture("A", 20), lecture("B", 45)] }] })),
  });

  const res = await call("GET", "/api/courses/all");

  assert.equal(res.status, 200);
  const [course] = res.data.data.courses;
  assert.equal(course.courseTitle, "Basics");
  assert.equal(course.lectureCount, 2);
  assert.equal(course.totalMinutes, 65);
  assert.equal(course.courseContent, undefined);
  assert.equal(course.enrolledStudents, undefined);
});
