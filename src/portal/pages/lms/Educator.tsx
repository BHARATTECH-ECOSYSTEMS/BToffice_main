import type { ReactNode } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router';
import { finalPrice, formatMoney, plural, type Enrollment } from '../../lmsData';
import { formatDate, usePeopleById, usePortal } from '../../store';
import { Badge, btnClass, BtnLabel, Empty, initials, Stat } from '../../ui';
import { CourseThumb, useCanTeach } from './parts';

/** Keeps the educator pages to people who may teach; everyone else lands on the student home. */
export function EducatorOnly() {
  return useCanTeach() ? <Outlet /> : <Navigate to="/portal/lms" replace />;
}

/** The signed-in educator's courses and every enrollment in them, newest first. */
function useTeaching() {
  const { me, courses, enrollments } = usePortal();
  const mine = courses.filter((c) => c.educatorId === me.id);
  const ids = new Set(mine.map((c) => c.id));
  const enrolled = enrollments.filter((e) => ids.has(e.courseId)).sort((a, b) => b.date.localeCompare(a.date));
  const courseOf = (e: Enrollment) => mine.find((c) => c.id === e.courseId)!;
  // what the enrollments would have paid at today's prices: there is no payment record to add up yet
  const earnings = (list: Enrollment[]) => list.reduce((n, e) => n + finalPrice(courseOf(e)), 0);
  return { mine, enrolled, courseOf, earnings };
}

const EARNINGS_NOTE = "Worked out from course prices. Payments aren't connected yet, so nothing has been charged.";

function EduHead({ title, sub, count, children }: { title: string; sub: string; count?: string; children?: ReactNode }) {
  return (
    <header className="p-edu-head">
      <div>
        <h1 className="p-lms-h1">
          {title} {count && <span className="p-count">{count}</span>}
        </h1>
        <p className="p-muted">{sub}</p>
      </div>
      {children}
    </header>
  );
}

export function EducatorDashboard() {
  const { mine, enrolled, courseOf, earnings } = useTeaching();
  const byId = usePeopleById();
  const latest = enrolled.slice(0, 5);
  return (
    <>
      <EduHead title="Overview dashboard" sub="Your course engagement, student enrollments and earnings." />
      <div className="p-stats is-three">
        <Stat icon="users" label="Total enrollments" value={enrolled.length} />
        <Stat icon="book" label="Active courses" value={mine.length} tone="saffron" />
        <Stat icon="invoice" label="Total earnings" value={formatMoney(earnings(enrolled))} hint={EARNINGS_NOTE} tone="tangerine" />
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
                      <Person name={byId.get(e.personId)?.name ?? 'Removed user'} />
                    </td>
                    <td>
                      <Badge kind="text">{courseOf(e).title}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <NoStudents hasCourses={mine.length > 0} />
        )}
      </section>
    </>
  );
}

export function MyCourses() {
  const { mine, enrolled, earnings } = useTeaching();
  const { state } = useLocation();
  const created = (state as { created?: string } | null)?.created;
  return (
    <>
      <EduHead title="My courses" count={plural(mine.length, 'course')} sub="Your published courses, their enrollments and earnings.">
        <Link to="/portal/lms/educator/add" className={btnClass('primary')}>
          <BtnLabel icon="plus">Add new course</BtnLabel>
        </Link>
      </EduHead>
      {created && (
        <p className="p-notice" data-on="" role="status">
          {created} was published. It's kept only until this page reloads.
        </p>
      )}
      <section className="p-card" aria-label="My courses">
        {mine.length ? (
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
                          <Link to={`/portal/lms/course/${c.id}`} className="p-enrolled">
                            <CourseThumb course={c} size="row" />
                            <span className="is-strong">{c.title}</span>
                          </Link>
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
        ) : (
          <Empty icon="book" title="You haven't published a course yet">
            <Link to="/portal/lms/educator/add">Create your first course</Link>.
          </Empty>
        )}
      </section>
    </>
  );
}

export function StudentsEnrolled() {
  const { mine, enrolled, courseOf } = useTeaching();
  const byId = usePeopleById();
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
                  {enrolled.map((e, i) => {
                    const p = byId.get(e.personId);
                    return (
                      <tr key={`${e.courseId}-${e.personId}`}>
                        <td className="is-mono">{String(i + 1).padStart(2, '0')}</td>
                        <td>
                          <Person name={p?.name ?? 'Removed user'} email={p?.email} />
                        </td>
                        <td>{courseOf(e).title}</td>
                        <td>{formatDate(e.date)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="p-dim">Showing {plural(enrolled.length, 'enrolled student')}</p>
          </>
        ) : (
          <NoStudents hasCourses={mine.length > 0} />
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

function NoStudents({ hasCourses }: { hasCourses: boolean }) {
  return (
    <Empty icon="users" title="No students yet">
      {hasCourses ? 'Enrollments in your courses will show up here.' : <Link to="/portal/lms/educator/add">Create a course</Link>}
    </Empty>
  );
}
