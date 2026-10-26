import { useEducatorFetch } from "../../hooks/useEducatorFetch";
import { educatorFigures, plural, progressLabel, shortDate } from "../../utils/courseHelpers";
import ProgressBar from "../../components/students/ProgressBar";
import { FirstLoad, LearnerCell, PageHead, bodyCell, headCell, tableClass } from "../../components/educator/parts";

const readEnrollments = (data) => data?.enrolledStudents || [];

// Everyone enrolled in the educator's courses and how far each is (owner's 3A, 2026-10-26), newest first, kept fresh
// every 15 s while the page is in view.
function StudentsEnrolled() {
  const enrollments = useEducatorFetch("/api/educator/enrolled-students", readEnrollments, { refresh: true });
  const list = enrollments.data || [];
  const figures = educatorFigures(0, list);

  return (
    <>
      <PageHead title="Learners">
        {enrollments.status === "ready" &&
          list.length > 0 &&
          `${plural(figures.enrollments, "enrollment")} from ${plural(figures.learners, "learner")} in your courses.`}
      </PageHead>

      {enrollments.status !== "ready" ? (
        <FirstLoad status={enrollments.status} retry={enrollments.retry} what="learners" />
      ) : list.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-line bg-card p-6">
          <p className="text-ink">No one has enrolled in your courses yet.</p>
          <p className="mt-1 text-sm text-muted">Learners show up here, with how far they are, as soon as they enroll.</p>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-card">
          <table className={tableClass}>
            <thead className="border-b border-line">
              <tr>
                <th scope="col" className={headCell}>Learner</th>
                <th scope="col" className={headCell}>Course</th>
                <th scope="col" className={headCell}>Progress</th>
                <th scope="col" className={`${headCell} text-right`}>Enrolled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((item) => {
                const progress = progressLabel(item.progress);
                return (
                  <tr key={`${item.student?._id}-${item.courseTitle}-${item.purchaseDate}`}>
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
                    <td className={`${bodyCell} text-right text-[13px] tabular-nums text-muted`}>{shortDate(item.purchaseDate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default StudentsEnrolled;
