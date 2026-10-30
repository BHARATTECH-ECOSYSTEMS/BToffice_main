import { test } from "node:test";
import assert from "node:assert/strict";
import { isListPath, backLink, rememberScroll, savedScroll } from "../src/utils/backToList.js";

// Going back from a course (owner's 1A-4A, 2026-10-27): the back link returns to the list the course was opened from,
// and that list comes back where you left it, so the course's cover can shrink back into its card.

test("Home, All courses and a search are the lists a course is opened from", () => {
  assert.equal(isListPath("/"), true);
  assert.equal(isListPath("/course-list"), true);
  assert.equal(isListPath("/course-list/react"), true);
  assert.equal(isListPath("/course/abc"), false);
  assert.equal(isListPath("/player/abc"), false);
  assert.equal(isListPath("/my-enrollments"), false);
  assert.equal(isListPath("/course-listing"), false);
  assert.equal(isListPath(undefined), false);
});

test("opened from a list, the back link steps back to it and is named after it", () => {
  assert.deepEqual(backLink({ from: "/" }), { back: true, to: "/", label: "Home" });
  assert.deepEqual(backLink({ from: "/course-list" }), { back: true, to: "/course-list", label: "All courses" });
  assert.deepEqual(backLink({ from: "/course-list/react" }), { back: true, to: "/course-list/react", label: "Search results" });
});

test("opened any other way, the back link opens All courses", () => {
  const allCourses = { back: false, to: "/course-list", label: "All courses" };
  assert.deepEqual(backLink(null), allCourses);
  assert.deepEqual(backLink(undefined), allCourses);
  assert.deepEqual(backLink({}), allCourses);
  assert.deepEqual(backLink({ from: "/player/abc" }), allCourses, "only a list is stepped back to");
  assert.deepEqual(backLink({ from: "https://elsewhere.example/" }), allCourses);
});

test("each list remembers where it was scrolled", () => {
  assert.equal(savedScroll("/test-a"), 0, "a list never left opens at the top");
  rememberScroll("/test-a", 640);
  rememberScroll("/test-b", 120);
  assert.equal(savedScroll("/test-a"), 640);
  assert.equal(savedScroll("/test-b"), 120);
  rememberScroll("/test-a", 80);
  assert.equal(savedScroll("/test-a"), 80, "the latest place wins");
});

test("an odd scroll value is never remembered", () => {
  rememberScroll("/test-c", Number.NaN);
  rememberScroll("/test-d", -20);
  assert.equal(savedScroll("/test-c"), 0);
  assert.equal(savedScroll("/test-d"), 0);
});
