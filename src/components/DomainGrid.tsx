import { useState, useCallback, useRef, useEffect } from 'react';
import type { CSSProperties, WheelEvent } from 'react';
import { Link } from 'react-router';
import { DomainCardReel } from './DomainCardReel';
import { DOMAINS } from '../content';
import { DOMAIN_REELS } from '../data/reelScreenplays';
import '../styles/domain-cinema.css';

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
 * Demaze Homescreen Card Stack Layout Architecture.
 * Features:
 * 1. Clean, luxury light studio aesthetic (warm paper / crisp ink, no dark mode clash).
 * 2. 100% visible, high-contrast typography with zero overlap over the 3D model.
 * 3. Dedicated 2-column card structure: left copy & act controller, right unobstructed 3D reel stage.
 * 4. Stacking deck transitions with interactive pill tabs, prev/next arrows, and keyboard/wheel support.
 */
export function DomainGrid({ link = true }: { link?: boolean }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [actIndices, setActIndices] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const deckRef = useRef<HTMLDivElement>(null);
  const lastScrollTime = useRef(0);

  const totalCards = DOMAINS.length;

  const handleNext = useCallback(() => {
    setActiveIdx((prev) => (prev + 1) % totalCards);
  }, [totalCards]);

  const handlePrev = useCallback(() => {
    setActiveIdx((prev) => (prev - 1 + totalCards) % totalCards);
  }, [totalCards]);

  const handleSelectCard = useCallback((i: number) => {
    setActiveIdx(i);
  }, []);

  const handleActChange = useCallback((cardIndex: number, newAct: number) => {
    setActIndices((prev) => {
      const next = [...prev];
      next[cardIndex] = newAct;
      return next;
    });
  }, []);

  // Smooth wheel navigation across cards with 650ms debounce
  const handleWheel = useCallback(
    (e: WheelEvent<HTMLDivElement>) => {
      const now = performance.now();
      if (now - lastScrollTime.current < 650) return;

      if (Math.abs(e.deltaY) > 35) {
        if (e.deltaY > 0 && activeIdx < totalCards - 1) {
          lastScrollTime.current = now;
          setActiveIdx((prev) => prev + 1);
        } else if (e.deltaY < 0 && activeIdx > 0) {
          lastScrollTime.current = now;
          setActiveIdx((prev) => prev - 1);
        }
      }
    },
    [activeIdx, totalCards]
  );

  // Keyboard navigation support
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleNext, handlePrev]);

  // Optional auto-play advancement
  useEffect(() => {
    if (!isAutoPlay) return;
    const timer = setInterval(() => {
      handleNext();
    }, 11500);
    return () => clearInterval(timer);
  }, [isAutoPlay, handleNext]);

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
                onClick={() => handleSelectCard(i)}
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
              title="Previous Domain Card (←)"
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
              title="Next Domain Card (→)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <button
            type="button"
            className={`deck-auto-btn ${isAutoPlay ? 'is-active' : ''}`}
            onClick={() => setIsAutoPlay((prev) => !prev)}
            title={isAutoPlay ? 'Disable Auto-Tour' : 'Enable Auto-Tour through Domains'}
            aria-label="Toggle Auto Tour"
          >
            <span className="deck-auto-dot" />
            <span>{isAutoPlay ? 'Tour Active' : 'Auto Tour'}</span>
          </button>
        </div>
      </div>

      {/* ── 2. The Demaze Deck Card Stack (.stack.is-deck) ── */}
      <div
        ref={deckRef}
        className="stack is-deck"
        data-deck
        onWheel={handleWheel}
      >
        {DOMAINS.map((d, i) => {
          const meta = DOMAIN_STACK_META[i] ?? DOMAIN_STACK_META[0];
          const reelData = DOMAIN_REELS[i] ?? DOMAIN_REELS[0];
          const curActIdx = actIndices[i] ?? 0;
          const currentChapter = reelData.chapters[curActIdx] ?? reelData.chapters[0];
          const isCurrent = i === activeIdx;
          const isPrev = i < activeIdx;
          const offset = activeIdx - i;

          // Demaze card stack transform calculations
          let transformStyle = '';
          let opacityVal = 1;
          let zIndexVal = 1;
          let pointerEventsVal: CSSProperties['pointerEvents'] = 'none';

          if (isCurrent) {
            transformStyle = 'translate3d(0, 0%, 0) scale(1)';
            opacityVal = 1;
            zIndexVal = 10;
            pointerEventsVal = 'auto';
          } else if (isPrev) {
            // Previous cards stack slightly scaled down behind the active card
            const yOffsetPx = -offset * 14;
            const scaleVal = Math.max(0.92, 1 - offset * 0.035);
            transformStyle = `translate3d(0, ${yOffsetPx}px, 0) scale(${scaleVal})`;
            opacityVal = offset === 1 ? 0.4 : 0;
            zIndexVal = 10 - offset;
          } else {
            // Upcoming cards slide in from below
            transformStyle = 'translate3d(0, 108%, 0) scale(1)';
            opacityVal = 0;
            zIndexVal = 1;
          }

          return (
            <article
              key={d.id}
              className={`stack-card ${isCurrent ? 'is-active' : ''} ${isPrev ? 'is-prev' : ''}`}
              data-stack-card
              style={
                {
                  '--tint': meta.tint,
                  '--tint-soft': meta.tintSoft,
                  '--tint-border': meta.tintBorder,
                  '--tint-strong': meta.tintStrong,
                  '--i': i,
                  transform: transformStyle,
                  opacity: opacityVal,
                  zIndex: zIndexVal,
                  pointerEvents: pointerEventsVal,
                } as CSSProperties
              }
            >
              <div className="stack-card__inner">
                {/* Soft daylight shade overlay when card is stacked behind */}
                <i
                  className="stack-card__shade"
                  aria-hidden="true"
                  style={{ opacity: isPrev ? 0.28 : 0 }}
                />

                {/* ── Left Column: Typography, Tags, Chapter Controls (100% Readable) ── */}
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
                    isActive={isCurrent}
                    externalAct={curActIdx}
                    onActChange={(newAct) => handleActChange(i, newAct)}
                    onReelComplete={() => {
                      if (isAutoPlay) {
                        handleNext();
                      }
                    }}
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
