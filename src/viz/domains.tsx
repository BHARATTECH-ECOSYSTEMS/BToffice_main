import { Chip, C, Icon, Label, Tag, type Tone } from './atoms';
import { inOut, lerp, seg, smooth, tri, window_ } from './math';
import type { Draw } from './Diagram';

export const DOMAIN_W = 320;
export const DOMAIN_H = 180;

const fadeEnd = (t: number) => 1 - smooth(seg(t, 7.4, 8));

/* 01 · GI Rivinity: learns continuously and keeps what it learns */
const rivinity: Draw = (t) => {
  const g = fadeEnd(t);
  const chips = [0.3, 1.4, 2.5, 3.6, 4.7, 5.8];
  const grown = chips.filter((c) => t > c + 0.9).length;
  return (
    <g style={{ opacity: g }}>
      <rect x={140} y={40} width={90} height={100} rx={12} style={{ fill: 'var(--card)', stroke: C.violet, strokeWidth: 1.4 }} />
      <Label x={185} y={58} text="Model" tone="violet" size={10} />
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x={152} y={128 - (i + 1) * 12} width={66} height={8} rx={4} style={{ fill: i < grown ? C.violet : 'var(--line)', opacity: i < grown ? 0.35 + i * 0.13 : 1 }} />
      ))}
      {chips.map((c, i) => {
        const u = inOut(seg(t, c, c + 0.9));
        return u > 0 && u < 1 ? <Chip key={i} x={lerp(30, 140, u)} y={lerp(70 + (i % 3) * 20, 108 - i * 6, u)} w={26} h={12} tone={i % 2 ? 'pitch' : 'tango'} a={1 - seg(u, 0.85, 1)} /> : null;
      })}
      <Label x={40} y={160} text="New experience" tone="mute" size={9.5} />
      <Label x={250} y={94} text="Keeps it" tone="violet" anchor="start" size={9.5} a={smooth(seg(t, 1.5, 2.2))} />
      <Icon name="check" x={262} y={78} tone="violet" a={smooth(seg(t, 1.5, 2.2))} />
    </g>
  );
};

/* 02 · Rivinity Core: one layer routes between many systems */
const core: Draw = (t) => {
  const g = fadeEnd(t);
  const L = [46, 90, 134], R = [46, 90, 134];
  const pairs: [number, number][] = [[0, 2], [1, 0], [2, 1], [0, 1]];
  const k = Math.min(3, Math.floor(t / 2));
  const l = t - k * 2;
  const [a, b] = pairs[k];
  const u1 = inOut(seg(l, 0.1, 0.9)), u2 = inOut(seg(l, 0.9, 1.7));
  return (
    <g style={{ opacity: g }}>
      {L.map((y, i) => <line key={`l${i}`} x1={76} y1={y} x2={160} y2={90} style={{ stroke: i === a ? C.violet : 'var(--line-strong)', strokeWidth: i === a ? 1.6 : 1 }} />)}
      {R.map((y, i) => <line key={`r${i}`} x1={160} y1={90} x2={244} y2={y} style={{ stroke: i === b && u1 > 0.9 ? C.violet : 'var(--line-strong)', strokeWidth: i === b && u1 > 0.9 ? 1.6 : 1 }} />)}
      {['Language', 'Vision', 'Geo'].map((n, i) => (
        <g key={n}>
          <rect x={20} y={L[i] - 14} width={56} height={28} rx={8} style={{ fill: 'var(--card)', stroke: i === a ? C.tango : 'var(--line-strong)' }} />
          <Label x={48} y={L[i] + 3.5} text={n} tone={i === a ? 'tango' : 'mute'} size={9.5} />
        </g>
      ))}
      {['App', 'Agent', 'API'].map((n, i) => (
        <g key={n}>
          <rect x={244} y={R[i] - 14} width={56} height={28} rx={8} style={{ fill: 'var(--card)', stroke: i === b && u2 > 0.9 ? C.violet : 'var(--line-strong)' }} />
          <Label x={272} y={R[i] + 3.5} text={n} tone={i === b && u2 > 0.9 ? 'violet' : 'mute'} size={9.5} />
        </g>
      ))}
      <circle cx={160} cy={90} r={22} style={{ fill: C.violet }} />
      <Icon name="memory" x={160} y={90} s={1} tone="white" />
      {u1 > 0 && u1 < 1 && <Chip x={lerp(76, 160, u1)} y={lerp(L[a], 90, u1)} w={20} h={10} tone="pitch" lines={false} />}
      {u2 > 0 && u2 < 1 && <Chip x={lerp(160, 244, u2)} y={lerp(90, R[b], u2)} w={20} h={10} tone="pitch" lines={false} />}
    </g>
  );
};

