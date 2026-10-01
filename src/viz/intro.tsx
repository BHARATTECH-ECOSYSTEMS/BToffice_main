import { Chip, C, Icon, Label, Panel, Tag, type Tone } from './atoms';
import { clamp, inOut, lerp, out, seg, smooth, window_ } from './math';
import type { Draw } from './Diagram';

/* ── It remembers ───────────────────────────────────────────────────────────
   Monday: the team shares its study. Thursday: new satellite data. Next week:
   a question, answered from what was kept. Every note says what it is. */

const PANEL = [
  { x: 16, when: 'Monday', t0: 0.2, t1: 3.9 },
  { x: 170, when: 'Thursday', t0: 4.0, t1: 7.4 },
  { x: 324, when: 'Next week', t0: 7.6, t1: 11.6 },
];
const PW = 140;
const NOTES = [
  { text: '40 districts', tone: 'tango' as Tone, from: 0, born: 0.6, fly: 2.0, slot: 92 },
  { text: '7 flagged critical', tone: 'pitch' as Tone, from: 0, born: 1.1, fly: 2.6, slot: 210 },
  { text: 'New satellite data', tone: 'violet' as Tone, from: 1, born: 4.6, fly: 5.8, slot: 350 },
];
const MEM_Y = 222;

export const remember: Draw = (t) => {
  const g = 1 - smooth(seg(t, 11.4, 12));
  const act = PANEL.map((p) => window_(t, p.t0, p.t1, 0.3));
  const recall = window_(t, 8.4, 11.6, 0.3);

  return (
    <g style={{ opacity: g }}>
      {/* sessions */}
      {PANEL.map((p, i) => (
        <Panel key={p.when} x={p.x} y={16} w={PW} h={100} title={p.when} active={act[i]} tone="violet" />
      ))}

      {/* next week's question and answer */}
      <g style={{ opacity: smooth(seg(t, 7.9, 8.3)) }}>
        <text x={PANEL[2].x + 12} y={58} style={{ fill: 'var(--ink)', fontSize: 10.5, fontWeight: 500, fontFamily: 'var(--sans)' }}>
          Which districts changed?
        </text>
      </g>
      <g style={{ opacity: smooth(seg(t, 10.2, 10.6)) }}>
        <rect x={PANEL[2].x + 10} y={84} width={PW - 20} height={22} rx={6} style={{ fill: 'var(--brand-soft)' }} />
        <Icon name="check" x={PANEL[2].x + 22} y={95} s={0.8} tone="violet" />
        <text x={PANEL[2].x + 32} y={99} style={{ fill: 'var(--brand-text)', fontSize: 10.5, fontWeight: 600, fontFamily: 'var(--sans)' }}>
          3 of 7 declined
        </text>
      </g>

      {/* memory */}
      <rect x={16} y={MEM_Y - 50} width={448} height={96} rx={12} style={{ fill: 'var(--card)', stroke: recall > 0.05 ? C.violet : 'var(--line-strong)', strokeWidth: 1 + recall * 0.6 }} />
      <Icon name="memory" x={34} y={MEM_Y - 30} s={0.75} tone={recall > 0.05 ? 'violet' : 'mute'} />
      <Label x={48} y={MEM_Y - 26} text="Memory" tone={recall > 0.05 ? 'violet' : 'mute'} anchor="start" />
      <Label x={452} y={MEM_Y - 26} text="Kept between sessions" tone="mute" anchor="end" size={10} a={smooth(seg(t, 3, 3.6))} />

      {/* notes are written in a session, then kept */}
      {NOTES.map((n, i) => {
        const P = PANEL[n.from];
        const sx = P.x + PW / 2, sy = 62 + (n.from === 0 ? (i === 0 ? -6 : 22) : 8);
        const u = inOut(seg(t, n.fly, n.fly + 1.1));
        const born = out(seg(t, n.born, n.born + 0.35));
        const lit = recall > 0.05 && t > 8.6 + i * 0.25;
        return <Chip key={n.text} x={lerp(sx, n.slot, u)} y={lerp(sy, MEM_Y + 8, u)} tone={n.tone} text={n.text} s={0.7 + 0.3 * born * (lit ? 1.06 : 1)} a={born} />;
      })}

      {/* recall: each note sends a copy up into next week's session */}
      {NOTES.map((n, i) => {
        const t0 = 8.7 + i * 0.25;
        const u = inOut(seg(t, t0, t0 + 1.0));
        if (u <= 0 || u >= 1) return null;
        return <Chip key={`r${i}`} x={lerp(n.slot, PANEL[2].x + 30 + i * 40, u)} y={lerp(MEM_Y + 8, 76, u)} w={30} h={10} tone={n.tone} lines={false} />;
      })}
    </g>
  );
};

/* ── It connects ────────────────────────────────────────────────────────────
   One system learns something; the shared memory hands it to all the others. */

