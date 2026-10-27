import { Link, useParams } from "react-router-dom";
import SearchBar from "../../components/students/SearchBar";
import CourseCard from "../../components/students/CourseCard";
import { CourseGridPlaceholder } from "../../components/students/CourseCardPlaceholder";
import Footer from "../../components/students/Footer";
import { useCourses } from "../../context/CourseContext";
import { useMyLearning } from "../../hooks/useMyLearning";
import { staggerDelay } from "../../utils/entrance";
import { useFirstShow } from "../../hooks/useFirstShow";
import { useListScroll } from "../../hooks/useListScroll";

function CoursesList() {
  const { query } = useParams();
  const { allCourses, loading } = useCourses();
  const mine = useMyLearning();
  const enrolledIds = new Set(mine.courses.map((c) => c.courseId));
  // typing a search narrows the list in place: only the first show animates
  const cardsFirst = useFirstShow("all-courses", !loading && allCourses.length > 0);

  useListScroll();

  const words = (query || "").trim().toLowerCase();
  const shown = words ? allCourses.filter((course) => course.courseTitle.toLowerCase().includes(words)) : allCourses;

  return (
    <>
      <main className="mx-auto w-full max-w-6xl px-6 pb-20 pt-12 text-left">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="font-display text-[44px] font-bold leading-[1.05] tracking-[-0.02em] text-ink">
              {words ? "Search results" : "All courses"}
            </h1>
            <p className="mt-2 text-[15px] text-muted">
              {words
                ? `${shown.length} ${shown.length === 1 ? "course matches" : "courses match"} “${query.trim()}”.`
                : `${allCourses.length} ${allCourses.length === 1 ? "course" : "courses"}, all free.`}
              {words && (
                <>
                  {" "}
                  <Link to="/course-list" className="font-medium text-act-deep underline-offset-2 mhover:underline">
                    Show all courses
                  </Link>
                </>
              )}
            </p>
          </div>
          <SearchBar data={query} />
        </header>

        {!loading && shown.length === 0 ? (
          <p className="mt-10 text-muted">No course title has those words. Try a shorter search.</p>
        ) : (
          <div className="mt-10 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6">
            {loading ? (
              <CourseGridPlaceholder />
            ) : (
              shown.map((course, i) => (
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
      </main>
      <Footer />
    </>
  );
}

export default CoursesList;
