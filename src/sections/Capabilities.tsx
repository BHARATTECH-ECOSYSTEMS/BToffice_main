import { useEffect, useRef, useState } from 'react';
import { useFormation } from '../gl/Scene';
import { useAnchors } from '../gl/useAnchors';
import { Lines, Kicker, Fade } from '../components/Reveal';
import { CAPABILITIES, CAPABILITY_GROUPS } from '../content';

const PER_RING = CAPABILITIES.length / CAPABILITY_GROUPS.length;

/**
 * Fifteen capabilities on three rings around one core. The list is where you read;
 * the orbit is where you see. A single callout ties the two together.
 */
export function Capabilities() {
  const ref = useRef<HTMLElement>(null);
  const callout = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [auto, setAuto] = useState(0);
  const [live, setLive] = useState(false);
  const spin = useRef(0);
  const active = hovered ?? auto;
  const activeRef = useRef(active);
  activeRef.current = active;

  useFormation(
    ref,
    () => ({ key: 'orbit15', pose: { x: 1.45, s: 0.74 }, params: { highlight: activeRef.current, spinY: spin.current }, mobilePose: { y: 1.25, s: 0.5 } }),
    (p, isActive) => {
      spin.current = -0.6 + p * 1.2;
      if (isActive !== live) setLive(isActive);
    },
  );

  // Idle: the system tours its own capabilities.
  useEffect(() => {
    if (!live || hovered !== null) return;
    const id = setInterval(() => setAuto((a) => (a + 1) % CAPABILITIES.length), 3200);
    return () => clearInterval(id);
  }, [live, hovered]);

  useAnchors(['orbit15'], (pts, settle) => {
    const el = callout.current;
    if (!el) return;
    if (!pts) {
      el.style.opacity = '0';
      return;
    }
    const a = pts[activeRef.current];
    // Sit on the outside of the orbit (above upper satellites, below lower ones) so the core stays visible.
    const cy = pts.reduce((sum, p) => sum + p.y, 0) / pts.length;
    const W = 280;
    const shift = Math.min(Math.max(a.x - W / 2, 24), window.innerWidth - W - 24) - a.x;
    el.style.opacity = String(settle);
    el.classList.toggle('is-below', a.y >= cy);
    el.style.setProperty('--shift', `${shift}px`);
    el.style.transform = `translate3d(${a.x}px, ${a.y}px, 0)`;
  });

  const cap = CAPABILITIES[active];
  const group = CAPABILITY_GROUPS[Math.floor(active / PER_RING)];

  return (
    <section id="capabilities" ref={ref} className="pin caps" data-chapter="Capabilities">
      <div className="pin-stage">
        <div ref={callout} className="callout" aria-hidden="true">
          <span className="callout-dot" />
          <span className="callout-line" />
          <div className="callout-card" key={active}>
            <p className="mono muted">
              {String(active + 1).padStart(2, '0')} · {group}
            </p>
            <p className="callout-name">{cap.name}</p>
            <p className="callout-body">{cap.body}</p>
          </div>
        </div>
        <div className="wrap caps-grid">
          <div className="caps-copy">
            <Kicker index="02">One intelligence</Kicker>
            <Lines className="h2" lines={['One intelligence.', 'Infinite capabilities.']} />
            <Fade as="p" className="body" delay={150}>
              Not a suite of products. Every capability draws on the same memory, reasoning and security.
            </Fade>
            <div className="cap-groups" onMouseLeave={() => setHovered(null)}>
              {CAPABILITY_GROUPS.map((g, gi) => (
                <Fade key={g} className="cap-group" delay={200 + gi * 90}>
                  <p className="mono cap-group-title">
                    <span>Ring {gi + 1}</span>
                    {g}
                  </p>
                  <ul>
                    {CAPABILITIES.slice(gi * PER_RING, (gi + 1) * PER_RING).map((c, j) => {
                      const i = gi * PER_RING + j;
                      return (
                        <li key={c.name}>
                          <button
                            className={`cap-item ${i === active ? 'is-active' : ''}`}
                            onMouseEnter={() => setHovered(i)}
                            onFocus={() => setHovered(i)}
                            onBlur={() => setHovered(null)}
                            onClick={() => setHovered(i)}
                          >
                            {c.name}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </Fade>
              ))}
            </div>
            <p className="caps-mobile-detail" aria-live="polite">
              <strong>{cap.name}.</strong> {cap.body}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
