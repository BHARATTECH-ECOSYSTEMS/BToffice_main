import { useState, useCallback, useRef, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DomainCardReel } from './DomainCardReel';
import { DOMAINS } from '../content';
import { DOMAIN_REELS } from '../data/reelScreenplays';
import { useScene } from '../gl/Scene';
import '../styles/domain-cinema.css';

gsap.registerPlugin(ScrollTrigger);

export interface DomainMeta {
  tone: string;
  tint: string;
  tintSoft: string;
  tintBorder: string;
  tintStrong: string;
  shortLabel: string;
}

export const DOMAIN_STACK_META: DomainMeta[] = [
  {
    tone: 'var(--violet)',
    tint: '#7c3aed',
    tintSoft: '#f5f3ff',
    tintBorder: 'rgba(124, 58, 237, 0.22)',
    tintStrong: '#6d28d9',
    shortLabel: 'GI Rivinity',
  },
  {
    tone: 'var(--tangerine)',
    tint: '#ea580c',
    tintSoft: '#fff7ed',
    tintBorder: 'rgba(234, 88, 12, 0.22)',
    tintStrong: '#c2410c',
    shortLabel: 'Rivinity Core',
  },
  {
    tone: '#059669',
    tint: '#059669',
    tintSoft: '#ecfdf5',
    tintBorder: 'rgba(5, 150, 105, 0.22)',
    tintStrong: '#047857',
    shortLabel: 'IoT Intelligence',
  },
  {
    tone: '#0284c7',
    tint: '#0284c7',
    tintSoft: '#f0f9ff',
    tintBorder: 'rgba(2, 132, 199, 0.22)',
    tintStrong: '#0369a1',
    shortLabel: 'Geo Intelligence',
  },
  {
    tone: '#e11d48',
    tint: '#e11d48',
    tintSoft: '#fff1f2',
    tintBorder: 'rgba(225, 29, 72, 0.22)',
    tintStrong: '#be123c',
    shortLabel: 'Defense AI',
  },
  {
    tone: 'var(--saffron)',
    tint: '#d97706',
    tintSoft: '#fffbeb',
    tintBorder: 'rgba(217, 119, 6, 0.25)',
    tintStrong: '#b45309',
    shortLabel: 'Miniature AI',
  },
];

export const DOMAIN_TONES = DOMAIN_STACK_META.map((m) => m.tone);

/**
 * Demaze Homescreen Scroll-Driven Card Stack Architecture.
 *
 * SCROLL-BASED INTERACTION:
 * - The section pins when reaching the viewport.
 * - Scrolling the page scrubs each card up over the previous one in real time.
 * - Previous cards scale down to 0.94 and receive subtle depth shading.
 * - Scrolling backwards peels cards off in reverse.
 * - Real-time synchronization: the top tabs and counter update automatically on scroll.
 * - Clicking a tab or arrow button smoothly scrolls to that card's exact position.
 * - Dedicated 2-column layout: copy on left, unobstructed 3D reel on right (zero overlap).
 */
