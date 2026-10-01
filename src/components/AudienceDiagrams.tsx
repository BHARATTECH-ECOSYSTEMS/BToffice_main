import {
  DiagramText,
  Badge,
  DiagramIcon,
  PillLabel,
  X,
  type Tone,
  lerp,
  norm,
  smooth,
  easeInOutCubic,
  easeOutCubic,
  easeOutBack,
  pulse,
} from './BentoDiagrams';

/* ── 08 Who it’s for Diagrams ────────────────────────────────────────────── */

/** 01. Researchers: long-term memory across months */
function drawResearchers(n: number) {
  const safeN = Number.isFinite(n) ? Math.max(0, n) : 0;
  const s = 1 - smooth(norm(safeN, 7.4, 8.0));
  const o = [56, 126, 196, 266, 336];
  const i = ['Sources', 'Hypothesis', 'Experiment', 'Dead end', 'Result'];
  const ol: Tone[] = ['tango', 'pitch', 'violet', 'tango', 'pitch'];
  const l = norm(safeN, 4.6, 6.2);

  return (
    <g style={{ opacity: s }}>
      <line x1={28} x2={372} y1={98} y2={98} style={{ stroke: 'var(--line-strong)', strokeWidth: 1.4 }} />
      {o.map((u, d) => {
        const p = easeOutBack(norm(safeN, 0.4 + d * 0.7, 0.9 + d * 0.7));
        const f = pulse(safeN, 4.8 + d * 0.25, 6.6, 0.2);
        return (
          <g key={d}>
            <circle cx={u} cy={98} r={3.5} style={{ fill: 'var(--ink-3)' }} />
            <Badge
              x={u}
              y={d % 2 ? 44 : 74}
              tone={ol[d % ol.length]}
              text={i[d % i.length]}
              s={(0.6 + 0.4 * p) * (1 + f * 0.06)}
              a={p}
              size={9.5}
            />
            <DiagramText x={u} y={118} text={`Month ${d + 1}`} size={9.5} a={p} />
          </g>
        );
      })}
      <PillLabel x={200} y={140} text="Picks up where you left off" tone="violet" a={smooth(l)} />
    </g>
  );
}

/** 02. Developers: single API reaching memory, reasoning and agents */
function drawDevelopers(n: number) {
  const safeN = Number.isFinite(n) ? Math.max(0, n) : 0;
  const s = 1 - smooth(norm(safeN, 7.4, 8.0));
  const o = safeN % 4;
  const i = easeInOutCubic(norm(o, 0.2, 1.2));
  const l = (d: number) => easeInOutCubic(norm(o, 1.4 + d * 0.15, 2.4 + d * 0.15));
  const u = ['Memory', 'Reasoning', 'Agents'];
  const ol: Tone[] = ['tango', 'pitch', 'violet'];

  return (
    <g style={{ opacity: s }}>
      <rect
        x={24}
        y={40}
        width={80}
        height={64}
        rx={10}
        style={{ fill: 'var(--card)', stroke: 'var(--line-strong)' }}
      />
      <DiagramIcon name="code" x={64} y={62} s={1.1} tone="ink" />
      <rect x={38} y={80} width={52} height={3.5} rx={1.75} style={{ fill: 'var(--line-strong)' }} />
      <rect x={38} y={88} width={34} height={3.5} rx={1.75} style={{ fill: 'var(--line-strong)' }} />
      <rect x={150} y={52} width={72} height={40} rx={20} style={{ fill: X.violet }} />
      <DiagramText x={186} y={76} text="One API" tone="white" size={11} />
      <line x1={104} y1={72} x2={150} y2={72} style={{ stroke: 'var(--line-strong)' }} />
      {u.map((d, p) => {
        const f = 34 + p * 38;
        const m = pulse(o, 2.4 + p * 0.15, 3.8, 0.2);
        const tone = ol[p % ol.length];
        return (
          <g key={d}>
            <path d={`M222 72C246 72 246 ${f} 270 ${f}`} fill="none" style={{ stroke: 'var(--line-strong)' }} />
            <rect
              x={270}
              y={f - 14}
              width={100}
              height={28}
              rx={8}
              style={{
                fill: 'var(--card)',
                stroke: m > 0.05 ? X[tone] : 'var(--line-strong)',
                strokeWidth: 1 + m * 0.7,
              }}
            />
            <DiagramText x={320} y={f + 4} text={d} tone={m > 0.05 ? tone : 'mute'} size={10.5} />
            {l(p) > 0 && l(p) < 1 && (
              <Badge
                x={lerp(222, 270, l(p))}
                y={lerp(72, f, l(p))}
                w={16}
                h={9}
                tone={tone}
                lines={false}
              />
            )}
          </g>
        );
      })}
      {i > 0 && i < 1 && <Badge x={lerp(104, 150, i)} y={72} tone="pitch" text="ask()" size={9.5} />}
    </g>
  );
}

