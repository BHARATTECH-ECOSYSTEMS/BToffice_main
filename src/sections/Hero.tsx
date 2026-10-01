import { opening, introPlanned } from '../opening';
import { CountUp } from '../components/Motion';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { attachTo, useFormation, useScene } from '../gl/Scene';
import { Lines, Arrow } from '../components/Reveal';
import { CAPABILITIES, DOMAINS, LAYERS } from '../content';

const FACTS = [
  { label: 'Research domains', value: <CountUp to={DOMAINS.length} pad={2} /> },
  { label: 'System layers', value: <CountUp to={LAYERS.length} pad={2} /> },
  { label: 'Capabilities', value: <CountUp to={CAPABILITIES.length} /> },
  { label: 'Headquarters', value: 'India' },
];

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  const { scrollTo } = useScene();
  useFormation(ref, () => ({ key: 'logo', pose: { x: 1.65, s: 0.92 }, ...attachTo(ref.current, 0.25, 0.56) }));

  useEffect(() => {
    let t = 0;
    let live = true;
    opening.then(() => {
      if (live) t = window.setTimeout(() => setReady(true), introPlanned ? 120 : 250);
    });
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, []);

  const d = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

  return (
    <section id="top" ref={ref} className="hero" data-room="violet" data-room2="tango" data-chapter="Origin">
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <p className={`eyebrow fade ${ready ? 'is-in' : ''}`}>
            <span className="eyebrow-dot" />
            Generative Intelligence Infrastructure
          </p>
          <Lines as="h1" className="display" show={ready} delay={80} lines={['Intelligence', 'should never', <span className="accent">forget.</span>]} />
          <p className={`lede fade ${ready ? 'is-in' : ''}`} style={d(520)}>
            Bharattech Origin is building the operating system for intelligence: one shared layer that lets AI remember context, work
            across tools and keep learning.
          </p>
          <div className={`hero-actions fade ${ready ? 'is-in' : ''}`} style={d(640)}>
            <button className="btn btn-solid" onClick={() => scrollTo(document.getElementById('intro')!)}>
              See what we’re building <Arrow dir="down" size={13} />
            </button>
            <button className="btn btn-ghost" onClick={() => scrollTo(document.getElementById('how')!)}>
              How it works
            </button>
          </div>
        </div>
      </div>
      <div className="wrap">
        <dl className={`hero-facts fade ${ready ? 'is-in' : ''}`} style={d(800)}>
          {FACTS.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
