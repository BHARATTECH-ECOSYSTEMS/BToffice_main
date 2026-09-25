/** One small generative drawing per research domain: a visual metaphor, drawn in the brand's two colours. */

const W = 320;
const H = 180;

function Rivinity() {
  // three bundles of thought converging on one point: the mark, in motion
  const bundles = [40, 90, 140];
  return (
    <>
      {bundles.map((y0, b) =>
        Array.from({ length: 7 }, (_, i) => {
          const y = y0 + (i - 3) * 4;
          return <path key={`${b}-${i}`} className={i === 3 ? 'da-line da-hot da-flow' : 'da-line'} d={`M-10 ${y} C110 ${y - (b - 1) * 20}, 170 90, 236 90`} />;
        }),
      )}
      <circle className="da-core-ring" cx={236} cy={90} r={16} />
      <circle className="da-core" cx={236} cy={90} r={5} />
    </>
  );
}

function Core() {
  // one layer routing between many systems
  const rings = [30, 52, 74];
  return (
    <>
      {rings.map((r, i) => (
        <ellipse key={r} className="da-line da-spin" cx={160} cy={90} rx={r * 1.7} ry={r * 0.62} style={{ animationDuration: `${18 + i * 8}s` }} />
      ))}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        const r = rings[i % 3];
        return <circle key={i} className="da-node" cx={160 + Math.cos(a) * r * 1.7} cy={90 + Math.sin(a) * r * 0.62} r={3.5} />;
      })}
      <circle className="da-core" cx={160} cy={90} r={9} />
    </>
  );
}

function IoT() {
  // a grid of devices; a signal passes between them
  const pts: [number, number][] = [];
  for (let x = 0; x < 9; x++) for (let y = 0; y < 5; y++) pts.push([40 + x * 30, 30 + y * 30]);
  const route = 'M40 150 L100 150 L100 90 L190 90 L190 30 L280 30';
  return (
    <>
      {pts.map(([x, y]) => (
        <rect key={`${x}-${y}`} className="da-cell" x={x - 3} y={y - 3} width={6} height={6} rx={1.5} />
      ))}
      <path className="da-route" d={route} />
      <circle r={4} className="da-core">
        <animateMotion dur="3.6s" repeatCount="indefinite" path={route} />
      </circle>
    </>
  );
}

function Geo() {
  // contour lines of terrain, with one surveyed point
  return (
    <>
      {Array.from({ length: 11 }, (_, i) => {
        const r = 12 + i * 11;
        const d = Array.from({ length: 49 }, (_, k) => {
          const a = (k / 48) * Math.PI * 2;
          const w = 1 + 0.14 * Math.sin(a * 3 + i * 0.4) + 0.06 * Math.sin(a * 5 + i);
          return `${k ? 'L' : 'M'}${(150 + Math.cos(a) * r * w * 1.3).toFixed(1)} ${(96 + Math.sin(a) * r * w * 0.7).toFixed(1)}`;
        }).join('');
        return <path key={i} className={i % 4 === 0 ? 'da-line da-hot' : 'da-line'} d={d + 'Z'} />;
      })}
      <circle className="da-core-ring da-pulse" cx={188} cy={80} r={10} />
      <circle className="da-core" cx={188} cy={80} r={3.5} />
    </>
  );
}

function Defense() {
  // nested perimeters, a scan sweeping across them
  return (
    <>
      {[70, 52, 34, 16].map((s, i) => (
        <rect key={s} className={i === 0 ? 'da-line da-hot' : 'da-line'} x={160 - s * 1.5} y={90 - s} width={s * 3} height={s * 2} rx={6 + i * 2} />
      ))}
      <rect className="da-scan" x={50} y={18} width={2} height={144} />
      <circle className="da-core" cx={160} cy={90} r={5} />
    </>
  );
}

function Miniature() {
  // a chip: small, local, still connected
  return (
    <>
      {Array.from({ length: 8 }, (_, i) => (
        <g key={i}>
          <line className="da-line" x1={120 + i * 11} x2={120 + i * 11} y1={36} y2={52} />
          <line className="da-line" x1={120 + i * 11} x2={120 + i * 11} y1={128} y2={144} />
        </g>
      ))}
      <rect className="da-chip" x={110} y={52} width={100} height={76} rx={10} />
      <rect className="da-line da-hot" x={136} y={72} width={48} height={36} rx={5} />
      <path className="da-route" d="M210 90 H300" />
      <circle r={3.5} className="da-core">
        <animateMotion dur="2.4s" repeatCount="indefinite" path="M184 90 H300" />
      </circle>
    </>
  );
}

const ARTS = [Rivinity, Core, IoT, Geo, Defense, Miniature];

export function DomainArt({ index }: { index: number }) {
  const Art = ARTS[index % ARTS.length];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" className="domain-art">
      <Art />
    </svg>
  );
}