/* 03 · IoT Intelligence: devices that sense, decide and act */
const iot: Draw = (t) => {
  const g = fadeEnd(t);
  const l = t % 4;
  const S = [50, 90, 130];
  const sense = inOut(seg(l, 0.1, 1.2));
  const act = inOut(seg(l, 1.6, 2.6));
  const on = window_(l, 2.6, 3.8, 0.2);
  return (
    <g style={{ opacity: g }}>
      {S.map((y, i) => (
        <g key={i}>
          <line x1={62} y1={y} x2={140} y2={90} style={{ stroke: 'var(--line-strong)' }} />
          <circle cx={46} cy={y} r={14} style={{ fill: 'var(--card)', stroke: i === Math.floor(t / 4) % 3 && l < 1.3 ? C.pitch : 'var(--line-strong)' }} />
          <path d={`M39 ${y}h3l2-5 3 10 2-5h3`} fill="none" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'var(--ink-2)' }} />
        </g>
      ))}
      <rect x={140} y={66} width={50} height={48} rx={12} style={{ fill: 'var(--card)', stroke: C.violet, strokeWidth: 1.4 }} />
      <Icon name="agent" x={165} y={90} s={1.1} tone="violet" />
      <Label x={165} y={130} text="Decides locally" tone="violet" size={9.5} />
      <line x1={190} y1={90} x2={250} y2={90} style={{ stroke: 'var(--line-strong)' }} />
      <rect x={250} y={68} width={44} height={44} rx={22} style={{ fill: on > 0.05 ? C.pitch : 'var(--card)', stroke: on > 0.05 ? C.pitch : 'var(--line-strong)', opacity: 1 }} />
      <Icon name="check" x={272} y={90} s={1.1} tone={on > 0.05 ? 'white' : 'mute'} />
      <Label x={272} y={130} text="Acts" tone={on > 0.05 ? 'pitch' : 'mute'} size={9.5} />
      {sense > 0 && sense < 1 && <Chip x={lerp(46, 140, sense)} y={lerp(S[Math.floor(t / 4) % 3], 90, sense)} w={18} h={9} tone="pitch" lines={false} />}
      {act > 0 && act < 1 && <Chip x={lerp(190, 250, act)} y={90} w={18} h={9} tone="violet" lines={false} />}
      <Label x={46} y={166} text="Sense" tone="mute" size={9.5} />
    </g>
  );
};

/* 04 · Geo Intelligence: reads the physical world and flags what changed */
const geo: Draw = (t) => {
  const g = fadeEnd(t);
  const cols = 8, rows = 4;
  const scan = seg(t, 0.4, 5.6);
  const changed = new Set([5, 13, 18, 26]);
  return (
    <g style={{ opacity: g }}>
      {Array.from({ length: cols * rows }, (_, n) => {
        const cx = n % cols, cy = Math.floor(n / cols);
        const x = 26 + cx * 34, y = 40 + cy * 28;
        const seen = scan * cols > cx + 0.5;
        const flag = changed.has(n) && scan * cols > cx + 1.2;
        return (
          <g key={n}>
            <rect x={x} y={y} width={30} height={24} rx={5} style={{ fill: flag ? 'var(--tango-soft)' : seen ? 'var(--brand-soft)' : 'var(--fill)', stroke: flag ? C.tango : 'var(--line)', strokeWidth: flag ? 1.3 : 1 }} />
            {flag && <circle cx={x + 15} cy={y + 12} r={3.4} style={{ fill: C.tango }} />}
          </g>
        );
      })}
      <line x1={26 + scan * 272} x2={26 + scan * 272} y1={30} y2={156} style={{ stroke: C.violet, strokeWidth: 1.6, opacity: scan > 0 && scan < 1 ? 1 : 0 }} />
      <g style={{ transform: `translate(${26 + scan * 272}px, 20px)`, opacity: scan > 0 && scan < 1 ? 1 : 0.0 }}>
        <rect x={-10} y={-6} width={20} height={12} rx={3} style={{ fill: C.violet }} />
        <rect x={-18} y={-2} width={6} height={4} style={{ fill: C.violet }} />
        <rect x={12} y={-2} width={6} height={4} style={{ fill: C.violet }} />
      </g>
      <Tag x={160} y={170} text="Changes flagged" tone="tango" a={smooth(seg(t, 3.8, 4.4))} />
    </g>
  );
};

