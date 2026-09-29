import { Chip, C, Icon, Label, Lines, Panel, Tag, type Tone } from './atoms';
import { inOut, lerp, out, back, seg, smooth, tri, window_ } from './math';
import type { Draw } from './Diagram';

/* ── It forgets ───────────────────────────────────────────────────────────── */

const CHIPS = [
  { x: 64, y: 84, tone: 'tango' as Tone },
  { x: 144, y: 84, tone: 'pitch' as Tone },
  { x: 64, y: 122, tone: 'pitch' as Tone },
  { x: 144, y: 122, tone: 'tango' as Tone },
  { x: 64, y: 160, tone: 'tango' as Tone },
  { x: 144, y: 160, tone: 'pitch' as Tone },
];

export const forgets: Draw = (t) => {
  const g = 1 - smooth(seg(t, 9.4, 10));
  const drain = CHIPS.map((_, i) => seg(t, 4.6 + i * 0.2, 5.6 + i * 0.2));
  const kept = CHIPS.reduce((n, _, i) => n + smooth(seg(t, 0.5 + i * 0.5, 0.9 + i * 0.5)) * (1 - smooth(drain[i])), 0);
  const second = smooth(seg(t, 6, 6.6));

  return (
    <g style={{ opacity: g }}>
      <Panel x={20} y={28} w={200} h={196} title="Session 1" active={1 - second} tone="tango">
        {CHIPS.map((c, i) => {
          const a = back(seg(t, 0.5 + i * 0.5, 0.95 + i * 0.5));
          const d = inOut(drain[i]);
          return <Chip key={i} x={c.x} y={c.y + d * 70} w={62} h={26} tone={c.tone} s={0.6 + 0.4 * a} a={a * (1 - out(seg(drain[i], 0.4, 1)))} />;
        })}
        {/* how much context the session holds */}
        <rect x={40} y={196} width={160} height={6} rx={3} style={{ fill: 'var(--line)' }} />
        <rect x={40} y={196} width={Math.max(0, 160 * (kept / CHIPS.length))} height={6} rx={3} style={{ fill: C.tango }} />
        <Label x={40} y={190} text="Context" tone="mute" anchor="start" size={10} />
      </Panel>
      <Tag x={120} y={250} text="Session ends" tone="tango" a={smooth(seg(t, 4.3, 4.7))} />

      {/* nothing crosses to the next one */}
      <g style={{ opacity: smooth(seg(t, 5.6, 6.2)) }}>
        <path d="M228 126h24" style={{ stroke: 'var(--ink-3)', strokeWidth: 1.4, strokeDasharray: '3 3' }} fill="none" />
        <circle cx={240} cy={126} r={9} style={{ fill: 'var(--card)', stroke: 'var(--tango-fill)', strokeWidth: 1.2 }} />
        <Icon name="x" x={240} y={126} s={0.8} tone="tango" />
      </g>

      <g style={{ opacity: 0.35 * (1 - second) }}>
        <Panel x={260} y={28} w={200} h={196} title="Next session" active={0} tone="ink" />
      </g>
      <g style={{ opacity: second }}>
        <Panel x={260} y={28} w={200} h={196} title="Next session" active={second} tone="ink">
          <rect x={280} y={62} width={26} height={18} rx={9} style={{ fill: C.tango }} />
          <text x={293} y={75} textAnchor="middle" style={{ fill: '#fff', fontSize: 12, fontWeight: 600, fontFamily: 'var(--sans)' }}>?</text>
          <Lines x={316} y={68} w={120} n={1} />
          <rect x={280} y={104} width={2} height={14} style={{ fill: 'var(--ink)', opacity: Math.floor(t * 2) % 2 ? 0 : 0.8 }} />
          <rect x={280} y={196} width={160} height={6} rx={3} style={{ fill: 'var(--line)' }} />
          <Label x={280} y={190} text="Context" tone="mute" anchor="start" size={10} />
        </Panel>
        <Tag x={360} y={250} text="Starts from zero" tone="ink" a={smooth(seg(t, 6.8, 7.2))} />
      </g>
    </g>
  );
};

/* ── It is fragmented ─────────────────────────────────────────────────────── */

const TOOLS = [
  { name: 'Chat', icon: 'chat' },
  { name: 'Search', icon: 'search' },
  { name: 'Docs', icon: 'docs' },
  { name: 'Code', icon: 'code' },
  { name: 'Vision', icon: 'vision' },
  { name: 'Voice', icon: 'voice' },
];
const BX = (i: number) => 88 + (i % 3) * 152;
const BY = (i: number) => 76 + Math.floor(i / 3) * 112;
const TRIES: [number, number][] = [[0, 1], [4, 5], [1, 4], [3, 4]];

