import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router';
import { finalPrice, formatMoney, plural, type Course } from '../../lmsData';
import { learningFailedMessage, type Student } from '../../learning';
import { ApiError } from '../../api';
import { formatDate } from '../../store';
import { Badge, btnClass, BtnLabel, Empty, initials, Modal, Stat, useNotice } from '../../ui';
import { CourseThumb, EduHead, useCanTeach } from './parts';
import { useLearning } from './source';

/** Keeps the educator pages to people who may teach; everyone else lands on the student home. */
export function EducatorOnly() {
  return useCanTeach() ? <Outlet /> : <Navigate to="/portal/lms" replace />;
}

/** The courses this person teaches (an admin: every course) and every enrollment in them, newest first. */
function useTeaching() {
  const { teaching: mine, students, connected, stats, isLive } = useLearning();
  const enrolled = students ?? [];
  const courseOf = (e: Student) => mine.find((c) => c.id === e.courseId);
  // what the enrollments would have paid at today's prices: there is no payment record to add up yet (demo only)
  const earnings = (list: Student[]) => list.reduce((n, e) => n + finalPrice(courseOf(e)!), 0);
  // connected, courses are free; their average rating, weighted by how many people rated each, says more
  const rated = mine.map(stats).filter((s) => s.ratingCount > 0);
  const ratingCount = rated.reduce((n, s) => n + s.ratingCount, 0);
  const averageRating = ratingCount ? rated.reduce((n, s) => n + s.average * s.ratingCount, 0) / ratingCount : 0;
  return { mine, live: mine.filter(isLive), enrolled, students, connected, courseOf, earnings, averageRating, ratingCount };
}

const EARNINGS_NOTE = "Worked out from course prices. Payments aren't connected yet, so nothing has been charged.";

