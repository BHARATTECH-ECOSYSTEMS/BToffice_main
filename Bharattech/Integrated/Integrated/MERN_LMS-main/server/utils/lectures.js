/** Every lecture id in a course, chapter by chapter. */
export const lectureIdsOf = (course) =>
  (course.courseContent || []).flatMap((chapter) => (chapter.chapterContent || []).map((lecture) => lecture.lectureId));

