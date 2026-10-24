import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import type { PortalIconName } from '../../data';
import { finalPrice, formatMinutes, formatPrice, plural, totalMinutes, type Chapter, type Course, type Lecture } from '../../lmsData';
import { managesPortal, useSession } from '../../session';
import { api } from '../../api';
import { learningFailedMessage } from '../../learning';
import { btnClass, BtnLabel, Empty, PIcon, SampleDataBar } from '../../ui';
import { DemoLearning, RemoteLearning, useLearning } from './source';

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
 * Educator pages are for admins and sub admins only. Employees never get them, even when a course lists them as its
 * educator; this one check decides both the "View as educator" switch and the educator routes. This is a browser-side
 * demo check, like the portal's "View as" switch; the real rule has to be enforced by the server.
 */
export function useCanTeach() {
  const session = useSession();
  return !!session && managesPortal(session.role);
}

/** The learning platform's pages, on the backend's courses when connected and the demo's samples otherwise. */
export function LmsShell() {
  const Source = api ? RemoteLearning : DemoLearning;
  return (
    <Source>
      <LmsFrame />
    </Source>
  );
}

/** The learning platform's own bar under the portal top bar: the student or educator pages, and the switch between them. */
function LmsFrame() {
  const { pathname } = useLocation();
  const canTeach = useCanTeach();
  const { connected, status, retry } = useLearning();
  const educator = pathname.startsWith('/portal/lms/educator');
  return (
    <>
      {!connected && <SampleDataBar />}
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
      {status.kind === 'ready' ? (
        <Outlet />
      ) : (
        <section className="p-card" aria-live="polite">
          {status.kind === 'error' ? (
            <Empty icon="book" title="The courses didn’t load">
              {learningFailedMessage(status.error)}{' '}
              <button type="button" className="p-text-btn" onClick={retry}>
                Try again
              </button>
            </Empty>
          ) : (
            <Empty icon="book" title="Loading the courses…" />
          )}
        </section>
      )}
    </>
  );
}

export function EduHead({ id, title, sub, count, children }: { id?: string; title: string; sub: string; count?: string; children?: ReactNode }) {
  return (
    <header className="p-edu-head">
      <div>
        <h1 id={id} className="p-lms-h1">
          {title} {count && <span className="p-count">{count}</span>}
        </h1>
        <p className="p-muted">{sub}</p>
      </div>
      {children}
    </header>
  );
}

/** Rating and audience numbers for one course. */
export const useCourseStats = (course: Course) => useLearning().stats(course);

/** The signed-in person's enrollment in a course, if any, and their progress through it. */
export const useMyProgress = (course: Course) => useLearning().progress(course);

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
  const { connected, educatorName } = useLearning();
  const { average, ratingCount } = useCourseStats(course);
  return (
    <article className="p-card p-course">
      <CourseThumb course={course} />
      <h2 className="p-card-title">{course.title}</h2>
      <p className="p-muted">{educatorName(course) || 'Former educator'}</p>
      <p className="p-rating">
        <span>{average.toFixed(1)}</span>
        <Stars value={average} />
        <span className="p-dim">({ratingCount})</span>
        <span className="sr-only">{ratingCount ? `, average of ${plural(ratingCount, 'rating')}` : ', no ratings yet'}</span>
      </p>
      {/* connected, every course is free, so there's no price to show */}
      {!connected && <PriceTag course={course} />}
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
            {/* closed lists stay rendered so they can fold open; visibility: hidden (portal.css) keeps them out of the
                tab order and away from screen readers, as `hidden` did */}
            <ul id={`ch-${c.id}`} className="p-lectures" data-open={isOpen || undefined}>
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