/** 03. Enterprises: multi-team controlled boundary */
function drawEnterprises(n: number) {
  const safeN = Number.isFinite(n) ? Math.max(0, n) : 0;
  const s = 1 - smooth(norm(safeN, 7.4, 8.0));
  const o = [
    { x: 64, y: 50, n: 'Team A' },
    { x: 64, y: 100, n: 'Team B' },
    { x: 336, y: 76, n: 'Team C' },
  ];
  const rawIdx = Math.floor(safeN / 2.6);
  const i = ((rawIdx % o.length) + o.length) % o.length;
  const l = safeN % 2.6;
  const u = easeInOutCubic(norm(l, 0.1, 0.9));
  const activeTeam = o[i] ?? o[0];
  const docs = ['Policy doc', 'Client notes', 'Budget'];

  return (
    <g style={{ opacity: s }}>
      <rect
        x={16}
        y={14}
        width={368}
        height={126}
        rx={16}
        fill="none"
        style={{
          stroke: X.violet,
          strokeWidth: 1.3,
          strokeDasharray: '4 5',
          opacity: 0.8,
        }}
      />
      <DiagramIcon name="lock" x={34} y={28} s={0.8} tone="violet" />
      <DiagramText x={46} y={32} text="Your data, your rules" tone="violet" anchor="start" size={10} />
      {o.map((d, p) => {
        const f = p === i ? pulse(l, 0, 0.9, 0.2) : pulse(l, 1, 2.4, 0.2);
        return (
          <g key={p}>
            <line x1={d.x} y1={d.y} x2={200} y2={80} style={{ stroke: 'var(--line-strong)' }} />
            <circle
              cx={d.x}
              cy={d.y}
              r={17}
              style={{
                fill: 'var(--card)',
                stroke: f > 0.05 ? X.tango : 'var(--line-strong)',
                strokeWidth: 1 + f * 0.7,
              }}
            />
            <circle cx={d.x} cy={d.y - 4} r={4} style={{ fill: 'var(--ink-3)' }} />
            <path
              d={`M${d.x - 7} ${d.y + 9}a7 6 0 0 1 14 0`}
              fill="none"
              strokeWidth={1.4}
              style={{ stroke: 'var(--ink-3)' }}
            />
            <DiagramText x={d.x} y={d.y + 33} text={d.n} size={9.5} />
          </g>
        );
      })}
      <circle cx={200} cy={80} r={24} style={{ fill: X.violet }} />
      <DiagramIcon name="memory" x={200} y={80} s={1.15} tone="white" />
      {u > 0 && u < 1 && (
        <Badge
          x={lerp(activeTeam.x, 200, u)}
          y={lerp(activeTeam.y, 80, u)}
          tone="pitch"
          text={docs[i % docs.length]}
          size={9.5}
        />
      )}
      {o.map((d, p) => {
        const f = easeInOutCubic(norm(l, 1, 1.9));
        return p !== i && f > 0 && f < 1 ? (
          <Badge key={p} x={lerp(200, d.x, f)} y={lerp(80, d.y, f)} w={20} h={10} tone="pitch" lines={false} />
        ) : null;
      })}
    </g>
  );
}

