const { test } = require("node:test");
const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");

// 2026-10-26, owner's 2-2A: the portal's own courses (/api/learning, step 10) are gone. Courses live in the company's
// LMS Platform (MERN LMS), which the portal's Learning opens, and nothing calls /api/learning any more. The courses it
// stored stay in the database untouched (owner's 2-3A); nothing reads them.

const here = (file) => path.join(__dirname, "..", file);

test("the /api/learning files are gone and server.js no longer mounts the route", () => {
  for (const file of ["controllers/learningController.js", "routes/learningRoutes.js", "models/LearningCourse.js", "models/LearningEnrollment.js"]) {
    assert.equal(existsSync(here(file)), false, file);
  }
  const server = readFileSync(here("server.js"), "utf8");
  assert.doesNotMatch(server, /learningRoutes|\/api\/learning/);
});

test("nothing announces new portal courses any more", () => {
  const notify = require("../utils/notify");
  assert.equal("noteCourse" in notify, false);
});
