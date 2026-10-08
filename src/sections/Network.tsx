import { useRef, type CSSProperties } from 'react';
import { fitTo, useFormation } from '../gl/Scene';
import { GLOBE_SIZE } from '../gl/Engine';
import { Eyebrow, Headline, Reveal } from '../components/ui';
import { Icon, type IconName } from '../components/fx';
import { NETWORK } from '../content';

const ICONS: IconName[] = ['shield', 'cloud', 'globe'];

/** The mark becomes a planet: India in violet, routes of light out to the world. */
export function Network() {
  const ref = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const spin = useRef(0);
  useFormation(
    ref,
    () => ({ key: 'globe', pose: fitTo(stage.current, GLOBE_SIZE, 0.95), spin: spin.current, follow: 26 }),
    (p) => {
      spin.current = -0.4 + p * 1.2;
    },
  );

  return (
    <section id="network" ref={ref} className="section network">
      <div className="wrap network-grid">
        <div className="network-visual">
          <div className="network-stage" ref={stage} aria-hidden="true" />
        </div>
        <div className="network-copy">
          <Eyebrow tone="saffron">Network</Eyebrow>
          <Headline tone="saffron" lines={['Built in Bharat.', 'For the world.']} />
          <Reveal as="p" className="lede" delay={100}>
            The core of Origin lives in India, and reaches every region it serves: from national data centres to the devices people carry.
          </Reveal>
          <div className="network-cells">
            {NETWORK.map((n, i) => (
              <Reveal key={n.title} className="cell cell-row" style={{ '--tone': `var(--${n.tone})` } as CSSProperties} delay={140 + i * 80}>
                <span className="icon-tile">
                  <Icon name={ICONS[i]} />
                </span>
                <div>
                  <h3>{n.title}</h3>
                  <p>{n.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
