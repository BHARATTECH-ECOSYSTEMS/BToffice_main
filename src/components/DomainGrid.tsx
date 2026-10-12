import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { DomainReel } from './DomainReel';
import { DOMAINS } from '../content';
import { pageScroll, trackBox } from './trackBox';
import '../styles/domain-cinema.css';

/** Accent per domain; the tags and reel progress pick it up through `--tint`. */
const DOMAIN_TINTS = ['#6E58F5', '#FF8643', '#F59E00', '#6E58F5', '#FF8643', '#F59E00'];

export const DOMAIN_TONES = [
  'var(--violet)',
  'var(--tangerine)',
  'var(--saffron)',
  'var(--violet)',
  'var(--tangerine)',
  'var(--saffron)',
];

/**
 * Stacking deck of research domains: each card pins just below the one before it as you
 * scroll, so the deck reads one domain at a time.
 */
export function DomainGrid({ link = true }: { link?: boolean }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const deckRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);

  // The front card is the last one whose top has reached its sticky offset. Card positions are worked out from
  // the deck's cached position and the card heights, measured only when layout changes, so scrolling never
  // forces a layout. Pinned cards report their stuck position, so their place in the deck is summed instead.
  useEffect(() => {
    const deck = deckRef.current;
    if (!deck) return;
    let offsets: number[] = []; // each card's top within the deck, as laid out before any pinning
    let pinAt: number[] = []; // each card's sticky offset; NaN where the cards are not sticky (small screens)
    const { box, release } = trackBox(deck, () => {
      const gap = parseFloat(getComputedStyle(deck).rowGap) || 0;
      let y = 0;
      offsets = cardRefs.current.map((el) => {
        const at = y;
        y += (el?.offsetHeight ?? 0) + gap;
        return at;
      });
      pinAt = cardRefs.current.map((el) => {
        const cs = el ? getComputedStyle(el) : null;
        return cs && cs.position === 'sticky' ? parseFloat(cs.top) : NaN;
      });
    });
    let rafId = 0;
    let current = -1;
    const update = () => {
      rafId = 0;
      let next = 0;
      offsets.forEach((off, i) => {
        const top = box.top + off - pageScroll();
        // sticky: the card has pinned; not sticky: the card has reached the middle of the screen
        const reached = Number.isNaN(pinAt[i]) ? top <= window.innerHeight * 0.5 : top <= pinAt[i] + 1;
        if (reached) next = i;
      });
      if (next !== current) {
        current = next;
        setActiveIdx(next);
      }
    };
    const onScroll = () => {
      if (!rafId) rafId = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      cancelAnimationFrame(rafId);
      release();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const total = String(DOMAINS.length).padStart(2, '0');

  return (
    <div className="domain-deck" ref={deckRef}>
      {DOMAINS.map((d, i) => (
        <article
          key={d.id}
          ref={(el) => {
            cardRefs.current[i] = el;
          }}
          className={`stack-card ${i < activeIdx ? 'is-behind' : ''}`}
          style={{ '--tint': DOMAIN_TINTS[i], '--i': i } as CSSProperties}
        >
          <div className="stack-card__inner">
            <div className="stack-card__copy">
              <span className="stack-card__num">
                {String(i + 1).padStart(2, '0')} / {total} · {d.field}
              </span>
              <h3 className="stack-card__title">{d.name}</h3>
              <p className="stack-card__body">{d.body}</p>
              <ul className="stack-card__tags">
                {d.focus.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {link && (
                <Link to="/research" className="link-arrow">
                  Read the research brief<span className="sr-only">: {d.name}</span>
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
            <figure className="stack-card__media">
              {/* Cards behind the front one are covered, and only the next card is sliding into view. */}
              <DomainReel index={i} live={i === activeIdx || i === activeIdx + 1} />
            </figure>
          </div>
        </article>
      ))}
    </div>
  );
}
