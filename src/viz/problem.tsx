import { Chip, C, Icon, Label, Panel, Tag, type Tone } from './atoms';
import { back, inOut, lerp, out, seg, smooth, tri, window_ } from './math';
import type { Draw } from './Diagram';

/* ── It forgets ─────────────────────────────────────────────────────────────
   A session fills with what you told it. It ends. The next one asks for everything again. */

const CHIPS = [
  { x: 72, y: 70, text: 'Your goal', tone: 'tango' as Tone },
  { x: 168, y: 70, text: 'Files', tone: 'pitch' as Tone },
  { x: 72, y: 104, text: 'Decisions', tone: 'pitch' as Tone },
  { x: 168, y: 104, text: 'Deadlines', tone: 'tango' as Tone },
  { x: 72, y: 138, text: 'Names', tone: 'tango' as Tone },
  { x: 168, y: 138, text: 'Draft', tone: 'pitch' as Tone },
];

export const forgets: Draw = (t) => {
  const g = 1 - smooth(seg(t, 9.4, 10));
  const drain = CHIPS.map((_, i) => seg(t, 4.4 + i * 0.15, 5.3 + i * 0.15));
  const kept = CHIPS.reduce((n, _, i) => n + smooth(seg(t, 0.4 + i * 0.45, 0.8 + i * 0.45)) * (1 - smooth(drain[i])), 0);
  const second = smooth(seg(t, 5.9, 6.4));

  return (
    <g style={{ opacity: g }}>
      <Panel x={16} y={20} w={208} h={188} title="Today's session" active={1 - second} tone="tango">
        {CHIPS.map((c, i) => {
          const a = back(seg(t, 0.4 + i * 0.45, 0.85 + i * 0.45));
          const d = inOut(drain[i]);
          return <Chip key={i} x={c.x} y={c.y + d * 24} tone={c.tone} text={c.text} s={(0.6 + 0.4 * a) * (1 - 0.3 * d)} a={a * (1 - out(seg(drain[i], 0.1, 0.8)))} />;
        })}
        <Label x={32} y={178} text="What it knows" tone="mute" anchor="start" size={10} />
        <rect x={32} y={186} width={176} height={6} rx={3} style={{ fill: 'var(--line)' }} />
        <rect x={32} y={186} width={Math.max(0, 176 * (kept / CHIPS.length))} height={6} rx={3} style={{ fill: C.tango }} />
      </Panel>
      <Tag x={120} y={232} text="Session ends: all of it is gone" tone="tango" a={smooth(seg(t, 4.2, 4.6))} />

      <g style={{ opacity: smooth(seg(t, 5.4, 5.9)) }}>
        <path d="M228 114h24" style={{ stroke: 'var(--ink-3)', strokeWidth: 1.4, strokeDasharray: '3 3' }} fill="none" />
        <circle cx={240} cy={114} r={9} style={{ fill: 'var(--card)', stroke: 'var(--tango-fill)', strokeWidth: 1.2 }} />
        <Icon name="x" x={240} y={114} s={0.8} tone="tango" />
      </g>

      <g style={{ opacity: 0.35 + 0.65 * second }}>
        <Panel x={256} y={20} w={208} h={188} title="Tomorrow's session" active={second} tone="ink">
          <g style={{ opacity: smooth(seg(t, 6.5, 6.9)) }}>
            <rect x={272} y={48} width={176} height={46} rx={10} style={{ fill: 'var(--card-2)', stroke: 'var(--line-strong)' }} />
            <text x={284} y={67} style={{ fill: 'var(--ink)', fontSize: 10.5, fontWeight: 500, fontFamily: 'var(--sans)' }}>
              What is your goal? Can you
            </text>
            <text x={284} y={82} style={{ fill: 'var(--ink)', fontSize: 10.5, fontWeight: 500, fontFamily: 'var(--sans)' }}>
              upload the files again?
            </text>
          </g>
          <Label x={272} y={178} text="What it knows" tone="mute" anchor="start" size={10} />
          <rect x={272} y={186} width={176} height={6} rx={3} style={{ fill: 'var(--line)' }} />
          <Label x={448} y={178} text="0%" tone="tango" anchor="end" size={10} a={second} />
        </Panel>
      </g>
      <Tag x={360} y={232} text="You start over" tone="ink" a={smooth(seg(t, 7.0, 7.4))} />
    </g>
  );
};