export const fragmented: Draw = (t) => {
  const g = 1 - smooth(seg(t, 9.4, 10));
  const k = Math.min(3, Math.floor(t / 2.35));
  const l = t - k * 2.35;
  const [a, b] = TRIES[k];
  const go = inOut(seg(l, 0.2, 1.0));
  const back_ = inOut(seg(l, 1.25, 2.0));
  const u = 0.5 * go * (1 - back_);
  const dx = Math.sign(BX(b) - BX(a)), dy = Math.sign(BY(b) - BY(a));
  const sx = BX(a) + dx * 50, sy = BY(a) + dy * 38;
  const mx = (BX(a) + BX(b)) / 2, my = (BY(a) + BY(b)) / 2;
  const px = lerp(sx, mx - dx * 8, u * 2), py = lerp(sy, my - dy * 8, u * 2);
  const bump = tri(l, 0.9, 1.5);

  return (
    <g style={{ opacity: g }}>
      {/* the walls between tools */}
      {[[0, 1], [1, 2], [3, 4], [4, 5], [0, 3], [1, 4], [2, 5]].map(([i, j], n) => {
        const cx = (BX(i) + BX(j)) / 2, cy = (BY(i) + BY(j)) / 2;
        const horizontal = BY(i) === BY(j);
        const hit = (i === a && j === b) || (i === b && j === a);
        return (
          <line key={n} x1={horizontal ? cx : cx - 14} x2={horizontal ? cx : cx + 14} y1={horizontal ? cy - 14 : cy} y2={horizontal ? cy + 14 : cy}
            style={{ stroke: hit && bump > 0 ? C.tango : 'var(--ink-3)', strokeWidth: hit && bump > 0 ? 2.6 : 1.6, strokeDasharray: '2 4', strokeLinecap: 'round' }} />
        );
      })}
      {TOOLS.map((tl, i) => {
        const sender = i === a;
        const lit = sender ? window_(l, 0.1, 2.1, 0.2) : 0;
        const shake = sender && l > 1.0 && l < 1.5 ? Math.sin(l * 60) * 1.6 * bump : 0;
        return (
          <g key={tl.name} style={{ transform: `translate(${shake}px, 0)` }}>
            <rect x={BX(i) - 44} y={BY(i) - 32} width={88} height={64} rx={12} style={{ fill: 'var(--card)', stroke: lit > 0.05 ? C.tango : 'var(--line-strong)', strokeWidth: 1 + lit * 0.7 }} />
            <Icon name={tl.icon} x={BX(i)} y={BY(i) - 6} s={1.25} tone={lit > 0.05 ? 'tango' : 'ink'} />
            <Label x={BX(i)} y={BY(i) + 21} text={tl.name} tone={lit > 0.05 ? 'tango' : 'mute'} />
          </g>
        );
      })}
      {go > 0.001 && <Chip x={px} y={py} w={26} h={13} tone="tango" />}
      {bump > 0 && (
        <g style={{ opacity: bump }}>
          <circle cx={mx} cy={my} r={10} style={{ fill: 'var(--card)', stroke: C.tango, strokeWidth: 1.3 }} />
          <Icon name="x" x={mx} y={my} s={0.85} tone="tango" />
        </g>
      )}
      <Tag x={240} y={282} text="6 tools, no shared memory" tone="ink" />
    </g>
  );
};

/* ── It stops learning ────────────────────────────────────────────────────── */

const MONTHS = 7;
const KNOWN = 74;
const BASE = 246;
const worldH = (i: number) => 62 + i * 25;

export const stops: Draw = (t) => {
  const g = 1 - smooth(seg(t, 11.3, 12));
  const cx = (i: number) => 64 + i * 60;
  const lastIn = smooth(seg(t, 8.2, 9.0));

  return (
    <g style={{ opacity: g }}>
      <path d={`M36 30V${BASE}H452`} fill="none" style={{ stroke: 'var(--line-strong)', strokeWidth: 1.2 }} />
      <Label x={452} y={BASE + 20} text="Time after training" anchor="end" size={10.5} />

      {Array.from({ length: MONTHS }, (_, i) => {
        const grow = out(seg(t, 0.4 + i * 0.85, 1.3 + i * 0.85));
        const h = worldH(i) * grow;
        const known = Math.min(h, KNOWN);
        const unknown = Math.max(0, h - KNOWN);
        return (
          <g key={i}>
            <rect x={cx(i) - 16} y={BASE - known} width={32} height={known} rx={i === 0 ? 4 : 0} style={{ fill: 'var(--line-strong)' }} />
            {unknown > 0 && <rect x={cx(i) - 16} y={BASE - h} width={32} height={unknown} rx={4} style={{ fill: C.tango, opacity: 0.9 }} />}
          </g>
        );
      })}

      {/* what the model knows stays where it was */}
      <line x1={36} x2={452} y1={BASE - KNOWN} y2={BASE - KNOWN} style={{ stroke: 'var(--ink)', strokeWidth: 1.4, strokeDasharray: '5 4' }} />
      <g style={{ opacity: smooth(seg(t, 0.3, 0.9)) }}>
        <rect x={40} y={20} width={10} height={10} rx={3} style={{ fill: 'var(--line-strong)' }} />
        <Icon name="snow" x={62} y={25} s={0.6} tone="ink" />
        <Label x={72} y={29} text="What the model knows" tone="ink" anchor="start" size={10.5} />
        <rect x={220} y={20} width={10} height={10} rx={3} style={{ fill: C.tango }} />
        <Label x={236} y={29} text="What has happened since" tone="tango" anchor="start" size={10.5} />
      </g>

      <g style={{ opacity: lastIn }}>
        <path d={`M${cx(MONTHS - 1) + 26} ${BASE - KNOWN}v${-(worldH(MONTHS - 1) - KNOWN)}`} fill="none" style={{ stroke: 'var(--tango-fill)', strokeWidth: 1.4 }} />
        <Tag x={cx(MONTHS - 1) - 34} y={BASE - worldH(MONTHS - 1) - 16} text="Never learned" tone="tango" />
      </g>
    </g>
  );
};

