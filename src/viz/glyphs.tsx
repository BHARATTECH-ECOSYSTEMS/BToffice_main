import type { ReactNode } from 'react';

/**
 * One small structure per architecture layer, drawn in the layer's own form: app tiles, a branching plan,
 * stacked memory, a graph, a lens over sources, a shield, pipes, a chip and a foundation.
 * They are still until their layer is active; then CSS (.glyph .g-*) sets them moving.
 */
const G: ReactNode[] = [
  /* 01 Applications: three app windows */
  <>
    {[0, 1, 2].map((k) => (
      <g key={k} className="g-pop" style={{ animationDelay: `${k * 0.12}s` }}>
        <rect x={4 + k * 21} y={5} width={17} height={14} rx={3.5} />
        <line x1={7 + k * 21} x2={12 + k * 21} y1={9} y2={9} />
      </g>
    ))}
  </>,
  /* 02 Reasoning Engine: a question branching into a plan */
  <>
    <circle cx={8} cy={12} r={3} className="g-fill" />
    <path d="M11 12C20 12 20 5 29 5M11 12H29M11 12C20 12 20 19 29 19" className="g-draw" />
    <circle cx={32} cy={5} r={2.4} />
    <circle cx={32} cy={12} r={2.4} />
    <circle cx={32} cy={19} r={2.4} />
    <path d="M35 5H44M35 12H50M35 19H47" className="g-dash" />
  </>,
  /* 03 Memory Engine: stacked records */
  <>
    {[0, 1, 2].map((k) => (
      <ellipse key={k} cx={32} cy={7 + k * 5} rx={24} ry={3.4} className={k === 1 ? 'g-fill g-bob' : 'g-bob'} style={{ animationDelay: `${k * 0.15}s` }} />
    ))}
  </>,
  /* 04 Knowledge Engine: a small graph */
  <>
    <path d="M8 16L20 6L34 14L46 5L56 17M20 6L26 19L34 14M46 5L44 19" className="g-draw" />
    {[[8, 16], [20, 6], [34, 14], [46, 5], [56, 17], [26, 19], [44, 19]].map(([x, y], k) => (
      <circle key={k} cx={x} cy={y} r={k === 2 ? 3 : 2.2} className={k === 2 ? 'g-fill g-pulse' : ''} />
    ))}
  </>,
  /* 05 Research Engine: a lens passing over sources */
  <>
    {[0, 1, 2].map((k) => (
      <line key={k} x1={4} x2={40 - k * 6} y1={6 + k * 6} y2={6 + k * 6} className="g-dash" />
    ))}
    <g className="g-scan">
      <circle cx={48} cy={11} r={6} />
      <path d="M52.5 15.5L57 20" />
    </g>
  </>,
  /* 06 Security Layer: a shield inside two boundaries */
  <>
    <rect x={3} y={3} width={58} height={18} rx={9} className="g-dash" />
    <rect x={14} y={6} width={36} height={12} rx={6} />
    <path d="M32 6.5l5 1.8v3.2c0 3-2.2 5-5 6-2.8-1-5-3-5-6V8.3z" className="g-fill g-pulse" />
  </>,
  /* 07 Infrastructure Layer: lanes with work moving along them */
  <>
    {[0, 1, 2].map((k) => (
      <g key={k}>
        <line x1={4} x2={60} y1={6 + k * 6} y2={6 + k * 6} />
        <rect x={4} y={4 + k * 6} width={9} height={4} rx={2} className="g-fill g-run" style={{ animationDelay: `${k * 0.35}s` }} />
      </g>
    ))}
  </>,
  /* 08 Compute Layer: a processor with its pins */
  <>
    <rect x={20} y={4} width={24} height={16} rx={3} />
    <rect x={26} y={8} width={12} height={8} rx={1.5} className="g-fill g-pulse" />
    {[0, 1, 2, 3].map((k) => (
      <g key={k}>
        <line x1={24 + k * 5.5} x2={24 + k * 5.5} y1={1} y2={4} />
        <line x1={24 + k * 5.5} x2={24 + k * 5.5} y1={20} y2={23} />
      </g>
    ))}
    <line x1={4} x2={20} y1={12} y2={12} className="g-dash" />
    <line x1={44} x2={60} y1={12} y2={12} className="g-dash" />
  </>,
  /* 09 Sovereign Cloud: a dome over a foundation */
  <>
    <path d="M14 17C14 7 22 3 32 3S50 7 50 17" className="g-draw" />
    <rect x={4} y={17} width={56} height={5} rx={2} className="g-fill" />
    {[0, 1, 2].map((k) => (
      <rect key={k} x={21 + k * 8} y={10} width={6} height={7} rx={1.2} className="g-pop" style={{ animationDelay: `${k * 0.12}s` }} />
    ))}
  </>,
];

export function LayerGlyph({ i }: { i: number }) {
  return (
    <svg className="glyph" viewBox="0 0 64 24" aria-hidden="true">
      {G[i]}
    </svg>
  );
}
