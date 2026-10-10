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
    tint: '#6E58F5',
    tintSoft: 'rgba(110, 88, 245, 0.08)',
    tintBorder: 'rgba(110, 88, 245, 0.22)',
    tintStrong: '#5B45E8',
    shortLabel: 'GI Rivinity',
    specCode: 'VAULT-OPT-01',
    classification: 'PHYSICAL REASONING SUBSTRATE',
  },
  {
    tone: 'var(--tangerine)',
    tint: '#FF8643',
    tintSoft: 'rgba(255, 134, 67, 0.08)',
    tintBorder: 'rgba(255, 134, 67, 0.22)',
    tintStrong: '#F06E28',
    shortLabel: 'Rivinity Core',
    specCode: 'UNIBODY-OS-02',
    classification: 'UNIVERSAL DISTRIBUTED FABRIC',
  },
  {
    tone: 'var(--saffron)',
    tint: '#F59E00',
    tintSoft: 'rgba(245, 158, 0, 0.08)',
    tintBorder: 'rgba(245, 158, 0, 0.22)',
    tintStrong: '#D98200',
    shortLabel: 'IoT Intelligence',
    specCode: 'LIDAR-SPATIAL-03',
    classification: 'VOLUMETRIC SENSOR FUSION',
  },
  {
    tone: 'var(--violet)',
    tint: '#6E58F5',
    tintSoft: 'rgba(110, 88, 245, 0.08)',
    tintBorder: 'rgba(110, 88, 245, 0.22)',
    tintStrong: '#5B45E8',
    shortLabel: 'Geo Intelligence',
    specCode: 'GEODESIC-GIS-04',
    classification: 'TOPOGRAPHIC SPATIAL MATRIX',
  },
  {
    tone: 'var(--tangerine)',
    tint: '#FF8643',
    tintSoft: 'rgba(255, 134, 67, 0.08)',
    tintBorder: 'rgba(255, 134, 67, 0.22)',
    tintStrong: '#F06E28',
    shortLabel: 'Defense AI',
    specCode: 'ENCLAVE-ZK-05',
    classification: 'CRYPTO HARDWARE ENCLAVE',
  },
  {
    tone: 'var(--saffron)',
    tint: '#F59E00',
    tintSoft: 'rgba(245, 158, 0, 0.08)',
    tintBorder: 'rgba(245, 158, 0, 0.22)',
    tintStrong: '#D98200',
    shortLabel: 'Miniature AI',
    specCode: 'SILICON-SOC-06',
    classification: 'ULTRA LOW-POWER EDGE NEURAL',
  },
];

export const DOMAIN_TONES = DOMAIN_STACK_META.map((m) => m.tone);

/**
 * High-End Sticky Stacking Deck Architecture.
 *
 * FIXES:
 * 1. Single-row segmented options bar (height: 48px, no wrapping, no bulky bulb shape).
 * 2. Guaranteed zero overlap: options bar docks at top: 66px, cards stick at top: 134px+ (20px clear margin).
 * 3. 60fps single-active WebGL rendering.
 * 4. Throttled scroll listener using requestAnimationFrame.
 */
export function DomainGrid({ link = true }: { link?: boolean }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [actIndices, setActIndices] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const { lenis } = useScene();

  const totalCards = DOMAINS.length;

  const handleActChange = useCallback((cardIndex: number, newAct: number) => {
    setActIndices((prev) => {
      if (prev[cardIndex] === newAct) return prev;
      const next = [...prev];
      next[cardIndex] = newAct;
      return next;
    });
  }, []);

  // Smooth scroll to card with guaranteed daylight offset clearance
  const scrollToCard = useCallback(
    (targetIdx: number) => {
      const el = cardRefs.current[targetIdx];
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const targetTop = window.scrollY + rect.top - (156 + targetIdx * 14);
      if (lenis) {
        lenis.scrollTo(targetTop, { duration: 0.75 });
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

  // Throttled 60fps scroll listener: tracks active card without state churn
  useEffect(() => {
    let rafId = 0;

    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const stickyThreshold = 156 + 35; // 191px
        let current = 0;

        cardRefs.current.forEach((el, idx) => {
          if (!el) return;
          const rect = el.getBoundingClientRect();
          if (rect.top <= stickyThreshold + idx * 14) {
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

  const activeMeta = DOMAIN_STACK_META[activeIdx] ?? DOMAIN_STACK_META[0];

  return (
    <div className="domain-sticky-deck">
      {/* ── 1. Architectural Studio Command Bar (Docked at 76px · Guaranteed 30px Daylight Clearance) ── */}
      <div className="deck-nav is-sticky">
        {/* Left: System Domains Identity & Active Spec Telemetry */}
        <div className="deck-nav__brand">
          <span
            className="deck-nav__dot"
            style={{
              background: activeMeta.tint,
              boxShadow: `0 0 8px ${activeMeta.tint}`,
            }}
          />
          <span className="deck-nav__brand-title">DOMAINS</span>
          <span className="deck-nav__brand-code">{activeMeta.specCode}</span>
        </div>

        {/* Center: Precision Segmented Options Track */}
        <div className="deck-nav__track" role="tablist" aria-label="Research Domains">
          {DOMAINS.map((d, i) => {
            const meta = DOMAIN_STACK_META[i] ?? DOMAIN_STACK_META[0];
            const isActive = i === activeIdx;
            return (
              <button
                key={d.id}
                role="tab"
                type="button"
                aria-selected={isActive}
                className={`deck-tab ${isActive ? 'is-active' : ''}`}
                style={
                  {
                    '--tab-tint': meta.tint,
                    '--tab-soft': meta.tintSoft,
                    '--tab-border': meta.tintBorder,
                    '--tab-strong': meta.tintStrong,
                  } as CSSProperties
                }
                onClick={() => scrollToCard(i)}
              >
                <span className="deck-tab__num">0{i + 1}</span>
                <span className="deck-tab__name">{meta.shortLabel}</span>
                {isActive && <span className="deck-tab__indicator" />}
              </button>
            );
          })}
        </div>

        {/* Right: Telemetry Counter & Tactile Navigation Arrows */}
        <div className="deck-nav__controls">
          <div className="deck-counter" aria-live="polite">
            <span className="deck-counter__active">0{activeIdx + 1}</span>
            <span className="deck-counter__sep">/</span>
            <span className="deck-counter__total">0{totalCards}</span>
          </div>

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
        </div>
      </div>

      {/* ── 2. Sticky Stacking Cards List (Zero Overlap with Nav) ── */}
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
                  top: `calc(156px + ${i * 14}px)`,
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
                      isActive={true}
                      selectedAct={curActIdx}
                      onActChange={(newAct) => handleActChange(i, newAct)}
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
