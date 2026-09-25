import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { useFormation, useScene } from '../gl/Scene';
import { Lines, Arrow } from '../components/Reveal';
import { CAPABILITIES, DOMAINS, LAYERS } from '../content';

const FACTS = [
  { label: 'Research domains', value: String(DOMAINS.length).padStart(2, '0') },
  { label: 'System layers', value: String(LAYERS.length).padStart(2, '0') },
  { label: 'Capabilities', value: String(CAPABILITIES.length) },
  { label: 'Headquarters', value: 'India' },
];

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  const { scrollTo } = useScene();
  useFormation(ref, { key: 'logo', pose: { x: 1.65, s: 0.92 }, mobilePose: { y: 1.05, s: 0.56 } });

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 250);
    return () => clearTimeout(t);
  }, []);

  const d = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

  return (
    <section id="top" ref={ref} className="hero" data-chapter="Origin">
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <p className={`eyebrow fade ${ready ? 'is-in' : ''}`}>
            <span className="eyebrow-dot" />
            Generative Intelligence Infrastructure
          </p>
          <Lines as="h1" className="display" show={ready} delay={80} lines={['Intelligence', 'should never', <>forget<em>.</em></>]} />
          <p className={`lede fade ${ready ? 'is-in' : ''}`} style={d(520)}>
            A unified intelligence infrastructure, designed to learn, remember, reason and evolve.
          </p>
          <div className={`hero-actions fade ${ready ? 'is-in' : ''}`} style={d(640)}>
            <button className="btn btn-solid" onClick={() => scrollTo(document.getElementById('mission')!)}>
              Explore the system <Arrow dir="down" size={13} />
            </button>
            <Link to="/about" className="btn btn-ghost">
              Read our thesis
            </Link>
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
