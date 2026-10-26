import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { lessonsLabel, minutesLabel, ratingSummary } from "../../utils/courseHelpers";

// The whole card opens the course (owner's 4A): every course is free, so the card says what differs between them,
// how big it is and who teaches it, and a rating only once someone has given one.
function CourseCard({ course, enrolled = false }) {
  const educatorName = course.educator?.name || "Bharattech";
  const rating = ratingSummary(course);
  const length = minutesLabel(course.totalMinutes);

  return (
    <Link
      to={`/course/${course._id}`}
      onClick={() => scrollTo(0, 0)}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-card transition-colors duration-150 ease-snappy mhover:border-line-strong"
    >
      <div className="aspect-video overflow-hidden bg-ink/5">
        <img src={course.courseThumbnail} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="line-clamp-2 text-[17px] font-semibold leading-snug text-ink transition-colors duration-150 ease-snappy group-mhover:text-act-deep">
          {course.courseTitle}
        </h3>
        <p className="text-sm text-muted">{educatorName}</p>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-[13px] tabular-nums text-muted">
          {course.lectureCount !== undefined && <span>{lessonsLabel(course.lectureCount)}</span>}
          {length && <span>{length}</span>}
          {rating && (
            <span className="inline-flex items-center gap-1" aria-label={`Rated ${rating.average} out of 5 by ${rating.count}`}>
              <Star className="h-3.5 w-3.5 fill-tangerine text-tangerine" aria-hidden="true" />
              {rating.average} ({rating.count})
            </span>
          )}
          {enrolled && <span className="ml-auto font-medium text-tangerine-text">Enrolled</span>}
        </div>
      </div>
    </Link>
  );
}

export default CourseCard;