/* ── It is fragmented ───────────────────────────────────────────────────────
   Each tool holds something the others need. Every hand-off hits a wall. */

const TOOLS = [
  { name: 'Chat', icon: 'chat' },
  { name: 'Search', icon: 'search' },
  { name: 'Docs', icon: 'docs' },
  { name: 'Code', icon: 'code' },
  { name: 'Vision', icon: 'vision' },
  { name: 'Voice', icon: 'voice' },
];
const BX = (i: number) => 88 + (i % 3) * 152;
const BY = (i: number) => 58 + Math.floor(i / 3) * 104;
const TRIES: { from: number; to: number; item: string }[] = [
  { from: 0, to: 1, item: 'Your question' },
  { from: 5, to: 4, item: 'Meeting audio' },
  { from: 2, to: 1, item: 'Survey notes' },
  { from: 4, to: 3, item: 'Chart image' },
];

export const fragmented: Draw = (t) => {
  const g = 1 - smooth(seg(t, 9.6, 10));
  const k = Math.min(3, Math.floor(t / 2.4));
  const l = t - k * 2.4;
  const { from: a, to: b, item } = TRIES[k];
  const dx = Math.sign(BX(b) - BX(a)), dy = Math.sign(BY(b) - BY(a));
  const sx = BX(a) + dx * 50, sy = BY(a) + dy * 38;
  const mx = (BX(a) + BX(b)) / 2, my = (BY(a) + BY(b)) / 2;
  const go = inOut(seg(l, 0.2, 1.0));
  const back_ = inOut(seg(l, 1.3, 2.1));
  const u = go * (1 - back_);
  const px = lerp(sx, mx - dx * 14, u), py = lerp(sy, my - dy * 10, u);
  const bump = tri(l, 0.9, 1.6);

  return (
    <g style={{ opacity: g }}>
      {[[0, 1], [1, 2], [3, 4], [4, 5], [0, 3], [1, 4], [2, 5]].map(([i, j], n) => {
        const cx = (BX(i) + BX(j)) / 2, cy = (BY(i) + BY(j)) / 2;
        const horizontal = BY(i) === BY(j);
        const hit = (i === a && j === b) || (i === b && j === a);
        return (
          <line key={n} x1={horizontal ? cx : cx - 16} x2={horizontal ? cx : cx + 16} y1={horizontal ? cy - 16 : cy} y2={horizontal ? cy + 16 : cy}
            style={{ stroke: hit && bump > 0 ? C.tango : 'var(--ink-3)', strokeWidth: hit && bump > 0 ? 2.6 : 1.6, strokeDasharray: '2 4', strokeLinecap: 'round' }} />
        );
      })}
      {TOOLS.map((tl, i) => {
        const lit = i === a ? window_(l, 0.1, 2.2, 0.2) : i === b ? bump : 0;
        return (
          <g key={tl.name}>
            <rect x={BX(i) - 44} y={BY(i) - 30} width={88} height={60} rx={12} style={{ fill: 'var(--card)', stroke: lit > 0.05 ? C.tango : 'var(--line-strong)', strokeWidth: 1 + lit * 0.7 }} />
            <Icon name={tl.icon} x={BX(i)} y={BY(i) - 6} s={1.2} tone={lit > 0.05 ? 'tango' : 'ink'} />
            <Label x={BX(i)} y={BY(i) + 20} text={tl.name} tone={lit > 0.05 ? 'tango' : 'mute'} />
          </g>
        );
      })}
      {go > 0.001 && <Chip x={px} y={py} w={20} h={10} tone="tango" lines={false} />}
      {bump > 0 && (
        <g style={{ opacity: bump }}>
          <circle cx={mx} cy={my} r={10} style={{ fill: 'var(--card)', stroke: C.tango, strokeWidth: 1.3 }} />
          <Icon name="x" x={mx} y={my} s={0.85} tone="tango" />
        </g>
      )}
      <Tag x={240} y={232} text={`${TOOLS[a].name} → ${TOOLS[b].name}: “${item}” is blocked`} tone="tango" a={window_(l, 0.1, 2.35, 0.2)} />
    </g>
  );
};

