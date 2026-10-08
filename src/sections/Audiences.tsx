import { useRef } from 'react';
import { Eyebrow, Headline, Reveal, toneStyle } from '../components/ui';
import { useQuiet } from '../gl/Scene';
import { AudienceArt } from '../components/AudienceArt';
import { AUDIENCE_DETAIL, AUDIENCE_TONES } from '../content';

export function Audiences() {
  const ref = useRef<HTMLElement>(null);
  useQuiet(ref);
  return (
    <section id="who" ref={ref} className="section">
      <div className="wrap">
        <div className="section-head">
          <div>
            <Eyebrow tone="tangerine">Who it’s for</Eyebrow>
            <Headline tone="tangerine" lines={['Built for the people', 'who build what’s next.']} />
          </div>
        </div>
        <div className="bento audience-bento">
          {AUDIENCE_DETAIL.map((a, i) => (
            <Reveal key={a.name} className="cell cell-tint audience" style={toneStyle(AUDIENCE_TONES[i])} delay={i * 60}>
              <div className="audience-art-wrap">
                <AudienceArt index={i} tone={AUDIENCE_TONES[i]} />
              </div>
              <h3>{a.name}</h3>
              <p>{a.line}</p>
              <ul className="mini-tags">
                {a.uses.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