/* 05 · Defense Intelligence: only what is trusted gets through */
const defense: Draw = (t) => {
  const g = fadeEnd(t);
  const attempts = [
    { a: 200, bad: true, t0: 0.3 },
    { a: 20, bad: false, t0: 1.7 },
    { a: 330, bad: true, t0: 3.2 },
    { a: 140, bad: false, t0: 4.6 },
    { a: 250, bad: true, t0: 6.0 },
  ];
  const cx = 160, cy = 90;
  return (
    <g style={{ opacity: g }}>
      <ellipse cx={cx} cy={cy} rx={104} ry={70} fill="none" style={{ stroke: C.violet, strokeWidth: 1.4, strokeDasharray: '4 5', opacity: 0.8 }} />
      <circle cx={cx} cy={cy} r={24} style={{ fill: C.violet }} />
      <Icon name="shield" x={cx} y={cy} s={1.3} tone="white" />
      {attempts.map((q, i) => {
        const u = seg(t, q.t0, q.t0 + 1.5);
        if (u <= 0 || u >= 1) return null;
        const ang = (q.a * Math.PI) / 180;
        const ex = cx + Math.cos(ang) * 104, ey = cy + Math.sin(ang) * 70;
        const sx = cx + Math.cos(ang) * 150, sy = cy + Math.sin(ang) * 100;
        const stop = q.bad ? 0.55 : 1;
        const m = inOut(clamp01(u / stop));
        const x = lerp(sx, q.bad ? ex : cx, m), y = lerp(sy, q.bad ? ey : cy, m);
        const blocked = q.bad && u > 0.55;
        return (
          <g key={i}>
            {!blocked && <Chip x={x} y={y} w={16} h={9} tone={q.bad ? 'tango' : 'pitch'} lines={false} a={1 - (q.bad ? 0 : seg(u, 0.85, 1))} />}
            {blocked && (
              <g style={{ opacity: 1 - seg(u, 0.75, 1) }}>
                <circle cx={ex} cy={ey} r={8 + 6 * seg(u, 0.55, 0.75)} style={{ fill: 'none', stroke: C.tango, strokeWidth: 1.3 }} />
                <Icon name="x" x={ex} y={ey} s={0.7} tone="tango" />
              </g>
            )}
          </g>
        );
      })}
      <Label x={cx} y={172} text="Verified in, threats out" tone="mute" size={9.5} />
    </g>
  );
};
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/* 06 · Miniature Intelligence: small models on the device, still connected */
const miniature: Draw = (t) => {
  const g = fadeEnd(t);
  const l = t % 4;
  const ask = inOut(seg(l, 0.1, 0.6));
  const answer = inOut(seg(l, 0.7, 1.2));
  const sync = inOut(seg(l, 1.6, 3.2));
  return (
    <g style={{ opacity: g }}>
      <rect x={100} y={16} width={120} height={38} rx={10} style={{ fill: 'var(--card)', stroke: 'var(--line-strong)' }} />
      <Label x={160} y={39} text="Larger network" tone="mute" size={10} />
      <line x1={160} y1={54} x2={160} y2={104} style={{ stroke: 'var(--line-strong)', strokeDasharray: '3 4' }} />
      <rect x={112} y={104} width={96} height={64} rx={14} style={{ fill: 'var(--card)', stroke: C.violet, strokeWidth: 1.4 }} />
      <rect x={128} y={116} width={30} height={30} rx={8} style={{ fill: C.violet }} />
      <Icon name="memory" x={143} y={131} s={0.9} tone="white" />
      <Label x={186} y={135} text="Small" tone="violet" size={9.5} />
      <Label x={160} y={160} text="On the device" tone="mute" size={9.5} />
      {ask > 0 && ask < 1 && <Chip x={lerp(70, 128, ask)} y={131} w={16} h={9} tone="pitch" lines={false} />}
      {answer > 0 && answer < 1 && <Chip x={lerp(128, 70, answer)} y={131} w={16} h={9} tone="violet" lines={false} />}
      <Tag x={54} y={131} text="You" tone="ink" />
      {sync > 0 && sync < 1 && <Chip x={160} y={lerp(104, 54, tri(sync, 0, 1) * 1)} w={14} h={8} tone="tango" lines={false} a={tri(sync, 0, 1)} />}
      <Label x={236} y={82} text="Syncs when it can" tone="mute" size={9.5} anchor="start" a={smooth(seg(l, 1.6, 2.2))} />
    </g>
  );
};

export const DOMAIN_DRAWS: Draw[] = [rivinity, core, iot, geo, defense, miniature];
export const DOMAIN_LABELS = [
  'A model takes in new experience and keeps what it learns',
  'One layer routes work between language, vision and geo systems and the apps that use them',
  'Sensors send readings to a local decision, which triggers an action',
  'A satellite scans a grid of map tiles and flags the ones that changed',
  'A perimeter lets verified requests through and blocks threats',
  'A small model answers on the device and syncs with the larger network when it can',
];
export const DOMAIN_STILL = [5, 3, 2.4, 6, 3.2, 1.9];
export type { Tone };
