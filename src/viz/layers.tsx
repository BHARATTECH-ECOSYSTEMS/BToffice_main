import { Chip, C, Icon, Label, Tag, type Tone } from './atoms';
import { back, inOut, lerp, seg, smooth } from './math';
import type { Draw } from './Diagram';

/** One small diagram per architecture layer, each showing that layer's job. 360 × 170, 6 s loops. */
export const LAYER_W = 360;
export const LAYER_H = 170;
const loop = (t: number) => 1 - smooth(seg(t, 5.6, 6));

/* 01 Applications: where a person asks */
const applications: Draw = (t) => {
  const apps = [{ n: 'Chat', i: 'chat' }, { n: 'Docs', i: 'docs' }, { n: 'Dashboard', i: 'search' }];
  const ask = inOut(seg(t, 0.4, 1.4));
  const down = inOut(seg(t, 2.0, 3.2));
  return (
    <g style={{ opacity: loop(t) }}>
      <circle cx={40} cy={60} r={16} style={{ fill: 'var(--card)', stroke: 'var(--line-strong)' }} />
      <circle cx={40} cy={55} r={4.5} style={{ fill: 'var(--ink-3)' }} />
      <path d="M32 68a8 7 0 0 1 16 0" fill="none" strokeWidth={1.5} style={{ stroke: 'var(--ink-3)' }} />
      <Label x={40} y={92} text="You" size={10} />
      {apps.map((a, k) => (
        <g key={a.n}>
          <rect x={100 + k * 86} y={36} width={76} height={50} rx={10} style={{ fill: 'var(--card)', stroke: k === 0 && t > 1.3 ? C.violet : 'var(--line-strong)', strokeWidth: 1.3 }} />
          <Icon name={a.i} x={138 + k * 86} y={54} s={1} tone={k === 0 && t > 1.3 ? 'violet' : 'ink'} />
          <Label x={138 + k * 86} y={78} text={a.n} size={9.5} tone={k === 0 && t > 1.3 ? 'violet' : 'mute'} />
        </g>
      ))}
      {ask > 0 && ask < 1 && <Chip x={lerp(60, 138, ask)} y={60} tone="pitch" text="A question" s={0.9} />}
      <line x1={138} x2={138} y1={86} y2={150} style={{ stroke: 'var(--line-strong)', strokeDasharray: '3 4' }} />
      {down > 0 && down < 1 && <Chip x={138} y={lerp(96, 146, down)} tone="pitch" text="Request" s={0.85} />}
      <Label x={240} y={140} text="To the layers below" tone="mute" size={10} a={smooth(seg(t, 2, 2.4))} />
    </g>
  );
};

/* 02 Reasoning Engine: turns a question into a plan and works through it */
const reasoning: Draw = (t) => {
  const steps = ['Recall the study', 'Fetch new imagery', 'Compare districts'];
  return (
    <g style={{ opacity: loop(t) }}>
      <Chip x={90} y={30} tone="pitch" text="Which districts changed?" />
      <Label x={250} y={34} text="Plan" tone="violet" size={11} />
      {steps.map((s, k) => {
        const on = back(seg(t, 0.6 + k * 0.5, 1.0 + k * 0.5));
        const done = smooth(seg(t, 2.4 + k * 0.7, 2.7 + k * 0.7));
        return (
          <g key={s} style={{ opacity: Math.min(1, on) }}>
            <rect x={140} y={52 + k * 36} width={200} height={28} rx={8} style={{ fill: done > 0.5 ? 'var(--brand-soft)' : 'var(--card)', stroke: done > 0.5 ? C.violet : 'var(--line-strong)' }} />
            <circle cx={158} cy={66 + k * 36} r={8} style={{ fill: done > 0.5 ? C.violet : 'none', stroke: C.violet }} />
            {done > 0.5 && <Icon name="check" x={158} y={66 + k * 36} s={0.7} tone="white" />}
            <text x={174} y={70 + k * 36} style={{ fill: 'var(--ink)', fontSize: 10.5, fontWeight: 500, fontFamily: 'var(--sans)' }}>
              {k + 1}. {s}
            </text>
          </g>
        );
      })}
      <path d="M90 42C90 100 110 66 138 66" fill="none" style={{ stroke: 'var(--line-strong)' }} />
    </g>
  );
};