export function DomainGrid({ link = true }: { link?: boolean }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [actIndices, setActIndices] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const deckRef = useRef<HTMLDivElement>(null);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);
  const { lenis } = useScene();

  const totalCards = DOMAINS.length;

  const handleActChange = useCallback((cardIndex: number, newAct: number) => {
    setActIndices((prev) => {
      const next = [...prev];
      next[cardIndex] = newAct;
      return next;
    });
  }, []);

  // Smoothly scroll page to a specific card index
  const scrollToCard = useCallback(
    (targetIdx: number) => {
      setActiveIdx(targetIdx);
      const st = scrollTriggerRef.current;
      if (st) {
        const progress = targetIdx / (totalCards - 1);
        const targetScroll = st.start + progress * (st.end - st.start);
        if (lenis) {
          lenis.scrollTo(targetScroll, { duration: 0.8 });
        } else {
          window.scrollTo({ top: targetScroll, behavior: 'smooth' });
        }
      }
    },
    [totalCards, lenis]
  );

  const handleNext = useCallback(() => {
    const next = (activeIdx + 1) % totalCards;
    scrollToCard(next);
  }, [activeIdx, totalCards, scrollToCard]);

  const handlePrev = useCallback(() => {
    const prev = (activeIdx - 1 + totalCards) % totalCards;
    scrollToCard(prev);
  }, [activeIdx, totalCards, scrollToCard]);

  // ── GSAP ScrollTrigger Pinned Deck Timeline (Demaze Homescreen Mechanics) ──
  useEffect(() => {
    const deck = deckRef.current;
    if (!deck) return;

    const section = deck.closest('section') as HTMLElement | null;
    const triggerTarget = section || deck;

    const ctx = gsap.context(() => {
      ScrollTrigger.matchMedia({
        // Desktop (>= 861px): Pinned scroll-driven card deck
        '(min-width: 861px)': () => {
          const cards = gsap.utils.toArray<HTMLElement>('[data-stack-card]', deck);
          if (cards.length === 0) return;

          deck.classList.add('is-deck');

          // Initialize card positions: card 0 at top, cards 1..5 positioned below
          cards.forEach((card, i) => {
            if (i > 0) {
              gsap.set(card, { yPercent: 108 });
            } else {
              gsap.set(card, { yPercent: 0 });
            }
          });

          // Scroll distance: 0.85 screen height per card transition
          const scrollDistance = window.innerHeight * 0.85 * (cards.length - 1);

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: triggerTarget,
              pin: true,
              scrub: 0.6,
              invalidateOnRefresh: true,
              start: () =>
                triggerTarget.offsetHeight > window.innerHeight
                  ? 'bottom bottom'
                  : 'top top',
              end: () => `+=${scrollDistance}`,
              onUpdate: (self) => {
                const prog = self.progress;
                const cur = Math.min(
                  cards.length - 1,
                  Math.round(prog * (cards.length - 1))
                );
                setActiveIdx(cur);
              },
            },
          });

          scrollTriggerRef.current = tl.scrollTrigger ?? null;

          // Build Demaze sequential card stacking steps
          cards.forEach((card, i) => {
            if (i === 0) return;
            const prevCard = cards[i - 1];
            const prevInner = prevCard.querySelector('.stack-card__inner');
            const prevShade = prevCard.querySelector('.stack-card__shade');

            tl.fromTo(
              card,
              { yPercent: 108 },
              { yPercent: 0, ease: 'none' },
              i - 1
            )
            .to(
              prevInner,
              { scale: 0.94, ease: 'none' },
              i - 1
            )
            .to(
              prevShade,
              { opacity: 0.3, ease: 'none' },
              i - 1
            );
          });
        },
      });
    }, deckRef);

    // Refresh after layout settles
    const refreshTimer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 250);

    return () => {
      clearTimeout(refreshTimer);
      ctx.revert();
    };
  }, []);

  return (
    <div className="domain-deck-section">
      {/* ── 1. Demaze Deck Top Navigation: Domain Pills + Action Controls ── */}
      <div className="deck-nav">
        <div className="deck-nav__tabs" role="tablist" aria-label="Research Domains">
          {DOMAINS.map((d, i) => {
            const meta = DOMAIN_STACK_META[i] ?? DOMAIN_STACK_META[0];
            const isActive = i === activeIdx;
            return (
              <button
                key={d.id}
                role="tab"
                type="button"
                aria-selected={isActive}
                className={`deck-pill ${isActive ? 'is-active' : ''}`}
                style={
                  {
                    '--pill-tint': meta.tint,
                    '--pill-soft': meta.tintSoft,
                    '--pill-border': meta.tintBorder,
                    '--pill-strong': meta.tintStrong,
                  } as CSSProperties
                }
                onClick={() => scrollToCard(i)}
              >
                <span className="deck-pill__num">0{i + 1}</span>
                <span className="deck-pill__name">{meta.shortLabel}</span>
                {isActive && <span className="deck-pill__indicator" />}
              </button>
            );
          })}
        </div>

        <div className="deck-nav__controls">
          <span className="deck-counter">
            <b>0{activeIdx + 1}</b> / 0{totalCards}
          </span>

          <div className="deck-arrows">
            <button
              type="button"
              className="deck-arrow-btn"
              onClick={handlePrev}
              aria-label="Previous Domain Card"
              title="Previous Domain Card"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 12H5M12 19l-7-7 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              className="deck-arrow-btn"
              onClick={handleNext}
              aria-label="Next Domain Card"
              title="Next Domain Card"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div className="deck-scroll-hint" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
            <span>Scroll to Stack</span>
          </div>
        </div>
      </div>

      {/* ── 2. The Demaze Deck Card Stack (.stack.is-deck) ── */}
      <div
        ref={deckRef}
        className="stack is-deck"
        data-deck
      >
        {DOMAINS.map((d, i) => {
          const meta = DOMAIN_STACK_META[i] ?? DOMAIN_STACK_META[0];
          const reelData = DOMAIN_REELS[i] ?? DOMAIN_REELS[0];
          const curActIdx = actIndices[i] ?? 0;
          const currentChapter = reelData.chapters[curActIdx] ?? reelData.chapters[0];
          const isNear = Math.abs(i - activeIdx) <= 1;

          return (
            <article
              key={d.id}
              className={`stack-card ${i === activeIdx ? 'is-active' : ''}`}
              data-stack-card
              style={
                {
                  '--tint': meta.tint,
                  '--tint-soft': meta.tintSoft,
                  '--tint-border': meta.tintBorder,
                  '--tint-strong': meta.tintStrong,
                  '--i': i,
                  zIndex: i + 1,
                } as CSSProperties
              }
            >
              <div className="stack-card__inner">
                {/* Demaze depth shading mask when card is stacked behind */}
                <i className="stack-card__shade" aria-hidden="true" />

                {/* ── Left Column: Typography, Tags, Chapter Controls (100% Visible) ── */}
                <div className="stack-card__copy">
                  {/* Category Kicker & Index */}
                  <div className="stack-card__kicker">
                    <span className="stack-card__num">0{i + 1} / 0{totalCards}</span>
                    <span className="stack-card__divider">·</span>
                    <span className="stack-card__field">{d.field}</span>
                  </div>

                  {/* Headline & Description */}
                  <h3 className="stack-card__title">{d.name}</h3>
                  <p className="stack-card__body">{d.body}</p>

                  {/* Focus Capability Chips */}
                  <ul className="tags stack-card__tags">
                    {d.focus.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>

                  {/* ── Interactive 4-Act Chapter Controller (Left Column) ── */}
                  <div className="stack-card__reel-ctrl">
                    <div className="reel-ctrl__header">
                      <span className="reel-ctrl__label">KINEMATIC CHAPTERS</span>
                      <span className={`reel-ctrl__pill is-${currentChapter.statusType}`}>
                        {currentChapter.statusPill}
                      </span>
                    </div>

                    <div className="reel-ctrl__acts">
                      {reelData.chapters.map((ch, actIdx) => (
                        <button
                          key={actIdx}
                          type="button"
                          className={`act-btn ${actIdx === curActIdx ? 'is-active' : ''}`}
                          onClick={() => handleActChange(i, actIdx)}
                          title={`${ch.act}: ${ch.title}`}
                        >
                          <span className="act-btn__num">0{actIdx + 1}</span>
                          <span className="act-btn__tag">{ch.tag}</span>
                        </button>
                      ))}
                    </div>

                    <div className="reel-ctrl__telemetry">
                      <span className="reel-ctrl__title">{currentChapter.title}</span>
                      <span className="reel-ctrl__metric">
                        <span className="metric-tag">{currentChapter.metric.label}:</span>{' '}
                        <b>{currentChapter.metric.value}</b>
                      </span>
                    </div>
                  </div>

                  {/* Action Link */}
                  {link && (
                    <div className="stack-card__actions">
                      <Link to="/research" className="link-arrow">
                        <span>Read research brief</span>
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
                    </div>
                  )}
                </div>

                {/* ── Right Column: Dedicated 3D Canvas Stage (Zero Model Overlap) ── */}
                <figure className="stack-card__media shot">
                  <DomainCardReel
                    index={i}
                    isActive={isNear}
                    externalAct={curActIdx}
                    onActChange={(newAct) => handleActChange(i, newAct)}
                  />
                </figure>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
