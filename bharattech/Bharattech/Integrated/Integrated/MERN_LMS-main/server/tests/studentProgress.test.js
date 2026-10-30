import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import CourseProgress from "../models/CourseProgress.js";
import { startApp, stopApp, clearDatabase, tokenFor, call, courseForm, sampleCourse } from "./helpers.js";

// Group C Part 4 (2026-10-26): Students Enrolled shows how far each student is in each course (lectures done out of
// the course's lectures, and whether they finished), so educators can see who is learning.

before(startApp);
after(stopApp);
beforeEach(clearDatabase);

// made per call: the stand-in Keycloak only exists once the app has started
const educator = () => tokenFor({ sub: "educator-1", roles: ["Admin"], name: "Asha Rao" });
const lecture = (lectureTitle) => ({ lectureTitle, lectureDuration: 5, lectureUrl: "https://youtu.be/dQw4w9WgXcQ", isPreviewFree: false });

async function course(title, lectures) {
  const res = await call("POST", "/api/educator/add-course", {
    token: educator(),
    form: courseForm(sampleCourse({ courseTitle: title, courseContent: [{ chapterTitle: "Chapter 1", chapterContent: lectures.map(lecture) }] })),
  });
  return String(res.data.data._id);
}
const student = (sub, name) => tokenFor({ sub, name });
const enroll = (token, courseId) => call("POST", "/api/user/purchase", { token, json: { courseId } });
const mark = (token, courseId, lectureId) => call("POST", "/api/user/update-course-progress", { token, json: { courseId, lectureId } });
const rows = async () => (await call("GET", "/api/educator/enrolled-students", { token: educator() })).data.data.enrolledStudents;
const rowOf = (list, name, title) => list.find((r) => r.student.name === name && r.courseTitle === title);

test("each enrollment says how many lectures are done and whether the course is finished", async () => {
  const basics = await course("Basics", ["One", "Two", "Three"]);
  const extra = await course("Extra", ["Only"]);
  const kabir = student("s1", "Kabir Das");
  const meera = student("s2", "Meera Iyer");
  for (const [t, c] of [[kabir, basics], [meera, basics], [meera, extra]]) await enroll(t, c);
  await mark(kabir, basics, "lecture-1-1");
  for (const id of ["lecture-1-1", "lecture-1-2", "lecture-1-3"]) await mark(meera, basics, id);

  const list = await rows();
  assert.deepEqual(rowOf(list, "Kabir Das", "Basics").progress, { done: 1, total: 3, completed: false });
  assert.deepEqual(rowOf(list, "Meera Iyer", "Basics").progress, { done: 3, total: 3, completed: true });
  assert.deepEqual(rowOf(list, "Meera Iyer", "Extra").progress, { done: 0, total: 1, completed: false });
});

test("only the course's real lectures count, even in progress saved before that was checked", async () => {
  const basics = await course("Basics", ["One", "Two"]);
  const kabir = student("s1", "Kabir Das");
  await enroll(kabir, basics);
  await CourseProgress.create({ userId: "s1", courseId: basics, lectureCompleted: ["lecture-1-1", "made-up-1", "made-up-2"] });

  assert.deepEqual(rowOf(await rows(), "Kabir Das", "Basics").progress, { done: 1, total: 2, completed: false });
});
