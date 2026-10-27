import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The video window (2026-10-27, owner's A): "Mark as watched" in the window shows no "Marked as watched." toast, which
// covered the window's own buttons; the window says "Watched" itself. A failure still shows its toast.

const src = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
// code without its comments
const code = (file) => fs.readFileSync(path.join(src, file), "utf8").replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "").replace(/^\s*\/\/.*$/gm, "");

test("the success toast is shown only when the caller asks for it", () => {
  const hook = code("hooks/useCourseProgress.js");
  assert.match(hook, /async \(lectureId, \{ announce = true \} = \{\}\)/);
  assert.match(hook, /if \(announce\) toast\.success\("Marked as watched\."\);/);
});

test("failures still show their toast whatever the caller asked", () => {
  const hook = code("hooks/useCourseProgress.js");
  // only markLectureCompleted's own body: fetchProgress has a toast.error(data.message) too
  const mark = hook.slice(hook.indexOf("const markLectureCompleted"), hook.indexOf("return {"));
  assert.match(mark, /\} else \{\s*toast\.error\(data\.message\);\s*\}/);
  assert.match(mark, /toast\.error\("Couldn't mark this lesson as watched\. Try again\."\)/);
});

test("the video window marks a lesson without the toast", () => {
  assert.match(code("pages/student/Player.jsx"), /onMarkComplete=\{\(lectureId\) => markLectureCompleted\(lectureId, \{ announce: false \}\)\}/);
});
