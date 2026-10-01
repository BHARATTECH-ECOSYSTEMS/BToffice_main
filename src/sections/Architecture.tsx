import { useEffect, useRef, useState } from 'react';
import { Lines, Kicker, Fade } from '../components/Reveal';
import { LAYERS } from '../content';
import { LAYER_GLYPHS, LayerAnimatedDiagram } from '../components/ArchitectureDiagrams';
import { useFormation, useScene } from '../gl/Scene';

const TONES = ['violet', 'violet', 'violet', 'tango', 'tango', 'tango', 'pitch', 'pitch', 'pitch'] as const;
const STEP_HEIGHT = 40;

export function Architecture() {
  const sectionRef = useRef<HTMLElement>(null);
  const [scrolledIndex, setScrolledIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { scrollTo } = useScene();

  useFormation(
    sectionRef,
    () => ({ key: 'field', params: { alpha: 0 } }),
    (p, active) => {
      if (!active) return;
      const idx = Math.min(LAYERS.length - 1, Math.floor(p * LAYERS.length));
      setScrolledIndex(idx);
    }
  );

  const active = hoveredIndex ?? scrolledIndex;
  const tracerY = active * STEP_HEIGHT + STEP_HEIGHT / 2;

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const totalScrollable = el.offsetHeight - window.innerHeight;
      if (totalScrollable <= 0) return;

      const currentScrolled = -rect.top;
      const progress = Math.min(1, Math.max(0, currentScrolled / totalScrollable));
      const idx = Math.min(LAYERS.length - 1, Math.floor(progress * LAYERS.length));
      setScrolledIndex(idx);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const scrollToLayer = (idx: number) => {
    setScrolledIndex(idx);
    const el = sectionRef.current;
    if (!el) return;
    const totalScrollable = el.offsetHeight - window.innerHeight;
    const target = el.offsetTop + (idx / (LAYERS.length - 1)) * totalScrollable;
    scrollTo(target);
  };

  return (
    <section id="architecture" ref={sectionRef} className="arch" data-chapter="Architecture">
      <div className="steps-stage">
        <div className="wrap">
          <header className="sec-head">
            <Kicker index="05">Architecture</Kicker>
            <div className="sec-head-main">
              <Lines className="h2" lines={['An operating system,', 'not an application.']} />
              <Fade as="p" className="lede" delay={120}>
                Nine layers, one continuous system. Follow a request from the app you use down to sovereign compute.
              </Fade>
            </div>
          </header>

          <div className="stack-wrap">
            <div className="stack">
              <div className="stack-rail" aria-hidden="true">
                <span className="stack-rail-fill" style={{ height: tracerY }} />
                <span className="stack-flow" style={{ transform: `translateY(${tracerY}px)` }}>
                  <i />
                  <b>Request</b>
                </span>
              </div>
              <ol className="stack-list" onMouseLeave={() => setHoveredIndex(null)}>
                {LAYERS.map((layer, idx) => {
                  const widthPercent = 84 + (idx / (LAYERS.length - 1)) * 16;
                  const tone = TONES[idx];
                  const isActive = idx === active;
                  const isPast = idx < active;
                  return (
                    <li key={layer.name} style={{ height: STEP_HEIGHT }}>
                      <button
                        type="button"
                        className={`slab slab--${idx + 1} ${isActive ? 'is-active' : ''} ${isPast ? 'is-past' : ''}`}
                        data-tone={tone}
                        style={{ width: `${widthPercent}%` }}
                        onClick={() => scrollToLayer(idx)}
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onFocus={() => setHoveredIndex(idx)}
                        aria-label={`Layer ${idx + 1}: ${layer.name}`}
                      >
                        <span className="num">{String(idx + 1).padStart(2, '0')}</span>
                        <span className="name">{layer.name}</span>
                        {LAYER_GLYPHS[idx]}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="stack-detail" data-tone={TONES[active]} aria-live="polite">
              <div className="stack-art" key={active}>
                <LayerAnimatedDiagram index={active} />
              </div>
              <div className="stack-copy" key={`copy-${active}`}>
                <span className="num">Layer {String(active + 1).padStart(2, '0')} of 9</span>
                <h3>{LAYERS[active].name}</h3>
                <p>{LAYERS[active].body}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
