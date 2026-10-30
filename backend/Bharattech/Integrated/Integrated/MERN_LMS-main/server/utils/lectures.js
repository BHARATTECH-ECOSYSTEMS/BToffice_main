/** Every lecture id in a course, chapter by chapter. */
export const lectureIdsOf = (course) =>
  (course.courseContent || []).flatMap((chapter) => (chapter.chapterContent || []).map((lecture) => lecture.lectureId));

/** How many lectures a course has and how many minutes they add up to, for the course cards. */
export function courseSize(course) {
  const lectures = (course.courseContent || []).flatMap((chapter) => chapter.chapterContent || []);
  return {
    lectureCount: lectures.length,
    totalMinutes: lectures.reduce((sum, lecture) => sum + (Number(lecture.lectureDuration) || 0), 0),
  };
}

/** How far someone is in a course: only its real lectures count. */
export function progressIn(course, lectureCompleted = []) {
  const ids = lectureIdsOf(course);
  const done = ids.filter((id) => lectureCompleted.includes(id)).length;
  return { done, total: ids.length, completed: ids.length > 0 && done === ids.length };
}
