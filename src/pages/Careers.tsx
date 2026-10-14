import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHero, Quiet } from '../components/PageHero';
import { Arrow, Reveal, toneStyle, BtnText } from '../components/ui';
import { DEPT_TONES, EMAIL, EMAIL_HREF, ROLES, VALUES } from '../content';
import { Icon, type IconName } from '../components/fx';
import { useScene } from '../gl/Scene';
import { DomainArt } from '../components/art';

const VALUE_ICONS: IconName[] = ['clock', 'layers', 'spark', 'rocket'];

/** Every open role as a deck. Pointing at a card opens it out of the deck; left alone, the deck shows each in turn. */
function CareersVisual() {
  const [hover, setHover] = useState(-1);
  const [auto, setAuto] = useState(0);
  const deck = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting));
    io.observe(deck.current!);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (hover >= 0 || !onScreen || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setInterval(() => setAuto((a) => (a + 1) % ROLES.length), 2600);
    return () => window.clearInterval(t);
  }, [hover, onScreen]);
  const open = hover >= 0 ? hover : auto;
  return (
    <div className="deck" ref={deck} onPointerLeave={() => setHover(-1)} style={{ '--n': ROLES.length } as React.CSSProperties}>
      {ROLES.map((r, i) => (
        <a
          key={r.title}
          href={applyHref(r)}
          className="deck-card"
          data-open={i === open || undefined}
          data-below={i > open || undefined}
          onPointerEnter={() => setHover(i)}
          onFocus={() => setHover(i)}
          onBlur={() => setHover(-1)}
          style={{ '--i': i, ...toneStyle(DEPT_TONES[r.dept]) } as React.CSSProperties}
        >
          <span className="deck-dept">
            <i />
            {r.dept}
          </span>
          <b>{r.title}</b>
          <span className="deck-more">
            <span>
              {r.focus} · {r.team}
            </span>
            <span>{r.location}</span>
            <span className="deck-apply">
              Apply <Arrow size={12} />
            </span>
          </span>
        </a>
      ))}
    </div>
  );
}

const applyHref = (r: (typeof ROLES)[number]) => `mailto:${EMAIL}?subject=${encodeURIComponent(`Application: ${r.title}, ${r.focus}`)}`;

/** Which research drawing each team gets on its role cards. */
const TEAM_ART: Record<string, number> = {
  'GI Rivinity': 0,
  'Rivinity Core': 1,
  'IoT Intelligence': 2,
  'Geo Intelligence': 3,
  'Defense Intelligence': 4,
  Platform: 5,
  Communications: 1,
};

const DEPTS = ['All', 'Research', 'Engineering', 'Operations'];

export function Careers() {
  const { scrollTo } = useScene();
  const [dept, setDept] = useState('All');
  const [q, setQ] = useState('');
  const roles = useMemo(() => {
    const s = q.trim().toLowerCase();
    return ROLES.filter((r) => (dept === 'All' || r.dept === dept) && (!s || `${r.title} ${r.focus} ${r.team} ${r.location}`.toLowerCase().includes(s)));
  }, [dept, q]);

  return (
    <>
      <PageHero
        tone="tangerine"
        title={['Build the', 'foundation.']}
        lede="We hire researchers and engineers who would rather spend a decade on the right problem than a quarter on the easy one."
        visual={<CareersVisual />}
      >
        <a href="#roles" className="btn btn-primary page-hero-cta" onClick={(e) => {
            e.preventDefault();
            const roles = document.getElementById('roles');
            if (roles) scrollTo(roles);
          }}>
          <BtnText>See open roles</BtnText> <Arrow dir="down" />
        </a>
      </PageHero>

      <Quiet>
        <div className="wrap">
          <div className="bento values-bento">
            {VALUES.map((v, i) => (
              <Reveal key={v.title} className="cell" delay={i * 60}>
                <span className="icon-tile">
                  <Icon name={VALUE_ICONS[i]} />
                </span>
                <h3>{v.title}</h3>
                <p>{v.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </Quiet>

      <Quiet id="roles">
        <div className="wrap">
          <div className="roles-bar">
            <div className="segmented" role="group" aria-label="Department">
              {DEPTS.map((d) => (
                <button key={d} aria-pressed={dept === d} style={toneStyle(DEPT_TONES[d] ?? 'violet')} onClick={() => setDept(d)}>
                  <i aria-hidden="true" />
                  {d}
                </button>
              ))}
            </div>
            <label className="search">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <circle cx="7" cy="7" r="5" />
                <path d="M11 11l3.5 3.5" />
              </svg>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search roles, teams, places" aria-label="Search roles" />
            </label>
          </div>
          <ul className="role-grid">
            {roles.map((r, i) => (
              <Reveal as="li" key={r.title} delay={(i % 3) * 70} style={toneStyle(DEPT_TONES[r.dept])}>
                <a href={applyHref(r)} className="role-card">
                  <span className="role-art">
                    <DomainArt index={TEAM_ART[r.team] ?? 0} />
                    <span className="role-dept">
                      <i aria-hidden="true" />
                      {r.dept}
                    </span>
                  </span>
                  <span className="role-body">
                    <b>{r.title}</b>
                    <small>{r.focus}</small>
                    <span className="role-facts">
                      <span>{r.team}</span>
                      <span>{r.location}</span>
                    </span>
                    <span className="role-go">
                      Apply <Arrow />
                    </span>
                  </span>
                </a>
              </Reveal>
            ))}
          </ul>
          {roles.length === 0 && (
            <p className="empty">
              No roles match. Write to us anyway at <a href={EMAIL_HREF} target="_blank" rel="noopener noreferrer">{EMAIL}</a>
            </p>
          )}
        </div>
      </Quiet>
    </>
  );
}
