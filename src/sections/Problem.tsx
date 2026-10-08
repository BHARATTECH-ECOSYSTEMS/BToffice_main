import { useRef, type CSSProperties } from 'react';
import { fitTo, useFormation } from '../gl/Scene';
import { MARK_SIZE, type Target } from '../gl/Engine';
import { ThreadDial } from '../components/ThreadDial';
import { Eyebrow, Headline } from '../components/ui';
import { Chapter, StepTabs, Steps, usePinned } from '../components/Chapter';
import { Icon, type IconName } from '../components/fx';
import { PROBLEMS, SILOS } from '../content';

const SILO_ICONS: IconName[] = ['chat', 'search', 'docs', 'code', 'vision', 'voice'];

const ROOM = 1.6;

/**
 * The logo's three threads are memory, connection and learning, and they meet at one origin.
 * Each failure happens to the threads: memory is wiped, every thread breaks into pieces, the whole mark
 * freezes, and the threads stop short of the origin.
 */
const STATES: Omit<Target, 'key'>[] = [
  { show: [0, 1, 1] },
  { broken: [1, 1, 1] },
  { grey: 1 },
  { apart: 1, grey: 0.25 },
];
const DIAL: [string, string, string][] = [
  ['Wiped every session', 'Intact', 'Intact'],
  ['In pieces', 'In pieces', 'In pieces'],
  ['Frozen', 'Frozen', 'Stopped at training'],
  ['Stops short', 'Stops short', 'Stops short'],
];
const ORIGIN = ['Shared', 'Shared', 'Shared', 'Never reached'];

/** A small instrument per failure, under its copy: a readout that shows the failure in numbers. */
function Readout({ i }: { i: number }) {
  if (i === 0)
    return (
      <div className="readout">
        <p className="cell-label">Session memory</p>
        <ol className="readout-sessions">
          {['Week 1', 'Week 2', 'Week 3'].map((w, k) => (
            <li key={w} style={{ '--k': k } as CSSProperties}>
              <span>{w}</span>
              <i data-lost={k > 0 || undefined} />
              <b>{k === 0 ? '7 districts flagged' : 'starts from zero'}</b>
            </li>
          ))}
        </ol>
      </div>
    );
  if (i === 1)
    return (
      <div className="readout">
        <p className="cell-label">Six tools, six memories</p>
        <ul className="readout-silos">
          {SILOS.map((s, k) => (
            <li key={s} style={{ '--k': k } as CSSProperties}>
              <Icon name={SILO_ICONS[k]} size={15} />
              {s}
            </li>
          ))}
        </ul>
      </div>
    );
  if (i === 2)
    return (
      <div className="readout">
        <p className="cell-label">What it knows vs. the world</p>
        <svg className="readout-chart" viewBox="0 0 240 70" aria-hidden="true">
          <path d="M0 52 C40 50 60 40 90 38 S150 22 180 18 S220 10 240 6" className="is-world" pathLength={1} />
          <path d="M0 52 C40 50 60 40 90 38 H240" className="is-model" pathLength={1} />
          <line x1="90" x2="90" y1="0" y2="70" className="is-cut" />
          <text x="94" y="66">training cut-off</text>
        </svg>
      </div>
    );
  return (
    <div className="readout">
      <p className="cell-label">Connections between tools</p>
      <div className="readout-meter">
        <b>0</b>
        <span>of 7 complete</span>
        <i>
          {Array.from({ length: 7 }, (_, k) => (
            <span key={k} />
          ))}
        </i>
      </div>
    </div>
  );
}

/** Four ways today's AI falls short, each one shown on the logo's own threads. */
export function Problem() {
  const ref = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const { step, goTo } = usePinned(ref, PROBLEMS.length);
  const stepRef = useRef(0);
  stepRef.current = step;

  useFormation(ref, () => {
    return { key: 'mark', pose: fitTo(stage.current, MARK_SIZE * ROOM, 0.95), follow: 30, ...STATES[stepRef.current] };
  });

  return (
    <Chapter id="problem" innerRef={ref} n={PROBLEMS.length} tone="tangerine" className="ch-problem">
      <div className="wrap chapter-grid">
        <div className="chapter-copy">
          <Eyebrow tone="tangerine">The problem</Eyebrow>
          <Headline tone="tangerine" lines={['Powerful,', 'but incomplete.']} />
          <StepTabs labels={PROBLEMS.map((p) => p.title.replace('.', ''))} step={step} goTo={goTo} />
          <Steps step={step} className="chapter-steps">
            {PROBLEMS.map((p, i) => (
              <div key={p.title} className="chapter-step">
                <span className="chapter-step-num">{String(i + 1).padStart(2, '0')}</span>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
                <Readout i={i} />
              </div>
            ))}
          </Steps>
        </div>
        <div className="chapter-stage" ref={stage} aria-hidden="true">
          <ThreadDial
            room={ROOM}
            threads={['Memory', 'Connection', 'Learning'].map((name, i) => ({ name, state: DIAL[step][i], ok: DIAL[step][i] === 'Intact' }))}
            active={step === 0 ? 0 : -1}
            origin={ORIGIN[step]}
            originOk={step < 3}
          />
          <span className="stage-caption">
            <i />
            {['The memory thread is wiped', 'Every thread in pieces', 'The whole mark freezes', 'The threads never meet'][step]}
          </span>
        </div>
      </div>
    </Chapter>
  );
}
