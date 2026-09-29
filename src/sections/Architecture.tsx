import { useEffect, useRef, useState } from 'react';
import { useFormation } from '../gl/Scene';
import { useInView, Fade, SectionHead } from '../components/Reveal';
import { LAYERS } from '../content';

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const ROW = 46;

/** Nine layers as a real stack. A request travels down it and intelligence comes back up. */
export function Architecture() {
  const ref = useRef<HTMLElement>(null);
  const [stackRef, inView] = useInView<HTMLOListElement>({ once: false, margin: '0px 0px -10% 0px' });
  const [step, setStep] = useState({ i: 0, dir: 1 as 1 | -1 });
  const [hover, setHover] = useState<number | null>(null);
  useFormation(ref, { key: 'field', params: { alpha: 0 } });

  useEffect(() => {
    if (!inView || hover !== null || reduced()) return;
    const id = setInterval(() => {
      setStep((s) => {
        const next = s.i + s.dir;
        if (next > LAYERS.length - 1) return { i: LAYERS.length - 1, dir: -1 };
        if (next < 0) return { i: 0, dir: 1 };
        return { i: next, dir: s.dir };
      });
    }, 950);
    return () => clearInterval(id);
  }, [inView, hover]);

  const active = hover ?? step.i;
  const down = hover === null ? step.dir === 1 : true;
  const L = LAYERS[active];

  return (
    <section id="architecture" ref={ref} className="section arch" data-chapter="Architecture">
      <div className="wrap">
        <SectionHead
          index="05"
          label="Architecture"
          title={['An operating system,', 'not an application.']}
          lede="Nine layers, one continuous system. A request travels down to sovereign compute, and intelligence comes back up to the application."
        />
        <Fade className="stack-wrap">
          <div className="stack">
            <div className="stack-rail" aria-hidden="true">
              <span className="stack-flow" data-dir={down ? 'down' : 'up'} style={{ transform: `translateY(${active * ROW + ROW / 2}px)` }}>
                <i />
                <b>{hover !== null ? 'Selected' : down ? 'Request' : 'Intelligence'}</b>
              </span>
            </div>
            <ol ref={stackRef} className="stack-list" onMouseLeave={() => setHover(null)}>
              {LAYERS.map((l, i) => {
                const width = 64 + (i / (LAYERS.length - 1)) * 36;
                return (
                  <li key={l.name} style={{ height: ROW }}>
                    <button
                      className={`slab ${i === active ? 'is-active' : ''} ${i < active ? 'is-past' : ''}`}
                      style={{ width: `${width}%` }}
                      onMouseEnter={() => setHover(i)}
                      onFocus={() => setHover(i)}
                      onBlur={() => setHover(null)}
                      onClick={() => setHover(i)}
                    >
                      <span className="num">{String(i + 1).padStart(2, '0')}</span>
                      <span className="name">{l.name}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
          <div className="stack-detail" aria-live="polite">
            <span className="num">Layer {String(active + 1).padStart(2, '0')} of {LAYERS.length}</span>
            <h3 key={L.name}>{L.name}</h3>
            <p key={L.body}>{L.body}</p>
            <dl>
              <div>
                <dt>Serves</dt>
                <dd>{active === 0 ? 'People and organisations' : LAYERS[active - 1].name}</dd>
              </div>
              <div>
                <dt>Rests on</dt>
                <dd>{active === LAYERS.length - 1 ? 'National infrastructure' : LAYERS[active + 1].name}</dd>
              </div>
            </dl>
          </div>
        </Fade>
      </div>
    </section>
  );
}
