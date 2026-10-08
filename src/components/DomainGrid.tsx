import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { Arrow, Reveal } from './ui';
import { DomainArt } from './art';
import { DOMAINS } from '../content';

export const DOMAIN_TONES = ['var(--violet)', 'var(--cobalt)', 'var(--emerald)', 'var(--saffron)', 'var(--pink)', 'var(--tangerine)'];
const SPANS = [8, 4, 4, 4, 4, 12];

/** The six research domains as a bento, each with a living diagram of what it studies. */
export function DomainGrid({ link = true }: { link?: boolean }) {
  return (
    <div className="bento domain-bento">
      {DOMAINS.map((d, i) => (
        <Reveal
          key={d.id}
          id={d.id}
          className={`cell domain-cell ${i === 0 ? 'is-lead' : ''} ${SPANS[i] === 12 ? 'is-wide' : ''}`}
          style={{ gridColumn: `span ${SPANS[i]}`, '--tone': DOMAIN_TONES[i] } as CSSProperties}
          delay={(i % 3) * 80}
        >
          <div className="domain-visual">
            <DomainArt index={i} />
          </div>
          <div className="domain-copy">
            <p className="cell-label">
              {String(i + 1).padStart(2, '0')} · {d.field}
            </p>
            <h3>{d.name}</h3>
            <p>{d.body}</p>
            <ul className="mini-tags">
              {d.focus.slice(0, i === 0 || SPANS[i] === 12 ? 5 : 3).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            {link && i === 0 && (
              <Link to="/research" className="text-link">
                Read about Rivinity <Arrow size={12} />
              </Link>
            )}
          </div>
        </Reveal>
      ))}
    </div>
  );
}
