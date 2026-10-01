import type { ReactNode } from 'react';
import {
  Diagram,
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
  easeOutBack,
} from './BentoDiagrams';

/* ── 05 Architecture Animated Diagrams ─────────────────────────────────────── */

const gr = (n: number) => 1 - smooth(norm(n, 5.6, 6));

/** 01. Applications: request flows down from Chat */
function drawApplications(n: number) {
  const apps = [
    { n: 'Chat', i: 'chat' },
    { n: 'Docs', i: 'docs' },
    { n: 'Dashboard', i: 'search' },
  ];
  const r = easeInOutCubic(norm(n, 0.4, 1.4));
  const a = easeInOutCubic(norm(n, 2, 3.2));
  return (
    <g style={{ opacity: gr(n) }}>
      <circle cx={40} cy={60} r={16} style={{ fill: 'var(--card)', stroke: 'var(--line-strong)' }} />
      <circle cx={40} cy={55} r={4.5} style={{ fill: 'var(--ink-3)' }} />
      <path d="M32 68a8 7 0 0 1 16 0" fill="none" strokeWidth={1.5} style={{ stroke: 'var(--ink-3)' }} />
      <DiagramText x={40} y={92} text="You" size={10} />
      {apps.map((app, idx) => (
        <g key={app.n}>
          <rect
            x={100 + idx * 86}
            y={36}
            width={76}
            height={50}
            rx={10}
            style={{
              fill: 'var(--card)',
              stroke: idx === 0 && n > 1.3 ? X.violet : 'var(--line-strong)',
              strokeWidth: 1.3,
            }}
          />
          <DiagramIcon
            name={app.i}
            x={138 + idx * 86}
            y={54}
            s={1}
            tone={idx === 0 && n > 1.3 ? 'violet' : 'ink'}
          />
          <DiagramText
            x={138 + idx * 86}
            y={78}
            text={app.n}
            size={9.5}
            tone={idx === 0 && n > 1.3 ? 'violet' : 'mute'}
          />
        </g>
      ))}
      {r > 0 && r < 1 && (
        <Badge x={lerp(60, 138, r)} y={60} tone="pitch" text="A question" s={0.9} />
      )}
      <line
        x1={138}
        x2={138}
        y1={86}
        y2={150}
        style={{ stroke: 'var(--line-strong)', strokeDasharray: '3 4' }}
      />
      {a > 0 && a < 1 && (
        <Badge x={138} y={lerp(96, 146, a)} tone="pitch" text="Request" s={0.85} />
      )}
      <DiagramText
        x={240}
        y={140}
        text="To the layers below"
        tone="mute"
        size={10}
        a={smooth(norm(n, 2, 2.4))}
      />
    </g>
  );
}

/** 02. Reasoning Engine: multi-step plan worked through */
function drawReasoning(n: number) {
  const steps = ['Recall the study', 'Fetch new imagery', 'Compare districts'];
  return (
    <g style={{ opacity: gr(n) }}>
      <Badge x={90} y={30} tone="pitch" text="Which districts changed?" />
      <DiagramText x={250} y={34} text="Plan" tone="violet" size={11} />
      {steps.map((step, idx) => {
        const appear = easeOutBack(norm(n, 0.6 + idx * 0.5, 1 + idx * 0.5));
        const done = smooth(norm(n, 2.4 + idx * 0.7, 2.7 + idx * 0.7));
        return (
          <g key={step} style={{ opacity: Math.min(1, appear) }}>
            <rect
              x={140}
              y={52 + idx * 36}
              width={200}
              height={28}
              rx={8}
              style={{
                fill: done > 0.5 ? 'var(--brand-soft)' : 'var(--card)',
                stroke: done > 0.5 ? X.violet : 'var(--line-strong)',
              }}
            />
            <circle
              cx={158}
              cy={66 + idx * 36}
              r={8}
              style={{ fill: done > 0.5 ? X.violet : 'none', stroke: X.violet }}
            />
            {done > 0.5 && <DiagramIcon name="check" x={158} y={66 + idx * 36} s={0.7} tone="white" />}
            <text
              x={174}
              y={70 + idx * 36}
              style={{
                fill: 'var(--ink)',
                fontSize: 10.5,
                fontWeight: 500,
                fontFamily: 'var(--sans)',
              }}
            >
              {idx + 1}. {step}
            </text>
          </g>
        );
      })}
      <path d="M90 42C90 100 110 66 138 66" fill="none" style={{ stroke: 'var(--line-strong)' }} />
    </g>
  );
}

