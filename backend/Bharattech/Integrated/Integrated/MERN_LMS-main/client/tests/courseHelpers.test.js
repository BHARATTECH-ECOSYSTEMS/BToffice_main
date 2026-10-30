import { test } from "node:test";
import assert from "node:assert/strict";
import { enrolledCountOf, ownRating, progressLabel } from "../src/utils/courseHelpers.js";

// Group C Part 1 (2026-10-26): a student's own rating shows again (the signed-in user has `id`, not `_id`), and the
// public course page's student count comes from enrolledCount now that it no longer lists who enrolled.

const course = { courseRatings: [{ userId: "kc-1", rating: 4 }, { userId: "kc-2", rating: 2 }] };

test("a student's own earlier rating is found by their sign-in id", () => {
  assert.equal(ownRating(course, { id: "kc-1" }), 4);
  assert.equal(ownRating(course, { id: "kc-2", _id: "kc-1" }), 2);
});

test("no rating yet, no user, or public ratings without ids give 0", () => {
  assert.equal(ownRating(course, { id: "kc-9" }), 0);
  assert.equal(ownRating(course, null), 0);
  assert.equal(ownRating({ courseRatings: [{ rating: 5 }] }, { id: undefined }), 0);
  assert.equal(ownRating({}, { id: "kc-1" }), 0);
});

test("the student count reads enrolledCount, or the list where an educator page still has it", () => {
  assert.equal(enrolledCountOf({ enrolledCount: 3 }), 3);
  assert.equal(enrolledCountOf({ enrolledStudents: ["a", "b"] }), 2);
  assert.equal(enrolledCountOf({}), 0);
});

// Group C Part 4: Students Enrolled shows how far each student is.
test("a student's progress reads as lessons watched out of the course's, or Completed", () => {
  assert.deepEqual(progressLabel({ done: 1, total: 3, completed: false }), { text: "1 of 3 lessons", percent: 33, completed: false });
  assert.deepEqual(progressLabel({ done: 1, total: 1, completed: true }), { text: "Completed", percent: 100, completed: true });
  assert.deepEqual(progressLabel({ done: 0, total: 1, completed: false }), { text: "0 of 1 lesson", percent: 0, completed: false });
  assert.deepEqual(progressLabel(undefined), { text: "-", percent: 0, completed: false });
});