/** 04. Governments: sovereign data centres + border defense */
function drawGovernments(n: number) {
  const safeN = Number.isFinite(n) ? Math.max(0, n) : 0;
  const s = 1 - smooth(norm(safeN, 7.4, 8.0));
  const o = [
    { x: 150, y: 56 },
    { x: 250, y: 50 },
    { x: 200, y: 96 },
    { x: 128, y: 100 },
  ];
  const rawIdx = Math.floor(safeN / 1.6);
  const i = ((rawIdx % o.length) + o.length) % o.length;
  const l = safeN % 1.6;
  const u = o[i] ?? o[0];
  const d = o[(i + 1) % o.length] ?? o[1];
  const p = easeInOutCubic(norm(l, 0.1, 1.2));
  const f = norm(safeN, 2.4, 4.4);
  const m = norm(safeN, 3.6, 4.4);

  return (
    <g style={{ opacity: s }}>
      <path
        d="M100 40 C120 22 190 18 230 26 C272 34 296 60 282 92 C270 118 210 126 160 122 C116 118 82 96 100 40Z"
        style={{
          fill: 'var(--brand-soft)',
          stroke: X.violet,
          strokeWidth: 1.4,
          strokeDasharray: '5 5',
        }}
      />
      {o.map((v, g) => (
        <g key={g}>
          <rect
            x={v.x - 11}
            y={v.y - 11}
            width={22}
            height={22}
            rx={6}
            style={{
              fill: 'var(--card)',
              stroke: g === i ? X.violet : 'var(--line-strong)',
            }}
          />
          <DiagramIcon name="server" x={v.x} y={v.y} s={0.62} tone={g === i ? 'violet' : 'ink'} />
        </g>
      ))}
      {p > 0 && p < 1 && (
        <Badge x={lerp(u.x, d.x, p)} y={lerp(u.y, d.y, p)} tone="pitch" text="Census data" size={9} />
      )}
      {f > 0 && f < 1 && (
        <Badge
          x={lerp(340, 288, easeInOutCubic(Math.min(1, f / 0.8)))}
          y={lerp(30, 66, easeInOutCubic(Math.min(1, f / 0.8)))}
          tone="tango"
          text="Outside request"
          size={9}
          a={1 - norm(f, 0.8, 1)}
        />
      )}
      {m > 0 && m < 1 && (
        <g style={{ opacity: 1 - norm(m, 0.6, 1) }}>
          <circle cx={288} cy={66} r={9} style={{ fill: 'var(--card)', stroke: X.tango }} />
          <DiagramIcon name="x" x={288} y={66} s={0.7} tone="tango" />
        </g>
      )}
      <DiagramText x={200} y={144} text="Under national control" tone="mute" size={10} />
    </g>
  );
}

