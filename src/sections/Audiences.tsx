import { useRef } from 'react';
import { Eyebrow, Headline, Reveal, toneStyle } from '../components/ui';
import { useQuiet } from '../gl/Scene';
import { Icon, type IconName } from '../components/fx';

const ICONS: IconName[] = ['flask', 'code2', 'building', 'landmark', 'cap', 'rocket'];
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
          <Reveal as="p" className="lede" delay={120}>
            One foundation, many hands. Here is what changes for each of them.
          </Reveal>
        </div>
        <div className="bento audience-bento">
          {AUDIENCE_DETAIL.map((a, i) => (
            <Reveal key={a.name} className="cell cell-tint audience" style={toneStyle(AUDIENCE_TONES[i])} delay={i * 60}>
              <span className="icon-tile">
                <Icon name={ICONS[i]} />
              </span>
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
