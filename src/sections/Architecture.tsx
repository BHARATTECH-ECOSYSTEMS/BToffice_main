import { useState } from 'react';
import { useFormation } from '../gl/Scene';
import { Fade, SectionHead } from '../components/Reveal';
import { useScrollSteps } from '../components/useScrollSteps';
import { Diagram } from '../viz/Diagram';
import { LAYER_DRAWS, LAYER_H, LAYER_LABELS, LAYER_W } from '../viz/layers';
import { LAYERS } from '../content';

const ROW = 40;

/** Nine layers. Scrolling takes a request down the stack; each layer shows what it does. */
export function Architecture() {
  const { ref, active: scrolled, progress, pinned, jump, style } = useScrollSteps<HTMLElement>(LAYERS.length, 28);
  const [picked, setPicked] = useState<number | null>(null);
  const active = pinned ? scrolled : (picked ?? 0);
  useFormation(ref, { key: 'field', params: { alpha: 0 } });
  const L = LAYERS[active];
  const flowY = pinned ? progress * (LAYERS.length - 0.001) * ROW : active * ROW + ROW / 2;

  return (
    <section id="architecture" ref={ref} className={`section arch ${pinned ? 'is-pinned' : ''}`} data-chapter="Architecture" style={style}>
      <div className={pinned ? 'steps-stage' : ''}>
        <div className="wrap">
          <SectionHead
            index="05"
            label="Architecture"
            title={['An operating system,', 'not an application.']}
            lede="Nine layers, one continuous system. Follow a request from the app you use down to sovereign compute."
          />
          <Fade className="stack-wrap">
            <div className="stack">
              <div className="stack-rail" aria-hidden="true">
                <span className="stack-rail-fill" style={{ height: flowY }} />
                <span className="stack-flow" style={{ transform: `translateY(${flowY}px)` }}>
                  <i />
                  <b>Request</b>
                </span>
              </div>
              <ol className="stack-list">
                {LAYERS.map((l, i) => {
                  const width = 64 + (i / (LAYERS.length - 1)) * 36;
                  return (
                    <li key={l.name} style={{ height: ROW }}>
                      <button
                        className={`slab ${i === active ? 'is-active' : ''} ${i < active ? 'is-past' : ''}`}
                        style={{ width: `${width}%` }}
                        onClick={() => (pinned ? jump(i) : setPicked(i))}
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
              <div className="stack-art" key={active}>
                <Diagram draw={LAYER_DRAWS[active]} period={6} w={LAYER_W} h={LAYER_H} label={LAYER_LABELS[active]} still={4.5} />
              </div>
              <div className="stack-copy">
                <span className="num">
                  Layer {String(active + 1).padStart(2, '0')} of {LAYERS.length}
                </span>
                <h3 key={L.name}>{L.name}</h3>
                <p key={L.body}>{L.body}</p>
              </div>
            </div>
          </Fade>
        </div>
      </div>
    </section>
  );
}
