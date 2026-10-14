import { useRef } from 'react';
import { useQuiet } from '../gl/Scene';
import { AudienceCorridor, type CorridorAudience } from '../components/AudienceCorridor';
import { Chapter, usePinned } from '../components/Chapter';
import { AUDIENCE_DETAIL, AUDIENCE_TONES } from '../content';
import { Headline, toneStyle, useQuickChange } from '../components/ui';

const CORRIDOR: CorridorAudience[] = AUDIENCE_DETAIL.map((a, i) => ({ name: a.name, uses: a.uses, tone: AUDIENCE_TONES[i] || 'violet' }));

/** Six audiences, one pinned frame: scrolling flies down a corridor of their use cases, one audience at a time. */
export function Audiences() {
  const ref = useRef<HTMLElement>(null);
  useQuiet(ref);
  const { step: activeIdx, goTo, progress } = usePinned(ref, AUDIENCE_DETAIL.length);

  const activeItem = AUDIENCE_DETAIL[activeIdx];
  const activeTone = AUDIENCE_TONES[activeIdx] || 'violet';
  const quick = useQuickChange(activeIdx);

  return (
    <Chapter id="who" innerRef={ref} n={AUDIENCE_DETAIL.length} screens={0.4} tone={activeTone} className="svc-section">
      <div className="wrap svc-frame">
        <div className="svc-showcase">
          {/* Left column: headline and the audience list */}
          <div className="svc-left-col">
            <Headline tone="violet" lines={['Built for the people', 'who build what’s next.']} />

            <div className="svc-list">
              {AUDIENCE_DETAIL.map((item, idx) => {
                const isActive = activeIdx === idx;
                const tone = AUDIENCE_TONES[idx] || 'violet';

                return (
                  <div
                    key={item.name}
                    className={`svc-list__item ${isActive ? 'is-active' : ''}`}
                    onClick={() => goTo(idx)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        goTo(idx);
                      }
                    }}
                    style={toneStyle(tone)}
                  >
                    <div className="svc-list__header">
                      <span className="svc-list__name">{item.name}</span>
                    </div>

                    {/* Progress Line Bar */}
                    <div className="svc-list__track" data-local>
                      {isActive ? (
                        <div
                          className="svc-list__fill"
                          style={{
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
            <div className="svc-panel">
              {/* The use cases travel on the corridor's cards; the hidden list carries them for screen readers. */}
              <AudienceCorridor audiences={CORRIDOR} active={activeIdx} progress={progress} />

              {/* Panel Content Header */}
              <div key={activeIdx} className="svc-panel__content" data-quick={quick || undefined}>
                <h3 className="svc-panel__title">{activeItem.name}</h3>
                <p className="svc-panel__desc">{activeItem.line}</p>
                <ul className="sr-only">
                  {activeItem.uses.map((useText) => (
                    <li key={useText}>{useText}</li>
                  ))}
                </ul>

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
    </Chapter>
  );
}