const SYSTEMS = [
  { name: 'Chat', icon: 'chat', tone: 'violet' as Tone },
  { name: 'Docs', icon: 'docs', tone: 'tango' as Tone },
  { name: 'Search', icon: 'search', tone: 'pitch' as Tone },
  { name: 'Voice', icon: 'voice', tone: 'violet' as Tone },
  { name: 'Vision', icon: 'vision', tone: 'tango' as Tone },
  { name: 'Code', icon: 'code', tone: 'pitch' as Tone },
];
const HUB = { x: 240, y: 136, r: 28 };
const NODES = SYSTEMS.map((_, k) => {
  const a = ((-90 + 60 * k) * Math.PI) / 180;
  return { x: 240 + 176 * Math.cos(a), y: 136 + 88 * Math.sin(a) };
});
const SEQ = [
  { src: 1, item: 'Survey PDF' },
  { src: 3, item: 'Call notes' },
  { src: 4, item: 'Map image' },
];

export const connect: Draw = (t) => {
  const k = Math.floor(t / 4) % 3;
  const { src, item } = SEQ[k];
  const l = t % 4;
  const up = inOut(seg(l, 0.3, 1.3));
  const pulse = seg(l, 1.3, 2.0);
  const S = NODES[src];
  const tone = SYSTEMS[src].tone;

  return (
    <g>
      {NODES.map((n, i) => (
        <line key={i} x1={HUB.x} y1={HUB.y} x2={n.x} y2={n.y} style={{ stroke: 'var(--line-strong)', strokeWidth: 1.2 }} />
      ))}

      <circle cx={HUB.x} cy={HUB.y} r={HUB.r + 22 * out(pulse)} style={{ fill: 'none', stroke: C.violet, strokeWidth: 1.4, opacity: pulse > 0 && pulse < 1 ? 0.5 * (1 - pulse) : 0 }} />
      <circle cx={HUB.x} cy={HUB.y} r={HUB.r} style={{ fill: C.violet }} />
      <Icon name="memory" x={HUB.x} y={HUB.y - 1} s={1.2} tone="white" />

      {SYSTEMS.map((s, i) => {
        const n = NODES[i];
        const isSrc = i === src;
        const delay = 0.05 * ((i - src + 6) % 6);
        const arrive = inOut(seg(l, 1.6 + delay, 2.5 + delay));
        const got = !isSrc ? window_(l, 2.5 + delay, 3.9, 0.25) : 0;
        const lit = isSrc ? window_(l, 0.05, 1.6, 0.25) : got;
        const above = n.y < HUB.y - 10;
        return (
          <g key={s.name}>
            <rect x={n.x - 22} y={n.y - 22} width={44} height={44} rx={11} style={{ fill: 'var(--card)', stroke: lit > 0.05 ? C[s.tone] : 'var(--line-strong)', strokeWidth: 1 + lit * 0.8 }} />
            <Icon name={s.icon} x={n.x} y={n.y} s={1.15} tone={lit > 0.05 ? s.tone : 'ink'} />
            <Label x={n.x} y={above ? n.y - 30 : n.y + 38} text={s.name} tone={lit > 0.05 ? s.tone : 'mute'} />
            {got > 0.05 && (
              <g style={{ opacity: got }}>
                <circle cx={n.x + 18} cy={n.y - 18} r={7.5} style={{ fill: C[tone] }} />
                <Icon name="check" x={n.x + 18} y={n.y - 18} s={0.75} tone={tone === 'pitch' ? 'ink' : 'white'} />
              </g>
            )}
            {!isSrc && arrive > 0 && arrive < 1 && <Chip x={lerp(HUB.x, n.x, arrive)} y={lerp(HUB.y, n.y, arrive)} w={18} h={9} tone={tone} lines={false} />}
          </g>
        );
      })}

      {/* the named item travels from its system into the shared memory */}
      {up > 0 && up < 1 && <Chip x={lerp(S.x, HUB.x, up)} y={lerp(S.y, HUB.y, up)} tone={tone} text={item} />}

      <Tag
        x={240}
        y={288}
        text={l < 1.6 ? `${SYSTEMS[src].name} learns “${item}”` : `Now all 6 systems know “${item}”`}
        tone={l < 1.6 ? 'ink' : 'violet'}
        a={window_(l, 0.2, 3.9, 0.25)}
      />
    </g>
  );
};

/* ── It keeps learning ──────────────────────────────────────────────────────
   Before deployment both systems learn. After it, the same new data reaches both:
   Origin absorbs it and rises; the frozen model ignores it and stays flat. */

const X0 = 48, X1 = 452, YB = 236, U_DEP = 0.3;
const xOf = (u: number) => lerp(X0, X1, u);
const hPre = (u: number) => 30 + 88 * smooth(clamp(u / U_DEP));
const hOrigin = (u: number) => (u <= U_DEP ? hPre(u) : 118 + 86 * (1 - Math.exp((-3.2 * (u - U_DEP)) / (1 - U_DEP))));
const hFrozen = (u: number) => (u <= U_DEP ? hPre(u) : 118);
const yOf = (h: number) => YB - h;
const DATA = [0.42, 0.53, 0.64, 0.75, 0.86, 0.96];

