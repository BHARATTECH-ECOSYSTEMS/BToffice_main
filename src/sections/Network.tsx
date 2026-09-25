import { useRef, useState, type ReactNode } from 'react';
import { attachTo, useFormation } from '../gl/Scene';
import { useAnchors } from '../gl/useAnchors';
import { Lines, Kicker, Fade } from '../components/Reveal';
import { GLOBE_LABELS } from '../gl/geo';

const icon = (d: ReactNode) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

/** Each pillar points at the part of the globe it is about. */
const PILLARS = [
  {
    title: 'Sovereign by design',
    body: 'The core lives in India. Data and intelligence stay under the control of those they serve.',
    icon: icon(<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3zM9 12l2 2 4-4" />),
    anchor: 0, // India
    side: 'left',
  },
  {
    title: 'Cloud to edge',
    body: 'The same intelligence runs in national data centres and on the phone in your hand.',
    icon: icon(<path d="M7 17a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.6 1.5A3.5 3.5 0 0 1 17 17H7zM12 17v4M9 21h6" />),
    anchor: 5, // Southeast Asia
    side: 'right',
  },
  {
    title: 'Open to the world',
    body: 'Conceived in Bharat, engineered to connect to every region and every language.',
    icon: icon(<path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" />),
    anchor: 1, // Europe
    side: 'right',
  },
] as const;

/**
 * The network, pinned. Scrolling turns the globe outwards from India while three
 * pillars appear one by one, each drawn to the place on the globe it describes.
 */
export function Network() {
  const ref = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState(0);
  const phaseRef = useRef(0);
  const spin = useRef(0);
  const labels = useRef<(HTMLDivElement | null)[]>([]);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const leaders = useRef<(SVGPathElement | null)[]>([]);
  const pins = useRef<(SVGCircleElement | null)[]>([]);

  useFormation(
    ref,
    () => ({
      key: 'globe',
      pose: { x: 0.2, y: -0.15, s: 0.98 },
      params: { drag: 1, spinY: spin.current },
      ...attachTo(ref.current, 0.28, 0.56),
    }),
    (p) => {
      spin.current = -0.15 + p * 1.1;
      const ph = Math.min(2, Math.floor(Math.max(0, p - 0.08) * 3.4));
      if (ph !== phaseRef.current) {
        phaseRef.current = ph;
        setPhase(ph);
      }
    },
  );

  useAnchors(['globe'], (pts, settle) => {
    labels.current.forEach((el, i) => {
      if (!el) return;
      const p = pts?.[i];
      if (!p) {
        el.style.opacity = '0';
        return;
      }
      const facing = Math.min(1, Math.max(0, (p.depth - 0.05) / 0.35));
      el.style.opacity = String(settle * facing);
      el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
    });
    PILLARS.forEach((pl, i) => {
      const path = leaders.current[i];
      const pin = pins.current[i];
      const card = cards.current[i];
      const a = pts?.[pl.anchor];
      const on = !!a && i <= phaseRef.current && a.depth > 0 && window.innerWidth > 900;
      if (!path || !pin || !card) return;
      path.style.opacity = pin.style.opacity = on ? String(settle * (i === phaseRef.current ? 1 : 0.45)) : '0';
      if (!on || !a) return;
      const r = card.getBoundingClientRect();
      const sx = pl.side === 'left' ? r.right : r.left;
      const sy = r.top + 34;
      const mx = sx + (a.x - sx) * 0.5;
      path.setAttribute('d', `M${sx} ${sy} C${mx} ${sy}, ${mx} ${a.y}, ${a.x} ${a.y}`);
      pin.setAttribute('cx', String(a.x));
      pin.setAttribute('cy', String(a.y));
    });
  });

  return (
    <section id="network" ref={ref} className="pin network is-draggable" data-chapter="Network">
      <div className="pin-stage">
        <svg className="net-leaders" aria-hidden="true">
          {PILLARS.map((p, i) => (
            <g key={p.title}>
              <path ref={(el) => (leaders.current[i] = el)} />
              <circle ref={(el) => (pins.current[i] = el)} r={5} />
            </g>
          ))}
        </svg>
        <div className="globe-labels" aria-hidden="true">
          {GLOBE_LABELS.map((g, i) => (
            <div key={g.name} ref={(el) => (labels.current[i] = el)} className={`globe-label ${g.home ? 'is-home' : ''}`}>
              <i />
              <span>{g.name}</span>
            </div>
          ))}
        </div>

        <div className="wrap net-stage">
          <header className="net-head">
            <Kicker index="06">Network</Kicker>
            <Lines className="h2" lines={['Built in Bharat.', <span className="accent">For the world.</span>]} />
            <Fade as="p" className="body" delay={120}>
              An intelligence network conceived in India and engineered to run anywhere. Every node shares what it learns with the rest.
            </Fade>
          </header>

          {PILLARS.map((p, i) => (
            <div
              key={p.title}
              ref={(el) => (cards.current[i] = el)}
              className={`net-card net-card-${i} ${i <= phase ? 'is-shown' : ''} ${i === phase ? 'is-active' : ''}`}
            >
              <span className="net-card-icon">{p.icon}</span>
              <div>
                <p className="net-card-num">0{i + 1}</p>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </div>
            </div>
          ))}

          <div className="net-foot">
            <div className="legend">
              <span>
                <i className="lg-home" />
                India: the sovereign core
              </span>
              <span>
                <i className="lg-link" />
                Links to every region
              </span>
              <span className="legend-hint">
                <svg width="16" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true">
                  <path d="M5 1L1 5l4 4M13 1l4 4-4 4M1 5h16" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Drag to rotate
              </span>
            </div>
            <div className="net-steps" aria-hidden="true">
              {PILLARS.map((p, i) => (
                <i key={p.title} className={i <= phase ? 'is-on' : ''} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
