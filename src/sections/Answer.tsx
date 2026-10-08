import { useRef, type CSSProperties } from 'react';
import { fitTo, useFormation } from '../gl/Scene';
import { MARK_SIZE, type Target } from '../gl/Engine';
import { Eyebrow, Headline } from '../components/ui';
import { Chapter, StepTabs, Steps, usePinned } from '../components/Chapter';
import { AutoVideo, Icon, type IconName } from '../components/fx';
import { PILLARS_PLAIN, SILOS } from '../content';

const SILO_ICONS: IconName[] = ['chat', 'search', 'docs', 'code', 'vision', 'voice'];
const FILMS = ['remember', 'connect', 'learn'];

/** The threads come back: memory returns first, then all three meet at the origin, then signals run along them. */
const STATES: Omit<Target, 'key'>[] = [
  { focus: 0, tint: '#2fd39a' },
  {},
  { flow: 1 },
];

/** The six tools in a ring around the mark; once it is whole, each is wired into it. */
function Orbit({ step }: { step: number }) {
  return (
    <div className="orbit" data-step={step}>
      <svg viewBox="-100 -100 200 200" aria-hidden="true">
        <circle r="86" className="orbit-ring" />
        {SILOS.map((s, i) => {
          const a = (i / SILOS.length) * Math.PI * 2 - Math.PI / 2;
          return <line key={s} x1={Math.cos(a) * 42} y1={Math.sin(a) * 42} x2={Math.cos(a) * 76} y2={Math.sin(a) * 76} className="orbit-wire" pathLength={1} style={{ '--k': i } as CSSProperties} />;
        })}
      </svg>
      {SILOS.map((s, i) => {
        const a = (i / SILOS.length) * Math.PI * 2 - Math.PI / 2;
        return (
          <span key={s} className="orbit-chip" style={{ left: `${50 + Math.cos(a) * 43}%`, top: `${50 + Math.sin(a) * 43}%`, '--k': i } as CSSProperties}>
            <Icon name={SILO_ICONS[i]} size={14} />
            {s}
          </span>
        );
      })}
      <span className="orbit-tag">{['Memory thread restored', 'All three meet at the origin', 'Signals flow in as it learns'][step]}</span>
    </div>
  );
}

export function Answer() {
  const ref = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const { step, goTo } = usePinned(ref, PILLARS_PLAIN.length);
  const stepRef = useRef(0);
  stepRef.current = step;

  useFormation(ref, () => {
    return { key: 'mark', pose: fitTo(stage.current, MARK_SIZE * 1.4, 0.95), follow: 30, ...STATES[stepRef.current] };
  });

  return (
    <Chapter id="promise" innerRef={ref} n={PILLARS_PLAIN.length} tone="emerald" className="ch-answer">
      <div className="wrap chapter-grid is-flipped">
        <div className="chapter-stage" ref={stage} aria-hidden="true">
          <Orbit step={step} />
        </div>
        <div className="chapter-copy">
          <Eyebrow tone="emerald">The answer</Eyebrow>
          <Headline tone="violet" lines={['One shared layer.', 'Nothing starts from zero.']} />
          <StepTabs labels={PILLARS_PLAIN.map((p) => p.title)} step={step} goTo={goTo} />
          <Steps step={step} className="chapter-steps">
            {PILLARS_PLAIN.map((p, i) => (
              <div key={p.title} className="chapter-step">
                <p>{p.body}</p>
                <div className="chapter-film">
                  <AutoVideo name={FILMS[i]} label={p.title} />
                </div>
              </div>
            ))}
          </Steps>
        </div>
      </div>
    </Chapter>
  );
}
