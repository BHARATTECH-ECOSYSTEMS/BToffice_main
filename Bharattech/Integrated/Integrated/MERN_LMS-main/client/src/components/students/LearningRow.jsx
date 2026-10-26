import { Link } from "react-router-dom";
import ProgressBar from "./ProgressBar";

/**
 * One of your courses with how far you are: Home's "Continue learning" and My courses. The whole row opens the
 * course, like a course card (owner's refinement); the pill says what opening it does.
 */
function LearningRow({ course }) {
  const action = course.completed ? "Watch again" : course.done ? "Resume" : "Start";

  return (
    <li>
      <Link
        to={`/player/${course.courseId}`}
        aria-label={`${action} ${course.courseTitle}, ${course.completed ? "completed" : `${course.done} of ${course.total} lessons watched`}`}
        className="group flex items-center gap-5 rounded-2xl border border-line bg-card p-3 pr-5 transition-colors duration-150 ease-snappy mhover:border-line-strong"
      >
        <div className="aspect-video w-36 shrink-0 overflow-hidden rounded-xl bg-ink/5">
          {course.cover && <img src={course.cover} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[17px] font-semibold text-ink transition-colors duration-150 ease-snappy group-mhover:text-act-deep">
            {course.courseTitle}
          </h3>
          {course.educatorName && <p className="text-sm text-muted">{course.educatorName}</p>}
          <div className="mt-3 flex items-center gap-3">
            <ProgressBar percent={course.percent} label={`${course.courseTitle} progress`} className="max-w-xs" />
            <p className="shrink-0 text-[13px] tabular-nums text-muted">
              {course.completed ? "Completed" : `${course.done} of ${course.total} lessons`}
            </p>
          </div>
        </div>

        <span
          aria-hidden="true"
          className={`shrink-0 rounded-full px-5 py-2 text-sm font-semibold transition-colors duration-150 ease-snappy ${
            course.completed ? "border border-line-strong text-ink group-mhover:border-ink/30" : "bg-act text-white group-mhover:bg-act-deep"
          }`}
        >
          {action}
        </span>
      </Link>
    </li>
  );
}

export default LearningRow;
