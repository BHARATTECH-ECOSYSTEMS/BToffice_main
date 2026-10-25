/** Every lecture id in a course, chapter by chapter. */
export const lectureIdsOf = (course) =>
  (course.courseContent || []).flatMap((chapter) => (chapter.chapterContent || []).map((lecture) => lecture.lectureId));

/** How far someone is in a course: only its real lectures count. */
export function progressIn(course, lectureCompleted = []) {
  const ids = lectureIdsOf(course);
  const done = ids.filter((id) => lectureCompleted.includes(id)).length;
  return { done, total: ids.length, completed: ids.length > 0 && done === ids.length };
}
