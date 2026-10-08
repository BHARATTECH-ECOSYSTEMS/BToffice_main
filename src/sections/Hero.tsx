import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { fitTo, useFormation } from '../gl/Scene';
import { MARK_SIZE } from '../gl/Engine';
import { Arrow, Headline } from '../components/ui';
import { Counter, Marquee } from '../components/fx';
import { CAPABILITIES, DOMAINS, LAYERS, THREAD_LABELS } from '../content';

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 80);
    return () => clearTimeout(t);
  }, []);

  useFormation(ref, () => ({ key: 'mark', pose: fitTo(stage.current, MARK_SIZE, 1.05), follow: 30 }));

  return (
    <section id="top" ref={ref} className="hero" data-ready={ready || undefined}>
      <div className="hero-grid-bg" aria-hidden="true" />
      <div className="wrap hero-inner">
        <div className="hero-copy">
          <Link to="/research" className="hero-badge">
            <span className="hero-badge-tag">New</span>
            Rivinity, our flagship research programme
            <Arrow size={12} />
          </Link>
          <Headline as="h1" className="display" tone="violet" lines={['Intelligence', 'should never', 'forget.']} show={ready} />
          <p className="hero-lede">
            We are building the operating system for intelligence: one shared layer that lets AI remember context, work across tools and keep learning.
          </p>
          <div className="hero-actions">
            <Link to="/contact" className="btn btn-primary btn-lg">
              Start a conversation <Arrow />
            </Link>
            <Link to="/research" className="btn btn-ghost btn-lg">
              Explore research
            </Link>
          </div>
          <ul className="hero-facts">
            <li>
              <b>
                <Counter to={DOMAINS.length} />
              </b>
              <span>research domains</span>
            </li>
            <li>
              <b>
                <Counter to={LAYERS.length} />
              </b>
              <span>system layers</span>
            </li>
            <li>
              <b>
                <Counter to={CAPABILITIES.length} />
              </b>
              <span>capabilities</span>
            </li>
          </ul>
        </div>

        <div className="hero-visual">
          <div className="hero-plate" aria-hidden="true">
            <span className="plate-corner is-tl" />
            <span className="plate-corner is-tr" />
            <span className="plate-corner is-bl" />
            <span className="plate-corner is-br" />
            <span className="plate-ring" />
            <span className="plate-ring is-outer" />
            <span className="plate-axis is-x" />
            <span className="plate-axis is-y" />
            <p className="plate-note is-tl">
              Fig. 01
              <b>The origin mark</b>
            </p>
            <ul className="plate-note is-br">
              {THREAD_LABELS.map((t, i) => (
                <li key={t}>
                  <i />
                  {String(i + 1).padStart(2, '0')} {t}
                </li>
              ))}
            </ul>
            <p className="plate-note is-tr">
              3 threads
              <b>1 origin</b>
            </p>
          </div>
          <div className="hero-stage" ref={stage} aria-hidden="true" />
        </div>
      </div>

      <div className="hero-ticker">
        <Marquee speed={55}>
          {CAPABILITIES.map((c) => (
            <span key={c.name} className="ticker-item">
              <i aria-hidden="true" />
              {c.name}
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
