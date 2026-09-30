import { useRef } from 'react';
import { useStage } from '../gl/Scene';
import { Stage } from '../components/Stage';
import { Fade, SectionHead } from '../components/Reveal';
import { AUDIENCE_DETAIL } from '../content';
import { Diagram } from '../viz/Diagram';
import { AUDIENCE_DRAWS, AUDIENCE_LABELS, AUDIENCE_STILL, AUD_H, AUD_W } from '../viz/audiences';

export function Audiences() {
  const ref = useRef<HTMLElement>(null);
  const cap = 'Six kinds of people, one intelligence in the middle';
  const stage = useStage(ref, 'people', { fig: '08', name: 'People', caption: cap, labels: () => AUDIENCE_DETAIL.map((a) => ({ text: a.name, side: 'below' as const })) });
  return (
    <section id="audiences" ref={ref} className="section audiences room" data-room="tango" data-room2="violet" data-chapter="Who it’s for">
      <div className="wrap">
        <SectionHead
          index="08"
          label="Who it’s for"
          title={['One intelligence,', 'shaped for your work.']}
          lede="The same memory and reasoning underneath, for people with very different jobs to do."
          stage={<Stage stageRef={stage} fig="08" name="People" caption={cap} />}
        />
        <div className="aud-grid">
          {AUDIENCE_DETAIL.map((a, i) => (
            <Fade key={a.name} delay={(i % 3) * 100} className="aud-card">
              <div className="aud-art">
                <Diagram draw={AUDIENCE_DRAWS[i]} period={8} w={AUD_W} h={AUD_H} label={AUDIENCE_LABELS[i]} still={AUDIENCE_STILL[i]} />
                <span className="aud-num">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <div className="aud-text">
                <h3>{a.name}</h3>
                <p>{a.line}</p>
                <ul>
                  {a.uses.map((u) => (
                    <li key={u}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                        <path d="M2.5 6.2l2.3 2.3 4.7-5" />
                      </svg>
                      {u}
                    </li>
                  ))}
                </ul>
              </div>
            </Fade>
          ))}
        </div>
      </div>
    </section>
  );
}
