import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { startApp, stopApp, clearDatabase, tokenFor, call, courseForm, sampleCourse } from "./helpers.js";

// Group C Part 6 (2026-10-26, owner's 6A): the portal's dashboard shows "My learning", the courses a person is
// enrolled in with how far they are, from one small request (no covers, no lecture lists, nobody else's data).

before(startApp);
after(stopApp);
beforeEach(clearDatabase);

const educator = () => tokenFor({ sub: "educator-1", roles: ["Admin"], name: "Asha Rao" });
const lecture = (lectureTitle) => ({ lectureTitle, lectureDuration: 5, lectureUrl: "https://youtu.be/dQw4w9WgXcQ", isPreviewFree: false });
async function course(title, n) {
  const res = await call("POST", "/api/educator/add-course", {
    token: educator(),
    form: courseForm(sampleCourse({ courseTitle: title, courseContent: [{ chapterTitle: "Chapter 1", chapterContent: Array.from({ length: n }, (_, i) => lecture(`L${i + 1}`)) }] })),
  });
  return String(res.data.data._id);
}
const learning = (token) => call("GET", "/api/user/learning", { token });

test("my courses come with their progress, unfinished first", async () => {
  const basics = await course("Basics", 2);
  const extra = await course("Extra", 1);
  const kabir = tokenFor({ sub: "s1", name: "Kabir Das" });
  await call("POST", "/api/user/purchase", { token: kabir, json: { courseId: extra } });
  await call("POST", "/api/user/purchase", { token: kabir, json: { courseId: basics } });
  await call("POST", "/api/user/update-course-progress", { token: kabir, json: { courseId: extra, lectureId: "lecture-1-1" } });
  await call("POST", "/api/user/update-course-progress", { token: kabir, json: { courseId: basics, lectureId: "lecture-1-1" } });

  const res = await learning(kabir);

  assert.equal(res.status, 200);
  assert.deepEqual(res.data.data.courses, [
    { courseId: basics, courseTitle: "Basics", educatorName: "Asha Rao", done: 1, total: 2, completed: false },
    { courseId: extra, courseTitle: "Extra", educatorName: "Asha Rao", done: 1, total: 1, completed: true },
  ]);
});

test("someone enrolled in nothing gets an empty list, and only their own courses ever", async () => {
  const basics = await course("Basics", 1);
  // someone else really is enrolled, or an empty list says nothing about "only their own"
  assert.equal((await call("POST", "/api/user/purchase", { token: tokenFor({ sub: "s1" }), json: { courseId: basics } })).status, 200);
  assert.deepEqual((await learning(tokenFor({ sub: "s1" }))).data.data.courses.map((c) => c.courseId), [basics]);
  const meera = await learning(tokenFor({ sub: "s2" }));
  assert.equal(meera.status, 200);
  assert.deepEqual(meera.data.data.courses, []);
});

test("it needs a sign-in", async () => {
  assert.equal((await call("GET", "/api/user/learning")).status, 401);
});
