import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { allLectures, COURSE_INCLUDES, finalPrice, formatMinutes, plural, totalMinutes, type Course } from '../../lmsData';
import { learningFailedMessage } from '../../learning';
import type { ApiError } from '../../api';
import { btnClass, BtnLabel, PIcon, PortalNotFound, useNotice } from '../../ui';
import { CourseStructure, CourseThumb, PriceTag, Stars, useCourseStats, useMyProgress } from './parts';
import { useLearning } from './source';

// what a connected course really gives: the demo's list promises things (certificates, downloads) nothing provides
const CONNECTED_INCLUDES = ['Every lecture, to watch at your own pace', 'Your progress saved to your account', 'Free for everyone at the company'];

export function CourseDetail() {
  const { id = '' } = useParams();
  const course = useLearning().courses.find((c) => c.id === id);
  // keyed by id so moving to another course starts with its description collapsed again
  return course ? <CourseView key={course.id} course={course} /> : <PortalNotFound />;
}

function CourseView({ course }: { course: Course }) {
  const { connected, enroll, educatorName, isLive } = useLearning();
  const [expanded, setExpanded] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [notice, notify] = useNotice();
  const stats = useCourseStats(course);
  const progress = useMyProgress(course);

  const lectures = allLectures(course);
  const minutes = totalMinutes(lectures);
  const paid = finalPrice(course) > 0;
  const hasPreview = lectures.some((l) => l.preview);
  const live = isLive(course);
  const join = () => {
    setEnrolling(true);
    enroll(course)
      .then(
        () => notify(`You're enrolled in ${course.title}.`),
        (e: ApiError) => notify(learningFailedMessage(e)),
      )
      .finally(() => setEnrolling(false));
  };

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
            Course by <strong>{educatorName(course) || 'a former educator'}</strong>
          </span>
        </p>
        {!live && <p className="p-hint">This course isn’t published, so only you and admins can see it.</p>}

        <h2 className="p-card-title">Course structure</h2>
        <CourseStructure
          chapters={course.chapters}
          action={(l) =>
            progress.watchesAll || l.preview ? (
              <Link to={`/portal/lms/player/${course.id}?lecture=${l.id}`} className="p-watch">
                {progress.watchesAll ? 'Watch' : 'Preview'}
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
        {!connected && <PriceTag course={course} />}
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
        ) : live ? (
          <>
            <button type="button" className={btnClass('primary', { wide: true })} onClick={join} disabled={enrolling}>
              <BtnLabel>{enrolling ? 'Enrolling…' : 'Enroll now'}</BtnLabel>
            </button>
            {paid && <p className="p-buy-note">Payments aren't connected yet, so enrolling doesn't charge anything.</p>}
            {hasPreview && <p className="p-buy-note">Lectures marked Preview can be watched before enrolling.</p>}
          </>
        ) : (
          <p className="p-buy-note">Publish the course from My courses to let people enroll.</p>
        )}
        {notice}
        <div className="p-buy-includes">
          <h2 className="p-buy-heading">What's in the course?</h2>
          <ul className="p-checks is-plain">
            {(connected ? CONNECTED_INCLUDES : COURSE_INCLUDES).map((item) => (
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