/** 03. Memory Engine: notes stored & recalled */
function drawMemory(n: number) {
  const notes: Array<{ text: string; tone: Tone }> = [
    { text: 'Groundwater study', tone: 'tango' },
    { text: '7 flagged', tone: 'pitch' },
    { text: 'Survey notes', tone: 'tango' },
  ];
  const r = easeInOutCubic(norm(n, 3.3, 4.3));
  return (
    <g style={{ opacity: gr(n) }}>
      <rect
        x={180}
        y={34}
        width={160}
        height={120}
        rx={14}
        style={{ fill: 'var(--card)', stroke: X.violet, strokeWidth: 1.3 }}
      />
      <DiagramText x={196} y={54} text="Memory" tone="violet" anchor="start" size={10.5} />
      {notes.map((note, idx) => {
        const u = easeInOutCubic(norm(n, 0.3 + idx * 0.6, 1.1 + idx * 0.6));
        const targetY = 76 + idx * 26;
        const isRecalled = idx === 1;
        const posX = isRecalled && r > 0 ? lerp(260, 90, r) : lerp(60, 260, u);
        const posY = isRecalled && r > 0 ? lerp(targetY, 120, r) : lerp(40 + idx * 14, targetY, u);
        return (
          <Badge
            key={note.text}
            x={posX}
            y={posY}
            tone={note.tone}
            text={note.text}
            a={smooth(norm(n, 0.2 + idx * 0.6, 0.4 + idx * 0.6))}
            s={0.9}
          />
        );
      })}
      <DiagramText
        x={90}
        y={146}
        text="Recalled when needed"
        tone="violet"
        size={10}
        a={smooth(norm(n, 4.2, 4.5))}
      />
    </g>
  );
}

/** 04. Knowledge Engine: linked graph facts */
function drawKnowledge(n: number) {
  const nodes = [
    { x: 70, y: 60, n: 'District' },
    { x: 180, y: 36, n: 'Aquifer' },
    { x: 290, y: 64, n: 'Rainfall' },
    { x: 120, y: 132, n: 'Survey' },
    { x: 250, y: 130, n: 'Crop yield' },
  ];
  const links = [
    [0, 1],
    [1, 2],
    [0, 3],
    [1, 4],
    [2, 4],
    [3, 4],
  ];
  return (
    <g style={{ opacity: gr(n) }}>
      {links.map(([fromIdx, toIdx], linkIdx) => {
        const d = easeInOutCubic(norm(n, 0.8 + linkIdx * 0.4, 1.3 + linkIdx * 0.4));
        return (
          <line
            key={linkIdx}
            x1={nodes[fromIdx].x}
            y1={nodes[fromIdx].y}
            x2={lerp(nodes[fromIdx].x, nodes[toIdx].x, d)}
            y2={lerp(nodes[fromIdx].y, nodes[toIdx].y, d)}
            style={{ stroke: X.violet, strokeWidth: 1.4, opacity: d > 0 ? 0.8 : 0 }}
          />
        );
      })}
      {nodes.map((node, nodeIdx) => (
        <Badge
          key={node.n}
          x={node.x}
          y={node.y}
          tone={nodeIdx % 2 ? 'pitch' : 'tango'}
          text={node.n}
          s={easeOutBack(norm(n, 0.1 + nodeIdx * 0.12, 0.5 + nodeIdx * 0.12))}
        />
      ))}
      <DiagramText
        x={180}
        y={164}
        text="Facts become connected knowledge"
        tone="mute"
        size={10}
        a={smooth(norm(n, 3.2, 3.6))}
      />
    </g>
  );
}

