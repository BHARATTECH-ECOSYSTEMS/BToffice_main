import { Link, Navigate, useParams, useSearchParams } from 'react-router';
import { allLectures, formatMinutes, plural, totalMinutes, youtubeId, type Course } from '../../lmsData';
import { usePortal } from '../../store';
import { Badge, btnClass, BtnLabel, Empty, PIcon, useNotice } from '../../ui';
import { PortalNotFound } from '../Resources';
import { CourseStructure, CourseThumb, StarInput, useMyProgress } from './parts';

export function MyEnrollments() {
  const { me, courses, enrollments } = usePortal();
  const mine = enrollments
    .filter((e) => e.personId === me.id)
    .map((e) => courses.find((c) => c.id === e.courseId))
    .filter((c): c is Course => !!c);

  return (
    <section className="p-card" aria-labelledby="my-enrollments">
      <h1 id="my-enrollments" className="p-card-title p-lms-h1">
        My enrollments
      </h1>
      {mine.length ? (
        <div className="p-table-wrap">
          <table className="p-table">
            <thead>
              <tr>
                <th scope="col">Course</th>
                <th scope="col">Duration</th>
                <th scope="col">Completed</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {mine.map((c) => (
                <EnrollmentRow key={c.id} course={c} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty icon="cap" title="You haven't enrolled in a course yet">
          <Link to="/portal/lms/courses">Browse the courses</Link> to find one.
        </Empty>
      )}
    </section>
  );
}

function EnrollmentRow({ course }: { course: Course }) {
  const { done, total } = useMyProgress(course);
  const finished = total > 0 && done === total;
  return (
    <tr>
      <td>
        <Link to={`/portal/lms/player/${course.id}`} className="p-enrolled">
          <CourseThumb course={course} size="row" />
          <span className="p-enrolled-text">
            <span className="is-strong">{course.title}</span>
            <span className="p-enrolled-bar" role="progressbar" aria-label={`${course.title} progress`} aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
              <i style={{ scale: `${total ? done / total : 0} 1` }} />
            </span>
          </span>
        </Link>
      </td>
      <td>{formatMinutes(totalMinutes(allLectures(course)))}</td>
      <td>
        {done} / {plural(total, 'lecture')}
      </td>
      <td>
        <Badge kind={finished ? 'done' : 'doing'}>{finished ? 'Completed' : 'Ongoing'}</Badge>
      </td>
    </tr>
  );
}

export function Player() {
  const { id = '' } = useParams();
  const course = usePortal().courses.find((c) => c.id === id);
  return course ? <PlayerView key={course.id} course={course} /> : <PortalNotFound />;
}

function PlayerView({ course }: { course: Course }) {
  const { me, ratings, setLectureDone, rateCourse } = usePortal();
  const [params, setParams] = useSearchParams();
  const [notice, notify] = useNotice();
  const progress = useMyProgress(course);
  const lectures = allLectures(course);
  const canWatch = (lectureId: string) => progress.enrolled || !!lectures.find((l) => l.id === lectureId)?.preview;

  // Nothing here is open to someone who isn't enrolled, apart from preview lectures.
  if (!progress.enrolled && !lectures.some((l) => l.preview)) return <Navigate to={`/portal/lms/course/${course.id}`} replace />;

  const requested = params.get('lecture');
  const current = requested && canWatch(requested) ? lectures.find((l) => l.id === requested) : undefined;
  const next = current && lectures.slice(lectures.indexOf(current) + 1).find((l) => canWatch(l.id));
  const video = current ? youtubeId(current.videoUrl) : null;
  const myRating = ratings.find((r) => r.courseId === course.id && r.personId === me.id)?.stars ?? 0;
  const watch = (lectureId: string) => setParams({ lecture: lectureId });

  return (
    <div className="p-player">
      <div className="p-player-side">
        <p className="p-lms-crumbs">
          <Link to={`/portal/lms/course/${course.id}`}>{course.title}</Link> / <span aria-current="page">Player</span>
        </p>
        <h1 className="p-card-title">Course structure</h1>
        {progress.enrolled && (
          <p className="p-dim">
            {progress.done} of {plural(progress.total, 'lecture')} done
          </p>
        )}
        <CourseStructure
          chapters={course.chapters}
          current={current?.id}
          action={(l) =>
            canWatch(l.id) ? (
              <>
                {progress.isDone(l.id) && (
                  <span className="p-done-tick" title="Completed">
                    <PIcon name="check" size={14} />
                    <span className="sr-only">Completed</span>
                  </span>
                )}
                <button type="button" className="p-watch" onClick={() => watch(l.id)} aria-pressed={current?.id === l.id}>
                  {current?.id === l.id ? 'Watching' : 'Watch'}
                  <span className="sr-only"> {l.title}</span>
                </button>
              </>
            ) : (
              <span className="p-locked" title="Enroll to watch">
                <PIcon name="lock" size={14} />
                <span className="sr-only">Locked until you enroll</span>
              </span>
            )
          }
        />
        {progress.enrolled ? (
          <div className="p-rate">
            <p className="p-rate-label">Rate this course:</p>
            <StarInput
              value={myRating}
              label={`Rate ${course.title}`}
              onChange={(stars) => {
                rateCourse(course.id, stars);
                notify(`Thanks, you rated it ${plural(stars, 'star')}.`);
              }}
            />
          </div>
        ) : (
          <p className="p-hint">
            You're watching previews. <Link to={`/portal/lms/course/${course.id}`}>Enroll</Link> to unlock every lecture.
          </p>
        )}
        {notice}
      </div>

      <section className="p-card p-player-main" aria-label="Video">
        <div className="p-video">
          {current && video ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${video}`}
              title={current.title}
              allow="encrypted-media; picture-in-picture; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <div className="p-video-empty">
              <CourseThumb course={course} size="large" />
              <p>{current ? "This lecture's video isn't connected yet." : 'Select a lecture to start watching.'}</p>
            </div>
          )}
        </div>
        {current && (
          <div className="p-player-bar">
            <div>
              <p className="cell-label">Now playing</p>
              <h2 className="p-card-title">{current.title}</h2>
              <p className="p-dim">{formatMinutes(current.minutes)}</p>
            </div>
            <div className="p-row">
              {progress.enrolled && (
                <button type="button" className={btnClass(progress.isDone(current.id) ? 'ghost' : 'primary')} onClick={() => setLectureDone(current.id, !progress.isDone(current.id))} aria-pressed={progress.isDone(current.id)}>
                  <BtnLabel icon="check">{progress.isDone(current.id) ? 'Completed' : 'Mark complete'}</BtnLabel>
                </button>
              )}
              {next && (
                <button type="button" className={btnClass('ghost')} onClick={() => watch(next.id)}>
                  <BtnLabel arrow="right">Next lecture</BtnLabel>
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
