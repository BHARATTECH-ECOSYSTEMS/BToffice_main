import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useQuiet, useScene } from '../gl/Scene';
import { Eyebrow, Headline } from '../components/ui';
import { CAPABILITIES, CAPABILITY_GROUPS } from '../content';
import type { HueName } from '../gl/palette';

const TONES: HueName[] = ['cobalt', 'violet', 'emerald'];
const LINES = [
  'Read the world in any form: text, images, speech and the web.',
  'Compose agents and workflows that inherit everything the system knows.',
  'Run it on your data, under your governance, from cloud to edge.',
];
const N = CAPABILITIES.length;
const STEP = 360 / N;
/** Screens of scroll per capability. */
const PACE = 0.32;

/**
 * Fifteen capabilities on one wheel. Scrolling turns it, and the capability that comes round to the
 * pointer opens in the card beside it. The wheel's three coloured arcs are the three families.
 */
export function Capabilities() {
  const ref = useRef<HTMLElement>(null);
  const wheel = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { scrollTo } = useScene();
  useQuiet(ref);

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const run = Math.max(1, r.height - window.innerHeight);
      const p = Math.min(1, Math.max(0, -r.top / run));
      const pos = p * (N - 1);
      // settle on each capability for a moment before turning on to the next
      const i = Math.floor(pos);
      const f = pos - i;
      const eased = i + (f < 0.45 ? 0 : f > 0.85 ? 1 : (f - 0.45) / 0.4);
      const k = Math.min(N - 1, eased);
      wheel.current?.style.setProperty('--turn', `${-k * STEP}deg`);
      setActive((a) => (a === Math.round(k) ? a : Math.round(k)));
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
    };
  }, []);

  const go = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    scrollTo(top + ((i + 0.2) / (N - 1)) * (el.offsetHeight - window.innerHeight));
  };

  const cap = CAPABILITIES[active];
  const fam = Math.floor(active / 5);

  return (
    <section id="capabilities" ref={ref} className="wheel-sec" style={{ '--count': N, '--pace': PACE } as CSSProperties}>
      <div className="wheel-pin">
        <div className="wrap wheel-grid">
          <div className="wheel-copy">
            <Eyebrow tone="cobalt">Capabilities</Eyebrow>
            <Headline tone="cobalt" lines={['One intelligence.', 'Fifteen capabilities.']} />

            <div className="wheel-card" style={{ '--tone': `var(--${TONES[fam]})` } as CSSProperties} aria-live="polite">
              <div className="wheel-card-top">
                <span className="wheel-fam">
                  <i />
                  {CAPABILITY_GROUPS[fam]}
                </span>
                <span className="wheel-num">
                  {String(active + 1).padStart(2, '0')} <em>/ {N}</em>
                </span>
              </div>
              <div className="wheel-card-body" key={active}>
                <h3>{cap.name}</h3>
                <p>{cap.body}</p>
              </div>
              <p className="wheel-line">{LINES[fam]}</p>
            </div>

            <ul className="wheel-fams">
              {CAPABILITY_GROUPS.map((g, i) => (
                <li key={g} data-on={i === fam || undefined} style={{ '--tone': `var(--${TONES[i]})` } as CSSProperties}>
                  <button type="button" onClick={() => go(i * 5)}>
                    <i />
                    {g}
                    <span>05</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="wheel" ref={wheel} aria-hidden="true">
          <svg className="wheel-ring" viewBox="-100 -100 200 200">
            <circle r="99.5" className="wheel-outer" />
            {TONES.map((t, i) => (
              <circle
                key={t}
                r="97"
                className="wheel-arc"
                pathLength={360}
                style={{ stroke: `var(--${t})`, strokeDasharray: `${5 * STEP - 3} ${360 - 5 * STEP + 3}`, strokeDashoffset: `${-(i * 5 * STEP - STEP / 2 + 1.5)}` } as CSSProperties}
              />
            ))}
            {Array.from({ length: N * 4 }, (_, k) => {
              const a = (k / (N * 4)) * Math.PI * 2;
              const long = k % 4 === 0;
              return <line key={k} x1={Math.cos(a) * 64} y1={Math.sin(a) * 64} x2={Math.cos(a) * (long ? 58 : 61)} y2={Math.sin(a) * (long ? 58 : 61)} className={long ? 'wheel-tick is-long' : 'wheel-tick'} />;
            })}
            <circle r="50" className="wheel-inner" />
          </svg>
          {CAPABILITIES.map((c, i) => (
            <span key={c.name} className="wheel-chip" data-on={i === active || undefined} style={{ '--a': `${i * STEP}deg`, '--tone': `var(--${TONES[Math.floor(i / 5)]})` } as CSSProperties}>
              <span>
                <b>{String(i + 1).padStart(2, '0')}</b>
                {c.name}
              </span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