/* 03 Memory Engine: keeps notes and brings the right one back */
const memory: Draw = (t) => {
  const notes: { text: string; tone: Tone }[] = [{ text: 'Groundwater study', tone: 'tango' }, { text: '7 flagged', tone: 'pitch' }, { text: 'Survey notes', tone: 'tango' }];
  const recall = inOut(seg(t, 3.3, 4.3));
  return (
    <g style={{ opacity: loop(t) }}>
      <rect x={180} y={34} width={160} height={120} rx={14} style={{ fill: 'var(--card)', stroke: C.violet, strokeWidth: 1.3 }} />
      <Label x={196} y={54} text="Memory" tone="violet" anchor="start" size={10.5} />
      {notes.map((n, k) => {
        const u = inOut(seg(t, 0.3 + k * 0.6, 1.1 + k * 0.6));
        const y = 76 + k * 26;
        const isRecalled = k === 1;
        const x = isRecalled && recall > 0 ? lerp(260, 90, recall) : lerp(60, 260, u);
        const yy = isRecalled && recall > 0 ? lerp(y, 120, recall) : lerp(40 + k * 14, y, u);
        return <Chip key={n.text} x={x} y={yy} tone={n.tone} text={n.text} a={smooth(seg(t, 0.2 + k * 0.6, 0.4 + k * 0.6))} s={0.9} />;
      })}
      <Label x={90} y={146} text="Recalled when needed" tone="violet" size={10} a={smooth(seg(t, 4.2, 4.5))} />
    </g>
  );
};

/* 04 Knowledge Engine: connects facts into a graph */
const knowledge: Draw = (t) => {
  const N = [
    { x: 70, y: 60, n: 'District' },
    { x: 180, y: 36, n: 'Aquifer' },
    { x: 290, y: 64, n: 'Rainfall' },
    { x: 120, y: 132, n: 'Survey' },
    { x: 250, y: 130, n: 'Crop yield' },
  ];
  const E: [number, number][] = [[0, 1], [1, 2], [0, 3], [1, 4], [2, 4], [3, 4]];
  return (
    <g style={{ opacity: loop(t) }}>
      {E.map(([a, b], k) => {
        const u = inOut(seg(t, 0.8 + k * 0.4, 1.3 + k * 0.4));
        return <line key={k} x1={N[a].x} y1={N[a].y} x2={lerp(N[a].x, N[b].x, u)} y2={lerp(N[a].y, N[b].y, u)} style={{ stroke: C.violet, strokeWidth: 1.4, opacity: u > 0 ? 0.8 : 0 }} />;
      })}
      {N.map((n, k) => (
        <Chip key={n.n} x={n.x} y={n.y} tone={k % 2 ? 'pitch' : 'tango'} text={n.n} s={back(seg(t, 0.1 + k * 0.12, 0.5 + k * 0.12))} />
      ))}
      <Label x={180} y={164} text="Facts become connected knowledge" tone="mute" size={10} a={smooth(seg(t, 3.2, 3.6))} />
    </g>
  );
};

/* 05 Research Engine: checks its sources before trusting them */
const research: Draw = (t) => {
  const src = [{ n: 'Government report', ok: true }, { n: 'Anonymous blog', ok: false }, { n: 'Satellite dataset', ok: true }, { n: 'Peer-reviewed paper', ok: true }];
  const scan = seg(t, 0.4, 4.2) * 4;
  return (
    <g style={{ opacity: loop(t) }}>
      {src.map((s, k) => {
        const seen = scan > k + 0.8;
        return (
          <g key={s.n}>
            <rect x={40} y={20 + k * 34} width={230} height={26} rx={8} style={{ fill: 'var(--card)', stroke: seen ? (s.ok ? C.violet : C.tango) : 'var(--line-strong)' }} />
            <text x={54} y={37 + k * 34} style={{ fill: seen && !s.ok ? 'var(--ink-3)' : 'var(--ink)', fontSize: 10.5, fontWeight: 500, fontFamily: 'var(--sans)', textDecoration: seen && !s.ok ? 'line-through' : 'none' }}>
              {s.n}
            </text>
            {seen && <Icon name={s.ok ? 'check' : 'x'} x={254} y={33 + k * 34} s={0.8} tone={s.ok ? 'violet' : 'tango'} />}
          </g>
        );
      })}
      <g style={{ transform: `translate(300px, ${20 + Math.min(3.4, scan) * 34}px)`, opacity: scan < 4 ? 1 : 0 }}>
        <Icon name="search" x={0} y={16} s={1.3} tone="violet" />
      </g>
      <Tag x={300} y={156} text="3 of 4 trusted" tone="violet" a={smooth(seg(t, 4.2, 4.6))} />
    </g>
  );
};

