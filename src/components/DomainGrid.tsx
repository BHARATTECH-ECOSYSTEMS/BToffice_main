import { useState, useCallback, useRef, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { DomainCardReel } from './DomainCardReel';
import { DOMAINS } from '../content';
import { DOMAIN_REELS } from '../data/reelScreenplays';
import { useScene } from '../gl/Scene';
import '../styles/domain-cinema.css';

export interface DomainMeta {
  tone: string;
  tint: string;
  tintSoft: string;
  tintBorder: string;
  tintStrong: string;
  shortLabel: string;
  specCode: string;
  classification: string;
}

export const DOMAIN_STACK_META: DomainMeta[] = [
  {
    tone: 'var(--violet)',
    tint: '#7c3aed',
    tintSoft: '#f5f3ff',
    tintBorder: 'rgba(124, 58, 237, 0.22)',
    tintStrong: '#6d28d9',
    shortLabel: 'GI Rivinity',
    specCode: 'VAULT-OPT-01',
    classification: 'PHYSICAL REASONING SUBSTRATE',
  },
  {
    tone: 'var(--tangerine)',
    tint: '#ea580c',
    tintSoft: '#fff7ed',
    tintBorder: 'rgba(234, 88, 12, 0.22)',
    tintStrong: '#c2410c',
    shortLabel: 'Rivinity Core',
    specCode: 'UNIBODY-OS-02',
    classification: 'UNIVERSAL DISTRIBUTED FABRIC',
  },
  {
    tone: '#059669',
    tint: '#059669',
    tintSoft: '#ecfdf5',
    tintBorder: 'rgba(5, 150, 105, 0.22)',
    tintStrong: '#047857',
    shortLabel: 'IoT Intelligence',
    specCode: 'LIDAR-SPATIAL-03',
    classification: 'VOLUMETRIC SENSOR FUSION',
  },
  {
    tone: '#0284c7',
    tint: '#0284c7',
    tintSoft: '#f0f9ff',
    tintBorder: 'rgba(2, 132, 199, 0.22)',
    tintStrong: '#0369a1',
    shortLabel: 'Geo Intelligence',
    specCode: 'GEODESIC-GIS-04',
    classification: 'TOPOGRAPHIC SPATIAL MATRIX',
  },
  {
    tone: '#e11d48',
    tint: '#e11d48',
    tintSoft: '#fff1f2',
    tintBorder: 'rgba(225, 29, 72, 0.22)',
    tintStrong: '#be123c',
    shortLabel: 'Defense AI',
    specCode: 'ENCLAVE-ZK-05',
    classification: 'CRYPTO HARDWARE ENCLAVE',
  },
  {
    tone: 'var(--saffron)',
    tint: '#d97706',
    tintSoft: '#fffbeb',
    tintBorder: 'rgba(217, 119, 6, 0.25)',
    tintStrong: '#b45309',
    shortLabel: 'Miniature AI',
    specCode: 'SILICON-SOC-06',
    classification: 'ULTRA LOW-POWER EDGE NEURAL',
  },
];

export const DOMAIN_TONES = DOMAIN_STACK_META.map((m) => m.tone);

/**
 * Optimized Sticky Stacking Deck Architecture.
 *
 * PERFORMANCE & FIXES:
 * 1. Only 1 WebGL renderer active at a time (zero GPU choke, 60fps fluid).
 * 2. Zero flashing / stuttering: isolated local chapter state with no re-render storm.
 * 3. Clear vertical headroom: cards stick at 150px, completely below the 60px nav bar with zero overlap.
 * 4. Throttled scroll observer: updates active tab smoothly using requestAnimationFrame.
 */
export function DomainGrid({ link = true }: { link?: boolean }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [actIndices, setActIndices] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const { lenis } = useScene();

  const totalCards = DOMAINS.length;

  const handleActChange = useCallback((cardIndex: number, newAct: number) => {
    setActIndices((prev) => {
      const next = [...prev];
      next[cardIndex] = newAct;
      return next;
    });
  }, []);

  // Smooth scroll to card
  const scrollToCard = useCallback(
    (targetIdx: number) => {
      const el = cardRefs.current[targetIdx];
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const targetTop = window.scrollY + rect.top - (145 + targetIdx * 12);
      if (lenis) {
        lenis.scrollTo(targetTop, { duration: 0.8 });
      } else {
        window.scrollTo({ top: targetTop, behavior: 'smooth' });
      }
    },
    [lenis]
  );

  const handleNext = useCallback(() => {
    const next = (activeIdx + 1) % totalCards;
    scrollToCard(next);
  }, [activeIdx, totalCards, scrollToCard]);

  const handlePrev = useCallback(() => {
    const prev = (activeIdx - 1 + totalCards) % totalCards;
    scrollToCard(prev);
  }, [activeIdx, totalCards, scrollToCard]);

  // Throttled 60fps scroll listener: tracks active card without re-rendering continuously
  useEffect(() => {
    let rafId = 0;

    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const stickyThreshold = 180;
        let current = 0;

        cardRefs.current.forEach((el, idx) => {
          if (!el) return;
          const rect = el.getBoundingClientRect();
          if (rect.top <= stickyThreshold + idx * 12) {
            current = idx;
          }
        });

        setActiveIdx((prev) => (prev !== current ? current : prev));
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    if (lenis) {
      lenis.on('scroll', onScroll);
    }
    onScroll();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      if (lenis) {
        lenis.off('scroll', onScroll);
      }
    };
  }, [lenis]);

  return (
    <div className="domain-sticky-deck">
      {/* ── 1. Sticky Navigation Bar: Distinct Docking Zone (Zero Overlap with Cards) ── */}
      <div className="deck-nav is-sticky">
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

      {/* ── 2. Sticky Stacking Cards List (Clean Vertical Clearance) ── */}
      <div className="sticky-deck-cards">
        {DOMAINS.map((d, i) => {
          const meta = DOMAIN_STACK_META[i] ?? DOMAIN_STACK_META[0];
          const reelData = DOMAIN_REELS[i] ?? DOMAIN_REELS[0];
          const curActIdx = actIndices[i] ?? 0;
          const currentChapter = reelData.chapters[curActIdx] ?? reelData.chapters[0];
          const isStackedBehind = i < activeIdx;

          return (
            <article
              key={d.id}
              ref={(el) => (cardRefs.current[i] = el)}
              className={`stack-card ${i === activeIdx ? 'is-active' : ''} ${isStackedBehind ? 'is-stacked-behind' : ''}`}
              data-stack-card
              style={
                {
                  '--tint': meta.tint,
                  '--tint-soft': meta.tintSoft,
                  '--tint-border': meta.tintBorder,
                  '--tint-strong': meta.tintStrong,
                  '--i': i,
                  top: `calc(clamp(142px, 18vh, 168px) + ${i * 12}px)`,
                  zIndex: i + 1,
                } as CSSProperties
              }
            >
              <div className="stack-card__inner">
                {/* ── Card Top Technical Header Strip ── */}
                <div className="stack-card__tech-bar">
                  <div className="tech-bar__left">
                    <span className="tech-bar__dot" style={{ background: meta.tint }} />
                    <span className="tech-bar__code">ORIGIN // {meta.specCode}</span>
                    <span className="tech-bar__divider">/</span>
                    <span className="tech-bar__class">{meta.classification}</span>
                  </div>
                  <div className="tech-bar__right">
                    <span className="tech-bar__stamp">REV 4.2 · IP68 HERMETIC · DAYLIGHT STUDIO</span>
                  </div>
                </div>

                {/* ── 2-Column Main Body (Zero 3D Model Overlap) ── */}
                <div className="stack-card__columns">
                  {/* Left Column: Typography, Tags, Chapter Controls */}
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
                        <span className="reel-ctrl__label">KINEMATIC REEL CHAPTERS</span>
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

                  {/* Right Column: Dedicated 3D Canvas Stage (Continuous 60fps WebGL) */}
                  <figure className="stack-card__media shot">
                    <DomainCardReel
                      index={i}
                      isActive={i === activeIdx}
                      selectedAct={curActIdx}
                    />
                  </figure>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
