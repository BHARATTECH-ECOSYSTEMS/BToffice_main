import { Chip, C, Icon, Label, Tag, type Tone } from './atoms';
import { back, inOut, lerp, out, seg, smooth, window_ } from './math';
import type { Draw } from './Diagram';

export const AUD_W = 400;
export const AUD_H = 152;
const fadeEnd = (t: number) => 1 - smooth(seg(t, 7.4, 8));
const TONES: Tone[] = ['tango', 'pitch', 'violet', 'tango', 'pitch'];

/* Researchers: months of work stay connected */
const researchers: Draw = (t) => {
  const g = fadeEnd(t);
  const xs = [56, 126, 196, 266, 336];
  const WHAT = ['Sources', 'Hypothesis', 'Experiment', 'Dead end', 'Result'];
  const recall = seg(t, 4.6, 6.2);
  return (
    <g style={{ opacity: g }}>
      <line x1={28} x2={372} y1={98} y2={98} style={{ stroke: 'var(--line-strong)', strokeWidth: 1.4 }} />
      {xs.map((x, i) => {
        const a = back(seg(t, 0.4 + i * 0.7, 0.9 + i * 0.7));
        const lit = window_(t, 4.8 + i * 0.25, 6.6, 0.2);
        return (
          <g key={i}>
            <circle cx={x} cy={98} r={3.5} style={{ fill: 'var(--ink-3)' }} />
            <Chip x={x} y={i % 2 ? 44 : 74} tone={TONES[i]} text={WHAT[i]} s={(0.6 + 0.4 * a) * (1 + lit * 0.06)} a={a} size={9.5} />
                        <Label x={x} y={118} text={`Month ${i + 1}`} size={9.5} a={a} />
          </g>
        );
      })}
      <Tag x={200} y={140} text="Picks up where you left off" tone="violet" a={smooth(recall)} />
    </g>
  );
};

/* Developers: one interface in front of memory, reasoning and agents */
const developers: Draw = (t) => {
  const g = fadeEnd(t);
  const l = t % 4;
  const call = inOut(seg(l, 0.2, 1.2));
  const fan = (i: number) => inOut(seg(l, 1.4 + i * 0.15, 2.4 + i * 0.15));
  const outs = ['Memory', 'Reasoning', 'Agents'];
  return (
    <g style={{ opacity: g }}>
      <rect x={24} y={40} width={80} height={64} rx={10} style={{ fill: 'var(--card)', stroke: 'var(--line-strong)' }} />
      <Icon name="code" x={64} y={62} s={1.1} tone="ink" />
      <rect x={38} y={80} width={52} height={3.5} rx={1.75} style={{ fill: 'var(--line-strong)' }} />
      <rect x={38} y={88} width={34} height={3.5} rx={1.75} style={{ fill: 'var(--line-strong)' }} />
      <rect x={150} y={52} width={72} height={40} rx={20} style={{ fill: C.violet }} />
      <Label x={186} y={76} text="One API" tone="white" size={11} />
      <line x1={104} y1={72} x2={150} y2={72} style={{ stroke: 'var(--line-strong)' }} />
      {outs.map((o, i) => {
        const y = 34 + i * 38;
        const got = window_(l, 2.4 + i * 0.15, 3.8, 0.2);
        return (
          <g key={o}>
            <path d={`M222 72C246 72 246 ${y} 270 ${y}`} fill="none" style={{ stroke: 'var(--line-strong)' }} />
            <rect x={270} y={y - 14} width={100} height={28} rx={8} style={{ fill: 'var(--card)', stroke: got > 0.05 ? C[TONES[i]] : 'var(--line-strong)', strokeWidth: 1 + got * 0.7 }} />
            <Label x={320} y={y + 4} text={o} tone={got > 0.05 ? TONES[i] : 'mute'} size={10.5} />
            {fan(i) > 0 && fan(i) < 1 && <Chip x={lerp(222, 270, fan(i))} y={lerp(72, y, fan(i))} w={16} h={9} tone={TONES[i]} lines={false} />}
          </g>
        );
      })}
      {call > 0 && call < 1 && <Chip x={lerp(104, 150, call)} y={72} tone="pitch" text="ask()" size={9.5} />}
    </g>
  );
};

