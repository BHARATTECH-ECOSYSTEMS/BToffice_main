import { test } from "node:test";
import assert from "node:assert/strict";
import { upNextLecture, lessonNumberStarts } from "../src/utils/courseHelpers.js";
import { staggerDelay, isFirstShow, markShown } from "../src/utils/entrance.js";

// Learning polish (2026-10-27, owner's 1A-4A): cards come in one after another the first time a list shows, lessons
// are numbered through the course, and the player's side card says which lesson is up next.

test("cards come in 40 ms apart, and the wait stops growing after the eighth card", () => {
  assert.equal(staggerDelay(0), 0);
  assert.equal(staggerDelay(1), 40);
  assert.equal(staggerDelay(7), 280);
  assert.equal(staggerDelay(8), 280);
  assert.equal(staggerDelay(40), 280);
});

test("an odd position never delays a card", () => {
  assert.equal(staggerDelay(-1), 0);
  assert.equal(staggerDelay(undefined), 0);
  assert.equal(staggerDelay(Number.NaN), 0);
});

test("a list animates only the first time it shows in this tab", () => {
  assert.equal(isFirstShow("test-list"), true);
  assert.equal(isFirstShow("test-list"), true, "asking alone doesn't use up the first show");
  markShown("test-list");
  assert.equal(isFirstShow("test-list"), false);
  assert.equal(isFirstShow("test-other-list"), true, "each list has its own first show");
});

const course = {
  courseContent: [
    { chapterContent: [{ lectureId: "1-1", lectureUrl: "u" }, { lectureId: "1-2", lectureUrl: "u" }] },
    { chapterContent: [] },
    { chapterContent: [{ lectureId: "3-1", lectureUrl: "" }, { lectureId: "3-2", lectureUrl: "u" }] },
  ],
};
const at = (chapterIndex, lectureIndex) => ({
  lecture: course.courseContent[chapterIndex].chapterContent[lectureIndex],
  chapterIndex,
  lectureIndex,
});

test("up next is the first lesson you haven't watched", () => {
  assert.deepEqual(upNextLecture(course, []), at(0, 0));
  assert.deepEqual(upNextLecture(course, ["1-1"]), at(0, 1));
  assert.deepEqual(upNextLecture(course, ["1-2"]), at(0, 0), "an earlier lesson you skipped comes first");
  assert.deepEqual(upNextLecture(course, undefined), at(0, 0));
});

test("up next skips empty chapters and lessons that can't be played", () => {
  assert.deepEqual(upNextLecture(course, ["1-1", "1-2"]), at(2, 1));
});

test("with every playable lesson watched, or no lessons, nothing is up next", () => {
  assert.equal(upNextLecture(course, ["1-1", "1-2", "3-2"]), null);
  assert.equal(upNextLecture({ courseContent: [] }, []), null);
  assert.equal(upNextLecture(undefined, []), null);
});

test("lessons are numbered through the whole course, chapter after chapter", () => {
  assert.deepEqual(lessonNumberStarts(course.courseContent), [1, 3, 3]);
  assert.deepEqual(lessonNumberStarts([{}, { chapterContent: [{}] }]), [1, 1]);
  assert.deepEqual(lessonNumberStarts(undefined), []);
});
