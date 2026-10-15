import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import type { PortalIconName } from '../../data';
import { allLectures, finalPrice, formatMinutes, formatPrice, plural, totalMinutes, type Chapter, type Course, type Lecture } from '../../lmsData';
import { managesPortal, useSession } from '../../session';
import { usePeopleById, usePortal } from '../../store';
import { btnClass, BtnLabel, PIcon } from '../../ui';

const STUDENT_TABS: [string, string, PortalIconName][] = [
  ['/portal/lms', 'Home', 'home'],
  ['/portal/lms/courses', 'All courses', 'book'],
  ['/portal/lms/enrollments', 'My enrollments', 'cap'],
];
const EDUCATOR_TABS: [string, string, PortalIconName][] = [
  ['/portal/lms/educator', 'Dashboard', 'grid'],
  ['/portal/lms/educator/add', 'Add course', 'plus'],
  ['/portal/lms/educator/courses', 'My courses', 'book'],
  ['/portal/lms/educator/students', 'Students enrolled', 'users'],
];

/**
 * Who may open the educator pages: admins and sub admins, and anyone who already teaches a course. This is a browser-side
 * demo check, like the portal's "View as" switch; the real rule has to be enforced by the server.
 */
export function useCanTeach() {
  const session = useSession();
  const { me, courses } = usePortal();
  return (!!session && managesPortal(session.role)) || courses.some((c) => c.educatorId === me.id);
}

/** The learning platform's own bar under the portal top bar: the student or educator pages, and the switch between them. */
export function LmsShell() {
  const { pathname } = useLocation();
  const canTeach = useCanTeach();
  const educator = pathname.startsWith('/portal/lms/educator');
  return (
    <>
      <div className="p-lms-bar">
        <nav className="p-lms-nav" aria-label={educator ? 'Educator pages' : 'Learning platform'}>
          {(educator ? EDUCATOR_TABS : STUDENT_TABS).map(([to, label, icon]) => (
            <NavLink key={to} to={to} end className="p-lms-tab">
              <PIcon name={icon} size={16} /> {label}
            </NavLink>
          ))}
        </nav>
        {canTeach && (
          <Link to={educator ? '/portal/lms' : '/portal/lms/educator'} className={btnClass('light', { small: true })}>
            <BtnLabel icon={educator ? 'cap' : 'pen'}>{educator ? 'View as student' : 'View as educator'}</BtnLabel>
          </Link>
        )}
      </div>
      <Outlet />
    </>
  );
}

/** Rating and audience numbers for one course. */
export function useCourseStats(course: Course) {
  const { ratings, enrollments } = usePortal();
  const mine = ratings.filter((r) => r.courseId === course.id);
  const average = mine.length ? mine.reduce((n, r) => n + r.stars, 0) / mine.length : 0;
  return { average, ratingCount: mine.length, students: enrollments.filter((e) => e.courseId === course.id).length };
}

/** The signed-in person's enrollment in a course, if any, and their progress through it. */
export function useMyProgress(course: Course) {
  const { me, enrollments, completed } = usePortal();
  const lectures = allLectures(course);
  const done = lectures.filter((l) => completed.has(`${me.id}:${l.id}`)).length;
  return {
    enrolled: enrollments.some((e) => e.courseId === course.id && e.personId === me.id),
    done,
    total: lectures.length,
    isDone: (lectureId: string) => completed.has(`${me.id}:${lectureId}`),
  };
}

/** A generated cover: the course's icon on a tinted tile (no logos copied from elsewhere). */
export function CourseThumb({ course, size = 'card' }: { course: Course; size?: 'card' | 'large' | 'row' }) {
  return (
    <span className={`p-thumb is-${size}`} style={{ '--tone': `var(--${course.tone})` } as CSSProperties} aria-hidden="true">
      {course.thumbUrl ? <img src={course.thumbUrl} alt="" /> : <PIcon name={course.icon} size={size === 'row' ? 18 : size === 'large' ? 44 : 34} />}
    </span>
  );
}

/** Five stars filled to the average (shown, not clickable). */
export function Stars({ value }: { value: number }) {
  return (
    <span className="p-stars" style={{ '--fill': `${(value / 5) * 100}%` } as CSSProperties} aria-hidden="true">
      ★★★★★
    </span>
  );
}

