import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useStage } from '../gl/Scene';
import { TEAMS } from '../gl/figures';
import { Stage } from '../components/Stage';
import { Fade, Arrow, SectionHead } from '../components/Reveal';
import { EMAIL, ROLES, VALUES } from '../content';

const DEPTS = ['All', ...Array.from(new Set(ROLES.map((r) => r.dept)))];

const VALUE_ICONS = [
  // long-term thinking: an hourglass
  'M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9',
  // deep craft: a precise diamond
  'M12 3l8 9-8 9-8-9 8-9zM4 12h16M12 3v18',
  // calm confidence: a level horizon
  'M3 15h18M6 15a6 6 0 0 1 12 0M12 5v2M5.6 7.6l1.4 1.4M18.4 7.6L17 9',
  // mission first: a target
  'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM12 11.5a.5.5 0 1 0 0 1',
];

const count = (key: 'dept' | 'location') =>
  Object.entries(ROLES.reduce<Record<string, number>>((m, r) => ((m[r[key]] = (m[r[key]] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);

export function Builders() {
  const ref = useRef<HTMLElement>(null);
  const [dept, setDept] = useState('All');
  const cap = `Empty seats at the table: ${ROLES.length} open roles across the teams`;
  const stage = useStage(ref, 'seats', {
    fig: '09',
    name: 'Seats',
    caption: cap,
    labels: () => TEAMS.map(([team, open]) => ({ text: `${team} · ${open} open`, hot: team === dept, side: 'right' as const })),
    params: () => ({ highlight: TEAMS.findIndex(([team]) => team === dept) }),
  });
  const roles = useMemo(() => ROLES.filter((r) => dept === 'All' || r.dept === dept), [dept]);
  const byDept = count('dept');
  const byPlace = count('location');

  return (
    <section id="builders" ref={ref} className="section builders" data-room="pitch" data-room2="violet" data-chapter="Builders">
      <div className="wrap">
        <SectionHead
          index="09"
          label="Careers"
          title={['Join the builders.']}
          lede="A research and engineering company working on problems measured in decades. If you would rather build the foundation than another feature, we should talk."
          stage={<Stage stageRef={stage} fig="09" name="Seats" caption={cap} />}
        />

        <div className="jobs">
          <Fade className="jobs-summary">
            <p className="jobs-big">
              <b>{ROLES.length}</b>
              <span>open roles</span>
            </p>
            <div className="jobs-breakdown">
              <p className="jobs-label">By team</p>
              {byDept.map(([d, n]) => (
                <div key={d} className="jobs-bar">
                  <span>{d}</span>
                  <i style={{ '--w': n / ROLES.length } as React.CSSProperties} />
                  <b>{n}</b>
                </div>
              ))}
            </div>
            <div className="jobs-breakdown">
              <p className="jobs-label">Where</p>
              <div className="jobs-places">
                {byPlace.map(([p, n]) => (
                  <span key={p}>
                    {p} <b>{n}</b>
                  </span>
                ))}
              </div>
            </div>
            <Link to="/careers" className="btn btn-light">
              See every role <Arrow size={13} />
            </Link>
          </Fade>

          <Fade className="jobs-board" delay={120}>
            <div className="jobs-board-head">
              <div className="segmented" role="group" aria-label="Team">
                {DEPTS.map((d) => (
                  <button key={d} aria-pressed={dept === d} onClick={() => setDept(d)}>
                    {d}
                  </button>
                ))}
              </div>
              <span className="jobs-count">
                {roles.length} {roles.length === 1 ? 'role' : 'roles'}
              </span>
            </div>
            <ul className="jobs-list">
              {roles.slice(0, 5).map((r) => (
                <li key={r.title}>
                  <a href={`mailto:${EMAIL}?subject=${encodeURIComponent(`Application: ${r.title}, ${r.focus}`)}`} className="job">
                    <span className="job-main">
                      <span className="job-title">{r.title}</span>
                      <span className="job-focus">{r.focus}</span>
                    </span>
                    <span className="job-team">{r.team}</span>
                    <span className="job-place">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
                      </svg>
                      {r.location}
                    </span>
                    <span className="job-go">
                      <Arrow size={13} />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            {roles.length > 5 && (
              <Link to="/careers" className="jobs-more">
                {roles.length - 5} more {dept === 'All' ? '' : dept.toLowerCase() + ' '}roles <Arrow size={12} />
              </Link>
            )}
          </Fade>
        </div>

        <div className="values">
          {VALUES.map((v, i) => (
            <Fade key={v.title} className="value" delay={i * 90}>
              <span className="value-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={VALUE_ICONS[i]} />
                </svg>
              </span>
              <h3>{v.title}</h3>
              <p>{v.body}</p>
            </Fade>
          ))}
        </div>
      </div>
    </section>
  );
}