/* Enterprises: teams share one memory, inside your own governance */
const enterprises: Draw = (t) => {
  const g = fadeEnd(t);
  const teams = [{ x: 64, y: 50, n: 'Team A' }, { x: 64, y: 100, n: 'Team B' }, { x: 336, y: 76, n: 'Team C' }];
  const src = Math.floor(t / 2.6) % 3;
  const l = t % 2.6;
  const inn = inOut(seg(l, 0.1, 0.9));
  return (
    <g style={{ opacity: g }}>
      <rect x={16} y={14} width={368} height={126} rx={16} fill="none" style={{ stroke: C.violet, strokeWidth: 1.3, strokeDasharray: '4 5', opacity: 0.8 }} />
      <Icon name="lock" x={34} y={28} s={0.8} tone="violet" />
      <Label x={46} y={32} text="Your data, your rules" tone="violet" anchor="start" size={10} />
      {teams.map((tm, i) => {
        const got = i === src ? window_(l, 0, 0.9, 0.2) : window_(l, 1.0, 2.4, 0.2);
        return (
          <g key={i}>
            <line x1={tm.x} y1={tm.y} x2={200} y2={80} style={{ stroke: 'var(--line-strong)' }} />
            <circle cx={tm.x} cy={tm.y} r={17} style={{ fill: 'var(--card)', stroke: got > 0.05 ? C.tango : 'var(--line-strong)', strokeWidth: 1 + got * 0.7 }} />
            <circle cx={tm.x} cy={tm.y - 4} r={4} style={{ fill: 'var(--ink-3)' }} />
            <path d={`M${tm.x - 7} ${tm.y + 9}a7 6 0 0 1 14 0`} fill="none" strokeWidth={1.4} style={{ stroke: 'var(--ink-3)' }} />
            <Label x={tm.x} y={tm.y + 33} text={tm.n} size={9.5} />
          </g>
        );
      })}
      <circle cx={200} cy={80} r={24} style={{ fill: C.violet }} />
      <Icon name="memory" x={200} y={80} s={1.15} tone="white" />
      {inn > 0 && inn < 1 && <Chip x={lerp(teams[src].x, 200, inn)} y={lerp(teams[src].y, 80, inn)} tone="pitch" text={['Policy doc', 'Client notes', 'Budget'][src]} size={9.5} />}
      {teams.map((tm, i) => {
        const u = inOut(seg(l, 1.0, 1.9));
        return i !== src && u > 0 && u < 1 ? <Chip key={i} x={lerp(200, tm.x, u)} y={lerp(80, tm.y, u)} w={20} h={10} tone="pitch" lines={false} /> : null;
      })}
    </g>
  );
};

/* Governments: data stays inside national borders */
const governments: Draw = (t) => {
  const g = fadeEnd(t);
  const nodes = [{ x: 150, y: 56 }, { x: 250, y: 50 }, { x: 200, y: 96 }, { x: 128, y: 100 }];
  const k = Math.floor(t / 1.6) % 4;
  const l = t % 1.6;
  const a = nodes[k], b = nodes[(k + 1) % 4];
  const u = inOut(seg(l, 0.1, 1.2));
  const attack = seg(t, 2.4, 4.4);
  const bump = seg(t, 3.6, 4.4);
  return (
    <g style={{ opacity: g }}>
      <path d="M100 40 C120 22 190 18 230 26 C272 34 296 60 282 92 C270 118 210 126 160 122 C116 118 82 96 100 40Z" style={{ fill: 'var(--brand-soft)', stroke: C.violet, strokeWidth: 1.4, strokeDasharray: '5 5' }} />
      {nodes.map((n, i) => (
        <g key={i}>
          <rect x={n.x - 11} y={n.y - 11} width={22} height={22} rx={6} style={{ fill: 'var(--card)', stroke: i === k ? C.violet : 'var(--line-strong)' }} />
          <Icon name="server" x={n.x} y={n.y} s={0.62} tone={i === k ? 'violet' : 'ink'} />
        </g>
      ))}
      {u > 0 && u < 1 && <Chip x={lerp(a.x, b.x, u)} y={lerp(a.y, b.y, u)} tone="pitch" text="Census data" size={9} />}
      {attack > 0 && attack < 1 && <Chip x={lerp(340, 288, inOut(Math.min(1, attack / 0.8)))} y={lerp(30, 66, inOut(Math.min(1, attack / 0.8)))} tone="tango" text="Outside request" size={9} a={1 - seg(attack, 0.8, 1)} />}
      {bump > 0 && bump < 1 && (
        <g style={{ opacity: 1 - seg(bump, 0.6, 1) }}>
          <circle cx={288} cy={66} r={9} style={{ fill: 'var(--card)', stroke: C.tango }} />
          <Icon name="x" x={288} y={66} s={0.7} tone="tango" />
        </g>
      )}
      <Label x={200} y={144} text="Under national control" tone="mute" size={10} />
    </g>
  );
};

