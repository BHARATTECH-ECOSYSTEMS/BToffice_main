import { Link } from "react-router-dom";
import { useEducatorFetch } from "../../hooks/useEducatorFetch";
import { enrolledCountOf, plural, shortDate } from "../../utils/courseHelpers";
import { primaryButton } from "../../components/students/ui";
import { FirstLoad, PageHead, bodyCell, headCell, tableClass } from "../../components/educator/parts";

const readCourses = (data) => data?.courses || [];

// The educator's published courses (owner's 3A, 2026-10-26): each row opens the course's own page, as learners see it.
function MyCourses() {
  const courses = useEducatorFetch("/api/educator/courses", readCourses);
  const list = courses.data || [];

  return (
    <>
      <PageHead title="My courses">
        {courses.status === "ready" && list.length > 0 && `${plural(list.length, "published course")}, newest first.`}
      </PageHead>

      {courses.status !== "ready" ? (
        <FirstLoad status={courses.status} retry={courses.retry} what="courses" />
      ) : list.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-line bg-card p-8">
          <h2 className="font-display text-[22px] font-semibold text-ink">You haven't published a course yet</h2>
          <p className="mt-2 max-w-prose text-muted">A course goes live for everyone in Learning as soon as you publish it.</p>
          <Link to="/educator/add-course" className={`mt-5 inline-block px-5 py-2.5 text-sm ${primaryButton}`}>
            Add a course
          </Link>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-card">
          <table className={tableClass}>
            <thead className="border-b border-line">
              <tr>
                <th scope="col" className={headCell}>Course</th>
                <th scope="col" className={headCell}>Learners</th>
                <th scope="col" className={`${headCell} text-right`}>Published</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...list]
                .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                .map((course) => (
                  <tr key={course._id}>
                    <td className={bodyCell}>
                      <Link to={`/course/${course._id}`} className="group flex items-center gap-4">
                        <span className="aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-ink/5">
                          <img src={course.courseThumbnail} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                        </span>
                        <span className="font-medium text-ink transition-colors duration-150 ease-snappy group-mhover:text-act-deep">{course.courseTitle}</span>
                      </Link>
                    </td>
                    <td className={`${bodyCell} tabular-nums text-ink-soft`}>{plural(enrolledCountOf(course), "learner")}</td>
                    <td className={`${bodyCell} text-right text-[13px] tabular-nums text-muted`}>{shortDate(course.createdAt)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default MyCourses;
