import { useRef } from 'react';
import { Eyebrow, Headline, Reveal, toneStyle } from '../components/ui';
import { useQuiet } from '../gl/Scene';
import { AudienceArt } from '../components/AudienceArt';
import { AUDIENCE_DETAIL, AUDIENCE_TONES } from '../content';

export function Audiences() {
  const ref = useRef<HTMLElement>(null);
  useQuiet(ref);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rx = ((y - rect.height / 2) / (rect.height / 2)) * -5;
    const ry = ((x - rect.width / 2) / (rect.width / 2)) * 5;
    card.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
    card.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
    card.style.setProperty('--mx', `${((x / rect.width) * 100).toFixed(1)}%`);
    card.style.setProperty('--my', `${((y / rect.height) * 100).toFixed(1)}%`);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
    card.style.setProperty('--mx', '50%');
    card.style.setProperty('--my', '50%');
  };

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
            <Reveal
              key={a.name}
              className="cell audience"
              style={toneStyle(AUDIENCE_TONES[i])}
              delay={i * 60}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
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
