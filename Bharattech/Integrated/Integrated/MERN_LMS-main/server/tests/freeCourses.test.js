import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import Course from "../models/Course.js";
import Purchase from "../models/Purchase.js";
import User from "../models/User.js";
import { startApp, stopApp, clearDatabase, tokenFor, call, courseForm, sampleCourse } from "./helpers.js";

// Group C Part 3 (2026-10-26, owner's 2A 4A): every course is free, so no price, discount or "earnings" is kept or
// shown, and lectures are YouTube videos only (the company's Cloudinary upload needs keys nobody has, and accepted any
// address as a video).

before(startApp);
after(stopApp);
beforeEach(clearDatabase);

const educator = () => tokenFor({ sub: "educator-1", roles: ["Admin"], name: "Asha Rao" });
const lecture = (overrides = {}) => ({ lectureTitle: "One", lectureDuration: 5, lectureUrl: "https://youtu.be/dQw4w9WgXcQ", isPreviewFree: true, ...overrides });
const withLecture = (l) => sampleCourse({ courseContent: [{ chapterTitle: "Chapter 1", chapterContent: [l] }] });

test("a new course is free whatever price or discount is sent", async () => {
  const res = await call("POST", "/api/educator/add-course", { token: educator(), form: courseForm(sampleCourse({ coursePrice: 999, discount: 50 })) });
  assert.equal(res.status, 201);
  const saved = await Course.findById(res.data.data._id).lean();
  assert.equal(saved.coursePrice, 0);
  assert.equal(saved.discount, 0);
});

test("a discount out of range no longer matters: it is ignored, not refused", async () => {
  const res = await call("POST", "/api/educator/add-course", { token: educator(), form: courseForm(sampleCourse({ discount: 400 })) });
  assert.equal(res.status, 201);
});

test("enrolling costs nothing, even in an older course that still has a price on file", async () => {
  await User.create({ _id: "educator-1", name: "Asha Rao", email: "asha@example.test" });
  const old = await Course.create({
    ...sampleCourse(),
    courseContent: [{ chapterId: "c1", chapterOrder: 1, chapterTitle: "Chapter 1", chapterContent: [{ ...lecture(), lectureId: "l1", lectureOrder: 1 }] }],
    coursePrice: 500,
    discount: 10,
    courseThumbnail: "data:image/png;base64,AA==",
    isPublished: true,
    educator: "educator-1",
  });
  const res = await call("POST", "/api/user/purchase", { token: tokenFor({ sub: "s1" }), json: { courseId: String(old._id) } });
  assert.equal(res.status, 200);
  assert.equal((await Purchase.findOne({ userId: "s1" })).amount, 0);
});

test("the educator dashboard reports enrollments, not earnings", async () => {
  const res = await call("GET", "/api/educator/dashboard", { token: educator() });
  assert.equal(res.status, 200);
  assert.equal("totalEarnings" in res.data.data, false);
});

test("lectures are YouTube videos only: any other address is refused, whatever source is claimed", async () => {
  for (const l of [lecture({ videoSource: "cloudinary", lectureUrl: "https://example.test/video.mp4" }), lecture({ videoSource: "cloudinary", lectureUrl: "javascript:alert(1)" })]) {
    const res = await call("POST", "/api/educator/add-course", { token: educator(), form: courseForm(withLecture(l)) });
    assert.equal(res.status, 400, l.lectureUrl);
    assert.match(res.data.message, /YouTube/);
  }
  assert.equal(await Course.countDocuments(), 0);
});

test("a YouTube lecture sent as an 'upload' is saved as a YouTube lecture", async () => {
  const res = await call("POST", "/api/educator/add-course", { token: educator(), form: courseForm(withLecture(lecture({ videoSource: "cloudinary" }))) });
  assert.equal(res.status, 201);
  const saved = await Course.findById(res.data.data._id).lean();
  assert.equal(saved.courseContent[0].chapterContent[0].videoSource, "youtube");
});
