import { useRef } from 'react';
import { Link } from 'react-router';
import { Arrow, Eyebrow, Headline, Reveal, toneStyle } from '../components/ui';
import { useQuiet } from '../gl/Scene';
import { Cover } from '../components/art';
import { POSTS, ROLES } from '../content';
import type { HueName } from '../gl/palette';

const TONES: HueName[] = ['cobalt', 'violet', 'emerald'];
const DEPTS = Array.from(new Set(ROLES.map((r) => r.dept)));

export function Journal() {
  const ref = useRef<HTMLElement>(null);
  useQuiet(ref);
  const [lead, ...rest] = POSTS.slice(0, 3);
  return (
    <section id="journal" ref={ref} className="section">
      <div className="wrap">
        <div className="section-head">
          <div>
            <Eyebrow tone="cobalt">From the lab</Eyebrow>
            <Headline tone="cobalt" lines={['Publications,', 'and people.']} />
          </div>
          <Reveal className="section-head-link" delay={120}>
            <Link to="/publications" className="btn btn-ghost">
              All publications <Arrow />
            </Link>
          </Reveal>
        </div>
        <div className="bento journal-bento">
          <Reveal className="cell cell-tint post post-lead" style={toneStyle(TONES[0])}>
            <Link to={`/publications/${lead.slug}`} className="cell-link">
              <Cover index={0} label={lead.category} />
              <p className="post-meta">
                <span>{lead.category}</span>
                {lead.date} · {lead.read}
              </p>
              <h3>{lead.title}</h3>
              <p>{lead.excerpt}</p>
              <span className="cell-go">
                Read <Arrow />
              </span>
            </Link>
          </Reveal>
          {rest.map((p, i) => (
            <Reveal key={p.slug} className="cell post" delay={80 + i * 70}>
              <Link to={`/publications/${p.slug}`} className="cell-link" style={toneStyle(TONES[i + 1])}>
                <Cover index={i + 1} label={p.category} />
                <p className="post-meta">
                  <span>{p.category}</span>
                  {p.date}
                </p>
                <h3>{p.title}</h3>
                <p>{p.dek}</p>
                <span className="cell-go">
                  Read <Arrow />
                </span>
              </Link>
            </Reveal>
          ))}
          <Reveal className="cell cell-ink careers-cell" delay={160}>
            <Link to="/careers" className="careers-band">
              <div className="careers-lead">
                <p className="cell-label">Careers</p>
                <p className="careers-num">
                  {String(ROLES.length).padStart(2, '0')}
                  <span>open roles</span>
                </p>
                <p>For researchers and engineers who would rather spend a decade on the right problem than a quarter on the easy one.</p>
                <ul className="mini-tags">
                  {DEPTS.map((d) => (
                    <li key={d}>
                      {d} · {ROLES.filter((r) => r.dept === d).length}
                    </li>
                  ))}
                </ul>
              </div>
              <ul className="careers-list">
                {ROLES.slice(0, 4).map((r, i) => (
                  <li key={r.title} style={toneStyle(TONES[i % 3])}>
                    <i aria-hidden="true">{String(i + 1).padStart(2, '0')}</i>
                    <span>
                      <b>{r.title}</b>
                      <small>
                        {r.team} · {r.location}
                      </small>
                    </span>
                    <Arrow />
                  </li>
                ))}
                <li className="careers-more">
                  See all {ROLES.length} roles <Arrow />
                </li>
              </ul>
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
