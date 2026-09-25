import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { useFormation } from '../gl/Scene';
import { useAnchors } from '../gl/useAnchors';
import { Lines, Kicker, Fade, Arrow } from '../components/Reveal';
import { DOMAINS } from '../content';

/** Six research domains = six segments of the helix. Opening one lights its segment. */
export function Laboratory() {
  const ref = useRef<HTMLElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const lit = hover ?? open;
  const litRef = useRef(lit);
  litRef.current = lit;

  const tags = useRef<(HTMLSpanElement | null)[]>([]);
  useAnchors(['helix'], (pts, settle) => {
    tags.current.forEach((el, i) => {
      if (!el) return;
      if (!pts) {
        el.style.opacity = '0';
        return;
      }
      el.style.opacity = String(settle * (litRef.current === null || litRef.current === i ? 1 : 0.35));
      el.style.transform = `translate3d(${pts[i].x}px, ${pts[i].y}px, 0) translate(-50%, -100%)`;
    });
  });

  useFormation(ref, () => ({
    key: 'helix',
    params: { dark: 1, highlight: litRef.current ?? -1, alpha: 0.85 },
    pose: { y: 0.85, s: 0.8 },
    mobilePose: { y: 1.6, s: 0.5 },
  }));

  return (
    <section id="laboratory" ref={ref} className="section lab" data-chapter="Laboratory" style={{ paddingTop: 'clamp(300px, 56vh, 560px)' }}>
      <div className="helix-tags" aria-hidden="true">
        {DOMAINS.map((d, i) => (
          <span key={d.id} ref={(el) => (tags.current[i] = el)} className={`helix-tag mono ${lit === i ? 'is-lit' : ''}`}>
            <b>{String(i + 1).padStart(2, '0')}</b>
            <span>{d.name}</span>
          </span>
        ))}
      </div>
      <div className="wrap">
        <div className="lab-head">
          <div>
            <Kicker index="05">Laboratory</Kicker>
            <Lines className="h2" lines={['Six domains.', 'One research programme.']} />
          </div>
          <Fade>
            <Link to="/research" className="btn btn-ghost">
              Enter the lab <Arrow />
            </Link>
          </Fade>
        </div>
        <ul className="domain-list" onMouseLeave={() => setHover(null)}>
          {DOMAINS.map((d, i) => {
            const isOpen = open === i;
            return (
              <Fade as="li" key={d.id} className={`domain ${isOpen ? 'is-open' : ''}`} delay={i * 70}>
                <button
                  className="domain-row"
                  aria-expanded={isOpen}
                  aria-controls={`domain-${d.id}`}
                  onClick={() => setOpen(isOpen ? null : i)}
                  onMouseEnter={() => setHover(i)}
                >
                  <span className="mono num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="domain-name">{d.name}</span>
                  <span className="domain-field">{d.field}</span>
                  <span className="domain-plus" aria-hidden="true" />
                </button>
                <div className="domain-more" id={`domain-${d.id}`}>
                  <div>
                    <div className="domain-more-inner">
                      <p>{d.body}</p>
                      <div className="tags">
                        {d.focus.map((f) => (
                          <span key={f} className="tag mono">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Fade>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
