// The video window's header (owner's 1A, 2026-10-27).

/** Which lesson of the course this is, counted through every chapter ("Lesson 3 of 8"), or null when it isn't found. */
export function lessonPlace(courseContent, lectureId) {
  const ids = (courseContent || []).flatMap((chapter) => (chapter.chapterContent || []).map((lecture) => lecture.lectureId));
  const at = ids.indexOf(lectureId);
  return at < 0 ? null : { number: at + 1, total: ids.length };
}
