import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useFormation, useScene, worldYOf } from '../gl/Scene';
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
  const copyRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const { scrollTo } = useScene();

  useFormation(ref, () => {
    const el = copyRef.current ?? ref.current;
    const y = worldYOf(el, el ? el.offsetHeight * 0.48 : window.innerHeight * 0.45);
    const scrollY = window.scrollY;
    // Fade out smoothly and subtly as hero copy scrolls up, avoiding overlap with facts
    const fadeDist = Math.max(240, window.innerHeight * 0.52);
    const progress = Math.min(1, Math.max(0, scrollY / fadeDist));
    const alpha = Math.max(0, 1 - progress * 1.15);
    return {
      key: 'logo',
      pose: { x: 1.65, y, s: 0.92 },
      mobilePose: { x: 0, y, s: 0.56 },
      params: { alpha },
      follow: 18,
    };
  });

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 250);
    return () => clearTimeout(t);
  }, []);

  const d = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

  return (
    <section id="top" ref={ref} className="hero" data-chapter="Origin">
      <div className="wrap hero-grid">
        <div ref={copyRef} className="hero-copy">
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