/** 05. Research Engine: 4 sources verified, 3 trusted, 1 rejected */
function drawResearch(n: number) {
  const sources = [
    { n: 'Government report', ok: true },
    { n: 'Anonymous blog', ok: false },
    { n: 'Satellite dataset', ok: true },
    { n: 'Peer-reviewed paper', ok: true },
  ];
  const r = norm(n, 0.4, 4.2) * 4;
  return (
    <g style={{ opacity: gr(n) }}>
      {sources.map((src, idx) => {
        const isChecked = r > idx + 0.8;
        return (
          <g key={src.n}>
            <rect
              x={40}
              y={20 + idx * 34}
              width={230}
              height={26}
              rx={8}
              style={{
                fill: 'var(--card)',
                stroke: isChecked
                  ? src.ok
                    ? X.violet
                    : X.tango
                  : 'var(--line-strong)',
              }}
            />
            <text
              x={54}
              y={37 + idx * 34}
              style={{
                fill: isChecked && !src.ok ? 'var(--ink-3)' : 'var(--ink)',
                fontSize: 10.5,
                fontWeight: 500,
                fontFamily: 'var(--sans)',
                textDecoration: isChecked && !src.ok ? 'line-through' : 'none',
              }}
            >
              {src.n}
            </text>
            {isChecked && (
              <DiagramIcon
                name={src.ok ? 'check' : 'x'}
                x={254}
                y={33 + idx * 34}
                s={0.8}
                tone={src.ok ? 'violet' : 'tango'}
              />
            )}
          </g>
        );
      })}
      <g
        style={{
          transform: `translate(300px, ${20 + Math.min(3.4, r) * 34}px)`,
          opacity: r < 4 ? 1 : 0,
        }}
      >
        <DiagramIcon name="search" x={0} y={16} s={1.3} tone="violet" />
      </g>
      <PillLabel
        x={300}
        y={156}
        text="3 of 4 trusted"
        tone="violet"
        a={smooth(norm(n, 4.2, 4.6))}
      />
    </g>
  );
}

/** 06. Security Layer: policy lock checks each caller */
function drawSecurity(n: number) {
  const callers = [
    { n: 'Analyst', ok: true, t0: 0.3 },
    { n: 'Unknown app', ok: false, t0: 2 },
    { n: 'Team lead', ok: true, t0: 3.6 },
  ];
  return (
    <g style={{ opacity: gr(n) }}>
      <rect
        x={172}
        y={20}
        width={16}
        height={130}
        rx={8}
        style={{ fill: 'var(--brand-soft)', stroke: X.violet }}
      />
      <circle cx={180} cy={85} r={18} style={{ fill: X.violet }} />
      <DiagramIcon name="lock" x={180} y={85} s={1.1} tone="white" />
      <rect
        x={250}
        y={55}
        width={90}
        height={60}
        rx={12}
        style={{ fill: 'var(--card)', stroke: 'var(--line-strong)' }}
      />
      <DiagramText x={295} y={90} text="Your data" size={10.5} tone="ink" />
      {callers.map((caller) => {
        const a = norm(n, caller.t0, caller.t0 + 1.4);
        if (a <= 0 || a >= 1) return null;
        const posX = caller.ok
          ? lerp(40, 262, easeInOutCubic(a))
          : lerp(40, 150, easeInOutCubic(Math.min(1, a / 0.6)));
        const isDenied = !caller.ok && a > 0.6;
        return (
          <g key={caller.n}>
            <Badge
              x={posX}
              y={85}
              tone={caller.ok ? 'pitch' : 'tango'}
              text={caller.n}
              s={0.9}
              a={isDenied ? 1 - norm(a, 0.8, 1) : 1}
            />
            {isDenied && <PillLabel x={120} y={124} text="Denied" tone="tango" />}
            {caller.ok && a > 0.45 && a < 0.8 && (
              <PillLabel x={220} y={124} text="Allowed" tone="violet" />
            )}
          </g>
        );
      })}
    </g>
  );
}