/* 06 Security Layer: checks who is asking at every boundary */
const security: Draw = (t) => {
  const reqs = [{ n: 'Analyst', ok: true, t0: 0.3 }, { n: 'Unknown app', ok: false, t0: 2.0 }, { n: 'Team lead', ok: true, t0: 3.6 }];
  return (
    <g style={{ opacity: loop(t) }}>
      <rect x={172} y={20} width={16} height={130} rx={8} style={{ fill: 'var(--brand-soft)', stroke: C.violet }} />
      <circle cx={180} cy={85} r={18} style={{ fill: C.violet }} />
      <Icon name="lock" x={180} y={85} s={1.1} tone="white" />
      <rect x={250} y={55} width={90} height={60} rx={12} style={{ fill: 'var(--card)', stroke: 'var(--line-strong)' }} />
      <Label x={295} y={90} text="Your data" size={10.5} tone="ink" />
      {reqs.map((r) => {
        const u = seg(t, r.t0, r.t0 + 1.4);
        if (u <= 0 || u >= 1) return null;
        const x = r.ok ? lerp(40, 262, inOut(u)) : lerp(40, 150, inOut(Math.min(1, u / 0.6)));
        const denied = !r.ok && u > 0.6;
        return (
          <g key={r.n}>
            <Chip x={x} y={85} tone={r.ok ? 'pitch' : 'tango'} text={r.n} s={0.9} a={denied ? 1 - seg(u, 0.8, 1) : 1} />
            {denied && <Tag x={120} y={124} text="Denied" tone="tango" />}
            {r.ok && u > 0.45 && u < 0.8 && <Tag x={220} y={124} text="Allowed" tone="violet" />}
          </g>
        );
      })}
    </g>
  );
};

/* 07 Infrastructure Layer: hands each job to the right worker and keeps them in sync */
const infrastructure: Draw = (t) => {
  const jobs: { n: string; lane: number; t0: number; tone: Tone }[] = [
    { n: 'Search', lane: 0, t0: 0.3, tone: 'tango' },
    { n: 'Vision', lane: 1, t0: 0.9, tone: 'pitch' },
    { n: 'Draft', lane: 2, t0: 1.5, tone: 'tango' },
  ];
  return (
    <g style={{ opacity: loop(t) }}>
      <rect x={24} y={60} width={80} height={50} rx={10} style={{ fill: C.violet }} />
      <Label x={64} y={89} text="Scheduler" tone="white" size={10} />
      {jobs.map((j) => {
        const y = 36 + j.lane * 50;
        const u = inOut(seg(t, j.t0, j.t0 + 0.9));
        const work = seg(t, j.t0 + 0.9, j.t0 + 3.2);
        return (
          <g key={j.n}>
            <path d={`M104 85C140 85 140 ${y} 176 ${y}`} fill="none" style={{ stroke: 'var(--line-strong)' }} />
            <rect x={176} y={y - 18} width={160} height={36} rx={10} style={{ fill: 'var(--card)', stroke: work > 0 && work < 1 ? C[j.tone] : 'var(--line-strong)' }} />
            <Label x={190} y={y - 2} text={`Worker ${j.lane + 1}`} anchor="start" size={9.5} />
            <rect x={190} y={y + 6} width={130} height={4} rx={2} style={{ fill: 'var(--line)' }} />
            <rect x={190} y={y + 6} width={130 * work} height={4} rx={2} style={{ fill: C[j.tone] }} />
            {work >= 1 && <Icon name="check" x={322} y={y - 6} s={0.7} tone="violet" />}
            {u > 0 && u < 1 && <Chip x={lerp(104, 250, u)} y={lerp(85, y - 2, u)} tone={j.tone} text={j.n} s={0.85} />}
            {u >= 1 && work < 1 && <Chip x={280} y={y - 5} tone={j.tone} text={j.n} s={0.75} />}
          </g>
        );
      })}
    </g>
  );
};