export function EducatorDashboard() {
  const { mine, live, enrolled, students, connected, courseOf, earnings, averageRating, ratingCount } = useTeaching();
  const latest = enrolled.slice(0, 5);
  return (
    <>
      <EduHead title="Overview dashboard" sub={connected ? 'Your course engagement, student enrollments and ratings.' : 'Your course engagement, student enrollments and earnings.'} />
      <div className="p-stats is-three">
        <Stat icon="users" label="Total enrollments" value={students === undefined ? '…' : enrolled.length} />
        <Stat icon="book" label="Active courses" value={live.length} tone="saffron" />
        {connected ? (
          <Stat icon="spark" label="Average rating" value={ratingCount ? averageRating.toFixed(1) : '–'} hint={ratingCount ? `From ${plural(ratingCount, 'rating')}` : 'No ratings yet'} tone="tangerine" />
        ) : (
          <Stat icon="invoice" label="Total earnings" value={formatMoney(earnings(enrolled))} hint={EARNINGS_NOTE} tone="tangerine" />
        )}
      </div>
      <section className="p-card" aria-labelledby="latest-enrollments">
        <div className="p-card-head">
          <h2 id="latest-enrollments" className="p-card-title">
            Latest enrollments
          </h2>
          {latest.length > 0 && <p className="p-dim">Showing the last {plural(latest.length, 'student')}</p>}
        </div>
        {latest.length ? (
          <div className="p-table-wrap">
            <table className="p-table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Student</th>
                  <th scope="col">Course enrolled</th>
                </tr>
              </thead>
              <tbody>
                {latest.map((e, i) => (
                  <tr key={`${e.courseId}-${e.personId}`}>
                    <td className="is-mono">{String(i + 1).padStart(2, '0')}</td>
                    <td className="is-strong">
                      <Person name={e.name || 'Removed user'} />
                    </td>
                    <td>
                      <Badge kind="text">{courseOf(e)?.title ?? e.courseTitle}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <NoStudents hasCourses={mine.length > 0} students={students} />
        )}
      </section>
    </>
  );
}

export function MyCourses() {
  const { mine, enrolled, connected, earnings } = useTeaching();
  const { state, pathname } = useLocation();
  const navigate = useNavigate();
  const [notice, notify] = useNotice();
  const told = (state ?? {}) as { created?: string; saved?: string; coverFailed?: boolean };
  // Connected, the course form's message goes in the page's one status line (where the course actions report too),
  // then is dropped from the address's state so a reload doesn't repeat it.
  useEffect(() => {
    if (!connected || (!told.created && !told.saved)) return;
    notify(
      told.created
        ? `${told.created} was published, and everyone was told in their bell.${told.coverFailed ? ' Its cover didn’t upload: add it again from Edit.' : ''}`
        : `${told.saved} was saved.`,
    );
    navigate(pathname, { replace: true, state: null });
    // only on arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <EduHead
        title="My courses"
        count={plural(mine.length, 'course')}
        sub={connected ? 'The courses you can change, who enrolled, and whether each is published.' : 'Your published courses, their enrollments and earnings.'}
      >
        <Link to="/portal/lms/educator/add" className={btnClass('primary')}>
          <BtnLabel icon="plus">Add new course</BtnLabel>
        </Link>
      </EduHead>
      {connected
        ? notice
        : told.created && (
            <p className="p-notice" data-on="" role="status">
              {told.created} was published. It's kept only until this page reloads.
            </p>
          )}
      <section className="p-card" aria-label="My courses">
        {mine.length ? (
          connected ? (
            <ManagedCourses courses={mine} notify={notify} />
          ) : (
            <>
              <div className="p-table-wrap">
                <table className="p-table">
                  <thead>
                    <tr>
                      <th scope="col">Course title</th>
                      <th scope="col">Total earnings</th>
                      <th scope="col">Enrolled students</th>
                      <th scope="col">Published</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mine.map((c) => {
                      const its = enrolled.filter((e) => e.courseId === c.id);
                      return (
                        <tr key={c.id}>
                          <td>
                            <CourseLink course={c} />
                          </td>
                          <td>{formatMoney(earnings(its))}</td>
                          <td>
                            <Badge kind="text">{plural(its.length, 'student')}</Badge>
                          </td>
                          <td>{formatDate(c.published)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="p-dim">{EARNINGS_NOTE}</p>
            </>
          )
        ) : (
          <Empty icon="book" title="You haven't published a course yet">
            <Link to="/portal/lms/educator/add">Create your first course</Link>.
          </Empty>
        )}
      </section>
    </>
  );
}

function CourseLink({ course }: { course: Course }) {
  return (
    <Link to={`/portal/lms/course/${course.id}`} className="p-enrolled">
      <CourseThumb course={course} size="row" />
      <span className="is-strong">{course.title}</span>
    </Link>
  );
}

/** Connected: each course with who enrolled, whether it's live, and Edit, Publish / Unpublish and Delete. */
function ManagedCourses({ courses, notify }: { courses: Course[]; notify: (text: string) => void }) {
  const { isLive, stats, setPublished, remove } = useLearning();
  const [busy, setBusy] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Course | null>(null);
  const run = (course: Course, work: () => Promise<void>, done: string) => {
    setBusy(course.id);
    work()
      .then(
        () => notify(done),
        (e: unknown) => notify(learningFailedMessage(e instanceof ApiError ? e : new ApiError('unavailable'))),
      )
      .finally(() => setBusy(null));
  };
  return (
    <>
      <div className="p-table-wrap">
        <table className="p-table">
          <thead>
            <tr>
              <th scope="col">Course title</th>
              <th scope="col">Enrolled students</th>
              <th scope="col">Status</th>
              <th scope="col">Published</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => {
              const live = isLive(c);
              return (
                <tr key={c.id}>
                  <td>
                    <CourseLink course={c} />
                  </td>
                  <td>
                    <Badge kind="text">{plural(stats(c).students, 'student')}</Badge>
                  </td>
                  <td>
                    <Badge kind={live ? 'done' : 'todo'}>{live ? 'Published' : 'Unpublished'}</Badge>
                  </td>
                  <td>{c.published ? formatDate(c.published) : '–'}</td>
                  <td>
                    <span className="p-row">
                      <Link to={`/portal/lms/educator/edit/${c.id}`} className={btnClass('ghost', { small: true })}>
                        <BtnLabel icon="edit">
                          Edit<span className="sr-only"> {c.title}</span>
                        </BtnLabel>
                      </Link>
                      <button
                        type="button"
                        className={btnClass('ghost', { small: true })}
                        disabled={busy === c.id}
                        onClick={() => run(c, () => setPublished(c, !live), live ? `${c.title} is unpublished: only you and admins see it now.` : `${c.title} is published, and everyone was told in their bell.`)}
                      >
                        <BtnLabel>
                          {live ? 'Unpublish' : 'Publish'}
                          <span className="sr-only"> {c.title}</span>
                        </BtnLabel>
                      </button>
                      <button type="button" className="p-text-btn is-danger" disabled={busy === c.id} onClick={() => setDeleting(c)}>
                        Delete<span className="sr-only"> {c.title}</span>
                      </button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {deleting && (
        <Modal
          title={`Delete ${deleting.title}?`}
          icon="book"
          onClose={() => setDeleting(null)}
          onSubmit={() => {
            const course = deleting;
            setDeleting(null);
            run(course, () => remove(course), `${course.title} was deleted.`);
          }}
          footer={
            <>
              <button type="button" className={btnClass('ghost')} onClick={() => setDeleting(null)}>
                <BtnLabel>Keep it</BtnLabel>
              </button>
              <button type="submit" className={btnClass('primary')}>
                <BtnLabel>Delete the course</BtnLabel>
              </button>
            </>
          }
        >
          <p>
            {stats(deleting).students
              ? `${plural(stats(deleting).students, 'person is', 'people are')} enrolled. Their enrollments and progress are deleted with it, and this can’t be undone.`
              : 'Nobody is enrolled yet. This can’t be undone.'}{' '}
            To hide it for now instead, unpublish it.
          </p>
        </Modal>
      )}
    </>
  );
}

export function StudentsEnrolled() {
  const { mine, enrolled, students, courseOf } = useTeaching();
  return (
    <>
      <EduHead title="Students enrolled" count={plural(enrolled.length, 'student')} sub="Who is enrolled in your courses, and when they joined." />
      <section className="p-card" aria-label="Students enrolled">
        {enrolled.length ? (
          <>
            <div className="p-table-wrap">
              <table className="p-table">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Student</th>
                    <th scope="col">Course title</th>
                    <th scope="col">Enrollment date</th>
                  </tr>
                </thead>
                <tbody>
                  {enrolled.map((e, i) => (
                    <tr key={`${e.courseId}-${e.personId}`}>
                      <td className="is-mono">{String(i + 1).padStart(2, '0')}</td>
                      <td>
                        <Person name={e.name || 'Removed user'} email={e.email || undefined} />
                      </td>
                      <td>{courseOf(e)?.title ?? e.courseTitle}</td>
                      <td>{formatDate(e.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="p-dim">Showing {plural(enrolled.length, 'enrolled student')}</p>
          </>
        ) : (
          <NoStudents hasCourses={mine.length > 0} students={students} />
        )}
      </section>
    </>
  );
}

function Person({ name, email }: { name: string; email?: string }) {
  return (
    <span className="p-person">
      <span className="p-avatar is-soft is-small" aria-hidden="true">
        {initials(name)}
      </span>
      <span className="p-person-text">
        <span className="is-strong">{name}</span>
        {email && <span className="p-dim">{email}</span>}
      </span>
    </span>
  );
}

function NoStudents({ hasCourses, students }: { hasCourses: boolean; students: Student[] | null | undefined }) {
  if (students === undefined) return <Empty icon="users" title="Loading who enrolled…" />;
  if (students === null) {
    return (
      <Empty icon="users" title="Who enrolled didn’t load">
        Reload the page to try again.
      </Empty>
    );
  }
  return (
    <Empty icon="users" title="No students yet">
      {hasCourses ? 'Enrollments in your courses will show up here.' : <Link to="/portal/lms/educator/add">Create a course</Link>}
    </Empty>
  );
}
