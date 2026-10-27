import SearchBar from "../../components/students/SearchBar";
import CourseCard from "../../components/students/CourseCard";
import LearningRow from "../../components/students/LearningRow";
import { CourseGridPlaceholder } from "../../components/students/CourseCardPlaceholder";
import { primaryButton } from "../../components/students/ui";
import Footer from "../../components/students/Footer";
import { useAuth } from "../../context/AuthContext";
import { useCourses } from "../../context/CourseContext";
import { useMyLearning } from "../../hooks/useMyLearning";
import { continueLearning } from "../../utils/courseHelpers";
import { staggerDelay } from "../../utils/entrance";
import { useFirstShow } from "../../hooks/useFirstShow";
import Educator from "../educator/Educator";

// The first page after Learning in the portal (owner's 3A, 2026-10-26): your own courses first, then everything on
// offer. No banner: people arrive here to pick up a course, not to be sold one.
function Home() {
  const { viewRole, loading } = useAuth();
  const { allCourses, loading: coursesLoading, error, refetchCourses } = useCourses();
  const mine = useMyLearning();
  const cardsFirst = useFirstShow("home-courses", !coursesLoading && allCourses.length > 0);
  const rowsFirst = useFirstShow("home-continue", mine.courses.length > 0);

  if (loading) return null;

  if (viewRole === "educator") {
    return <Educator />;
  }

  const unfinished = continueLearning(mine.courses, allCourses);
  const enrolledIds = new Set(mine.courses.map((c) => c.courseId));

  return (
    <>
      <main className="mx-auto w-full max-w-6xl px-6 pb-20 pt-12 text-left">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="font-display text-[44px] font-bold leading-[1.05] tracking-[-0.02em] text-ink">Learning</h1>
            <p className="mt-2 text-[15px] text-muted">
              {allCourses.length
                ? `${allCourses.length} ${allCourses.length === 1 ? "course" : "courses"} for the Bharattech team, all free.`
                : "Courses for the Bharattech team, all free."}
            </p>
          </div>
          <SearchBar />
        </header>

        {unfinished.length > 0 && (
          <section aria-labelledby="continue" className="mt-12">
            <h2 id="continue" className="font-display text-[22px] font-semibold tracking-[-0.01em] text-ink">
              Continue learning
            </h2>
            <ul className="mt-5 flex flex-col gap-3">
              {unfinished.slice(0, 3).map((course, i) => (
                <LearningRow key={course.courseId} course={course} entrance={rowsFirst ? staggerDelay(i) : undefined} />
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="all-courses" className="mt-12">
          <h2 id="all-courses" className="font-display text-[22px] font-semibold tracking-[-0.01em] text-ink">
            All courses
          </h2>
          {error ? (
            <div className="mt-4 rounded-2xl border border-line bg-card p-6">
              <p className="text-ink">The courses didn't load. Check your connection, then try again.</p>
              <button type="button" onClick={refetchCourses} className={`mt-3 px-5 py-2 text-sm ${primaryButton}`}>
                Try again
              </button>
            </div>
          ) : !coursesLoading && allCourses.length === 0 ? (
            <p className="mt-4 text-muted">No courses have been published yet.</p>
          ) : (
            <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6">
              {coursesLoading ? (
                <CourseGridPlaceholder />
              ) : (
                allCourses.map((course, i) => (
                  <CourseCard
                    key={course._id}
                    course={course}
                    enrolled={enrolledIds.has(String(course._id))}
                    entrance={cardsFirst ? staggerDelay(i) : undefined}
                  />
                ))
              )}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}

export default Home;