/* 08 Compute Layer: the processors that do the work, from a cluster down to a device */
const compute: Draw = (t) => {
  const load = 0.35 + 0.5 * (0.5 + 0.5 * Math.sin((t / 6) * Math.PI * 2 - 1.2));
  return (
    <g style={{ opacity: loop(t) }}>
      <Label x={40} y={24} text="Data centre cluster" anchor="start" size={10} />
      {Array.from({ length: 12 }, (_, k) => {
        const on = (k * 0.37 + t * 0.9) % 1 < load;
        return <rect key={k} x={40 + (k % 6) * 34} y={34 + Math.floor(k / 6) * 34} width={28} height={28} rx={6} style={{ fill: on ? C.violet : 'var(--fill)', stroke: on ? C.violet : 'var(--line)', opacity: on ? 0.9 : 1 }} />;
      })}
      <Label x={290} y={24} text="Phone" size={10} />
      <rect x={272} y={34} width={36} height={62} rx={8} style={{ fill: 'var(--card)', stroke: 'var(--line-strong)' }} />
      <rect x={280} y={46} width={20} height={20} rx={4} style={{ fill: Math.floor(t * 2) % 2 ? C.pitch : 'var(--fill)' }} />
      <Label x={40} y={126} text="Load" anchor="start" size={10} />
      <rect x={76} y={120} width={232} height={6} rx={3} style={{ fill: 'var(--line)' }} />
      <rect x={76} y={120} width={232 * load} height={6} rx={3} style={{ fill: C.violet }} />
      <Label x={308} y={146} text={`${Math.round(load * 100)}% in use`} anchor="end" size={10} tone="violet" />
    </g>
  );
};

/* 09 Sovereign Cloud: the data moves between national data centres and never leaves */
const sovereign: Draw = (t) => {
  const dcs = [{ x: 140, y: 58 }, { x: 214, y: 84 }, { x: 150, y: 118 }];
  const k = Math.floor(t / 1.5) % 3;
  const l = t % 1.5;
  const u = inOut(seg(l, 0.1, 1.2));
  const a = dcs[k], b = dcs[(k + 1) % 3];
  const out = seg(t, 3.4, 4.8);
  return (
    <g style={{ opacity: loop(t) }}>
      <path d="M110 24C150 12 230 18 256 40C282 64 270 120 232 142C196 160 132 158 106 128C80 98 78 36 110 24Z" style={{ fill: 'var(--brand-soft)', stroke: C.violet, strokeWidth: 1.4, strokeDasharray: '5 5' }} />
      <Label x={180} y={166} text="Inside national borders" tone="violet" size={10} />
      {dcs.map((d, i) => (
        <g key={i}>
          <rect x={d.x - 13} y={d.y - 13} width={26} height={26} rx={7} style={{ fill: 'var(--card)', stroke: i === k ? C.violet : 'var(--line-strong)' }} />
          <Icon name="server" x={d.x} y={d.y} s={0.72} tone={i === k ? 'violet' : 'ink'} />
        </g>
      ))}
      {u > 0 && u < 1 && <Chip x={lerp(a.x, b.x, u)} y={lerp(a.y, b.y, u)} w={18} h={10} tone="pitch" lines={false} />}
      {out > 0 && out < 1 && (
        <>
          <Chip x={lerp(214, 272, inOut(Math.min(1, out / 0.6)))} y={84} tone="tango" text="Copy abroad?" s={0.85} a={1 - seg(out, 0.8, 1)} />
          {out > 0.6 && <Tag x={318} y={60} text="Blocked" tone="tango" a={1 - seg(out, 0.85, 1)} />}
        </>
      )}
    </g>
  );
};

export const LAYER_DRAWS: Draw[] = [applications, reasoning, memory, knowledge, research, security, infrastructure, compute, sovereign];
export const LAYER_LABELS = [
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
