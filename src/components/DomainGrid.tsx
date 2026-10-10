import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { Reveal } from './ui';
import { DomainCardReel } from './DomainCardReel';
import { DOMAINS } from '../content';

export const DOMAIN_TONES = [
  'var(--violet)',
  'var(--tangerine)',
  'var(--saffron)',
  'var(--violet)',
  'var(--tangerine)',
  'var(--saffron)',
];

// Demaze-grade structured layout: 2 Featured Lead Cards (6+6) + 3 Standard Cards (4+4+4) + 1 Wide Showcase (12)
const SPANS = [6, 6, 4, 4, 4, 12];

/**
 * Six research domains adapted after the Demaze Projects layout & transition architecture.
 * Features 2 prominent lead cards, 3 capability cards, and 1 panoramic edge silicon showcase.
 */
export function DomainGrid({ link = true }: { link?: boolean }) {
  return (
    <div className="pgrid domain-pgrid">
      {DOMAINS.map((d, i) => (
        <Reveal
          key={d.id}
          id={d.id}
          className={`pcard ${i < 2 ? 'pcard--featured' : ''} ${SPANS[i] === 12 ? 'pcard--wide' : ''}`}
          style={{ gridColumn: `span ${SPANS[i]}`, '--tone': DOMAIN_TONES[i] } as CSSProperties}
          delay={(i % 3) * 80}
        >
          {/* Demaze Media Stage with Real-Time 3D WebGL Cinema Reel */}
          <div className="pcard__media shot">
            <DomainCardReel index={i} />
          </div>

          {/* Demaze Card Body with Category Kicker, Title, Description, Tags, and Glide Arrow */}
          <div className="pcard__body">
            <span className="pcard__num">
              0{i + 1} · {d.field}
            </span>
            <h3>{d.name}</h3>
            <p>{d.body}</p>
            <ul className="pcard__tags">
              {d.focus.slice(0, i < 2 || SPANS[i] === 12 ? 5 : 3).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            {link && (
              <Link to="/research" className="pcard__more">
                <span>Explore Research Architecture</span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            )}
          </div>
        </Reveal>
      ))}
    </div>
  );
}
