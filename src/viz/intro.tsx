import { Chip, C, Icon, Label, Lines, Panel, Tag, type Tone } from './atoms';
import { clamp, inOut, lerp, out, seg, smooth, window_ } from './math';
import type { Draw } from './Diagram';

/* ── It remembers ─────────────────────────────────────────────────────────── */

const CARD_X = [24, 180, 336];
const WHEN = ['Monday', 'Thursday', 'Next week'];
const SLOT = [
  { x: 150, tone: 'tango' as Tone, from: 0, at: 1.2 },
  { x: 214, tone: 'violet' as Tone, from: 1, at: 5.0 },
  { x: 278, tone: 'pitch' as Tone, from: 1, at: 5.5 },
];
const FLIGHT = 1.3;

export const remember: Draw = (t, p) => {
  const g = 1 - smooth(seg(t, 11.3, 12));
  const act = [window_(t, 0.2, 3.6), window_(t, 4.0, 7.4), window_(t, 8.0, 11.4)];
  const recall = window_(t, 8.6, 11.4);
  const hot = p.on > 0.3 ? SLOT.findIndex((s) => Math.abs(p.x - s.x) < 24 && Math.abs(p.y - 228) < 24 && t > s.at + FLIGHT) : -1;

  return (
    <g style={{ opacity: g }}>
      {/* memory */}
      <rect x={24} y={172} width={432} height={100} rx={12} style={{ fill: 'var(--card-2)', stroke: recall > 0.05 ? C.violet : 'var(--line-strong)', strokeWidth: 1 + recall * 0.6 }} />
      <Label x={40} y={194} text="Memory" tone={recall > 0.05 ? 'violet' : 'mute'} anchor="start" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={132 + i * 64} y={212} width={38} height={32} rx={7} style={{ fill: 'none', stroke: 'var(--line-strong)', strokeDasharray: '3 3' }} />
      ))}

      {/* sessions */}
      {CARD_X.map((x, i) => (
        <Panel key={i} x={x} y={24} w={120} h={84} title={WHEN[i]} active={act[i]} tone="violet">
          <Lines x={x + 12} y={62} w={96} n={i === 2 ? 1 : 2} a={smooth(seg(t, [0.3, 4.1, 8.2][i], [1.0, 4.8, 8.8][i]))} />
        </Panel>
      ))}

      {/* the question in session three */}
      <g style={{ opacity: smooth(seg(t, 8.5, 8.9)) }}>
        <rect x={CARD_X[2] + 12} y={56} width={22} height={16} rx={8} style={{ fill: C.tango }} />
        <text x={CARD_X[2] + 23} y={68} textAnchor="middle" style={{ fill: '#fff', fontSize: 11, fontWeight: 600, fontFamily: 'var(--sans)' }}>?</text>
        <Lines x={CARD_X[2] + 40} y={62} w={68} n={1} />
      </g>

      {/* notes leaving sessions one and two, and staying */}
      {SLOT.map((s, i) => {
        const u = inOut(seg(t, s.at, s.at + FLIGHT));
        const sx = CARD_X[s.from] + 60, sy = 116;
        const x = lerp(sx + (i === 2 ? 14 : i === 1 ? -14 : 0), s.x + 0, u), y = lerp(sy, 228, u);
        const born = smooth(seg(t, s.at - 0.25, s.at));
        const h = hot === i;
        return <Chip key={i} x={x} y={y} w={h ? 40 : 34} h={h ? 20 : 17} tone={s.tone} a={born * (hot >= 0 && !h ? 0.4 : 1)} />;
      })}

      {/* recall: copies rise from memory into session three */}
      {SLOT.map((s, i) => {
        const t0 = 9.0 + i * 0.22;
        const u = inOut(seg(t, t0, t0 + 1.2));
        const tx = CARD_X[2] + 32 + i * 28, ty = 92;
        const x = lerp(s.x, tx, u), y = lerp(228, ty, u);
        return <Chip key={`r${i}`} x={x} y={y} w={22} h={11} tone={s.tone} lines={false} a={u > 0 && u < 1 ? 1 : u >= 1 ? recall : 0} />;
      })}
      <g style={{ opacity: smooth(seg(t, 10.4, 10.8)) * recall }}>
        <circle cx={CARD_X[2] + 104} cy={38} r={8} style={{ fill: C.violet }} />
        <Icon name="check" x={CARD_X[2] + 104} y={38} s={0.85} tone="white" />
      </g>

      {hot >= 0 && <Tag x={SLOT[hot].x} y={262} text={`From ${WHEN[SLOT[hot].from]}`} tone={SLOT[hot].tone} />}
    </g>
  );
};

/* ── It connects ──────────────────────────────────────────────────────────── */