/** 07. Infrastructure Layer: scheduler hands jobs to workers */
function drawInfrastructure(n: number) {
  const tasks: Array<{ n: string; lane: number; t0: number; tone: Tone }> = [
    { n: 'Search', lane: 0, t0: 0.3, tone: 'tango' },
    { n: 'Vision', lane: 1, t0: 0.9, tone: 'pitch' },
    { n: 'Draft', lane: 2, t0: 1.5, tone: 'tango' },
  ];
  return (
    <g style={{ opacity: gr(n) }}>
      <rect x={24} y={60} width={80} height={50} rx={10} style={{ fill: X.violet }} />
      <DiagramText x={64} y={89} text="Scheduler" tone="white" size={10} />
      {tasks.map((task) => {
        const laneY = 36 + task.lane * 50;
        const travel = easeInOutCubic(norm(n, task.t0, task.t0 + 0.9));
        const progress = norm(n, task.t0 + 0.9, task.t0 + 3.2);
        return (
          <g key={task.n}>
            <path
              d={`M104 85C140 85 140 ${laneY} 176 ${laneY}`}
              fill="none"
              style={{ stroke: 'var(--line-strong)' }}
            />
            <rect
              x={176}
              y={laneY - 18}
              width={160}
              height={36}
              rx={10}
              style={{
                fill: 'var(--card)',
                stroke: progress > 0 && progress < 1 ? X[task.tone] : 'var(--line-strong)',
              }}
            />
            <DiagramText
              x={190}
              y={laneY - 2}
              text={`Worker ${task.lane + 1}`}
              anchor="start"
              size={9.5}
            />
            <rect x={190} y={laneY + 6} width={130} height={4} rx={2} style={{ fill: 'var(--line)' }} />
            <rect
              x={190}
              y={laneY + 6}
              width={130 * progress}
              height={4}
              rx={2}
              style={{ fill: X[task.tone] }}
            />
            {progress >= 1 && (
              <DiagramIcon name="check" x={322} y={laneY - 6} s={0.7} tone="violet" />
            )}
            {travel > 0 && travel < 1 && (
              <Badge
                x={lerp(104, 250, travel)}
                y={lerp(85, laneY - 2, travel)}
                tone={task.tone}
                text={task.n}
                s={0.85}
              />
            )}
            {travel >= 1 && progress < 1 && (
              <Badge x={280} y={laneY - 5} tone={task.tone} text={task.n} s={0.75} />
            )}
          </g>
        );
      })}
    </g>
  );
}

/** 08. Compute Layer: data centre cluster and edge phone */
function drawCompute(n: number) {
  const load = 0.35 + 0.5 * (0.5 + 0.5 * Math.sin((n / 6) * Math.PI * 2 - 1.2));
  return (
    <g style={{ opacity: gr(n) }}>
      <DiagramText x={40} y={24} text="Data centre cluster" anchor="start" size={10} />
      {Array.from({ length: 12 }, (_, i) => {
        const isLit = (i * 0.37 + n * 0.9) % 1 < load;
        return (
          <rect
            key={i}
            x={40 + (i % 6) * 34}
            y={34 + Math.floor(i / 6) * 34}
            width={28}
            height={28}
            rx={6}
            style={{
              fill: isLit ? X.violet : 'var(--fill)',
              stroke: isLit ? X.violet : 'var(--line)',
              opacity: isLit ? 0.9 : 1,
            }}
          />
        );
      })}
      <DiagramText x={290} y={24} text="Phone" size={10} />
      <rect
        x={272}
        y={34}
        width={36}
        height={62}
        rx={8}
        style={{ fill: 'var(--card)', stroke: 'var(--line-strong)' }}
      />
      <rect
        x={280}
        y={46}
        width={20}
        height={20}
        rx={4}
        style={{ fill: Math.floor(n * 2) % 2 ? X.pitch : 'var(--fill)' }}
      />
      <DiagramText x={40} y={126} text="Load" anchor="start" size={10} />
      <rect x={76} y={120} width={232} height={6} rx={3} style={{ fill: 'var(--line)' }} />
      <rect x={76} y={120} width={232 * load} height={6} rx={3} style={{ fill: X.violet }} />
      <DiagramText
        x={308}
        y={146}
        text={`${Math.round(load * 100)}% in use`}
        anchor="end"
        size={10}
        tone="violet"
      />
    </g>
  );
}

