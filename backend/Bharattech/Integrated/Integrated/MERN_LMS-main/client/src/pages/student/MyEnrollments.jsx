import { Link } from "react-router-dom";
import Footer from "../../components/students/Footer";
import LearningRow from "../../components/students/LearningRow";
import { primaryButton } from "../../components/students/ui";
import { useCourses } from "../../context/CourseContext";
import { useMyLearning } from "../../hooks/useMyLearning";
import { withCovers } from "../../utils/courseHelpers";
import { staggerDelay } from "../../utils/entrance";
import { useFirstShow } from "../../hooks/useFirstShow";

// Your courses, unfinished first, from one request (owner's 4A, 2026-10-26): it used to ask for each course's progress
// separately and showed a table header over "Check back later!", though only you can enroll yourself.
function MyEnrollments() {
  const { allCourses } = useCourses();
  const mine = useMyLearning();
  const courses = withCovers(mine.courses, allCourses);
  const finished = courses.filter((c) => c.completed).length;
  const rowsFirst = useFirstShow("my-courses", courses.length > 0);

  return (
    <>
      <main className="mx-auto min-h-[60vh] w-full max-w-6xl px-6 pb-20 pt-12 text-left">
        <h1 className="font-display text-[44px] font-bold leading-[1.05] tracking-[-0.02em] text-ink">My courses</h1>

        {mine.status === "loading" ? (
          <p className="mt-4 text-muted">Loading your courses…</p>
        ) : mine.status === "failed" && courses.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-line bg-card p-6">
            <p className="text-ink">Your courses didn't load. Check your connection, then try again.</p>
            <button type="button" onClick={mine.retry} className={`mt-3 px-5 py-2 text-sm ${primaryButton}`}>
              Try again
            </button>
          </div>
        ) : courses.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-line bg-card p-8">
            <h2 className="font-display text-[22px] font-semibold text-ink">You haven't enrolled in a course yet</h2>
            <p className="mt-2 max-w-prose text-muted">Pick one from the course list. Enrolling is free, and your progress is saved as you watch.</p>
            <Link to="/" className={`mt-5 inline-block px-5 py-2.5 text-sm ${primaryButton}`}>
              Browse courses
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-2 text-[15px] text-muted">
              {courses.length} {courses.length === 1 ? "course" : "courses"}
              {finished ? `, ${finished} finished` : ""}.
            </p>
            <ul className="mt-8 flex flex-col gap-3">
              {courses.map((course, i) => (
                <LearningRow key={course.courseId} course={course} entrance={rowsFirst ? staggerDelay(i) : undefined} />
              ))}
            </ul>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

export default MyEnrollments;
