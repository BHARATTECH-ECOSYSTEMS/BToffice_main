import { test } from "node:test";
import assert from "node:assert/strict";
import { lessonPlace } from "../src/utils/videoWindow.js";

// The video window (2026-10-27, owner's 1A): its header says which lesson of the course is playing.

const content = [
  { chapterContent: [{ lectureId: "a" }, { lectureId: "b" }] },
  { chapterContent: [] },
  { chapterContent: [{ lectureId: "c" }, { lectureId: "d" }] },
];

test("a lesson's place is counted through the whole course, across chapters", () => {
  assert.deepEqual(lessonPlace(content, "a"), { number: 1, total: 4 });
  assert.deepEqual(lessonPlace(content, "b"), { number: 2, total: 4 });
  assert.deepEqual(lessonPlace(content, "c"), { number: 3, total: 4 }, "an empty chapter doesn't count");
  assert.deepEqual(lessonPlace(content, "d"), { number: 4, total: 4 });
});

test("an unknown lesson or a course without content has no place", () => {
  assert.equal(lessonPlace(content, "x"), null);
  assert.equal(lessonPlace(undefined, "a"), null);
  assert.equal(lessonPlace([{}], "a"), null);
});