/* ── It works alone ───────────────────────────────────────────────────────── */

const AG = [90, 240, 390];
const AY = 210;

export const alone: Draw = (t) => {
  const g = 1 - smooth(seg(t, 9.4, 10));
  const dl = (i: number) => inOut(seg(t, 0.4 + i * 0.25, 1.5 + i * 0.25));
  const work = (i: number) => seg(t, 1.9 + i * 0.1, 3.4);
  const tries = [
    { from: 0, to: 1, t0: 4.0 },
    { from: 2, to: 1, t0: 6.0 },
  ];
  return (
    <g style={{ opacity: g }}>
      {/* one source, read three times */}
      <rect x={216} y={22} width={48} height={48} rx={12} style={{ fill: 'var(--card)', stroke: 'var(--line-strong)' }} />
      <Icon name="docs" x={240} y={46} s={1.25} tone="ink" />
      <Label x={240} y={86} text="Same document" tone="mute" />

      {AG.map((x, i) => {
        const d = dl(i);
        const done = smooth(seg(t, 3.2, 3.7));
        return (
          <g key={i}>
            <path d={`M240 96L${x} ${AY - 52}`} fill="none" style={{ stroke: 'var(--line)', strokeWidth: 1.2 }} />
            {d > 0 && d < 1 && <Chip x={lerp(240, x, d)} y={lerp(96, AY - 52, d)} w={24} h={12} tone="pitch" />}
            <circle cx={x} cy={AY} r={30} style={{ fill: 'var(--card)', stroke: work(i) > 0 && work(i) < 1 ? C.pitch : 'var(--line-strong)', strokeWidth: 1.4 }} />
            <Icon name="agent" x={x} y={AY} s={1.3} tone="ink" />
            {work(i) > 0 && work(i) < 1 && (
              <circle cx={x} cy={AY} r={38} fill="none" strokeLinecap="round" style={{ stroke: C.pitch, strokeWidth: 2, strokeDasharray: `${work(i) * 60} 300`, transform: `rotate(${work(i) * 300 - 90}deg)`, transformOrigin: `${x}px ${AY}px` }} />
            )}
            <Chip x={x} y={AY - 52} w={30} h={14} tone="pitch" a={done} />
            <Label x={x} y={AY + 52} text={`Agent ${i + 1}`} tone="mute" />
          </g>
        );
      })}

      {/* they reach for each other and never connect */}
      {tries.map((r, n) => {
        const u = seg(t, r.t0, r.t0 + 0.9);
        const back_ = seg(t, r.t0 + 1.1, r.t0 + 1.8);
        const f = 0.42 * inOut(u) * (1 - inOut(back_));
        const x0 = AG[r.from] + (AG[r.to] > AG[r.from] ? 32 : -32), x1 = AG[r.to] + (AG[r.to] > AG[r.from] ? -32 : 32);
        const mx = lerp(x0, x1, f);
        const hit = tri(t, r.t0 + 0.75, r.t0 + 1.35);
        const wx = lerp(x0, x1, 0.5);
        return (
          <g key={n}>
            <line x1={x0} x2={x1} y1={AY} y2={AY} style={{ stroke: 'var(--ink-3)', strokeWidth: 1.3, strokeDasharray: '2 5', opacity: seg(t, r.t0 - 0.2, r.t0) * (1 - seg(t, r.t0 + 1.8, r.t0 + 2)) }} />
            {u > 0 && back_ < 1 && <Chip x={mx} y={AY} w={22} h={11} tone="pitch" lines={false} />}
            {hit > 0 && (
              <g style={{ opacity: hit }}>
                <circle cx={wx} cy={AY} r={9} style={{ fill: 'var(--card)', stroke: C.tango }} />
                <Icon name="x" x={wx} y={AY} s={0.8} tone="tango" />
              </g>
            )}
          </g>
        );
      })}
      <Tag x={240} y={286} text="The same work, three times" tone="ink" a={smooth(seg(t, 3.7, 4.2))} />
    </g>
  );
};
