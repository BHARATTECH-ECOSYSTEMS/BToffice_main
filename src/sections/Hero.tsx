import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useFormation, useScene } from '../gl/Scene';
import { Lines, Arrow } from '../components/Reveal';

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  const { scrollTo } = useScene();
  useFormation(ref, { key: 'logo', pose: { x: 1.75 }, mobilePose: { y: 1.02, s: 0.6 } });

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 350);
    return () => clearTimeout(t);
  }, []);

  return (
    <section id="top" ref={ref} className="section hero" data-chapter="Origin">
      <div className="wrap">
        <div className="hero-copy">
          <p className={`kicker mono fade ${ready ? 'is-in' : ''}`}>Generative Intelligence Infrastructure</p>
          <Lines
            as="h1"
            className="display"
            show={ready}
            delay={120}
            lines={['Intelligence', 'should never', <>forget<em>.</em></>]}
          />
          <div className={`hero-lede fade ${ready ? 'is-in' : ''}`} style={{ '--d': '700ms' } as React.CSSProperties}>
            <p className="lede">A unified intelligence infrastructure, designed to learn, remember, reason and evolve.</p>
          </div>
          <div className={`hero-actions fade ${ready ? 'is-in' : ''}`} style={{ '--d': '850ms' } as React.CSSProperties}>
            <button className="btn btn-solid" onClick={() => scrollTo(document.getElementById('mission')!)}>
              Explore the system <Arrow dir="down" />
            </button>
            <Link to="/about" className="btn btn-ghost">
              Read our thesis <Arrow />
            </Link>
          </div>
        </div>
      </div>
      <div className="hero-foot">
        <div className="wrap mono">
          <span className="scroll-cue">
            <i /> Scroll <span className="hero-hint">&nbsp;·&nbsp; Move through the sphere, click anywhere to send a pulse</span>
          </span>
        </div>
      </div>
    </section>
  );
}
