import { useRef } from 'react';
import { useFormation } from '../gl/Scene';
import { Lines, Kicker, Fade } from '../components/Reveal';

const PILLARS = [
  { title: 'Sovereign by design', body: 'Data and intelligence that remain under the control of those they serve.' },
  { title: 'Cloud to edge', body: 'The same intelligence, from national data centres to the device in your hand.' },
  { title: 'Open to the world', body: 'Designed in India, built to connect everywhere.' },
];

export function Network() {
  const ref = useRef<HTMLElement>(null);
  useFormation(ref, { key: 'globe', params: { drag: 1 }, mobilePose: { y: 1.1, s: 0.58 } });
  return (
    <section id="network" ref={ref} className="section network is-draggable" data-chapter="Network">
      <div className="wrap">
        <Kicker index="04">Network</Kicker>
        <Lines className="h2" lines={['Built in Bharat.', 'For the world.']} />
        <Fade as="p" className="lede" delay={150}>
          An intelligence network conceived in India and engineered to run anywhere. Every node shares what it learns.
        </Fade>
        <div className="pillars">
          {PILLARS.map((p, i) => (
            <Fade key={p.title} className="pillar" delay={200 + i * 110}>
              <span className="mono muted">{String(i + 1).padStart(2, '0')}</span>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </Fade>
          ))}
        </div>
      </div>
      <p className="drag-hint mono" aria-hidden="true">
        <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
          <path d="M5 1L1 5l4 4M13 1l4 4-4 4M1 5h16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Drag to rotate the network
      </p>
    </section>
  );
}
