import { useRef, useState } from 'react';
import { useFormation } from '../gl/Scene';
import { useAnchors } from '../gl/useAnchors';
import { Lines, Kicker, Fade } from '../components/Reveal';
import { LAYERS } from '../content';

/** The exploded stack. Scroll walks down the layers; the active one lifts out and is labelled in place. */
export function Architecture() {
  const ref = useRef<HTMLElement>(null);
  const tag = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered ?? scrolled;
  const activeRef = useRef(active);
  activeRef.current = active;
  const last = useRef(0);

  useFormation(
    ref,
    () => ({ key: 'layers', params: { dark: 1, highlight: activeRef.current, explode: 1 }, mobilePose: { y: 1.3, s: 0.48 } }),
    (p) => {
      const s = Math.min(LAYERS.length - 1, Math.floor(Math.max(0, p - 0.04) * 1.08 * LAYERS.length));
      if (s !== last.current) {
        last.current = s;
        setScrolled(s);
      }
    },
  );

  useAnchors(['layers'], (pts, settle) => {
    const el = tag.current;
    if (!el) return;
    if (!pts) {
      el.style.opacity = '0';
      return;
    }
    const a = pts[activeRef.current];
    el.style.opacity = String(settle);
    el.style.transform = `translate3d(${a.x}px, ${a.y}px, 0)`;
  });

  return (
    <section id="architecture" ref={ref} className="pin arch" data-chapter="Architecture">
      <div className="pin-stage">
        <div ref={tag} className="layer-tag" aria-hidden="true">
          <span className="layer-tag-line" />
          <span className="layer-tag-text" key={active}>
            <b>{String(active + 1).padStart(2, '0')}</b> {LAYERS[active].name}
          </span>
        </div>
        <div className="wrap arch-grid">
          <div className="arch-copy">
            <Kicker index="03">Architecture</Kicker>
            <Lines className="h2" lines={['An operating system,', 'not an application.']} />
            <Fade as="p" className="body" delay={150}>
              Nine layers, one continuous system. Intelligence flows from sovereign compute at the base to the applications people
              touch.
            </Fade>
            <ol className="layer-list" onMouseLeave={() => setHovered(null)}>
              {LAYERS.map((l, i) => (
                <li key={l.name} className={`layer-item ${i === active ? 'is-active' : ''}`}>
                  <button className="layer-btn" onMouseEnter={() => setHovered(i)} onFocus={() => setHovered(i)} onBlur={() => setHovered(null)}>
                    <span className="num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="name">{l.name}</span>
                    <span className="desc">
                      <span>{l.body}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
          <div className="arch-visual-space" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
