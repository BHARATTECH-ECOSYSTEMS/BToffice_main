import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import Course from "../models/Course.js";
import User from "../models/User.js";
import {
  startApp,
  stopApp,
  clearDatabase,
  tokenFor,
  call,
  courseForm,
  sampleCourse,
  LOCAL_SECRET,
} from "./helpers.js";

const here = path.dirname(fileURLToPath(import.meta.url));

before(startApp);
after(stopApp);
beforeEach(clearDatabase);

async function storedCourse({ isPublished }) {
  await User.create({ _id: "educator-1", name: "Educator One", email: "educator@example.test", imageUrl: "https://example.test/me.png" });
  return Course.create({
    ...sampleCourse(),
    courseThumbnail: "data:image/png;base64,AA==",
    isPublished,
    educator: "educator-1",
    courseContent: [
      {
        chapterId: "c1",
        chapterOrder: 1,
        chapterTitle: "Chapter 1",
        chapterContent: [
          {
            lectureId: "l1",
            lectureTitle: "Lecture 1",
            lectureDuration: 5,
            lectureUrl: "https://youtu.be/dQw4w9WgXcQ",
            isPreviewFree: false,
            lectureOrder: 1,
          },
        ],
      },
    ],
  });
}

test("a token the server signed itself is refused, even with JWT_SECRET set", async () => {
  const selfMade = jwt.sign({ id: "anyone", role: "admin", roles: ["admin"] }, LOCAL_SECRET);
  const res = await call("GET", "/api/educator/courses", { token: selfMade });
  assert.equal(res.status, 401);
});

test("only tokens issued for the LMS's own Keycloak app are accepted", async () => {
  const other = await call("GET", "/api/user/profile", { token: tokenFor({ azp: "other-client" }) });
  assert.equal(other.status, 401);
  const missing = await call("GET", "/api/user/profile", { token: tokenFor({ azp: undefined }) });
  assert.equal(missing.status, 401);
  const own = await call("GET", "/api/user/profile", { token: tokenFor() });
  assert.equal(own.status, 200);
});

test("a refused token gets a plain message without the internal error", async () => {
  const res = await call("GET", "/api/user/profile", { token: "not.a.token" });
  assert.equal(res.status, 401);
  assert.deepEqual(Object.keys(res.data).sort(), ["message", "success"]);
});

test("a person's first visit works without a picture on file", async () => {
  const profile = await call("GET", "/api/user/profile", { token: tokenFor({ sub: "new-person" }) });
  assert.equal(profile.status, 200);
  assert.equal(profile.data.data.user._id, "new-person");
});

test("a sub admin's first course is saved (no 500 for a missing picture)", async () => {
  const res = await call("POST", "/api/educator/add-course", {
    token: tokenFor({ sub: "sub-1", roles: ["Subadmin"] }),
    form: courseForm(sampleCourse()),
  });
  assert.equal(res.status, 201);
  assert.ok(await User.findById("sub-1"));
});

test("course descriptions keep their formatting but lose anything that runs code", async () => {
  const res = await call("POST", "/api/educator/add-course", {
    token: tokenFor({ roles: ["admin"] }),
    form: courseForm(
      sampleCourse({
        courseDescription:
          '<h2>Welcome</h2><p><strong>Bold</strong> and <em>loose</em> <a href="https://example.test/a">link</a></p>' +
          "<ul><li>One</li></ul>" +
          '<script>steal()</script><img src=x onerror="steal()"><a href="javascript:steal()">bad</a>' +
          '<p onclick="steal()" style="color:red">click</p><iframe src="https://evil.test"></iframe>',
      })
    ),
  });
  assert.equal(res.status, 201);
  const saved = (await Course.findById(res.data.data._id).lean()).courseDescription;
  for (const kept of ["<h2>Welcome</h2>", "<strong>Bold</strong>", "<em>loose</em>", 'href="https://example.test/a"', "<li>One</li>"]) {
    assert.ok(saved.includes(kept), `kept ${kept}`);
  }
  for (const gone of ["<script", "steal()", "onerror", "javascript:", "onclick", "<iframe", "style="]) {
    assert.ok(!saved.includes(gone), `removed ${gone}`);
  }
});

test("a description that is only code, or the editor's empty paragraph, is refused instead of saved empty", async () => {
  for (const courseDescription of ["<script>steal()</script>", "<p><br></p>"]) {
    const res = await call("POST", "/api/educator/add-course", {
      token: tokenFor({ roles: ["admin"] }),
      form: courseForm(sampleCourse({ courseDescription })),
    });
    assert.equal(res.status, 400, courseDescription);
  }
  assert.equal(await Course.countDocuments(), 0);
});

test("an unpublished course can't be opened or enrolled in", async () => {
  const course = await storedCourse({ isPublished: false });
  const open = await call("GET", `/api/courses/${course._id}`);
  assert.equal(open.status, 404);
  const enroll = await call("POST", "/api/user/purchase", { token: tokenFor(), json: { courseId: String(course._id) } });
  assert.equal(enroll.status, 404);
  assert.deepEqual((await Course.findById(course._id).lean()).enrolledStudents, []);
});

test("public course pages don't show the educator's email", async () => {
  const course = await storedCourse({ isPublished: true });
  const one = await call("GET", `/api/courses/${course._id}`);
  assert.equal(one.status, 200);
  assert.equal(one.data.data.course.educator.name, "Educator One");
  assert.equal(one.data.data.course.educator.email, undefined);
  const all = await call("GET", "/api/courses/all");
  assert.equal(all.data.data.courses.length, 1);
  assert.equal(all.data.data.courses[0].educator.email, undefined);
});

test("no reply sends an error's internal message", () => {
  const folders = ["controllers", "middlewares"].map((folder) => path.join(here, "..", folder));
  const leaks = [];
  for (const folder of folders) {
    for (const file of fs.readdirSync(folder)) {
      const source = fs.readFileSync(path.join(folder, file), "utf8");
      // every .json(...) or .send(...) reply, up to its closing bracket
      for (const reply of source.matchAll(/\.(?:json|send)\(([\s\S]*?)\);/g)) {
        if (/\b(err|error)\.message\b/.test(reply[1])) leaks.push(`${file}: ${reply[1].replace(/\s+/g, " ").slice(0, 80)}`);
      }
    }
  }
  assert.deepEqual(leaks, []);
});
