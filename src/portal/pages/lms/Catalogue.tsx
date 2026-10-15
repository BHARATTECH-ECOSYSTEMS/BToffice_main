import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { usePeopleById, usePortal } from '../../store';
import { btnClass, BtnLabel, Empty, PIcon } from '../../ui';
import { CourseCard } from './parts';

/** The search box on both pages: it always lands on the course list, with the words in the address so it can be shared. */
function CourseSearch({ initial = '' }: { initial?: string }) {
  const [q, setQ] = useState(initial);
  const navigate = useNavigate();
  return (
    <form
      className="p-lms-search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const words = q.trim();
        navigate(words ? `/portal/lms/courses?q=${encodeURIComponent(words)}` : '/portal/lms/courses');
      }}
    >
      <PIcon name="search" size={18} />
      <label className="sr-only" htmlFor="course-search">
        Search for courses
      </label>
      <input id="course-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for courses" />
      <button type="submit" className={btnClass('primary')}>
        <BtnLabel>Search</BtnLabel>
      </button>
    </form>
  );
}

export function LmsHome() {
  const { courses } = usePortal();
  // the four newest, like the old platform's home
  const latest = [...courses].sort((a, b) => b.published.localeCompare(a.published)).slice(0, 4);
  return (
    <>
      <header className="p-lms-hero">
        <p className="cell-label">Bharattech LMS</p>
        <h1 className="p-lms-hero-title">Master new skills with courses that match your ambition</h1>
        <p className="p-lms-hero-sub">
          Learn from <strong>industry experts</strong>, work through <strong>interactive content</strong>, and grow your career <strong>at your own pace</strong>.
        </p>
        <CourseSearch />
      </header>
      <section aria-labelledby="latest-courses" className="p-lms-section">
        <h2 id="latest-courses" className="p-card-title">
          Latest courses
        </h2>
        <div className="p-course-grid">
          {latest.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
        <Link to="/portal/lms/courses" className={`${btnClass('light')} p-lms-more`}>
          <BtnLabel arrow="right">Show all courses</BtnLabel>
        </Link>
      </section>
    </>
  );
}

export function CourseList() {
  const { courses } = usePortal();
  const byId = usePeopleById();
  const [params] = useSearchParams();
  const q = params.get('q')?.trim() ?? '';
  const query = q.toLowerCase();
  const rows = courses.filter((c) => !query || [c.title, c.summary, byId.get(c.educatorId)?.name ?? ''].some((v) => v.toLowerCase().includes(query)));

  return (
    <>
      <header className="p-lms-hero is-compact">
        <p className="cell-label">Bharattech LMS</p>
        <h1 className="p-lms-hero-title">
          Explore our <em>courses</em>
        </h1>
        <p className="p-lms-crumbs">
          <Link to="/portal/lms">Home</Link> / <span aria-current="page">Course list</span>
        </p>
        {/* key: a new search from the address resets the box to it */}
        <CourseSearch key={q} initial={q} />
      </header>
      <section className="p-lms-section" aria-label="Courses">
        {q && (
          <p className="p-lms-result" role="status">
            {rows.length === 1 ? '1 course' : `${rows.length} courses`} for "<strong>{q}</strong>" · <Link to="/portal/lms/courses">Clear search</Link>
          </p>
        )}
        {rows.length ? (
          <div className="p-course-grid">
            {rows.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        ) : (
          <section className="p-card">
            <Empty icon="search" title={q ? 'No courses match that search' : 'No courses yet'}>
              {q ? 'Try fewer or different words.' : 'Courses appear here once an educator publishes one.'}
            </Empty>
          </section>
        )}
      </section>
    </>
  );
}
