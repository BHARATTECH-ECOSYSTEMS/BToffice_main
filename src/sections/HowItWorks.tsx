import { useRef, type CSSProperties } from 'react';
import { useQuiet } from '../gl/Scene';
import { Headline, toneStyle } from '../components/ui';
import { Chapter, Steps, usePinned } from '../components/Chapter';
import { Icon, Typewriter } from '../components/fx';
import { FLOW, FLOW_TONES } from '../content';

const ICONS = [
  'M5 12c0-3.9 3.1-7 7-7s7 3.1 7 7M8.5 12a3.5 3.5 0 0 1 7 0M12 12v7',
  'M4 8l8-4 8 4-8 4-8-4zM4 12l8 4 8-4M4 16l8 4 8-4',
  'M6 5v6a4 4 0 0 0 4 4h8M14 11l4 4-4 4M6 19v.01',
  'M13 3 5 14h6l-1 7 8-11h-6l1-7z',
  'M4 18h4v-4h4v-4h4V6h4',
];

/** One small diagram per step, drawn for the groundwater request the console narrates. */
function Scene({ i }: { i: number }) {
  if (i === 0) {
    const yTargets = [22, 40.67, 59.33, 78];
    return (
      <div className="how-scene scene-inputs">
        {(['chat', 'voice', 'docs', 'vision'] as const).map((n, k) => (
          <span key={n} style={{ '--k': k } as CSSProperties}>
            <Icon name={n} size={16} />
          </span>
        ))}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {yTargets.map((y, k) => (
            <path key={y} d={`M 21 ${y} C 44 ${y} 48 50 67 50`} pathLength={1} style={{ '--k': k } as CSSProperties} />
          ))}
        </svg>
        <b className="scene-core">Request</b>
      </div>
    );
  }
  if (i === 1)
    return (
      <div className="how-scene scene-recall">
        {['Survey notes · round 2', 'Groundwater study', 'Aquifer records'].map((t, k) => (
          <span key={t} data-hit={k === 1 || undefined} style={{ '--k': k } as CSSProperties}>
            <small>{['Docs', 'Memory · 3 weeks ago', 'Knowledge'][k]}</small>
            {t}
          </span>
        ))}
      </div>
    );
  if (i === 2)
    return (
      <div className="how-scene scene-plan">
        {['Recall the study', 'Compare new imagery', 'Draft the brief'].map((t, k) => (
          <span key={t} style={{ '--k': k } as CSSProperties}>
            <i aria-hidden="true" />
            {t}
          </span>
        ))}
      </div>
    );
  if (i === 3) {
    const yTargets = [24, 50, 76];
    return (
      <div className="how-scene scene-act">
        <b className="scene-core">Agent</b>
        {['Brief', 'Sources', 'Share'].map((t, k) => (
          <span key={t} style={{ '--k': k } as CSSProperties}>
            {t}
          </span>
        ))}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {yTargets.map((y, k) => (
            <path key={y} d={`M 31 50 C 46 50 48 ${y} 66 ${y}`} pathLength={1} style={{ '--k': k } as CSSProperties} />
          ))}
        </svg>
      </div>
    );
  }
  return (
    <div className="how-scene scene-learn">
      <svg viewBox="0 0 200 140" aria-hidden="true">
        {[
          [100, 70, 56, 36],
          [100, 70, 150, 40],
          [100, 70, 60, 108],
          [100, 70, 146, 104],
          [150, 40, 176, 76],
        ].map(([a, b, c, d], k) => (
          <line key={k} x1={a} y1={b} x2={c} y2={d} data-new={k === 4 || undefined} />
        ))}
        {[
          [56, 36],
          [150, 40],
          [60, 108],
          [146, 104],
        ].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r="7" />
        ))}
        <circle cx="100" cy="70" r="12" className="is-core" />
        <circle cx="176" cy="76" r="8" className="is-new" />
        <circle cx="176" cy="76" r="8" className="is-ping" />
      </svg>
    </div>
  );
}

/** Five steps, one request. Scrolling runs the pipeline; the console narrates each step as it lands. */
export function HowItWorks() {
  const ref = useRef<HTMLElement>(null);
  useQuiet(ref);
  const { step, goTo } = usePinned(ref, FLOW.length);
  const f = FLOW[step];

  return (
    <Chapter id="how" innerRef={ref} n={FLOW.length} screens={0.4} tone={FLOW_TONES[step]} className="ch-how">
      <div className="wrap how-frame">
        <div className="how-head">
          <Headline tone="pink" lines={['From request to result,', 'in five steps.']} />
        </div>

        <div className="pipe" role="tablist" aria-label="Steps" style={{ '--step': step, '--n': FLOW.length } as CSSProperties}>
          <span className="pipe-rail" aria-hidden="true">
            <span className="pipe-fill" />
          </span>
          {FLOW.map((s, i) => (
            <button
              key={s.step}
              role="tab"
              aria-selected={i === step}
              className="pipe-step"
              data-done={i < step || undefined}
              style={toneStyle(FLOW_TONES[i], { '--i': i } as CSSProperties)}
              onClick={() => goTo(i)}
            >
              <span className="pipe-node">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d={ICONS[i]} />
                </svg>
              </span>
              {s.step}
            </button>
          ))}
        </div>

        <div className="how-panel" style={toneStyle(FLOW_TONES[step])}>
          <Steps step={step} className="how-scenes">
            {FLOW.map((s, i) => (
              <Scene key={s.step} i={i} />
            ))}
          </Steps>
          <Steps step={step} className="how-copy">
            {FLOW.map((s) => (
              <div key={s.step} className="how-main">
                <span className="how-big">{s.step}</span>
                <p>{s.body}</p>
                <div className="how-powered">
                  {s.powered.map((p) => (
                    <span key={p} className="chip-soft">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </Steps>
          <div className="console" aria-live="polite">
            <div className="console-bar">
              <span className="ui-dots">
                <i />
                <i />
                <i />
              </span>
              origin · trace
            </div>
            {/* the whole trace is always listed, so the console reads as a run in progress rather than an
                empty box: done steps in full, the current one typing, the rest waiting their turn */}
            <ol className="console-log">
              {FLOW.map((s, i) => (
                <li key={s.step} data-now={i === step || undefined} data-done={i < step || undefined} data-wait={i > step || undefined}>
                  <span className="console-k">{s.step.toLowerCase()}</span>
                  {i === step ? <Typewriter key={f.step} text={s.trace} run speed={14} /> : <span>{i < step ? s.trace : 'waiting'}</span>}
                </li>
              ))}
            </ol>
            <p className="console-foot">
              <i aria-hidden="true" />
              {step === FLOW.length - 1 ? 'learning from the result' : 'running'}
            </p>
          </div>
        </div>
      </div>
    </Chapter>
  );
}
