import { useMemo, useState } from 'react';
import { PageHero, Zone } from '../components/PageHero';
import { Lines, Kicker, Fade, Arrow } from '../components/Reveal';
import { EMAIL, ROLES, VALUES } from '../content';

const DEPTS = ['All', 'Research', 'Engineering', 'Operations'];

export function Careers() {
  const [dept, setDept] = useState('All');
  const [q, setQ] = useState('');
  const roles = useMemo(() => {
    const s = q.trim().toLowerCase();
    return ROLES.filter(
      (r) => (dept === 'All' || r.dept === dept) && (!s || `${r.title} ${r.focus} ${r.team} ${r.location}`.toLowerCase().includes(s)),
    );
  }, [dept, q]);

  return (
    <div className="page">
      <PageHero
        index="Careers"
        label="Join the builders"
        title={['Build the', 'foundation.']}
        lede="We hire researchers and engineers who would rather spend a decade on the right problem than a quarter on the easy one."
        target={{ key: 'field', params: { alpha: 0 } }}
      >
        <a href="#roles" className="btn btn-solid" style={{ marginTop: 36 }} onClick={(e) => { e.preventDefault(); document.getElementById('roles')?.scrollIntoView({ behavior: 'smooth' }); }}>
          {ROLES.length} open roles <Arrow dir="down" />
        </a>
      </PageHero>

      <Zone target={{ key: 'field', params: { alpha: 0 } }} className="section">
        <div className="wrap">
          <Kicker index="01">How we work</Kicker>
          <div className="values" style={{ marginTop: 40 }}>
            {VALUES.map((v, i) => (
              <Fade key={v.title} className="value" delay={i * 90}>
                <span className="mono muted">{String(i + 1).padStart(2, '0')}</span>
                <h3>{v.title}</h3>
                <p>{v.body}</p>
              </Fade>
            ))}
          </div>
        </div>
      </Zone>

      <Zone target={{ key: 'field', params: { alpha: 0 } }} className="section" id="roles">
        <div className="wrap">
          <div style={{ marginBottom: 40 }}>
            <Kicker index="02">Open roles</Kicker>
            <Lines className="h2" lines={['Find your', 'problem.']} />
          </div>
          <div className="filters">
            <div className="segmented" role="group" aria-label="Department">
              {DEPTS.map((d) => (
                <button key={d} aria-pressed={dept === d} onClick={() => setDept(d)}>
                  {d}
                </button>
              ))}
            </div>
            <label className="search">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.3" />
                <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search roles, teams, locations" aria-label="Search roles" />
            </label>
          </div>
          <ul className="roles">
            {roles.map((r) => (
              <li key={r.title} className="role">
                <a href={`mailto:${EMAIL}?subject=${encodeURIComponent(`Application: ${r.title}, ${r.focus}`)}`}>
                  <span className="role-title">
                    {r.title} <span>{r.focus}</span>
                  </span>
                  <span className="mono muted">{r.team}</span>
                  <span className="mono muted">{r.location}</span>
                  <Arrow />
                </a>
              </li>
            ))}
          </ul>
          {roles.length === 0 && <p className="empty mono">No roles match. Write to us anyway at {EMAIL}</p>}
        </div>
      </Zone>
    </div>
  );
}
