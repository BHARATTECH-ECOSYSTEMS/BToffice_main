import { useRef, useState } from 'react';
import { useFormation, useScene } from '../gl/Scene';
import { Kicker, Lines, Fade } from '../components/Reveal';
import { FLOW } from '../content';

const X = [120, 360, 600, 840, 1080]; // station centres on the 1200-wide diagram
const Y = 196; // the line every request travels along
const SPAN = X[4] - X[0];

const NODE_ICONS = [
  'M-8 0h3M-3-5v10M1-8v16M5-4v8M8 0h1',
  'M-6 0a6 6 0 1 0 1.8-4.3M-6-6.5v3h3',
  'M-8 0h4m0 0l5-5m-5 5l5 5M1-5h6M1 5h6',
  'M1-8h7v7M8-8L-1 1M6 2v5a1 1 0 0 1-1 1h-12a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1h5',
  'M0-8l8 4-8 4-8-4 8-4zM-8 0l8 4 8-4M-8 4l8 4 8-4',
];

/** Station vignettes, each drawn around its own centre (x, 0 = top of the vignette band). */
function Understand({ x }: { x: number }) {
  const inputs = [
    { dx: -66, label: 'Aa' },
    { dx: -22, label: 'mic' },
    { dx: 22, label: 'doc' },
    { dx: 66, label: 'img' },
  ];
  return (
    <g>
      {inputs.map((c) => (
        <g key={c.label}>
          <path className="dg-wire dg-flow" d={`M${x + c.dx} 68 C${x + c.dx} 120, ${x} 120, ${x} 172`} />
          <rect className="dg-chip" x={x + c.dx - 18} y={40} width={36} height={28} rx={8} />
          {c.label === 'Aa' && <text className="dg-chip-text" x={x + c.dx} y={58} textAnchor="middle">Aa</text>}
          {c.label === 'mic' && <path className="dg-glyph" d={`M${x + c.dx} 47v8m-4-3a4 4 0 0 0 8 0M${x + c.dx} 59v3`} />}
          {c.label === 'doc' && <path className="dg-glyph" d={`M${x + c.dx - 5} 46h7l3 3v12h-10zM${x + c.dx - 2} 53h5M${x + c.dx - 2} 57h5`} />}
          {c.label === 'img' && <path className="dg-glyph" d={`M${x + c.dx - 7} 47h14v12h-14zM${x + c.dx - 7} 57l4-4 3 3 2-2 5 3`} />}
        </g>
      ))}
    </g>
  );
}

function Recall({ x }: { x: number }) {
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <g key={i} className={`dg-card ${i === 1 ? 'dg-card-hit' : ''}`} style={{ transformOrigin: `${x}px ${56 + i * 30}px` }}>
          <rect x={x - 70} y={44 + i * 30} width={140} height={24} rx={6} />
          <text x={x - 58} y={60 + i * 30}>{['Survey notes', 'Groundwater study', 'Satellite data'][i]}</text>
        </g>
      ))}
      <path className="dg-wire" d={`M${x} 128 V172`} />
    </g>
  );
}

function Reason({ x }: { x: number }) {
  const leaves = [-64, 0, 64];
  return (
    <g>
      {leaves.map((dx, i) => (
        <g key={dx} className={i === 2 ? 'dg-branch dg-branch-pick' : 'dg-branch'}>
          <path d={`M${x} 172 C${x} 120, ${x + dx} 110, ${x + dx} 72`} />
          <circle cx={x + dx} cy={60} r={12} />
          {i === 2 ? <path className="dg-check" d={`M${x + dx - 5} 60l3 3 6-6`} /> : <path className="dg-cross" d={`M${x + dx - 4} 56l8 8m0-8l-8 8`} />}
        </g>
      ))}
      <text className="dg-note" x={x} y={34} textAnchor="middle">3 plans · 1 chosen</text>
    </g>
  );
}

function Act({ x }: { x: number }) {
  const agents = ['Draft brief', 'Link sources', 'Share'];
  return (
    <g>
      <path className="dg-wire dg-flow" d={`M${x} 136 V172`} />
      <path className="dg-wire" d={`M${x - 38} 56 V124`} />
      {agents.map((a, i) => {
        const y = 44 + i * 34;
        return (
          <g key={a} className="dg-agent" style={{ animationDelay: `${i * 0.25}s` }}>
            <rect x={x - 54} y={y} width={108} height={24} rx={12} />
            <circle cx={x - 38} cy={y + 12} r={4} />
            <text x={x - 26} y={y + 16}>{a}</text>
          </g>
        );
      })}
    </g>
  );
}

function Learn({ x }: { x: number }) {
  return (
    <g className="dg-store">
      <clipPath id="dg-store-clip">
        <path d={`M${x - 40} 50v60a40 12 0 0 0 80 0v-60z`} />
      </clipPath>
      <rect className="dg-store-fill" x={x - 40} y={40} width={80} height={90} clipPath="url(#dg-store-clip)" />
      <path className="dg-store-body" d={`M${x - 40} 50v60a40 12 0 0 0 80 0v-60`} />
      <ellipse className="dg-store-top" cx={x} cy={50} rx={40} ry={12} />
      <path className="dg-wire" d={`M${x} 122 V172`} />
      <text className="dg-note" x={x + 50} y={92}>+ new findings</text>
    </g>
  );
}