/** 05. Education: progress steps + continuity */
function drawEducation(n: number) {
  const safeN = Number.isFinite(n) ? Math.max(0, n) : 0;
  const s = 1 - smooth(norm(safeN, 7.4, 8.0));
  const o = 5;
  const i = (j: number) => 60 + j * 64;
  const l = (j: number) => 112 - j * 20;
  const u = easeOutCubic(norm(safeN, 0.3, 4.2)) * (o - 1);
  const d = smooth(norm(safeN, 4.6, 5));
  const p = Math.max(0, Math.min(o - 1, u));
  const f = Math.floor(p);
  const m = p - f;
  const v = lerp(i(f), i(Math.min(o - 1, f + 1)), easeInOutCubic(m));
  const g = lerp(l(f), l(Math.min(o - 1, f + 1)), easeInOutCubic(m)) - 14;
  const w = safeN > 5.4;

  return (
    <g style={{ opacity: s }}>
      {Array.from({ length: o }, (_, k) => (
        <g key={k}>
          <rect
            x={i(k) - 26}
            y={l(k)}
            width={52}
            height={152 - l(k)}
            rx={6}
            style={{
              fill: k <= p ? 'var(--brand-soft)' : 'var(--fill)',
              stroke: k <= p ? X.violet : 'var(--line)',
              strokeWidth: 1,
            }}
          />
          <DiagramText x={i(k)} y={l(k) + 16} text={`Lesson ${k + 1}`} size={9} tone={k <= p ? 'violet' : 'mute'} />
        </g>
      ))}
      <DiagramIcon
        name="check"
        x={i(o - 1)}
        y={l(o - 1) + 14}
        tone="violet"
        a={smooth(norm(p, o - 1.2, o - 1))}
      />
      <g style={{ opacity: 1 - d * (w ? 0 : 1) }}>
        <circle cx={w ? i(o - 1) : v} cy={w ? l(o - 1) - 14 : g} r={9} style={{ fill: X.tango }} />
        <circle cx={w ? i(o - 1) : v} cy={(w ? l(o - 1) - 14 : g) - 2} r={3} style={{ fill: '#fff' }} />
      </g>
      <PillLabel x={74} y={24} text="Back next week" tone="ink" a={smooth(norm(safeN, 4.6, 5.1))} />
      <PillLabel x={196} y={24} text="Continues from here" tone="violet" a={smooth(norm(safeN, 5.4, 5.9))} />
    </g>
  );
}

/** 06. Startups: fast stack on shared foundation */
function drawStartups(n: number) {
  const safeN = Number.isFinite(n) ? Math.max(0, n) : 0;
  const s = 1 - smooth(norm(safeN, 7.4, 8.0));
  const o = [
    { w: 220, tone: 'tango' as Tone, t0: 1, text: 'Memory + agents, ready' },
    { w: 170, tone: 'pitch' as Tone, t0: 2.2, text: 'Your features' },
    { w: 110, tone: 'tango' as Tone, t0: 3.4, text: 'Your app' },
  ];

  return (
    <g style={{ opacity: s }}>
      <rect x={80} y={108} width={240} height={26} rx={8} style={{ fill: X.violet }} />
      <DiagramText x={200} y={125} text="Shared foundation" tone="white" size={10.5} />
      {o.map((i, l) => {
        const u = easeOutCubic(norm(safeN, i.t0, i.t0 + 0.7));
        const d = lerp(-20, 108 - (l + 1) * 26, u);
        return <Badge key={l} x={200} y={d + 11} w={i.w} h={22} tone={i.tone} text={i.text} a={u > 0 ? 1 : 0} />;
      })}
      <g
        style={{
          opacity: smooth(norm(safeN, 4.4, 5)),
          transform: `translate(0px, ${-8 * norm(safeN, 4.4, 6.4)}px)`,
        }}
      >
        <path d="M200 18l7 12h-14z" style={{ fill: 'var(--ink)' }} />
        <DiagramText x={200} y={12} text="Ship" size={10} tone="ink" />
      </g>
    </g>
  );
}

export const AUDIENCE_DIAGRAMS = [
  {
    draw: drawResearchers,
    period: 8,
    w: 400,
    h: 152,
    still: 6,
    label: 'Notes from months of work stay connected, and a question recalls all of them',
  },
  {
    draw: drawDevelopers,
    period: 8,
    w: 400,
    h: 152,
    still: 2,
    label: 'One call to a single interface reaches memory, reasoning and agents',
  },
  {
    draw: drawEnterprises,
    period: 8,
    w: 400,
    h: 152,
    still: 1.2,
    label: 'Three teams share one memory inside a boundary the organisation controls',
  },
  {
    draw: drawGovernments,
    period: 8,
    w: 400,
    h: 152,
    still: 3,
    label: 'Data moves between national data centres while outside traffic is blocked at the border',
  },
  {
    draw: drawEducation,
    period: 8,
    w: 400,
    h: 152,
    still: 6,
    label: 'A learner climbs a set of steps, and when they return they continue from the last one',
  },
  {
    draw: drawStartups,
    period: 8,
    w: 400,
    h: 152,
    still: 4,
    label: 'Product blocks are stacked on a shared foundation',
  },
];
