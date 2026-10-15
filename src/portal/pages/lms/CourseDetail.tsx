import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { allLectures, COURSE_INCLUDES, finalPrice, formatMinutes, plural, totalMinutes, type Course } from '../../lmsData';
import { usePeopleById, usePortal } from '../../store';
import { btnClass, BtnLabel, PIcon, useNotice } from '../../ui';
import { PortalNotFound } from '../Resources';
import { CourseStructure, CourseThumb, PriceTag, Stars, useCourseStats, useMyProgress } from './parts';

export function CourseDetail() {
  const { id = '' } = useParams();
  const course = usePortal().courses.find((c) => c.id === id);
  // keyed by id so moving to another course starts with its description collapsed again
  return course ? <CourseView key={course.id} course={course} /> : <PortalNotFound />;
}

function CourseView({ course }: { course: Course }) {
  const { enroll } = usePortal();
  const byId = usePeopleById();
  const [expanded, setExpanded] = useState(false);
  const [notice, notify] = useNotice();
  const stats = useCourseStats(course);
  const progress = useMyProgress(course);

  const lectures = allLectures(course);
  const minutes = totalMinutes(lectures);
  const paid = finalPrice(course) > 0;
  const hasPreview = lectures.some((l) => l.preview);

  return (
    <div className="p-detail">
      <div className="p-detail-main">
        <p className="p-lms-crumbs">
          <Link to="/portal/lms/courses">All courses</Link> / <span aria-current="page">{course.title}</span>
        </p>
        <h1 className="p-detail-title">{course.title}</h1>
        <p className="p-detail-summary">{course.summary}</p>
        <div id="course-about" className="p-detail-about" hidden={!expanded}>
          {course.description.map((para) => (
            <p key={para}>{para}</p>
          ))}
        </div>
        <button type="button" className="p-text-btn" aria-expanded={expanded} aria-controls="course-about" onClick={() => setExpanded((e) => !e)}>
          {expanded ? 'Show less' : 'Show more'}
        </button>
        <p className="p-detail-meta">
          <span className="p-rating">
            <span>{stats.average.toFixed(1)}</span>
            <Stars value={stats.average} />
            <span>({plural(stats.ratingCount, 'rating')})</span>
          </span>
          <span>{plural(stats.students, 'student')}</span>
          <span>
            Course by <strong>{byId.get(course.educatorId)?.name ?? 'a former educator'}</strong>
          </span>
        </p>

        <h2 className="p-card-title">Course structure</h2>
        <CourseStructure
          chapters={course.chapters}
          action={(l) =>
            progress.enrolled || l.preview ? (
              <Link to={`/portal/lms/player/${course.id}?lecture=${l.id}`} className="p-watch">
                {progress.enrolled ? 'Watch' : 'Preview'}
                <span className="sr-only"> {l.title}</span>
              </Link>
            ) : (
              <span className="p-locked" title="Enroll to watch">
                <PIcon name="lock" size={14} />
                <span className="sr-only">Locked until you enroll</span>
              </span>
            )
          }
        />
      </div>

      <aside className="p-card p-buy" aria-label="Enrollment">
        <CourseThumb course={course} size="large" />
        <PriceTag course={course} />
        <p className="p-buy-stats">
          <span>
            <PIcon name="spark" size={15} /> {stats.average.toFixed(1)}
          </span>
          <span>
            <PIcon name="clock" size={15} /> {formatMinutes(minutes)}
          </span>
          <span>
            <PIcon name="book" size={15} /> {plural(lectures.length, 'lesson')}
          </span>
        </p>
        {progress.enrolled ? (
          <>
            <Link to={`/portal/lms/player/${course.id}`} className={btnClass('primary', { wide: true })}>
              <BtnLabel arrow="right">{progress.done ? 'Continue learning' : 'Start learning'}</BtnLabel>
            </Link>
            <p className="p-buy-note">
              <PIcon name="check" size={14} /> You're enrolled · {progress.done} of {plural(progress.total, 'lecture')} done
            </p>
          </>
        ) : (
          <>
            <button
              type="button"
              className={btnClass('primary', { wide: true })}
              onClick={() => {
                enroll(course.id);
                notify(`You're enrolled in ${course.title}.`);
              }}
            >
              <BtnLabel>Enroll now</BtnLabel>
            </button>
            {paid && <p className="p-buy-note">Payments aren't connected yet, so enrolling doesn't charge anything.</p>}
            {hasPreview && <p className="p-buy-note">Lectures marked Preview can be watched before enrolling.</p>}
          </>
        )}
        {notice}
        <div className="p-buy-includes">
          <h2 className="p-buy-heading">What's in the course?</h2>
          <ul className="p-checks is-plain">
            {COURSE_INCLUDES.map((item) => (
              <li key={item}>
                <PIcon name="check" size={14} /> {item}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
