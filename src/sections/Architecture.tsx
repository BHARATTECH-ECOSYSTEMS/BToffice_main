import { useRef, type CSSProperties } from 'react';
import { useQuiet } from '../gl/Scene';
import { Eyebrow, Headline } from '../components/ui';
import { Chapter, Steps, usePinned } from '../components/Chapter';
import { LayerStack } from '../components/art';
import { LAYERS, LAYER_FAMILIES } from '../content';

const FAMILY_TONES = ['var(--violet)', 'var(--cobalt)', 'var(--tangerine)'];
const TONES = LAYERS.map((_, i) => FAMILY_TONES[LAYER_FAMILIES.findIndex((f) => i >= f.from && i <= f.to)]);

/** Nine layers as a stack of plates. Scrolling walks one request down through them, top to bottom. */
export function Architecture() {
  const ref = useRef<HTMLElement>(null);
  useQuiet(ref);
  const { step, goTo } = usePinned(ref, LAYERS.length);
  const l = LAYERS[step];

  return (
    <Chapter id="architecture" innerRef={ref} n={LAYERS.length} screens={0.42} tone="violet" className="ch-arch">
      <div className="wrap arch">
        <div className="arch-side">
          <Eyebrow tone="violet">Architecture</Eyebrow>
          <Headline tone="violet" lines={['An operating system,', 'not an application.']} />
          <div className="arch-list">
            {LAYER_FAMILIES.map((fam, fi) => (
              <div key={fam.name} className="arch-family" style={{ '--tone': FAMILY_TONES[fi] } as CSSProperties}>
                <p className="arch-family-name">
                  <i />
                  {fam.name}
                </p>
                <ol>
                  {LAYERS.slice(fam.from, fam.to + 1).map((x, k) => {
                    const i = fam.from + k;
                    return (
                      <li key={x.name}>
                        <button data-on={i === step || undefined} data-done={i < step || undefined} onClick={() => goTo(i)}>
                          <span className="arch-num">{String(i + 1).padStart(2, '0')}</span>
                          <span className="arch-name">{x.name}</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        </div>

        <div className="arch-visual">
          <LayerStack names={LAYERS.map((x) => x.name)} active={step} tones={TONES} />
          <div className="arch-card" style={{ '--tone': TONES[step] } as CSSProperties}>
            <Steps step={step} className="arch-card-steps">
              {LAYERS.map((x, i) => (
                <div key={x.name} className="arch-card-body">
                  <p className="cell-label">
                    <i />
                    Layer {String(i + 1).padStart(2, '0')} · {LAYER_FAMILIES.find((f) => i >= f.from && i <= f.to)?.name}
                  </p>
                  <h3>{x.name}</h3>
                  <p className="arch-card-what">{x.body}</p>
                  <p className="arch-card-trace">
                    <span>In the groundwater request</span>
                    {x.trace}
                  </p>
                </div>
              ))}
            </Steps>
            <span className="arch-card-meter" aria-hidden="true">
              <b style={{ transform: `scaleY(${(step + 1) / LAYERS.length})` }} />
            </span>
            <span className="sr-only" aria-live="polite">
              {l.name}
            </span>
          </div>
        </div>
      </div>
    </Chapter>
  );
}
