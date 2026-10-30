import { test } from "node:test";
import assert from "node:assert/strict";
import { educatorFigures, shortDate, plural } from "../src/utils/courseHelpers.js";

// Educator view redesign (2026-10-26, owner's 3A): the figures are named for what they count, so "enrollments"
// (one person in two courses counts twice) and "learners" (different people) can't be mixed up again.

test("enrollments count every enrollment; learners count each person once", () => {
  const enrollments = [
    { student: { _id: "devesh" } },
    { student: { _id: "ranit" } },
    { student: { _id: "devesh" } },
    { student: null },
  ];
  assert.deepEqual(educatorFigures(8, enrollments), { courses: 8, enrollments: 4, learners: 2 });
});

test("no data gives zeros, not errors", () => {
  assert.deepEqual(educatorFigures(undefined, undefined), { courses: 0, enrollments: 0, learners: 0 });
});

test("dates read day, short month, year; anything unreadable reads as nothing", () => {
  assert.equal(shortDate("2026-10-26T09:30:00.000Z"), "26 Oct 2026");
  assert.equal(shortDate(""), "");
  assert.equal(shortDate("not a date"), "");
  assert.equal(shortDate(undefined), "");
});

test("counts read naturally", () => {
  assert.equal(plural(1, "learner"), "1 learner");
  assert.equal(plural(0, "learner"), "0 learners");
  assert.equal(plural(3, "enrollment"), "3 enrollments");
});