const path = (fn: (u: number) => number, from: number, to: number) => {
  const n = Math.max(2, Math.ceil((to - from) * 70));
  return Array.from({ length: n + 1 }, (_, i) => {
    const u = lerp(from, to, i / n);
    return `${i ? 'L' : 'M'}${xOf(u).toFixed(1)} ${yOf(fn(u)).toFixed(1)}`;
  }).join('');
};

export const learn: Draw = (t) => {
  const g = 1 - smooth(seg(t, 11.3, 12));
  const uh = inOut(seg(t, 0.6, 9.8));
  const dep = smooth(seg(uh, U_DEP - 0.02, U_DEP + 0.02));
  const firstData = seg(uh, DATA[0] - 0.1, DATA[0]);

  return (
    <g style={{ opacity: g }}>
      <path d={`M${X0} 30V${YB}H${X1}`} fill="none" style={{ stroke: 'var(--line-strong)', strokeWidth: 1.2 }} />
      <text x={22} y={134} textAnchor="middle" transform="rotate(-90 22 134)" style={{ fill: 'var(--ink-3)', fontSize: 10.5, fontWeight: 500, fontFamily: 'var(--sans)' }}>
        How much it knows
      </text>
      <Label x={X1} y={YB + 20} text="Time" anchor="end" size={10.5} />

      <line x1={xOf(U_DEP)} x2={xOf(U_DEP)} y1={42} y2={YB} style={{ stroke: 'var(--tango-fill)', strokeWidth: 1.2, strokeDasharray: '3 4', opacity: 0.8 }} />
      <Tag x={xOf(U_DEP)} y={30} text="Deployed" tone="tango" />
      <Label x={xOf(U_DEP / 2)} y={YB + 20} text="Training" size={10.5} />

      <path d={path(hPre, 0, Math.min(uh, U_DEP))} fill="none" strokeWidth={2.4} strokeLinecap="round" style={{ stroke: 'var(--ink-2)' }} />
      {uh > U_DEP && (
        <>
          <path d={path(hFrozen, U_DEP, uh)} fill="none" strokeWidth={2.2} strokeLinecap="round" style={{ stroke: 'var(--ink-3)', strokeDasharray: '2 6' }} />
          <path d={path(hOrigin, U_DEP, uh)} fill="none" strokeWidth={2.8} strokeLinecap="round" style={{ stroke: C.violet }} />
        </>
      )}

      {/* the same new data reaches both lines */}
      {DATA.map((u, k) => {
        const f = seg(uh, u - 0.1, u);
        if (f <= 0 || uh <= U_DEP) return null;
        const x = xOf(u), yO = yOf(hOrigin(u)), yF = yOf(hFrozen(u));
        const first = inOut(clamp(f / 0.6));
        const second = seg(f, 0.6, 1);
        const settled = seg(uh, u, u + 0.05);
        return (
          <g key={k}>
            <circle cx={x} cy={lerp(40, yO, first)} r={4.4} style={{ fill: C.pitch, opacity: f < 0.6 ? 1 : 1 - seg(f, 0.6, 0.7) }} />
            {second > 0 && (
              <>
                <circle cx={x} cy={lerp(yO, yF, second)} r={4.4} style={{ fill: 'none', stroke: 'var(--ink-3)', strokeWidth: 1.2, opacity: 0.85 * (1 - settled) }} />
                <g style={{ opacity: settled > 0 ? 0.9 * (1 - seg(uh, u + 0.05, u + 0.1)) : 0 }}>
                  <Icon name="x" x={x} y={yF} s={0.9} tone="tango" />
                </g>
              </>
            )}
            {f >= 0.6 && <circle cx={x} cy={yO} r={4 + 9 * seg(f, 0.6, 1)} style={{ fill: 'none', stroke: C.violet, strokeWidth: 1.4, opacity: 0.6 * (1 - seg(f, 0.6, 1)) }} />}
          </g>
        );
      })}
      <Chip x={xOf(DATA[0]) + 34} y={48} tone="pitch" text="New data" a={firstData > 0 ? 1 - smooth(seg(uh, 0.62, 0.7)) : 0} />
      <Label x={xOf(0.6)} y={yOf(118) + 22} text="Frozen model ignores it" tone="mute" size={10} a={smooth(seg(uh, 0.5, 0.56))} />

      {uh > 0.01 && <circle cx={xOf(uh)} cy={yOf(uh > U_DEP ? hOrigin(uh) : hPre(uh))} r={4.8} style={{ fill: uh > U_DEP ? C.violet : 'var(--ink)' }} />}
      <Label x={X1 - 4} y={yOf(hFrozen(1)) - 10} text="Frozen model" tone="mute" anchor="end" a={dep} />
      <Label x={xOf(0.5) - 10} y={yOf(hOrigin(0.5)) - 12} text="Origin learns from it" tone="violet" anchor="end" a={smooth(seg(uh, 0.5, 0.56))} />
    </g>
  );
};
