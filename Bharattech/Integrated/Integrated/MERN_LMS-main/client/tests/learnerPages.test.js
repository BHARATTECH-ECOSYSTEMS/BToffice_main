import { test } from "node:test";
import assert from "node:assert/strict";
import { excerptOf, ratingSummary, lessonsLabel, minutesLabel, withCovers, continueLearning, nextLectureAfter } from "../src/utils/courseHelpers.js";

// LMS redesign (2026-10-26, owner's 1A-4A): the learner pages show only what is true and useful: a readable
// description excerpt, ratings only once someone rated, lessons and length on each card, and your own courses with
// their progress first.

test("an excerpt keeps a space between a heading and the paragraph after it", () => {
  const html = "<h2>Learn the Basics of JavaScript</h2><p>JavaScript is a versatile language.</p>";
  assert.equal(excerptOf(html, 200), "Learn the Basics of JavaScript JavaScript is a versatile language.");
});

test("an excerpt reads list items, line breaks and common entities as plain text", () => {
  assert.equal(excerptOf("<ul><li>One</li><li>Two</li></ul>Three<br>Four &amp; five &lt;b&gt;", 200), "One Two Three Four & five <b>");
});

test("a long excerpt is cut at a word, with an ellipsis", () => {
  assert.equal(excerptOf("<p>alpha beta gamma delta</p>", 14), "alpha beta…");
  assert.equal(excerptOf("<p>alpha beta</p>", 14), "alpha beta");
  assert.equal(excerptOf("", 14), "");
  assert.equal(excerptOf(undefined, 14), "");
});

test("no rating yet shows nothing; ratings show their average and how many", () => {
  assert.equal(ratingSummary({ courseRatings: [] }), null);
  assert.equal(ratingSummary({}), null);
  assert.deepEqual(ratingSummary({ courseRatings: [{ rating: 4 }, { rating: 5 }] }), { average: 4.5, count: 2 });
});

test("lessons and length read naturally", () => {
  assert.equal(lessonsLabel(1), "1 lesson");
  assert.equal(lessonsLabel(4), "4 lessons");
  assert.equal(lessonsLabel(0), "No lessons yet");
  assert.equal(minutesLabel(45), "45 min");
  assert.equal(minutesLabel(60), "1 h");
  assert.equal(minutesLabel(65), "1 h 5 min");
  assert.equal(minutesLabel(0), "");
});

const all = [
  { _id: "a", courseThumbnail: "a.jpg" },
  { _id: "b", courseThumbnail: "b.jpg" },
];
const learning = [
  { courseId: "b", courseTitle: "B", educatorName: "Asha", done: 1, total: 4, completed: false },
  { courseId: "a", courseTitle: "A", educatorName: "Asha", done: 2, total: 2, completed: true },
  { courseId: "gone", courseTitle: "Gone", educatorName: "", done: 0, total: 3, completed: false },
];

test("your courses get their covers and a whole-number percentage, in the order the server sent", () => {
  assert.deepEqual(withCovers(learning, all), [
    { courseId: "b", courseTitle: "B", educatorName: "Asha", done: 1, total: 4, completed: false, cover: "b.jpg", percent: 25 },
    { courseId: "a", courseTitle: "A", educatorName: "Asha", done: 2, total: 2, completed: true, cover: "a.jpg", percent: 100 },
    { courseId: "gone", courseTitle: "Gone", educatorName: "", done: 0, total: 3, completed: false, cover: "", percent: 0 },
  ]);
});

test("a third of a course reads as 33 percent, not a long fraction", () => {
  const [course] = withCovers([{ courseId: "a", done: 1, total: 3, completed: false }], all);
  assert.equal(course.percent, 33);
});

test("continue learning lists only the courses you haven't finished", () => {
  assert.deepEqual(continueLearning(learning, all).map((c) => c.courseId), ["b", "gone"]);
  assert.deepEqual(continueLearning([], all), []);
  assert.deepEqual(continueLearning(undefined, all), []);
});

// owner's refinement A (2026-10-26): after "Mark as watched" the video window offers the next lesson
const course = {
  courseContent: [
    { chapterContent: [{ lectureId: "1-1", lectureUrl: "u" }, { lectureId: "1-2", lectureUrl: "u" }] },
    { chapterContent: [] },
    { chapterContent: [{ lectureId: "3-1", lectureUrl: "" }, { lectureId: "3-2", lectureUrl: "u" }] },
  ],
};

test("the next lesson is the following one in the same chapter", () => {
  assert.deepEqual(nextLectureAfter(course, "1-1"), { lecture: course.courseContent[0].chapterContent[1], chapterIndex: 0, lectureIndex: 1 });
});

test("the next lesson skips empty chapters and lessons that can't be played", () => {
  assert.deepEqual(nextLectureAfter(course, "1-2"), { lecture: course.courseContent[2].chapterContent[1], chapterIndex: 2, lectureIndex: 1 });
});

test("after the last lesson, or for a lesson not in the course, there is no next one", () => {
  assert.equal(nextLectureAfter(course, "3-2"), null);
  assert.equal(nextLectureAfter(course, "nope"), null);
  assert.equal(nextLectureAfter({}, "1-1"), null);
});
