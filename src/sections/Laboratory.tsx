import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { useAnchors } from '../gl/useAnchors';
import { Fade, Arrow, SectionHead } from '../components/Reveal';
import { DOMAINS } from '../content';
import { DomainArt } from '../components/DomainArt';
import { useFormation, worldYOf } from '../gl/Scene';

const HELIX_BAND = 200; // px from the top of the section to the helix axis

/** Six research domains = six segments of the helix. Pointing at a card lights its segment. */
export function Laboratory() {
  const ref = useRef<HTMLElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const lit = hover;
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
      const focus = litRef.current === null || litRef.current === i ? 1 : 0.35;
      el.style.opacity = String(settle * focus);
      el.style.transform = `translate3d(${pts[i].x}px, ${pts[i].y}px, 0) translate(-50%, -100%)`;
    });
  });

  // The helix is part of the page: it scrolls with its band at the top of the section.
  useFormation(ref, () => {
    const y = worldYOf(ref.current, HELIX_BAND);
    return {
      key: 'helix',
      params: { dark: 1, highlight: litRef.current ?? -1, alpha: 0.95 },
      pose: { y, s: 0.76, rz: 0 },
      mobilePose: { y, s: 0.5, rz: 0 },
      follow: 16,
    };
  });

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
          index="07"
          label="Laboratory"
          title={['Six domains.', 'One research programme.']}
          aside={
            <Link to="/research" className="link">
              Enter the lab <Arrow size={13} />
            </Link>
          }
        />
        <div className="lab-grid" onMouseLeave={() => setHover(null)}>
          {DOMAINS.map((d, i) => (
            <Fade key={d.id} delay={(i % 3) * 80}>
              <Link
                to="/research"
                className={`lab-card ${lit === i ? 'is-lit' : ''}`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              >
                <div className="lab-card-art">
                  <DomainArt index={i} />
                  <span className="lab-card-num">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <div className="lab-card-text">
                  <p className="lab-card-field">{d.field}</p>
                  <h3>{d.name}</h3>
                  <p className="lab-card-body">{d.body}</p>
                  <div className="tags">
                    {d.focus.slice(0, 3).map((f) => (
                      <span key={f} className="tag">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            </Fade>
          ))}
        </div>
      </div>
    </section>
  );
}
