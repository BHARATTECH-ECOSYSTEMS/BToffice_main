import humanizeDuration from "humanize-duration";

export function calculateRatings(course) {
  if (!course?.courseRatings?.length) {
    return 0;
  }
  const totalRating = course.courseRatings.reduce(
    (sum, rating) => sum + rating.rating,
    0
  );
  return +(totalRating / course.courseRatings.length).toFixed(1);
}

/** A course's ratings as the cards show them: nothing until someone rated, then the average and how many. */
export function ratingSummary(course) {
  const count = course?.courseRatings?.length || 0;
  return count ? { average: calculateRatings(course), count } : null;
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " " };

/**
 * A description as plain text, cut at a word near `max` characters. Block ends and line breaks become spaces, so a
 * heading doesn't run into the paragraph after it ("JavaScriptJavaScript"). Shown as text, never as HTML.
 */
export function excerptOf(html, max) {
  const text = String(html || "")
    .replace(/<br\s*\/?>|<\/(p|h[1-6]|li|blockquote|pre|ul|ol|div)>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, name) => ENTITIES[name])
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const end = cut.lastIndexOf(" ");
  return `${(end > 0 ? cut.slice(0, end) : text.slice(0, max)).trimEnd()}…`;
}

export const lessonsLabel = (count) => (count ? `${count} ${count === 1 ? "lesson" : "lessons"}` : "No lessons yet");

/** Minutes as "45 min", "1 h" or "1 h 5 min"; nothing for none. */
export function minutesLabel(minutes) {
  const total = Math.round(Number(minutes) || 0);
  if (!total) return "";
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** Your courses (GET /api/user/learning, server order) with each course's cover from the course list and a percentage. */
export const withCovers = (learning, allCourses) =>
  (learning || []).map((course) => ({
    ...course,
    cover: allCourses?.find((c) => String(c._id) === course.courseId)?.courseThumbnail || "",
    percent: course.total ? Math.round((course.done / course.total) * 100) : 0,
  }));

/** The courses you've started or enrolled in but not finished, for "Continue learning". */
export const continueLearning = (learning, allCourses) => withCovers(learning, allCourses).filter((course) => !course.completed);

export const plural = (count, word) => `${count} ${count === 1 ? word : `${word}s`}`;

/** The educator dashboard's figures: every enrollment counts, but each learner only once. */
export function educatorFigures(totalCourses, enrollments) {
  const list = enrollments || [];
  return {
    courses: totalCourses || 0,
    enrollments: list.length,
    learners: new Set(list.map((e) => e?.student?._id).filter(Boolean)).size,
  };
}

/** "26 Oct 2026", or nothing for a date that can't be read. */
export function shortDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** The playable lesson after `lectureId`, course order, with where it sits; null after the last one. */
export function nextLectureAfter(course, lectureId) {
  const all = (course?.courseContent || []).flatMap((chapter, chapterIndex) =>
    (chapter.chapterContent || []).map((lecture, lectureIndex) => ({ lecture, chapterIndex, lectureIndex }))
  );
  const at = all.findIndex((item) => item.lecture.lectureId === lectureId);
  if (at < 0) return null;
  return all.slice(at + 1).find((item) => item.lecture.lectureUrl) || null;
}

/**
 * The player's "Up next" (owner's 4A, 2026-10-27): the first playable lesson you haven't watched, earlier skipped
 * ones included, as { lecture, chapterIndex, lectureIndex }; null once every playable lesson is watched.
 */
export function upNextLecture(course, completedIds) {
  const watched = new Set(completedIds || []);
  for (const [chapterIndex, chapter] of (course?.courseContent || []).entries()) {
    for (const [lectureIndex, lecture] of (chapter.chapterContent || []).entries()) {
      if (lecture.lectureUrl && !watched.has(lecture.lectureId)) return { lecture, chapterIndex, lectureIndex };
    }
  }
  return null;
}

/** Lessons are numbered through the whole course: the number each chapter's first lesson gets. */
export function lessonNumberStarts(courseContent) {
  let next = 1;
  return (courseContent || []).map((chapter) => {
    const start = next;
    next += chapter.chapterContent?.length || 0;
    return start;
  });
}

/** The signed-in person's own rating of a course (the user from the sign-in carries `id`), or 0. */
export function ownRating(course, user) {
  if (!user?.id) return 0;
  return course?.courseRatings?.find((rating) => rating.userId === user.id)?.rating ?? 0;
}

/** How many enrolled: public pages send a count, educator pages still send the list. */
export const enrolledCountOf = (course) => course?.enrolledCount ?? course?.enrolledStudents?.length ?? 0;

/** A learner's progress as the educator pages show it: "2 of 5 lessons" or "Completed", with a percentage. */
export function progressLabel(progress) {
  if (!progress?.total) return { text: "-", percent: 0, completed: false };
  if (progress.completed) return { text: "Completed", percent: 100, completed: true };
  return {
    text: `${progress.done} of ${progress.total} ${progress.total === 1 ? "lesson" : "lessons"}`,
    percent: Math.round((progress.done / progress.total) * 100),
    completed: false,
  };
}

// Function to calculate course chapter time:
export const calculateChapterTime = (chapter) => {
  const totalSeconds = chapter.chapterContent.reduce(
    (total, lecture) => total + (lecture.lectureDuration || 0),
    0
  );
  return humanizeDuration(totalSeconds * 60 * 1000, {
    units: ["h", "m"],
    round: true,
  });
};

// Function to calculate course duration:
export const calculateCourseDuration = (course) => {
  const totalSeconds = course.courseContent.reduce((courseTotal, chapter) => {
    const chapterDuration = chapter.chapterContent.reduce(
      (chapterTotal, lecture) => chapterTotal + (lecture.lectureDuration || 0),
      0
    );
    return courseTotal + chapterDuration;
  }, 0);
  return humanizeDuration(totalSeconds * 60 * 1000, {
    units: ["h", "m"],
    round: true,
  });
};

// Function to calculate Num of Lectures in the course:
export const calculateNumOfLectures = (course) => {
  return course.courseContent.reduce(
    (total, chapter) => total + (chapter.chapterContent?.length || 0),
    0
  );
};
