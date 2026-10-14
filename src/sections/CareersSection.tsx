import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { Arrow, Headline, Reveal, toneStyle, useInView, BtnText } from '../components/ui';
import { useQuiet } from '../gl/Scene';
import { DEPT_TONES, ROLES } from '../content';
import '../styles/careers-section.css';

const DEPTS = ['All', ...Array.from(new Set(ROLES.map((r) => r.dept)))];

/**
 * Careers, after the services deck: the open roles in a dark panel. When it comes into view the panel rises,
 * the roles slide in one by one; choosing a department folds the others away.
 */
export function CareersSection() {
  const ref = useRef<HTMLElement>(null);
  const [dept, setDept] = useState('All');
  const [panel, inView] = useInView<HTMLDivElement>('0px 0px -15% 0px');
  const [onScreen, setOnScreen] = useState(false);
  useQuiet(ref);

  // the drifting light behind the panel only moves while the panel can be seen
  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [panel]);

  return (
    <section id="careers" ref={ref} className="section careers-sec">
      <div className="wrap wrap-sheet">
        <div className="section-head wrap-col">
          <div>
            <Headline tone="tangerine" lines={['Build the', 'foundation.']} />
          </div>
          <Reveal className="section-head-link" delay={120}>
            <Link to="/careers" className="btn btn-ghost">
              <BtnText>All roles</BtnText> <Arrow />
            </Link>
          </Reveal>
        </div>

        <div ref={panel} className="careers-panel" data-in={inView || undefined} data-live={onScreen || undefined}>
          <div className="careers-glow" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>

          <div className="careers-intro">
            <p className="careers-count">
              <span>Open roles</span>
              <small>
                <em>
                  <i aria-hidden="true" />
                  Hiring now
                </em>
              </small>
            </p>
            <p className="careers-lede">We hire researchers and engineers who would rather spend a decade on the right problem than a quarter on the easy one.</p>
            <div className="careers-filter" role="group" aria-label="Department">
              {DEPTS.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={dept === d}
                  onClick={() => setDept(d)}
                  style={{ ...toneStyle(DEPT_TONES[d] ?? 'violet'), '--i': i } as CSSProperties}
                >
                  <i aria-hidden="true" />
                  {d}
                </button>
              ))}
            </div>
          </div>

          <ul className="careers-roles">
            {ROLES.map((r, i) => {
              const shown = dept === 'All' || r.dept === dept;
              return (
                <li
                  key={r.title}
                  className="careers-role"
                  data-hidden={!shown || undefined}
                  aria-hidden={!shown || undefined}
                  style={{ ...toneStyle(DEPT_TONES[r.dept] ?? 'violet'), '--i': i } as CSSProperties}
                >
                  <div>
                    <Link to="/careers" tabIndex={shown ? undefined : -1}>
                      <i aria-hidden="true" />
                      <span className="careers-role-name">
                        <b>{r.title}</b>
                        <small>
                          {r.focus}
                          {r.team !== r.focus && ` · ${r.team}`}
                        </small>
                      </span>
                      <span className="careers-where">{r.location}</span>
                      <Arrow />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
