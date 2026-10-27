import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import Course from "../models/Course.js";
import User from "../models/User.js";
import Purchase from "../models/Purchase.js";
import CourseProgress from "../models/CourseProgress.js";
import { isValidYouTubeUrl, extractYouTubeId } from "../utils/videoHelpers.js";
import { startApp, stopApp, clearDatabase, tokenFor, call, sampleCourse, baseUrl } from "./helpers.js";

// Review 2026-10-26 low list, Learning (owner's 1A, 2A, 3A, 5A): "My enrollments" sent each course whole, with the
// list of everyone enrolled and everyone's ratings; any localhost site could call the live server, and a blocked site
// got a 500; two first visits at once during an account move could fail; and the YouTube check took any link with
// "youtube.com/…" somewhere inside it.

before(startApp);
after(stopApp);
beforeEach(clearDatabase);

const content = [{ chapterId: "c1", chapterOrder: 1, chapterTitle: "One", chapterContent: [{ lectureId: "l1", lectureOrder: 1, lectureTitle: "One", lectureDuration: 5, lectureUrl: "https://youtu.be/dQw4w9WgXcQ", isPreviewFree: true }] }];

test("my enrolled courses don't list the other students, and carry only my own rating", async () => {
  await User.create({ _id: "educator-1", name: "Asha Rao", email: "asha@example.test" });
  const course = await Course.create({
    ...sampleCourse(),
    courseContent: content,
    courseThumbnail: "data:image/png;base64,AA==",
    isPublished: true,
    educator: "educator-1",
    enrolledStudents: ["kc-me", "kc-other"],
    courseRatings: [{ userId: "kc-me", rating: 4 }, { userId: "kc-other", rating: 1 }],
  });
  await User.create({ _id: "kc-me", name: "Me", email: "me@example.test", enrolledCourses: [course._id] });
  const res = await call("GET", "/api/user/enrolled-courses", { token: tokenFor({ sub: "kc-me", email: "me@example.test" }) });
  assert.equal(res.status, 200);
  const [mine] = res.data.data.enrolledCourses;
  assert.equal(mine.enrolledStudents, undefined);
  assert.deepEqual(mine.courseRatings.map((r) => [r.userId, r.rating]), [["kc-me", 4]]);
  assert.ok(!JSON.stringify(res.data).includes("kc-other"));
});

test("localhost sites may call the server only when it isn't live", async () => {
  // app.js loads after startApp: its sign-in check reads the stand-in Keycloak's address when it loads
  const { isAllowedOrigin } = await import("../app.js");
  process.env.NODE_ENV = "development";
  assert.equal(isAllowedOrigin("http://localhost:5175"), true);
  process.env.NODE_ENV = "production";
  assert.equal(isAllowedOrigin("http://localhost:5175"), false);
  delete process.env.NODE_ENV;
  process.env.RENDER = "true";
  assert.equal(isAllowedOrigin("http://127.0.0.1:5175"), false, "a Render server is live too");
  delete process.env.RENDER;
  process.env.NODE_ENV = "test";
  assert.equal(isAllowedOrigin(undefined), true, "no Origin: a server-to-server call");
});

test("a site that isn't allowed is refused plainly, not with a server error", async () => {
  const res = await fetch(`${baseUrl}/api/courses/all`, { headers: { Origin: "https://not-ours.example" } });
  assert.notEqual(res.status, 500);
  assert.equal(res.headers.get("access-control-allow-origin"), null);
});
