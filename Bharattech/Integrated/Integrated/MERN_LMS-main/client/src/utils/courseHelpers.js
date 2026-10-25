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

/** The signed-in person's own rating of a course (the user from the sign-in carries `id`), or 0. */
export function ownRating(course, user) {
  if (!user?.id) return 0;
  return course?.courseRatings?.find((rating) => rating.userId === user.id)?.rating ?? 0;
}

/** How many enrolled: public pages send a count, educator pages still send the list. */
export const enrolledCountOf = (course) => course?.enrolledCount ?? course?.enrolledStudents?.length ?? 0;

/** A student's progress as Students Enrolled shows it: "2 / 5 lectures" or "Completed", with a percentage. */
export function progressLabel(progress) {
  if (!progress?.total) return { text: "-", percent: 0, completed: false };
  if (progress.completed) return { text: "Completed", percent: 100, completed: true };
  return {
    text: `${progress.done} / ${progress.total} ${progress.total === 1 ? "lecture" : "lectures"}`,
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
