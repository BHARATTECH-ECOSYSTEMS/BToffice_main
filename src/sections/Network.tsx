import { useRef, useState, type ReactNode } from 'react';
import { useFormation } from '../gl/Scene';
import { Diagram } from '../viz/Diagram';
import { network, type NetFocus } from '../viz/network';
import { Fade, Lines, Kicker } from '../components/Reveal';

const icon = (d: ReactNode) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

const PILLARS: { key: NetFocus; title: string; body: string; icon: ReactNode }[] = [
  {
    key: 'sovereign',
    title: 'Sovereign by design',
    body: 'The core lives in India. Data and intelligence stay under the control of those they serve.',
    icon: icon(<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3zM9 12l2 2 4-4" />),
  },
  {
    key: 'edge',
    title: 'Cloud to edge',
    body: 'The same intelligence runs in national data centres and on the phone in your hand.',
    icon: icon(<path d="M7 17a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.6 1.5A3.5 3.5 0 0 1 17 17H7zM12 17v4M9 21h6" />),
  },
  {
    key: 'world',
    title: 'Open to the world',
    body: 'Conceived in Bharat, engineered to connect to every region and every language.',
    icon: icon(<path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" />),
  },
];

/** One core, many places: what any node learns, every node receives. */
export function Network() {
  const ref = useRef<HTMLElement>(null);
  const [focus, setFocus] = useState<NetFocus>(null);
  useFormation(ref, { key: 'field', params: { alpha: 0 } });
  return (
    <section id="network" ref={ref} className="section net room room--pitch" data-room="pitch" data-chapter="Network">
      <div className="wrap">
        <header className="sec-head">
          <Kicker index="06">Network</Kicker>
          <div className="sec-head-main">
            <Lines className="h2" lines={['Built in Bharat.', <span className="accent">For the world.</span>]} />
            <Fade as="p" className="lede" delay={120}>
              An intelligence network conceived in India and engineered to run anywhere. Every node shares what it learns with the rest.
            </Fade>
          </div>
        </header>
        <Fade className="net-grid">
          <div className="net-art">
            <Diagram
              draw={network(focus)}
              period={15}
              w={560}
              h={380}
              still={11.5}
              label="Something learned on one device travels to a national data centre, then to the sovereign core in India, then out to every other node"
            />
          </div>
          <ul className="net-list" onMouseLeave={() => setFocus(null)}>
            {PILLARS.map((p) => (
              <li key={p.title}>
                <button className={`net-pillar ${focus === p.key ? 'is-on' : ''}`} onMouseEnter={() => setFocus(p.key)} onFocus={() => setFocus(p.key)} onBlur={() => setFocus(null)}>
                  <span className="net-icon">{p.icon}</span>
                  <span className="net-copy">
                    <h3>{p.title}</h3>
                    <p>{p.body}</p>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Fade>
      </div>
    </section>
  );
}
