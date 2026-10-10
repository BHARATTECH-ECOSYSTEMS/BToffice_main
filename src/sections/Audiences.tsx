import { useState, useEffect, useRef } from 'react';
import { useQuiet } from '../gl/Scene';
import { AudienceSchematic } from '../components/AudienceSchematic';
import { AUDIENCE_DETAIL, AUDIENCE_TONES } from '../content';
import { toneStyle } from '../components/ui';

const AUTO_SLIDE_DURATION = 6500; // 6.5s per tab

export function Audiences() {
  const ref = useRef<HTMLElement>(null);
  useQuiet(ref);

  const [activeIdx, setActiveIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Time tracking ref for smooth animation
  const startTimeRef = useRef<number>(performance.now());
  const animFrameRef = useRef<number | null>(null);

  // Restart timer when activeIdx changes
  useEffect(() => {
    startTimeRef.current = performance.now();
    setProgress(0);
  }, [activeIdx]);

  // Continuous timer loop with requestAnimationFrame
  useEffect(() => {
    let lastTick = performance.now();

    const tick = (now: number) => {
      if (isPaused) {
        // Shift start time by pause duration so it resumes seamlessly
        startTimeRef.current += now - lastTick;
      } else {
        const elapsed = now - startTimeRef.current;
        const currentProgress = Math.min(100, (elapsed / AUTO_SLIDE_DURATION) * 100);
        setProgress(currentProgress);

        if (elapsed >= AUTO_SLIDE_DURATION) {
          setActiveIdx((prev) => (prev + 1) % AUDIENCE_DETAIL.length);
          startTimeRef.current = now;
          setProgress(0);
        }
      }
      lastTick = now;
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPaused]);

  const handleSelectTab = (idx: number) => {
    setActiveIdx(idx);
    startTimeRef.current = performance.now();
    setProgress(0);
  };

  const activeItem = AUDIENCE_DETAIL[activeIdx];
  const activeTone = AUDIENCE_TONES[activeIdx] || 'violet';

  return (
    <section id="who" ref={ref} className="section svc-section">
      <div className="wrap">
        <div
          className="svc-showcase"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Left Column: Eyebrow, Headline & Interactive Tabs List */}
          <div className="svc-left-col">
            <div className="svc-eyebrow">
              <span className="svc-eyebrow__dot" />
              <span>WHO IT’S FOR</span>
            </div>

            <h2 className="svc-headline">
              Built for the people<br />
              <span className="is-accent">who build what’s next.</span>
            </h2>

            <div className="svc-list">
              {AUDIENCE_DETAIL.map((item, idx) => {
                const isActive = activeIdx === idx;
                const tone = AUDIENCE_TONES[idx] || 'violet';

                return (
                  <div
                    key={item.name}
                    className={`svc-list__item ${isActive ? 'is-active' : ''}`}
                    onClick={() => handleSelectTab(idx)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectTab(idx);
                      }
                    }}
                    style={toneStyle(tone)}
                  >
                    <div className="svc-list__header">
                      <span className="svc-list__num">0{idx + 1}</span>
                      <span className="svc-list__name">{item.name}</span>
                    </div>

                    {/* Progress Line Bar */}
                    <div className="svc-list__track">
                      {isActive ? (
                        <div
                          className="svc-list__fill"
                          style={{
                            width: `${progress}%`,
                            backgroundColor: `var(--${tone})`,
                            boxShadow: `0 0 10px var(--${tone})`,
                          }}
                        />
                      ) : (
                        <div className="svc-list__line-subtle" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Dynamic Feature Panel */}
          <div className="svc-panel-wrap" style={toneStyle(activeTone)}>
            <div key={activeIdx} className="svc-panel">
              {/* Top Animated Vector Schematic (Floating directly with no separate container box) */}
              <div className="svc-panel__schematic">
                <AudienceSchematic index={activeIdx} tone={activeTone} />
              </div>

              {/* Panel Content Header */}
              <div className="svc-panel__content">
                <h3 className="svc-panel__title">{activeItem.name}</h3>
                <p className="svc-panel__desc">{activeItem.line}</p>

                {/* 2-Column Capability Checklist */}
                <div className="svc-panel__grid">
                  {activeItem.uses.map((useText, uIdx) => (
                    <div key={uIdx} className="svc-panel__check-item">
                      <div className="svc-panel__check-icon">
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M2.5 6.2L4.8 8.5L9.5 3.5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <span className="svc-panel__check-text">{useText}</span>
                    </div>
                  ))}
                </div>

                {/* Footer: SEEN IN / POWERED BY text links */}
                <div className="svc-panel__footer">
                  <span className="svc-panel__footer-label">SEEN IN</span>
                  <div className="svc-panel__seen-items">
                    {activeItem.poweredBy && activeItem.poweredBy.map((engine) => (
                      <span key={engine} className="svc-panel__seen-link">
                        {engine}
                      </span>
                    ))}
                    <span className="svc-panel__seen-more">+3 more</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
