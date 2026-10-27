import { Link } from "react-router-dom";
import { useEducatorFetch } from "../../hooks/useEducatorFetch";
import { educatorFigures, plural, progressLabel, shortDate } from "../../utils/courseHelpers";
import ProgressBar from "../../components/students/ProgressBar";
import { FirstLoad, LearnerCell, PageHead, bodyCell, enrollmentRow, headCell, tableBody, tableClass, tableHead } from "../../components/educator/parts";

const LATEST = 5;
const readCourseCount = (data) => data?.totalCourses || 0;
const readEnrollments = (data) => data?.enrolledStudents || [];

// The educator's overview (owner's 3A, 2026-10-26): figures named for what they count, and the newest enrollments
// with how far each person is, both kept fresh every 15 s while the page is in view.
function Dashboard() {
  const courses = useEducatorFetch("/api/educator/dashboard", readCourseCount, { refresh: true });
  const enrollments = useEducatorFetch("/api/educator/enrolled-students", readEnrollments, { refresh: true });

  const firstLoad = [courses, enrollments].find((r) => r.status !== "ready");
  const figures = educatorFigures(courses.data, enrollments.data);
  const latest = (enrollments.data || []).slice(0, LATEST);

  return (
    <>
      <PageHead title="Dashboard">Updates every 15 seconds while this page is open.</PageHead>

      {firstLoad ? (
        <FirstLoad
          status={firstLoad.status}
          retry={() => [courses, enrollments].forEach((r) => r.status !== "ready" && r.retry())}
          what="dashboard"
        />
      ) : (
        <>
          <dl className="mt-10 grid grid-cols-3 divide-x divide-line overflow-hidden rounded-2xl border border-line bg-card">
            {[
              ["courses", "published by you"],
              ["enrollments", "in your courses"],
              ["learners", "different people"],
            ].map(([key, note]) => (
              <div key={key} className="px-6 py-5">
                <dt className="text-sm text-muted">
                  {key.charAt(0).toUpperCase() + key.slice(1)} <span className="sr-only">{note}</span>
                </dt>
                <dd className="mt-1 font-display text-[36px] font-semibold leading-none tabular-nums text-ink">{figures[key]}</dd>
                <dd className="mt-2 text-[13px] text-muted" aria-hidden="true">
                  {note}
                </dd>
              </div>
            ))}
          </dl>

          <section aria-labelledby="latest" className="mt-12">
            <div className="flex items-end justify-between gap-4">
              <h2 id="latest" className="font-display text-[22px] font-semibold tracking-[-0.01em] text-ink">
                Latest enrollments
              </h2>
              {figures.enrollments > LATEST && (
                <Link to="/educator/students-enrolled" className="text-sm font-medium text-act-deep underline-offset-2 mhover:underline">
                  See all {plural(figures.enrollments, "enrollment")}
                </Link>
              )}
            </div>

            {latest.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-line bg-card p-6">
                <p className="text-ink">No one has enrolled yet.</p>
                <p className="mt-1 text-sm text-muted">When someone enrolls in one of your courses, they show up here.</p>
              </div>
            ) : (
              <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-card">
                <table className={tableClass}>
                  <thead className={tableHead}>
                    <tr>
                      <th scope="col" className={headCell}>Learner</th>
                      <th scope="col" className={headCell}>Course</th>
                      <th scope="col" className={headCell}>Progress</th>
                      <th scope="col" className={`${headCell} text-right`}>Enrolled</th>
                    </tr>
                  </thead>
                  <tbody className={tableBody}>
                    {latest.map((item) => {
                      const progress = progressLabel(item.progress);
                      return (
                        <tr key={`${item.student?._id}-${item.courseTitle}-${item.purchaseDate}`} className={enrollmentRow}>
                          <td className={bodyCell}>
                            <LearnerCell student={item.student} />
                          </td>
                          <td className={`${bodyCell} text-ink-soft`}>{item.courseTitle}</td>
                          <td className={bodyCell}>
                            <div className="flex items-center gap-3">
                              <ProgressBar percent={progress.percent} label={`${item.student?.name || "Learner"}'s progress`} className="w-24" />
                              <span className="whitespace-nowrap text-[13px] tabular-nums text-muted">{progress.text}</span>
                            </div>
                          </td>
                          <td className={`${bodyCell} text-right text-[13px] tabular-nums text-muted max-md:text-left`}>
                            <span className="md:hidden">Enrolled </span>
                            {shortDate(item.purchaseDate)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}

export default Dashboard;