/** A 1–5 star picker; a radio group underneath, so it works with the keyboard and screen readers. */
export function StarInput({ value, onChange, label }: { value: number; onChange: (stars: number) => void; label: string }) {
  const [hover, setHover] = useState(0);
  return (
    <fieldset className="p-star-input" onMouseLeave={() => setHover(0)}>
      <legend className="sr-only">{label}</legend>
      {[1, 2, 3, 4, 5].map((n) => (
        <label key={n} className={(hover || value) >= n ? 'is-on' : ''} onMouseEnter={() => setHover(n)}>
          <input type="radio" name={label} value={n} checked={value === n} onChange={() => onChange(n)} />
          <span aria-hidden="true">★</span>
          <span className="sr-only">{plural(n, 'star')}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function PriceTag({ course }: { course: Course }) {
  const price = finalPrice(course);
  return (
    <span className="p-price">
      <strong>{formatPrice(price)}</strong>
      {/* only a real discount is shown; a "0% off" tag would be noise */}
      {course.discount > 0 && (
        <>
          <s>
            <span className="sr-only">was </span>
            {formatPrice(course.price)}
          </s>
          <span className="p-off">{course.discount}% off</span>
        </>
      )}
    </span>
  );
}

export function CourseCard({ course }: { course: Course }) {
  const byId = usePeopleById();
  const { average, ratingCount } = useCourseStats(course);
  return (
    <article className="p-card p-course">
      <CourseThumb course={course} />
      <p className="cell-label">Course</p>
      <h2 className="p-card-title">{course.title}</h2>
      <p className="p-muted">{byId.get(course.educatorId)?.name ?? 'Former educator'}</p>
      <p className="p-rating">
        <span>{average.toFixed(1)}</span>
        <Stars value={average} />
        <span className="p-dim">({ratingCount})</span>
        <span className="sr-only">{ratingCount ? `, average of ${plural(ratingCount, 'rating')}` : ', no ratings yet'}</span>
      </p>
      <PriceTag course={course} />
      <Link to={`/portal/lms/course/${course.id}`} className={btnClass('primary', { wide: true })}>
        <BtnLabel icon="eye">
          View<span className="sr-only"> {course.title}</span>
        </BtnLabel>
      </Link>
    </article>
  );
}

/**
 * The chapter accordion on the course page and the player. `action` renders the right-hand end of each
 * lecture row (a Watch button, a lock, a tick) so both pages share one list.
 */
export function CourseStructure({ chapters, action, current }: { chapters: Chapter[]; action?: (l: Lecture) => ReactNode; current?: string }) {
  // the chapter holding the current lecture starts open; on the course page, the first one does
  const [open, setOpen] = useState<Set<string>>(() => new Set([chapters.find((c) => c.lectures.some((l) => l.id === current))?.id ?? chapters[0]?.id ?? '']));
  // when another lecture starts (Next lecture, or a link), its chapter opens so the highlighted row is in view
  useEffect(() => {
    const id = chapters.find((c) => c.lectures.some((l) => l.id === current))?.id;
    if (id) setOpen((s) => (s.has(id) ? s : new Set(s).add(id)));
  }, [current, chapters]);
  const toggle = (id: string) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="p-structure">
      {chapters.map((c) => {
        const isOpen = open.has(c.id);
        return (
          <section key={c.id} className="p-chapter">
            <h3 className="p-chapter-title">
              <button type="button" aria-expanded={isOpen} aria-controls={`ch-${c.id}`} onClick={() => toggle(c.id)}>
                <PIcon name="chevron" size={16} />
                <span className="p-chapter-name">{c.title}</span>
                <span className="p-dim">
                  {plural(c.lectures.length, 'lecture')} · {formatMinutes(totalMinutes(c.lectures))}
                </span>
              </button>
            </h3>
            <ul id={`ch-${c.id}`} className="p-lectures" hidden={!isOpen}>
              {c.lectures.map((l) => (
                <li key={l.id} className={l.id === current ? 'is-current' : ''} aria-current={l.id === current ? 'true' : undefined}>
                  <PIcon name="play" size={16} />
                  <span className="p-lecture-title">{l.title}</span>
                  {action?.(l)}
                  <span className="p-dim p-lecture-time">{formatMinutes(l.minutes)}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
