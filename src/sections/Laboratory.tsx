import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { useFormation } from '../gl/Scene';
import { useAnchors } from '../gl/useAnchors';
import { Fade, Arrow, SectionHead } from '../components/Reveal';
import { DOMAINS } from '../content';

/** Six research domains = six segments of the helix. Opening one lights its segment. */
export function Laboratory() {
  const ref = useRef<HTMLElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const lit = hover ?? open;
  const litRef = useRef(lit);
  litRef.current = lit;

  const recede = useRef(0);
  const tags = useRef<(HTMLSpanElement | null)[]>([]);
  useAnchors(['helix'], (pts, settle) => {
    tags.current.forEach((el, i) => {
      if (!el) return;
      if (!pts) {
        el.style.opacity = '0';
        return;
      }
      const focus = litRef.current === null ? 1 - recede.current : litRef.current === i ? 1 : 0.3;
      el.style.opacity = String(settle * focus);
      el.style.transform = `translate3d(${pts[i].x}px, ${pts[i].y}px, 0) translate(-50%, -100%)`;
    });
  });

  // The helix owns the top of the section, then steps back once the reading starts.
  useFormation(
    ref,
    () => ({
      key: 'helix',
      params: { dark: 1, highlight: litRef.current ?? -1, alpha: 0.9 - recede.current * 0.72 },
      pose: { y: 0.95, s: 0.76 },
      mobilePose: { y: 1.6, s: 0.5 },
    }),
    (p) => {
      recede.current = litRef.current === null ? Math.min(1, Math.max(0, (p - 0.2) / 0.14)) : 0.4;
    },
  );

  return (
    <section id="laboratory" ref={ref} className="section lab" data-chapter="Laboratory">
      <div className="helix-tags" aria-hidden="true">
        {DOMAINS.map((d, i) => (
          <span key={d.id} ref={(el) => (tags.current[i] = el)} className={`helix-tag ${lit === i ? 'is-lit' : ''}`}>
            <b>{String(i + 1).padStart(2, '0')}</b>
            <span>{d.name}</span>
          </span>
        ))}
      </div>
      <div className="wrap">
        <SectionHead
          index="05"
          label="Laboratory"
          title={['Six domains.', 'One research programme.']}
          aside={
            <Link to="/research" className="link">
              Enter the lab <Arrow size={13} />
            </Link>
          }
        />
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
                  <span className="num">{String(i + 1).padStart(2, '0')}</span>
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
                          <span key={f} className="tag">
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
