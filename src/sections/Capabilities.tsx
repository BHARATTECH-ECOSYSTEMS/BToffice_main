import { useRef, type CSSProperties } from 'react';
import { fitTo, useFormation } from '../gl/Scene';
import { MARK_SIZE } from '../gl/Engine';
import { Eyebrow, Headline } from '../components/ui';
import { Chapter, StepTabs, Steps, usePinned } from '../components/Chapter';
import { MetricsArt, SearchArt, WorkflowArt } from '../components/art';
import { CAPABILITIES, CAPABILITY_GROUPS } from '../content';
import type { HueName } from '../gl/palette';

const ROOM = 1.35;

/** Each family is one of the logo's threads; `thread` is its colour on the glaze. */
const FAMILY: { tone: HueName; thread: string; line: string; Art: () => JSX.Element }[] = [
  { tone: 'cobalt', thread: '#6d8cff', line: 'Read the world in any form: text, images, speech and the web.', Art: SearchArt },
  { tone: 'violet', thread: '#d2c7ff', line: 'Compose agents and workflows that inherit everything the system knows.', Art: WorkflowArt },
  { tone: 'emerald', thread: '#2fd39a', line: 'Run it on your data, under your governance, from cloud to edge.', Art: MetricsArt },
];

/** Three families, three threads: the family being read lights its thread while the other two sink into the glaze. */
export function Capabilities() {
  const ref = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const { step, goTo } = usePinned(ref, CAPABILITY_GROUPS.length);
  const stepRef = useRef(0);
  stepRef.current = step;

  useFormation(ref, () => ({ key: 'mark', focus: stepRef.current, tint: FAMILY[stepRef.current].thread, flow: 0.6, pose: fitTo(stage.current, MARK_SIZE * ROOM, 0.95), follow: 30 }));

  return (
    <Chapter id="capabilities" innerRef={ref} n={CAPABILITY_GROUPS.length} tone="cobalt" className="ch-caps">
      <div className="wrap caps-frame">
        <div className="caps-head">
          <div>
            <Eyebrow tone="cobalt">Capabilities</Eyebrow>
            <Headline tone="cobalt" lines={['One intelligence.', 'Fifteen capabilities.']} />
          </div>
          <StepTabs labels={CAPABILITY_GROUPS} step={step} goTo={goTo} tones={FAMILY.map((f) => f.tone)} />
        </div>
        <div className="caps-body">
          <Steps step={step} className="chapter-steps caps-copy">
            {CAPABILITY_GROUPS.map((g, gi) => {
              const f = FAMILY[gi];
              return (
                <div key={g} className="chapter-step cap-step" style={{ '--tone': `var(--${f.tone})` } as CSSProperties}>
                  <span className="chapter-step-num">
                    {String(gi + 1).padStart(2, '0')} · {g}
                  </span>
                  <h3>{f.line}</h3>
                  <ul className="cap-specs">
                    {CAPABILITIES.slice(gi * 5, gi * 5 + 5).map((c, k) => (
                      <li key={c.name} style={{ '--k': k } as CSSProperties}>
                        <b>{c.name}</b>
                        <span>{c.body}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </Steps>
          <div className="chapter-stage cap-stage" ref={stage} aria-hidden="true">
            <ol className="thread-key">
              {CAPABILITY_GROUPS.map((g, i) => (
                <li key={g} data-on={i === step || undefined} style={{ '--tone': `var(--${FAMILY[i].tone})` } as CSSProperties}>
                  <i />
                  Thread {String(i + 1).padStart(2, '0')} · {g}
                </li>
              ))}
            </ol>
          </div>
          <Steps step={step} className="cap-art-steps">
            {FAMILY.map(({ Art }, i) => (
              <Art key={i} />
            ))}
          </Steps>
        </div>
      </div>
    </Chapter>
  );
}
