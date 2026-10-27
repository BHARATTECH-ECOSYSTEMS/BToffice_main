import { useRef } from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { lessonsLabel, minutesLabel, ratingSummary } from "../../utils/courseHelpers";
import { useCoverMorph } from "../../hooks/useCoverMorph";
import { entranceProps, metaList } from "./ui";

// The whole card opens the course (owner's 4A): every course is free, so the card says what differs between them,
// how big it is and who teaches it, and a rating only once someone has given one.
function CourseCard({ course, enrolled = false, entrance }) {
  const educatorName = course.educator?.name || "Bharattech";
  const rating = ratingSummary(course);
  const length = minutesLabel(course.totalMinutes);
  const to = `/course/${course._id}`;
  const cover = useRef(null);
  const openWithMorph = useCoverMorph();
  const enter = entranceProps(entrance);

  return (
    <Link
      to={to}
      onClick={(event) => openWithMorph(event, to, cover.current)}
      style={enter.style}
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-card transition-colors duration-150 ease-snappy mhover:border-line-strong ${enter.className}`}
    >
      <div ref={cover} className="aspect-video overflow-hidden rounded-t-2xl bg-ink/5">
        <img src={course.courseThumbnail} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
      </div>

      <div className="flex flex-1 flex-col p-5">
        {/* two lines' room for every title, so teachers and lesson counts line up across a row */}
        <h3 className="line-clamp-2 min-h-[2lh] text-[17px] font-semibold leading-[1.3] text-ink transition-colors duration-150 ease-snappy group-mhover:text-act-deep">
          {course.courseTitle}
        </h3>
        <p className="mt-1.5 text-sm text-muted">{educatorName}</p>

        <div className="mt-auto flex items-center gap-3 pt-5 text-[13px] tabular-nums text-muted">
          <ul className={metaList}>
            {course.lectureCount !== undefined && <li>{lessonsLabel(course.lectureCount)}</li>}
            {length && <li>{length}</li>}
            {rating && (
              <li className="inline-flex items-center gap-1" aria-label={`Rated ${rating.average} out of 5 by ${rating.count}`}>
                <Star className="h-3.5 w-3.5 fill-tangerine text-tangerine" aria-hidden="true" />
                {rating.average} ({rating.count})
              </li>
            )}
          </ul>
          {enrolled && <span className="ml-auto shrink-0 font-medium text-tangerine-text">Enrolled</span>}
        </div>
      </div>
    </Link>
  );
}

export default CourseCard;