/** 09. Sovereign Cloud: data stays within national boundary */
function drawSovereign(n: number) {
  const centers = [
    { x: 140, y: 58 },
    { x: 214, y: 84 },
    { x: 150, y: 118 },
  ];
  const step = Math.floor(n / 1.5) % 3;
  const subT = n % 1.5;
  const travel = easeInOutCubic(norm(subT, 0.1, 1.2));
  const fromCenter = centers[step];
  const toCenter = centers[(step + 1) % 3];
  const copyAbroad = norm(n, 3.4, 4.8);

  return (
    <g style={{ opacity: gr(n) }}>
      <path
        d="M110 24C150 12 230 18 256 40C282 64 270 120 232 142C196 160 132 158 106 128C80 98 78 36 110 24Z"
        style={{
          fill: 'var(--brand-soft)',
          stroke: X.violet,
          strokeWidth: 1.4,
          strokeDasharray: '5 5',
        }}
      />
      <DiagramText x={180} y={166} text="Inside national borders" tone="violet" size={10} />
      {centers.map((center, idx) => (
        <g key={idx}>
          <rect
            x={center.x - 13}
            y={center.y - 13}
            width={26}
            height={26}
            rx={7}
            style={{
              fill: 'var(--card)',
              stroke: idx === step ? X.violet : 'var(--line-strong)',
            }}
          />
          <DiagramIcon
            name="server"
            x={center.x}
            y={center.y}
            s={0.72}
            tone={idx === step ? 'violet' : 'ink'}
          />
        </g>
      ))}
      {travel > 0 && travel < 1 && (
        <Badge
          x={lerp(fromCenter.x, toCenter.x, travel)}
          y={lerp(fromCenter.y, toCenter.y, travel)}
          w={18}
          h={10}
          tone="pitch"
          lines={false}
        />
      )}
      {copyAbroad > 0 && copyAbroad < 1 && (
        <>
          <Badge
            x={lerp(214, 272, easeInOutCubic(Math.min(1, copyAbroad / 0.6)))}
            y={84}
            tone="tango"
            text="Copy abroad?"
            s={0.85}
            a={1 - norm(copyAbroad, 0.8, 1)}
          />
          {copyAbroad > 0.6 && (
            <PillLabel x={318} y={60} text="Blocked" tone="tango" a={1 - norm(copyAbroad, 0.85, 1)} />
          )}
        </>
      )}
    </g>
  );
}

export const ARCHITECTURE_DRAWS = [
  drawApplications,
  drawReasoning,
  drawMemory,
  drawKnowledge,
  drawResearch,
  drawSecurity,
  drawInfrastructure,
  drawCompute,
  drawSovereign,
];

export const ARCHITECTURE_LABELS = [
  'A person asks a question in an app and the request goes down to the layers below',
  'A question becomes a three-step plan that is worked through step by step',
  'Notes are stored in memory and the right one is recalled when needed',
  'Facts such as district, aquifer and rainfall are linked into a graph',
  'Four sources are checked; three are trusted and one is rejected',
  'A lock checks each request: known people are allowed, an unknown app is denied',
  'A scheduler hands search, vision and drafting jobs to separate workers',
  'Processors in a data centre and on a phone light up with the current load',
  'Data moves between national data centres and a copy abroad is blocked',
];

/* ── 9 Micro-animated Vector Glyphs on Slabs ────────────────────────────────── */