const SYSTEMS = [
  { name: 'Chat', icon: 'chat', tone: 'violet' as Tone },
  { name: 'Docs', icon: 'docs', tone: 'tango' as Tone },
  { name: 'Search', icon: 'search', tone: 'pitch' as Tone },
  { name: 'Voice', icon: 'voice', tone: 'violet' as Tone },
  { name: 'Vision', icon: 'vision', tone: 'tango' as Tone },
  { name: 'Code', icon: 'code', tone: 'pitch' as Tone },
];
const HUB = { x: 240, y: 148, r: 30 };
const NODES = SYSTEMS.map((_, k) => {
  const a = ((-90 + 60 * k) * Math.PI) / 180;
  return { x: 240 + 178 * Math.cos(a), y: 148 + 100 * Math.sin(a) };
});
const SEQ = [1, 3, 4];

export const connect: Draw = (t, p) => {
  const hover = p.on > 0.3 ? NODES.findIndex((n) => Math.abs(p.x - n.x) < 30 && Math.abs(p.y - n.y) < 30) : -1;
  const src = hover >= 0 ? hover : SEQ[Math.floor(t / 4) % 3];
  const l = t % 4;
  const up = inOut(seg(l, 0.3, 1.3));
  const pulse = seg(l, 1.3, 2.0);
  const S = NODES[src];

  return (
    <g>
      {NODES.map((n, k) => (
        <line key={k} x1={HUB.x} y1={HUB.y} x2={n.x} y2={n.y} style={{ stroke: 'var(--line-strong)', strokeWidth: 1.2 }} />
      ))}

      {/* hub */}
      <circle cx={HUB.x} cy={HUB.y} r={HUB.r + 22 * out(pulse)} style={{ fill: 'none', stroke: C.violet, strokeWidth: 1.4, opacity: pulse > 0 && pulse < 1 ? 0.5 * (1 - pulse) : 0 }} />
      <circle cx={HUB.x} cy={HUB.y} r={HUB.r} style={{ fill: C.violet }} />
      <Icon name="memory" x={HUB.x} y={HUB.y - 1} s={1.25} tone="white" />
      <Label x={HUB.x} y={HUB.y + HUB.r + 18} text="Shared memory" tone="violet" />

      {SYSTEMS.map((s, k) => {
        const n = NODES[k];
        const isSrc = k === src;
        const delay = 0.05 * ((k - src + 6) % 6);
        const arrive = inOut(seg(l, 1.6 + delay, 2.6 + delay));
        const got = !isSrc ? window_(l, 2.6 + delay, 3.9, 0.25) : 0;
        const lit = isSrc ? window_(l, 0.05, 1.6, 0.25) : got;
        const above = n.y < HUB.y;
        return (
          <g key={s.name}>
            <rect x={n.x - 24} y={n.y - 24} width={48} height={48} rx={12} style={{ fill: 'var(--card)', stroke: lit > 0.05 ? C[s.tone] : 'var(--line-strong)', strokeWidth: 1 + lit * 0.8 }} />
            <Icon name={s.icon} x={n.x} y={n.y} s={1.2} tone={lit > 0.05 ? s.tone : 'ink'} />
            <Label x={n.x} y={above ? n.y - 32 : n.y + 42} text={s.name} tone={lit > 0.05 ? s.tone : 'mute'} />
            {got > 0.05 && (
              <g style={{ opacity: got }}>
                <circle cx={n.x + 20} cy={n.y - 20} r={8} style={{ fill: C[SYSTEMS[src].tone] }} />
                <Icon name="check" x={n.x + 20} y={n.y - 20} s={0.8} tone="white" />
              </g>
            )}
            {/* a copy leaves the hub for every other system */}
            {!isSrc && arrive > 0 && arrive < 1 && <Chip x={lerp(HUB.x, n.x, arrive)} y={lerp(HUB.y, n.y, arrive)} w={22} h={11} tone={SYSTEMS[src].tone} lines={false} a={1} />}
          </g>
        );
      })}

      {/* the source hands its information to the hub */}
      {up > 0 && up < 1 && <Chip x={lerp(S.x, HUB.x, up)} y={lerp(S.y, HUB.y, up)} w={26} h={13} tone={SYSTEMS[src].tone} />}
    </g>
  );
};

/* ── It keeps learning ────────────────────────────────────────────────────── */

const X0 = 48, X1 = 452, YB = 232, U_DEP = 0.32;
const xOf = (u: number) => lerp(X0, X1, u);
const hPre = (u: number) => 30 + 90 * smooth(clamp(u / U_DEP));
const hOrigin = (u: number) => (u <= U_DEP ? hPre(u) : 120 + 84 * (1 - Math.exp((-3.2 * (u - U_DEP)) / (1 - U_DEP))));
const hFrozen = (u: number) => (u <= U_DEP ? hPre(u) : 120);
const yOf = (h: number) => YB - h;
const DATA = [0.44, 0.54, 0.64, 0.74, 0.84, 0.93];