/* ── It stops learning ──────────────────────────────────────────────────────
   A model is trained in January. The months after keep happening. Ask it about
   any of them and it has no idea. */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
const TX = (i: number) => 58 + i * 62;
const TY = 150;
const EVENTS = [
  { m: 1, text: 'New policy', tone: 'tango' as Tone },
  { m: 2, text: 'Price change', tone: 'pitch' as Tone },
  { m: 4, text: 'New research', tone: 'tango' as Tone },
  { m: 6, text: 'Fresh data', tone: 'pitch' as Tone },
];

export const stops: Draw = (t) => {
  const g = 1 - smooth(seg(t, 11.4, 12));
  const run = seg(t, 0.8, 6.8);
  const head = lerp(TX(0), TX(6), run);
  const ask = smooth(seg(t, 7.4, 7.9));
  const reply = smooth(seg(t, 8.6, 9.0));

  return (
    <g style={{ opacity: g }}>
      {/* what the model knows: everything up to its training date */}
      <rect x={20} y={TY - 50} width={TX(0) + 10 - 20} height={62} rx={10} style={{ fill: 'var(--brand-soft)', stroke: C.violet, strokeWidth: 1.2 }} />
      <Icon name="snow" x={TX(0) - 10} y={TY - 34} s={0.7} tone="violet" />
      <Label x={TX(0) - 10} y={TY - 12} text="Trained" tone="violet" size={9.5} />

      {/* the timeline keeps running */}
      <line x1={20} x2={460} y1={TY} y2={TY} style={{ stroke: 'var(--line-strong)', strokeWidth: 1.4 }} />
      <line x1={TX(0) + 10} x2={head} y1={TY} y2={TY} style={{ stroke: C.tango, strokeWidth: 2 }} />
      {MONTHS.map((m, i) => (
        <g key={m}>
          <circle cx={TX(i)} cy={TY} r={3.5} style={{ fill: head >= TX(i) - 1 ? (i === 0 ? C.violet : C.tango) : 'var(--line-strong)' }} />
          <Label x={TX(i)} y={TY + 34} text={m} size={10} tone={i === 0 ? 'violet' : 'mute'} />
        </g>
      ))}
      <Label x={(TX(1) + TX(6)) / 2} y={TY + 56} text="Everything after training: never learned" tone="tango" size={10.5} a={smooth(seg(t, 2.4, 3))} />

      {EVENTS.map((e, i) => {
        const on = back(seg(t, 0.8 + (e.m / 6) * 6 - 0.3, 0.8 + (e.m / 6) * 6 + 0.15));
        const y = TY - 30 - (i % 2) * 28;
        return (
          <g key={e.text} style={{ opacity: Math.min(1, on) }}>
            <line x1={TX(e.m)} x2={TX(e.m)} y1={TY - 4} y2={y + 8} style={{ stroke: C[e.tone], strokeWidth: 1 }} />
            <Chip x={TX(e.m)} y={y} tone={e.tone} text={e.text} s={0.7 + 0.3 * on} />
          </g>
        );
      })}

      {/* a question about something recent */}
      <g style={{ opacity: ask }}>
        <rect x={20} y={18} width={200} height={28} rx={14} style={{ fill: 'var(--card)', stroke: 'var(--line-strong)' }} />
        <text x={34} y={36} style={{ fill: 'var(--ink)', fontSize: 10.5, fontWeight: 500, fontFamily: 'var(--sans)' }}>
          What changed in the new policy?
        </text>
      </g>
      <g style={{ opacity: reply }}>
        <rect x={234} y={18} width={226} height={28} rx={14} style={{ fill: 'var(--tango-soft)', stroke: C.tango }} />
        <Icon name="x" x={250} y={32} s={0.75} tone="tango" />
        <text x={262} y={36} style={{ fill: 'var(--tango-text)', fontSize: 10.5, fontWeight: 600, fontFamily: 'var(--sans)' }}>
          I have no information on that.
        </text>
      </g>
    </g>
  );
};