const VIGNETTES = [Understand, Recall, Reason, Act, Learn];

/**
 * One request, followed through the system. The section is pinned; scrolling moves the
 * request along the line and each station performs its part as the request arrives.
 */
export function HowItWorks() {
  const ref = useRef<HTMLElement>(null);
  const { scrollTo } = useScene();
  const [active, setActive] = useState(0);
  const last = useRef(0);
  const packet = useRef<SVGGElement>(null);
  const fill = useRef<SVGLineElement>(null);

  useFormation(
    ref,
    { key: 'logo', params: { alpha: 0 } },
    (p) => {
      const t = Math.min(4, Math.max(0, p * 4.4 - 0.2)); // 0…4 along the stations
      const x = X[0] + (t / 4) * SPAN;
      packet.current?.setAttribute('transform', `translate(${x} ${Y})`);
      fill.current?.setAttribute('x2', String(x));
      const s = Math.min(4, Math.max(0, Math.round(t)));
      if (s !== last.current) {
        last.current = s;
        setActive(s);
      }
    },
  );

  const jump = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    scrollTo(top + ((i + 0.25) / 4.4) * (el.offsetHeight - window.innerHeight));
  };

  const step = FLOW[active];

  return (
    <section id="how" ref={ref} className="pin how" data-chapter="How it works">
      <div className="pin-stage">
        <div className="wrap how-stage">
          <header className="how-head">
            <div>
              <Kicker index="04">How it works</Kicker>
              <Lines className="h2" lines={['From a question to an answer.']} />
            </div>
            <Fade as="p" className="body" delay={120}>
              The request from the scenario above, followed through the system. Keep scrolling: five stations, one shared memory
              underneath.
            </Fade>
          </header>

          <svg className="diagram" viewBox="0 0 1200 330" preserveAspectRatio="xMidYMid meet" role="img" aria-label="A request travelling through five stages: understand, recall, reason, act, learn.">
            <defs>
              <marker id="dg-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M2 2l5 3-5 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </marker>
            </defs>

            {VIGNETTES.map((V, i) => (
              <g key={i} className={`dg-station ${i === active ? 'is-active' : ''} ${i < active ? 'is-done' : ''}`}>
                <V x={X[i]} />
              </g>
            ))}

            <path className={`dg-loop ${active === 4 ? 'is-on' : ''}`} d={`M${X[4]} 256 C${X[4]} 316, ${X[1]} 316, ${X[1]} 262`} markerEnd="url(#dg-arrow)" />
            <text className={`dg-loop-label ${active === 4 ? 'is-on' : ''}`} x={(X[1] + X[4]) / 2} y={306} textAnchor="middle">
              What it learns flows back into memory
            </text>

            <line className="dg-rail" x1={40} x2={1160} y1={Y} y2={Y} />
            <line ref={fill} className="dg-rail-fill" x1={40} x2={X[0]} y1={Y} y2={Y} />

            {X.map((x, i) => (
              <g
                key={x}
                className={`dg-node ${i === active ? 'is-active' : ''} ${i < active ? 'is-done' : ''}`}
                transform={`translate(${x} ${Y})`}
                onClick={() => jump(i)}
                role="button"
                aria-label={FLOW[i].step}
              >
                <circle r={24} />
                <path d={NODE_ICONS[i]} />
                <text y={48} textAnchor="middle">
                  {FLOW[i].step}
                </text>
              </g>
            ))}

            <g ref={packet} className="dg-packet" transform={`translate(${X[0]} ${Y})`}>
              <circle r={16} className="dg-packet-ring" />
              <circle r={6} />
            </g>
          </svg>

          {/* Phones: the same journey as a vertical timeline */}
          <ol className="how-list">
            {FLOW.map((f, i) => (
              <li key={f.step}>
                <span className="how-list-node">
                  <svg width="18" height="18" viewBox="-12 -12 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={NODE_ICONS[i]} />
                  </svg>
                </span>
                <div>
                  <p className="how-list-num">Step {i + 1}</p>
                  <h3>{f.step}</h3>
                  <p>{f.body}</p>
                  <p className="how-list-trace">{f.trace}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="how-detail" key={active}>
            <div className="how-step">
              <p className="how-count">
                <b>{String(active + 1).padStart(2, '0')}</b> / 05
              </p>
              <h3 className="h3">{step.step}</h3>
            </div>
            <div className="how-body">
              <p>{step.body}</p>
              <div className="tags">
                {step.powered.map((p) => (
                  <span key={p} className="tag">
                    {p}
                  </span>
                ))}
              </div>
            </div>
            <div className="how-trace">
              <span className="how-trace-head">
                <span className="console-pulse" />
                Trace
              </span>
              <p>{step.trace}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