const path = (fn: (u: number) => number, from: number, to: number) => {
  const n = Math.max(2, Math.ceil((to - from) * 70));
  return Array.from({ length: n + 1 }, (_, i) => {
    const u = lerp(from, to, i / n);
    return `${i ? 'L' : 'M'}${xOf(u).toFixed(1)} ${yOf(fn(u)).toFixed(1)}`;
  }).join('');
};

export const learn: Draw = (t, p) => {
  const g = 1 - smooth(seg(t, 11.3, 12)) * (1 - p.on);
  const auto = inOut(seg(t, 0.6, 9.4));
  const scrub = clamp((p.x - X0) / (X1 - X0));
  const uh = lerp(auto, scrub, p.on);
  const dep = smooth(seg(uh, U_DEP - 0.02, U_DEP + 0.02));

  return (
    <g style={{ opacity: g }}>
      {/* axes */}
      <path d={`M${X0} 28V${YB}H${X1}`} fill="none" style={{ stroke: 'var(--line-strong)', strokeWidth: 1.2 }} />
      <text x={20} y={130} textAnchor="middle" transform="rotate(-90 20 130)" style={{ fill: 'var(--ink-3)', fontSize: 10.5, fontWeight: 500, fontFamily: 'var(--sans)' }}>Quality</text>
      <Label x={X1} y={YB + 20} text="Time" anchor="end" size={10.5} />

      {/* deployment */}
      <line x1={xOf(U_DEP)} x2={xOf(U_DEP)} y1={44} y2={YB} style={{ stroke: 'var(--tango-fill)', strokeWidth: 1.2, strokeDasharray: '3 4', opacity: 0.8 }} />
      <Tag x={xOf(U_DEP)} y={32} text="Deployed" tone="tango" />

      {/* what both systems did before deployment */}
      <path d={path(hPre, 0, Math.min(uh, U_DEP))} fill="none" strokeWidth={2.4} strokeLinecap="round" style={{ stroke: 'var(--ink-2)' }} />
      {uh > U_DEP && (
        <>
          <path d={path(hFrozen, U_DEP, uh)} fill="none" strokeWidth={2.2} strokeLinecap="round" style={{ stroke: 'var(--ink-3)', strokeDasharray: '2 6' }} />
          <path d={path(hOrigin, U_DEP, uh)} fill="none" strokeWidth={2.8} strokeLinecap="round" style={{ stroke: C.violet }} />
        </>
      )}

      {/* the same new information reaches both */}
      {DATA.map((u, k) => {
        const start = u - 0.1;
        const f = seg(uh, start, u);
        if (f <= 0 || uh <= U_DEP) return null;
        const x = xOf(u), yO = yOf(hOrigin(u)), yF = yOf(hFrozen(u));
        const first = inOut(clamp(f / 0.62));
        const second = seg(f, 0.62, 1);
        const settled = seg(uh, u, u + 0.05);
        return (
          <g key={k}>
            <circle cx={x} cy={lerp(16, yO, first)} r={4.2} style={{ fill: C.pitch, opacity: f < 0.62 ? 1 : 1 - seg(f, 0.62, 0.72) }} />
            {second > 0 && (
              <>
                <circle cx={x} cy={lerp(yO, yF, second)} r={4.2} style={{ fill: 'none', stroke: 'var(--ink-3)', strokeWidth: 1.2, opacity: 0.85 * (1 - settled) }} />
                <g style={{ opacity: settled > 0 ? 0.9 * (1 - seg(uh, u + 0.05, u + 0.1)) : 0 }}>
                  <Icon name="x" x={x} y={yF} s={0.9} tone="tango" />
                </g>
              </>
            )}
            {f >= 0.62 && <circle cx={x} cy={yO} r={4 + 9 * seg(f, 0.62, 1)} style={{ fill: 'none', stroke: C.violet, strokeWidth: 1.4, opacity: 0.6 * (1 - seg(f, 0.62, 1)) }} />}
          </g>
        );
      })}

      {/* the head of each curve */}
      {uh > 0.01 && <circle cx={xOf(uh)} cy={yOf(uh > U_DEP ? hOrigin(uh) : hPre(uh))} r={4.6} style={{ fill: uh > U_DEP ? C.violet : 'var(--ink)' }} />}
      <Label x={X1 - 4} y={yOf(hFrozen(1)) - 10} text="Frozen model" tone="mute" anchor="end" a={dep} />
      <Label x={X1 - 4} y={yOf(hOrigin(1)) - 10} text="Origin" tone="violet" anchor="end" a={dep} />
    </g>
  );
};