const GLYPH_ICONS: ReactNode[] = [
  // 01 Applications: 3 app window cards
  <>
    {[0, 1, 2].map((n) => (
      <g key={n} className="g-pop" style={{ animationDelay: `${n * 0.12}s` }}>
        <rect x={4 + n * 21} y={5} width={17} height={14} rx={3.5} />
        <line x1={7 + n * 21} x2={12 + n * 21} y1={9} y2={9} />
      </g>
    ))}
  </>,
  // 02 Reasoning Engine: branch flow
  <>
    <circle cx={8} cy={12} r={3} className="g-fill" />
    <path d="M11 12C20 12 20 5 29 5M11 12H29M11 12C20 12 20 19 29 19" className="g-draw" />
    <circle cx={32} cy={5} r={2.4} />
    <circle cx={32} cy={12} r={2.4} />
    <circle cx={32} cy={19} r={2.4} />
    <path d="M35 5H44M35 12H50M35 19H47" className="g-dash" />
  </>,
  // 03 Memory Engine: stacked disks
  <>
    {[0, 1, 2].map((n) => (
      <ellipse
        key={n}
        cx={32}
        cy={7 + n * 5}
        rx={24}
        ry={3.4}
        className={n === 1 ? 'g-fill g-bob' : 'g-bob'}
        style={{ animationDelay: `${n * 0.15}s` }}
      />
    ))}
  </>,
  // 04 Knowledge Engine: graph network
  <>
    <path d="M8 16L20 6L34 14L46 5L56 17M20 6L26 19L34 14M46 5L44 19" className="g-draw" />
    {[
      [8, 16],
      [20, 6],
      [34, 14],
      [46, 5],
      [56, 17],
      [26, 19],
      [44, 19],
    ].map(([x, y], r) => (
      <circle key={r} cx={x} cy={y} r={r === 2 ? 3 : 2.2} className={r === 2 ? 'g-fill g-pulse' : ''} />
    ))}
  </>,
  // 05 Research Engine: document scan
  <>
    {[0, 1, 2].map((n) => (
      <line key={n} x1={4} x2={40 - n * 6} y1={6 + n * 6} y2={6 + n * 6} className="g-dash" />
    ))}
    <g className="g-scan">
      <circle cx={48} cy={11} r={6} />
      <path d="M52.5 15.5L57 20" />
    </g>
  </>,
  // 06 Security Layer: shield lock
  <>
    <rect x={3} y={3} width={58} height={18} rx={9} className="g-dash" />
    <rect x={14} y={6} width={36} height={12} rx={6} />
    <path d="M32 6.5l5 1.8v3.2c0 3-2.2 5-5 6-2.8-1-5-3-5-6V8.3z" className="g-fill g-pulse" />
  </>,
  // 07 Infrastructure Layer: data streaming bus
  <>
    {[0, 1, 2].map((n) => (
      <g key={n}>
        <line x1={4} x2={60} y1={6 + n * 6} y2={6 + n * 6} />
        <rect
          x={4}
          y={4 + n * 6}
          width={9}
          height={4}
          rx={2}
          className="g-fill g-run"
          style={{ animationDelay: `${n * 0.35}s` }}
        />
      </g>
    ))}
  </>,
  // 08 Compute Layer: microchip
  <>
    <rect x={20} y={4} width={24} height={16} rx={3} />
    <rect x={26} y={8} width={12} height={8} rx={1.5} className="g-fill g-pulse" />
    {[0, 1, 2, 3].map((n) => (
      <g key={n}>
        <line x1={24 + n * 5.5} x2={24 + n * 5.5} y1={1} y2={4} />
        <line x1={24 + n * 5.5} x2={24 + n * 5.5} y1={20} y2={23} />
      </g>
    ))}
    <line x1={4} x2={20} y1={12} y2={12} className="g-dash" />
    <line x1={44} x2={60} y1={12} y2={12} className="g-dash" />
  </>,
  // 09 Sovereign Cloud: sovereign vault
  <>
    <path d="M14 17C14 7 22 3 32 3S50 7 50 17" className="g-draw" />
    <rect x={4} y={17} width={56} height={5} rx={2} className="g-fill" />
    {[0, 1, 2].map((n) => (
      <rect
        key={n}
        x={21 + n * 8}
        y={10}
        width={6}
        height={7}
        rx={1.2}
        className="g-pop"
        style={{ animationDelay: `${n * 0.12}s` }}
      />
    ))}
  </>,
];

export const LAYER_GLYPHS = GLYPH_ICONS.map((icon, idx) => (
  <svg key={idx} className="glyph" viewBox="0 0 64 24" aria-hidden="true">
    {icon}
  </svg>
));

export function LayerAnimatedDiagram({ index }: { index: number }) {
  const draw = ARCHITECTURE_DRAWS[index] ?? ARCHITECTURE_DRAWS[0];
  const label = ARCHITECTURE_LABELS[index] ?? ARCHITECTURE_LABELS[0];
  return <Diagram draw={draw} period={6} w={360} h={170} label={label} still={4.5} />;
}