/* ── It works alone ─────────────────────────────────────────────────────────
   Three agents get the same report. Each writes the same summary, because none
   of them can see what the others did. */

const AG = [90, 240, 390];
const AY = 150;

export const alone: Draw = (t) => {
  const g = 1 - smooth(seg(t, 9.4, 10));
  const dl = (i: number) => inOut(seg(t, 0.4 + i * 0.25, 1.4 + i * 0.25));
  const work = (i: number) => seg(t, 1.8 + i * 0.1, 3.3);
  const done = smooth(seg(t, 3.2, 3.6));
  const tries = [
    { from: 0, to: 1, t0: 4.2 },
    { from: 2, to: 1, t0: 6.0 },
  ];
  return (
    <g style={{ opacity: g }}>
      <Chip x={240} y={30} tone="ink" text="Quarterly report" />

      {AG.map((x, i) => {
        const d = dl(i);
        const w = work(i);
        return (
          <g key={i}>
            <path d={`M240 42L${x} ${AY - 30}`} fill="none" style={{ stroke: 'var(--line)', strokeWidth: 1.2 }} />
            {d > 0 && d < 1 && <Chip x={lerp(240, x, d)} y={lerp(42, AY - 30, d)} w={20} h={10} tone="ink" lines={false} />}
            <circle cx={x} cy={AY} r={26} style={{ fill: 'var(--card)', stroke: w > 0 && w < 1 ? C.pitch : 'var(--line-strong)', strokeWidth: 1.4 }} />
            <Icon name="agent" x={x} y={AY} s={1.2} tone="ink" />
            {w > 0 && w < 1 && (
              <circle cx={x} cy={AY} r={33} fill="none" strokeLinecap="round" style={{ stroke: C.pitch, strokeWidth: 2, strokeDasharray: `${w * 60} 300`, transform: `rotate(${w * 300 - 90}deg)`, transformOrigin: `${x}px ${AY}px` }} />
            )}
            <Label x={x} y={AY + 44} text={`Agent ${i + 1}`} tone="mute" />
            <Chip x={x} y={AY + 66} tone="pitch" text="Same summary" a={done} />
          </g>
        );
      })}

      {tries.map((r, n) => {
        const u = seg(t, r.t0, r.t0 + 0.9);
        const back_ = seg(t, r.t0 + 1.1, r.t0 + 1.8);
        const f = 0.42 * inOut(u) * (1 - inOut(back_));
        const dir = AG[r.to] > AG[r.from] ? 1 : -1;
        const x0 = AG[r.from] + dir * 30, x1 = AG[r.to] - dir * 30;
        const hit = tri(t, r.t0 + 0.75, r.t0 + 1.35);
        const wx = lerp(x0, x1, 0.5);
        return (
          <g key={n}>
            <line x1={x0} x2={x1} y1={AY} y2={AY} style={{ stroke: 'var(--ink-3)', strokeWidth: 1.3, strokeDasharray: '2 5', opacity: seg(t, r.t0 - 0.2, r.t0) * (1 - seg(t, r.t0 + 1.8, r.t0 + 2)) }} />
            {u > 0 && back_ < 1 && <Chip x={lerp(x0, x1, f)} y={AY} w={18} h={9} tone="pitch" lines={false} />}
            {hit > 0 && (
              <g style={{ opacity: hit }}>
                <circle cx={wx} cy={AY} r={9} style={{ fill: 'var(--card)', stroke: C.tango }} />
                <Icon name="x" x={wx} y={AY} s={0.8} tone="tango" />
              </g>
            )}
          </g>
        );
      })}
      <Tag x={240} y={78} text="Can't see each other's work" tone="tango" a={window_(t, 4.4, 7.8, 0.3)} />
    </g>
  );
};