/* Education: a learner's progress is remembered */
const education: Draw = (t) => {
  const g = fadeEnd(t);
  const steps = 5;
  const sx = (i: number) => 60 + i * 64, sy = (i: number) => 112 - i * 20;
  const climb = out(seg(t, 0.3, 4.2)) * (steps - 1);
  const back_ = smooth(seg(t, 4.6, 5.0));
  const pos = climb;
  const i0 = Math.floor(pos), f = pos - i0;
  const x = lerp(sx(i0), sx(Math.min(steps - 1, i0 + 1)), inOut(f)), y = lerp(sy(i0), sy(Math.min(steps - 1, i0 + 1)), inOut(f)) - 14;
  const returned = t > 5.4;
  return (
    <g style={{ opacity: g }}>
      {Array.from({ length: steps }, (_, i) => (
        <g key={i}>
          <rect x={sx(i) - 26} y={sy(i)} width={52} height={152 - sy(i)} rx={6} style={{ fill: i <= pos ? 'var(--brand-soft)' : 'var(--fill)', stroke: i <= pos ? C.violet : 'var(--line)', strokeWidth: 1 }} />
          <Label x={sx(i)} y={sy(i) + 16} text={`Lesson ${i + 1}`} size={9} tone={i <= pos ? 'violet' : 'mute'} />
        </g>
      ))}
      <Icon name="check" x={sx(steps - 1)} y={sy(steps - 1) + 14} tone="violet" a={smooth(seg(pos, steps - 1.2, steps - 1))} />
      <g style={{ opacity: 1 - back_ * (returned ? 0 : 1) }}>
        <circle cx={returned ? sx(steps - 1) : x} cy={returned ? sy(steps - 1) - 14 : y} r={9} style={{ fill: C.tango }} />
        <circle cx={returned ? sx(steps - 1) : x} cy={(returned ? sy(steps - 1) - 14 : y) - 2} r={3} style={{ fill: '#fff' }} />
      </g>
      <Tag x={74} y={24} text="Back next week" tone="ink" a={smooth(seg(t, 4.6, 5.1))} />
      <Tag x={196} y={24} text="Continues from here" tone="violet" a={smooth(seg(t, 5.4, 5.9))} />
    </g>
  );
};

/* Startups: build on a shared foundation instead of from scratch */
const startups: Draw = (t) => {
  const g = fadeEnd(t);
  const blocks = [{ w: 220, tone: 'tango' as Tone, t0: 1.0, text: 'Memory + agents, ready' }, { w: 170, tone: 'pitch' as Tone, t0: 2.2, text: 'Your features' }, { w: 110, tone: 'tango' as Tone, t0: 3.4, text: 'Your app' }];
  return (
    <g style={{ opacity: g }}>
      <rect x={80} y={108} width={240} height={26} rx={8} style={{ fill: C.violet }} />
      <Label x={200} y={125} text="Shared foundation" tone="white" size={10.5} />
      {blocks.map((b, i) => {
        const u = out(seg(t, b.t0, b.t0 + 0.7));
        const y = lerp(-20, 108 - (i + 1) * 26, u);
        return <Chip key={i} x={200} y={y + 11} w={b.w} h={22} tone={b.tone} text={b.text} a={u > 0 ? 1 : 0} />;
      })}
      <g style={{ opacity: smooth(seg(t, 4.4, 5.0)), transform: `translate(0px, ${-8 * seg(t, 4.4, 6.4)}px)` }}>
        <path d="M200 18l7 12h-14z" style={{ fill: 'var(--ink)' }} />
        <Label x={200} y={12} text="Ship" size={10} tone="ink" />
      </g>
    </g>
  );
};

export const AUDIENCE_DRAWS: Draw[] = [researchers, developers, enterprises, governments, education, startups];
export const AUDIENCE_LABELS = [
  'Notes from months of work stay connected, and a question recalls all of them',
  'One call to a single interface reaches memory, reasoning and agents',
  'Three teams share one memory inside a boundary the organisation controls',
  'Data moves between national data centres while outside traffic is blocked at the border',
  'A learner climbs a set of steps, and when they return they continue from the last one',
  'Product blocks are stacked on a shared foundation',
];
export const AUDIENCE_STILL = [6, 2, 1.2, 3, 6, 4];
