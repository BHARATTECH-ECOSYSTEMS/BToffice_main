import { useEffect, useState, type CSSProperties } from 'react';
import { Typewriter } from './fx';
import { useInView } from './ui';
import { INDIA, INDIA_BBOX } from '../gl/geo';

// Product-style motion graphics. Each one is an honest illustration of what a capability does,
// drawn in code so it stays sharp at any size and costs nothing to load.

/** Cycles 0…n-1 every `ms` while `on`. */
function useCycle(n: number, ms: number, on = true) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!on) return;
    const id = window.setInterval(() => setI((x) => (x + 1) % n), ms);
    return () => window.clearInterval(id);
  }, [n, ms, on]);
  return i;
}

// ── Understand: intent-aware search over everything the system remembers ─────────────────────────

const RESULTS = [
  { title: 'Groundwater study · 40 districts', src: 'Memory', score: 96 },
  { title: 'Survey notes, field round 2', src: 'Docs', score: 88 },
  { title: 'Sentinel-2 tiles, Mar → Sep', src: 'Vision', score: 81 },
  { title: 'Team call: “flag the critical ones”', src: 'Voice', score: 74 },
];

export function SearchArt() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [typed, setTyped] = useState(false);
  return (
    <div ref={ref} className="ui-card search-art">
      <div className="ui-bar">
        <span className="ui-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="ui-title">origin · search</span>
      </div>
      <div className="search-field">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4" />
        </svg>
        <Typewriter text="districts we flagged as critical" run={inView} onDone={() => setTyped(true)} />
        <kbd>⏎</kbd>
      </div>
      <ul className="search-results" data-on={typed || undefined}>
        {RESULTS.map((r, i) => (
          <li key={r.title} style={{ '--i': i, '--w': `${r.score}%` } as CSSProperties}>
            <span className="sr-src">{r.src}</span>
            <span className="sr-title">{r.title}</span>
            <span className="sr-score">
              <b />
              {r.score}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Build: agents and workflows as a live graph ─────────────────────────────────────────────────

const NODES = [
  { id: 'trigger', label: 'New imagery', kind: 'Trigger', x: 8, y: 18 },
  { id: 'memory', label: 'Recall study', kind: 'Memory', x: 8, y: 62 },
  { id: 'agent', label: 'Compare & flag', kind: 'Agent', x: 40, y: 40 },
  { id: 'brief', label: 'Draft brief', kind: 'Workflow', x: 72, y: 18 },
  { id: 'share', label: 'Share with team', kind: 'Action', x: 72, y: 62 },
];
const EDGES: [number, number][] = [
  [0, 2],
  [1, 2],
  [2, 3],
  [2, 4],
];

export function WorkflowArt() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const step = useCycle(EDGES.length + 1, 900, inView);
  return (
    <div ref={ref} className="ui-card flow-art">
      <div className="ui-bar">
        <span className="ui-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="ui-title">agent builder · groundwater-watch</span>
        <span className="ui-live">
          <i /> running
        </span>
      </div>
      <div className="flow-canvas">
        <svg viewBox="0 0 100 80" preserveAspectRatio="none" aria-hidden="true">
          {EDGES.map(([a, b], i) => {
            const A = NODES[a];
            const B = NODES[b];
            const x1 = A.x + 20;
            const y1 = A.y + 7;
            const x2 = B.x;
            const y2 = B.y + 7;
            const d = `M${x1} ${y1} C${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${y2} ${x2} ${y2}`;
            return (
              <g key={i} data-on={step > i || undefined}>
                <path d={d} className="flow-edge" vectorEffect="non-scaling-stroke" />
                <path d={d} className="flow-edge-live" vectorEffect="non-scaling-stroke" />
              </g>
            );
          })}
        </svg>
        {NODES.map((n, i) => {
          const lit = i === 2 ? step >= 2 : i < 2 ? step >= 1 : step >= (i === 3 ? 3 : 4);
          return (
            <div key={n.id} className="flow-node" data-on={lit || undefined} style={{ left: `${n.x}%`, top: `${(n.y / 80) * 100}%` }}>
              <small>{n.kind}</small>
              <b>{n.label}</b>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Operate: deployments you can watch ──────────────────────────────────────────────────────────

const SERIES = [32, 38, 35, 44, 41, 52, 49, 58, 55, 63, 60, 71, 68, 76, 73, 82];

export function MetricsArt() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const w = 300;
  const h = 110;
  const pts = SERIES.map((v, i) => [(i / (SERIES.length - 1)) * w, h - (v / 90) * h] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
  const area = `${line}L${w} ${h}L0 ${h}Z`;
  const tick = useCycle(1000, 1600, inView);
  const regions = ['Delhi', 'Mumbai', 'Bengaluru', 'Edge'];
  return (
    <div ref={ref} className="ui-card metrics-art" data-in={inView || undefined}>
      <div className="ui-bar">
        <span className="ui-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="ui-title">operate · rivinity-core</span>
        <span className="ui-live">
          <i /> live
        </span>
      </div>
      <div className="metrics-head">
        <div>
          <small>Context recalled</small>
          <b>{(96.4 + ((tick * 7) % 9) / 10).toFixed(1)}%</b>
        </div>
        <div>
          <small>Median latency</small>
          <b>{180 + ((tick * 13) % 24)} ms</b>
        </div>
      </div>
      <svg className="metrics-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
        {[0.25, 0.5, 0.75].map((k) => (
          <line key={k} x1="0" x2={w} y1={h * k} y2={h * k} className="metrics-grid" />
        ))}
        <path d={area} fill="#5b3df5" fillOpacity="0.1" className="metrics-area" />
        <path d={line} className="metrics-line" pathLength={1} vectorEffect="non-scaling-stroke" />
      </svg>
      <ul className="metrics-regions">
        {regions.map((r, i) => (
          <li key={r} style={{ '--i': i } as CSSProperties}>
            <i />
            {r}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Architecture: nine layers as a stack of plates, each engraved with what it does ───────────────

const INDIA_PATH = (() => {
  const { minLon, maxLon, minLat, maxLat } = INDIA_BBOX;
  const k = 190 / Math.max(maxLon - minLon, maxLat - minLat);
  return (
    INDIA.map(([lon, lat], i) => `${i ? 'L' : 'M'}${(150 + (lon - (minLon + maxLon) / 2) * k).toFixed(1)} ${(150 - (lat - (minLat + maxLat) / 2) * k).toFixed(1)}`).join('') + 'Z'
  );
})();

/** The drawing on each plate's face, in a 300 × 300 square. Lines take the plate's ink colour. */
export function PlateArt({ i }: { i: number }) {
  switch (i) {
    case 0: // Applications: the windows people work in
      return (
        <g>
          {[
            [40, 46, 130, 96],
            [130, 120, 130, 96],
            [52, 174, 96, 82],
            [196, 50, 64, 54],
          ].map(([x, y, w, h], k) => (
            <g key={k}>
              <rect x={x} y={y} width={w} height={h} rx="10" className="pl-fill" />
              <path d={`M${x} ${y + 18}H${x + w}`} />
              <circle cx={x + 10} cy={y + 9} r="2.5" className="pl-dot" />
              <path d={`M${x + 12} ${y + 34}H${x + w * 0.7}M${x + 12} ${y + 46}H${x + w * 0.5}`} className="pl-thin" />
            </g>
          ))}
        </g>
      );
    case 1: // Reasoning: a plan that branches and converges
      return (
        <g>
          <path d="M150 52V96M150 96L76 150M150 96V150M150 96L224 150M76 150L110 216M150 150V216M224 150L190 216M110 216L150 254M150 216V254M190 216L150 254" />
          {[
            [150, 52, 14],
            [76, 150, 11],
            [150, 150, 11],
            [224, 150, 11],
            [110, 216, 9],
            [150, 216, 9],
            [190, 216, 9],
            [150, 254, 13],
          ].map(([x, y, r], k) => (
            <circle key={k} cx={x} cy={y} r={r} className={k === 0 || k === 7 ? 'pl-solid' : 'pl-fill'} />
          ))}
        </g>
      );
    case 2: // Memory: sessions laid down over time, none of them lost
      return (
        <g>
          <path d="M40 240C80 236 96 200 130 196S190 160 214 130 240 70 262 56" strokeDasharray="4 6" />
          {[
            [40, 240],
            [96, 208],
            [150, 186],
            [204, 140],
            [250, 66],
          ].map(([x, y], k) => (
            <g key={k}>
              <rect x={x - 22} y={y - 34} width="44" height="26" rx="6" className="pl-fill" />
              <path d={`M${x - 14} ${y - 25}H${x + 10}M${x - 14} ${y - 17}H${x + 2}`} className="pl-thin" />
              <circle cx={x} cy={y} r="5" className="pl-solid" />
            </g>
          ))}
        </g>
      );
    case 3: // Knowledge: a living graph
      return (
        <g>
          {[
            [150, 150, 80, 84],
            [150, 150, 226, 92],
            [150, 150, 92, 222],
            [150, 150, 214, 220],
            [80, 84, 150, 46],
            [226, 92, 150, 46],
            [80, 84, 44, 160],
            [92, 222, 44, 160],
            [214, 220, 258, 160],
            [226, 92, 258, 160],
            [92, 222, 150, 262],
            [214, 220, 150, 262],
          ].map(([a, b, c, d], k) => (
            <line key={k} x1={a} y1={b} x2={c} y2={d} />
          ))}
          {[
            [80, 84],
            [226, 92],
            [92, 222],
            [214, 220],
            [150, 46],
            [44, 160],
            [258, 160],
            [150, 262],
          ].map(([x, y], k) => (
            <circle key={k} cx={x} cy={y} r={k < 4 ? 12 : 8} className="pl-fill" />
          ))}
          <circle cx="150" cy="150" r="20" className="pl-solid" />
        </g>
      );
    case 4: // Research: a lens over satellite tiles
      return (
        <g>
          {Array.from({ length: 5 }, (_, r) =>
            Array.from({ length: 5 }, (_, c) => <rect key={`${r}${c}`} x={36 + c * 46} y={36 + r * 46} width="38" height="38" rx="5" className={(r * 5 + c) % 7 === 3 ? 'pl-solid' : 'pl-fill'} />),
          )}
          <circle cx="176" cy="132" r="54" className="pl-lens" />
          <path d="M214 170L254 210" className="pl-bold" />
        </g>
      );
    case 5: // Security: boundaries within boundaries, a lock at the centre
      return (
        <g>
          <rect x="34" y="34" width="232" height="232" rx="22" strokeDasharray="6 7" />
          <rect x="76" y="76" width="148" height="148" rx="16" />
          <rect x="128" y="146" width="44" height="36" rx="6" className="pl-solid" />
          <path d="M138 146v-12a12 12 0 0 1 24 0v12" className="pl-bold" />
        </g>
      );
    case 6: // Infrastructure: one job split across workers
      return (
        <g>
          <rect x="120" y="40" width="60" height="40" rx="8" className="pl-solid" />
          {[46, 112, 178, 244].map((x, k) => (
            <g key={k}>
              <path d={`M150 80C150 120 ${x} 110 ${x} 150`} />
              <rect x={x - 26} y="150" width="52" height="40" rx="8" className="pl-fill" />
              <path d={`M${x} 190V230`} strokeDasharray="3 5" />
            </g>
          ))}
          <rect x="40" y="230" width="220" height="34" rx="8" className="pl-fill" />
        </g>
      );
    case 7: // Compute: an accelerator die
      return (
        <g>
          <rect x="70" y="70" width="160" height="160" rx="16" className="pl-fill" />
          {Array.from({ length: 4 }, (_, r) =>
            Array.from({ length: 4 }, (_, c) => <rect key={`${r}${c}`} x={92 + c * 30} y={92 + r * 30} width="22" height="22" rx="4" className={r === c ? 'pl-solid' : 'pl-fill'} />),
          )}
          {Array.from({ length: 6 }, (_, k) => (
            <path key={k} d={`M${88 + k * 25} 70V44M${88 + k * 25} 230V256M70 ${88 + k * 25}H44M230 ${88 + k * 25}H256`} />
          ))}
        </g>
      );
    default: // Sovereign cloud: it runs, and stays, in India
      return (
        <g>
          <path d={INDIA_PATH} className="pl-fill" />
          {[
            [138, 112],
            [104, 164],
            [140, 218],
            [182, 158],
          ].map(([x, y], k) => (
            <g key={k}>
              <circle cx={x} cy={y} r="14" className="pl-ring" />
              <circle cx={x} cy={y} r="6" className="pl-solid" />
            </g>
          ))}
        </g>
      );
  }
}

/** Nine plates in an isometric stack. The plate being read lifts clear of the others, its drawing in full colour. */
export function LayerStack({ names, active, tones }: { names: string[]; active: number; tones: string[] }) {
  return (
    <div className="stack" aria-hidden="true">
      <div className="stack-scene">
        {names.map((n, i) => (
          <div
            key={n}
            className="stack-plate"
            data-on={i === active || undefined}
            data-above={i < active || undefined}
            style={{ '--i': i, '--n': names.length, '--tone': tones[i] } as CSSProperties}
          >
            <svg viewBox="0 0 300 300" className="plate-art">
              <PlateArt i={i} />
            </svg>
            <span className="stack-chip">
              {String(i + 1).padStart(2, '0')}
              <b>{n}</b>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Research domains: one living diagram each ───────────────────────────────────────────────────

export function DomainArt({ index }: { index: number }) {
  const common = { viewBox: '0 0 200 140', className: `domain-art art-${index}`, 'aria-hidden': true } as const;
  switch (index) {
    case 0: // GI Rivinity: memory that compounds, rings of context around a core
      return (
        <svg {...common}>
          {[16, 30, 44, 58].map((r, i) => (
            <circle key={r} cx="100" cy="70" r={r} className="ring" style={{ '--i': i } as CSSProperties} />
          ))}
          {Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2;
            const r = 30 + (i % 3) * 14;
            return <circle key={i} cx={100 + Math.cos(a) * r} cy={70 + Math.sin(a) * r} r="2.6" className="orbit-dot" style={{ '--i': i } as CSSProperties} />;
          })}
          <circle cx="100" cy="70" r="7" className="core" />
        </svg>
      );
    case 1: // Rivinity Core: routing across a fabric of systems
      return (
        <svg {...common}>
          {Array.from({ length: 4 }, (_, r) =>
            Array.from({ length: 6 }, (_, c) => <circle key={`${r}${c}`} cx={25 + c * 30} cy={25 + r * 30} r="3" className="grid-dot" />),
          )}
          <path d="M25 25H85V55H145V85H175" className="route" />
          <path d="M25 115H55V85H115V25H175" className="route is-b" />
        </svg>
      );
    case 2: // IoT: sensors that report in
      return (
        <svg {...common}>
          {[
            [40, 40],
            [160, 36],
            [56, 108],
            [150, 104],
            [100, 22],
          ].map(([x, y], i) => (
            <g key={i} style={{ '--i': i } as CSSProperties}>
              <line x1={x} y1={y} x2="100" y2="72" className="link" />
              <circle cx={x} cy={y} r="10" className="ping" />
              <rect x={x - 4} y={y - 4} width="8" height="8" rx="2" className="sensor" />
            </g>
          ))}
          <rect x="88" y="60" width="24" height="24" rx="6" className="hub" />
        </svg>
      );
    case 3: // Geo: terrain read from above
      return (
        <svg {...common}>
          {Array.from({ length: 7 }, (_, i) => (
            <path
              key={i}
              className="contour"
              style={{ '--i': i } as CSSProperties}
              d={`M-10 ${30 + i * 15} C40 ${14 + i * 15 + (i % 2) * 12} 80 ${48 + i * 13} 120 ${30 + i * 15} S180 ${18 + i * 15} 210 ${34 + i * 14}`}
            />
          ))}
          <circle cx="132" cy="62" r="5" className="marker" />
          <circle cx="132" cy="62" r="12" className="ping" />
        </svg>
      );
    case 4: // Defense: a watch that never sleeps
      return (
        <svg {...common}>
          {[18, 36, 54].map((r) => (
            <circle key={r} cx="100" cy="70" r={r} className="ring" />
          ))}
          <line x1="46" y1="70" x2="154" y2="70" className="ring" />
          <line x1="100" y1="16" x2="100" y2="124" className="ring" />
          <g className="sweep">
            <path d="M100 70 L100 16 A54 54 0 0 1 146 42 Z" />
          </g>
          <circle cx="128" cy="50" r="3" className="blip" />
          <circle cx="72" cy="96" r="3" className="blip is-b" />
        </svg>
      );
    default: // Miniature: a model small enough for the chip in your pocket
      return (
        <svg {...common}>
          <rect x="70" y="40" width="60" height="60" rx="10" className="chip" />
          <rect x="84" y="54" width="32" height="32" rx="5" className="die" />
          {Array.from({ length: 5 }, (_, i) => (
            <g key={i} style={{ '--i': i } as CSSProperties}>
              <path d={`M${78 + i * 11} 40V20`} className="pin" />
              <path d={`M${78 + i * 11} 100V120`} className="pin" />
              <path d={`M70 ${48 + i * 11}H48`} className="pin" />
              <path d={`M130 ${48 + i * 11}H152`} className="pin" />
            </g>
          ))}
        </svg>
      );
  }
}

// ── Publication covers: a drawing of what each essay is about, white on one flat colour ─────────

const COVER_TONES = ['#5b3df5', '#2e5bff', '#0fa874', '#e08a00', '#ff5fa2', '#ff7438'];

function CoverArt({ kind }: { kind: number }) {
  switch (kind) {
    case 0: // why AI must remember: sessions on a line, each one carried into the next
      return (
        <g>
          <path d="M30 120H290" className="cv-dash" />
          {[40, 112, 184, 256].map((x, k) => (
            <g key={x} className="cv-pop" style={{ '--k': k } as CSSProperties}>
              <rect x={x - 26} y="58" width="52" height="40" rx="8" className={k === 3 ? 'cv-solid' : 'cv-soft'} />
              <path d={`M${x - 16} 72H${x + 12}M${x - 16} 82H${x + 4}`} className={k === 3 ? 'cv-ink' : ''} />
              <circle cx={x} cy="120" r="5" className="cv-solid" />
              {k < 3 && <path d={`M${x + 26} 78C${x + 40} 78 ${x + 32} 78 ${x + 46} 78`} />}
            </g>
          ))}
        </g>
      );
    case 1: // generative intelligence is not generative AI: content on one side, capability on the other
      return (
        <g>
          {[0, 1, 2, 3, 4].map((k) => (
            <path key={k} d={`M40 ${52 + k * 16}H${120 - (k % 2) * 26}`} className="cv-pop" style={{ '--k': k } as CSSProperties} />
          ))}
          <path d="M152 74l16 16M168 74l-16 16" className="cv-bold" />
          {[
            [228, 56],
            [270, 92],
            [206, 124],
            [252, 136],
          ].map(([x, y], k) => (
            <g key={k}>
              <line x1="236" y1="96" x2={x} y2={y} />
              <circle cx={x} cy={y} r="8" className="cv-soft cv-pop" style={{ '--k': k } as CSSProperties} />
            </g>
          ))}
          <circle cx="236" cy="96" r="12" className="cv-solid" />
        </g>
      );
    case 2: // intelligence in the physical world: sensors reporting to a hub
      return (
        <g>
          {[
            [56, 50],
            [264, 44],
            [70, 138],
            [252, 132],
            [160, 28],
            [160, 156],
          ].map(([x, y], k) => (
            <g key={k}>
              <line x1={x} y1={y} x2="160" y2="90" className="cv-dash" />
              <circle cx={x} cy={y} r="13" className="cv-ping" style={{ '--k': k } as CSSProperties} />
              <rect x={x - 6} y={y - 6} width="12" height="12" rx="3" className="cv-solid" />
            </g>
          ))}
          <rect x="140" y="70" width="40" height="40" rx="10" className="cv-solid" />
        </g>
      );
    case 3: // reasoning at planetary scale: a globe, its grid and one marked region
      return (
        <g>
          <circle cx="160" cy="90" r="64" className="cv-soft" />
          <ellipse cx="160" cy="90" rx="26" ry="64" />
          <ellipse cx="160" cy="90" rx="50" ry="64" />
          <path d="M96 90H224M104 58H216M104 122H216" />
          <circle cx="182" cy="70" r="7" className="cv-solid" />
          <circle cx="182" cy="70" r="16" className="cv-ping" />
        </g>
      );
    case 4: // edge AI: a model small enough for the phone
      return (
        <g>
          <rect x="132" y="22" width="56" height="136" rx="12" className="cv-soft" />
          <rect x="146" y="72" width="28" height="28" rx="6" className="cv-solid" />
          {[0, 1, 2, 3].map((k) => (
            <path key={k} d={`M${150 + k * 7} 72v-8M${150 + k * 7} 100v8`} />
          ))}
          <path d="M60 90h50M210 90h50" className="cv-dash" />
          <circle cx="56" cy="90" r="6" className="cv-solid" />
          <circle cx="264" cy="90" r="6" className="cv-solid" />
        </g>
      );
    default: // infrastructure, not applications: the layers under everything
      return (
        <g>
          {[0, 1, 2, 3].map((k) => (
            <path
              key={k}
              d={`M160 ${36 + k * 24}L236 ${66 + k * 24}L160 ${96 + k * 24}L84 ${66 + k * 24}Z`}
              className={`cv-pop ${k === 3 ? 'cv-solid' : 'cv-soft'}`}
              style={{ '--k': 3 - k } as CSSProperties}
            />
          ))}
        </g>
      );
  }
}

export function Cover({ index, label }: { index: number; label: string }) {
  return (
    <div className="cover" style={{ '--tone': COVER_TONES[index % COVER_TONES.length] } as CSSProperties}>
      <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <CoverArt kind={index % 6} />
      </svg>
      <span className="cover-tag">{label}</span>
    </div>
  );
}
