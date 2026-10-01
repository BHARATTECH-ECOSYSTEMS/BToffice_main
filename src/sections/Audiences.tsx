import { useRef } from 'react';
import { useFormation } from '../gl/Scene';
import { Fade, SectionHead } from '../components/Reveal';
import { AUDIENCE_DETAIL } from '../content';
import { Diagram } from '../components/BentoDiagrams';
import { AUDIENCE_DIAGRAMS } from '../components/AudienceDiagrams';

export function Audiences() {
  const ref = useRef<HTMLElement>(null);
  useFormation(ref, { key: 'orbit6', params: { alpha: 0 } });
  return (
    <section id="audiences" ref={ref} className="section audiences" data-chapter="Who it’s for">
      <div className="wrap">
        <SectionHead
          index="08"
          label="Who it’s for"
          title={['One intelligence,', 'shaped for your work.']}
          lede="The same memory and reasoning underneath, for people with very different jobs to do."
        />
        <div className="aud-grid">
          {AUDIENCE_DETAIL.map((a, i) => (
            <Fade key={a.name} delay={(i % 3) * 80} className="aud-card">
              <div className="aud-art">
                <Diagram
                  draw={AUDIENCE_DIAGRAMS[i].draw}
                  period={AUDIENCE_DIAGRAMS[i].period}
                  w={AUDIENCE_DIAGRAMS[i].w}
                  h={AUDIENCE_DIAGRAMS[i].h}
                  label={AUDIENCE_DIAGRAMS[i].label}
                  still={AUDIENCE_DIAGRAMS[i].still}
                />
              </div>
              <div className="aud-text">
                <h3>
                  <span className="aud-num">{String(i + 1).padStart(2, '0')}</span>
                  {a.name}
                </h3>
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
