import { Chip, C, Icon, Label, Tag, type Tone } from './atoms';
import { inOut, lerp, seg, smooth, window_ } from './math';
import type { Draw } from './Diagram';

export const DOMAIN_W = 320;
export const DOMAIN_H = 180;

const fadeEnd = (t: number) => 1 - smooth(seg(t, 7.4, 8));
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/* 01 · GI Rivinity: every new experience becomes something the model keeps */
const LESSONS = [
  { text: 'User feedback', tone: 'tango' as Tone },
  { text: 'New paper', tone: 'pitch' as Tone },
  { text: 'A correction', tone: 'tango' as Tone },
  { text: 'Fresh data', tone: 'pitch' as Tone },
];
const rivinity: Draw = (t) => {
  const g = fadeEnd(t);
  const k = Math.min(3, Math.floor(t / 1.7));
  const l = t - k * 1.7;
  const fly = inOut(seg(l, 0.3, 1.2));
  const learned = LESSONS.filter((_, i) => i < k || (i === k && l > 1.2)).length;
  return (
    <g style={{ opacity: g }}>
      <Label x={70} y={30} text="Something new happens" size={10} />
      {fly < 1 && <Chip x={lerp(70, 210, fly)} y={lerp(60, 92, fly)} tone={LESSONS[k].tone} text={LESSONS[k].text} s={1 - 0.35 * fly} a={smooth(seg(l, 0, 0.25))} />}
      <rect x={160} y={36} width={140} height={124} rx={12} style={{ fill: 'var(--card)', stroke: C.violet, strokeWidth: 1.4 }} />
      <Label x={172} y={56} text="Model keeps it" tone="violet" anchor="start" size={10.5} />
      {LESSONS.map((ls, i) => (
        <g key={i} style={{ opacity: i < learned ? 1 : 0.35 }}>
          <rect x={172} y={68 + i * 22} width={116} height={16} rx={5} style={{ fill: i < learned ? 'var(--brand-soft)' : 'var(--fill)' }} />
          {i < learned && <Icon name="check" x={182} y={76 + i * 22} s={0.6} tone="violet" />}
          <text x={192} y={80 + i * 22} style={{ fill: i < learned ? 'var(--ink)' : 'var(--ink-3)', fontSize: 9.5, fontWeight: 500, fontFamily: 'var(--sans)' }}>
            {i < learned ? ls.text : '—'}
          </text>
        </g>
      ))}
    </g>
  );
};

/* 02 · Rivinity Core: routes a request to the system that can answer it */
const ASKS = [
  { from: 0, via: 2, q: 'Map this area' },
  { from: 1, via: 0, q: 'Summarise' },
  { from: 2, via: 1, q: 'Read this chart' },
];
const APPS = ['App', 'Agent', 'API'];
const SYS = ['Language', 'Vision', 'Geo'];
const core: Draw = (t) => {
  const g = fadeEnd(t);
  const k = Math.floor(t / 2.6) % 3;
  const l = t % 2.6;
  const { from, via, q } = ASKS[k];
  const Y = [44, 92, 140];
  const u1 = inOut(seg(l, 0.1, 0.8)), u2 = inOut(seg(l, 0.8, 1.4)), u3 = inOut(seg(l, 1.5, 2.3));
  return (
    <g style={{ opacity: g }}>
      {Y.map((y, i) => <line key={`a${i}`} x1={70} y1={y} x2={160} y2={92} style={{ stroke: i === from ? C.violet : 'var(--line-strong)' }} />)}
      {Y.map((y, i) => <line key={`s${i}`} x1={160} y1={92} x2={250} y2={y} style={{ stroke: i === via && l > 0.8 ? C.violet : 'var(--line-strong)' }} />)}
      {APPS.map((n, i) => (
        <g key={n}>
          <rect x={16} y={Y[i] - 13} width={54} height={26} rx={8} style={{ fill: 'var(--card)', stroke: i === from ? C.violet : 'var(--line-strong)' }} />
          <Label x={43} y={Y[i] + 3.5} text={n} tone={i === from ? 'violet' : 'mute'} size={9.5} />
        </g>
      ))}
      {SYS.map((n, i) => (
        <g key={n}>
          <rect x={250} y={Y[i] - 13} width={58} height={26} rx={8} style={{ fill: 'var(--card)', stroke: i === via && l > 1.3 ? C.tango : 'var(--line-strong)' }} />
          <Label x={279} y={Y[i] + 3.5} text={n} tone={i === via && l > 1.3 ? 'tango' : 'mute'} size={9.5} />
        </g>
      ))}
      <circle cx={160} cy={92} r={20} style={{ fill: C.violet }} />
      <Icon name="memory" x={160} y={92} s={0.95} tone="white" />
      {u1 > 0 && u1 < 1 && <Chip x={lerp(70, 160, u1)} y={lerp(Y[from], 92, u1)} tone="pitch" text={q} s={0.9} />}
      {u2 > 0 && u2 < 1 && <Chip x={lerp(160, 250, u2)} y={lerp(92, Y[via], u2)} tone="pitch" text={q} s={0.9} />}
      {u3 > 0 && u3 < 1 && <Chip x={lerp(250, 70, u3)} y={lerp(Y[via], Y[from], u3)} tone="violet" text="Answer" s={0.9} />}
      <Label x={160} y={172} text="Sends each request to the right system" tone="mute" size={9.5} />
    </g>
  );
};

/* 03 · IoT Intelligence: a reading comes in, a decision is made on site, something happens */
const iot: Draw = (t) => {
  const g = fadeEnd(t);
  const l = t % 4;
  const read = inOut(seg(l, 0.2, 1.1));
  const act = inOut(seg(l, 1.7, 2.5));
  const on = window_(l, 2.5, 3.9, 0.2);
  const temp = Math.round(lerp(31, 38, seg(l, 0, 1)) - 7 * seg(l, 2.6, 3.6));
  return (
    <g style={{ opacity: g }}>
      <rect x={16} y={60} width={70} height={64} rx={12} style={{ fill: 'var(--card)', stroke: l < 1.2 ? C.pitch : 'var(--line-strong)' }} />
      <Label x={51} y={52} text="Sensor" size={9.5} />
      <text x={51} y={98} textAnchor="middle" style={{ fill: temp >= 36 ? 'var(--tango-text)' : 'var(--ink)', fontSize: 18, fontWeight: 600, fontFamily: 'var(--sans)' }}>
        {temp}°
      </text>
      <line x1={86} y1={92} x2={124} y2={92} style={{ stroke: 'var(--line-strong)' }} />
      <rect x={124} y={60} width={78} height={64} rx={12} style={{ fill: 'var(--card)', stroke: C.violet, strokeWidth: 1.4 }} />
      <Label x={163} y={52} text="Decides on site" tone="violet" size={9.5} />
      <text x={163} y={90} textAnchor="middle" style={{ fill: 'var(--ink)', fontSize: 10, fontWeight: 500, fontFamily: 'var(--sans)' }}>
        Too hot?
      </text>
      <text x={163} y={106} textAnchor="middle" style={{ fill: 'var(--brand-text)', fontSize: 10, fontWeight: 600, fontFamily: 'var(--sans)', opacity: smooth(seg(l, 1.2, 1.5)) }}>
        Yes → cool
      </text>
      <line x1={202} y1={92} x2={240} y2={92} style={{ stroke: 'var(--line-strong)' }} />
      <rect x={240} y={60} width={64} height={64} rx={12} style={{ fill: on > 0.05 ? 'var(--pitch-soft)' : 'var(--card)', stroke: on > 0.05 ? C.pitch : 'var(--line-strong)' }} />
      <Label x={272} y={52} text="Machine" size={9.5} />
      <g style={{ transform: `rotate(${on > 0.05 ? l * 540 : 0}deg)`, transformOrigin: '272px 92px' }}>
        <path d="M272 92l0-14a7 7 0 0 1 0 14zM272 92l12 7a7 7 0 0 1-12-7zM272 92l-12 7a7 7 0 0 1 12-7z" style={{ fill: on > 0.05 ? C.pitch : 'var(--ink-3)' }} />
      </g>
      {read > 0 && read < 1 && <Chip x={lerp(86, 124, read)} y={92} tone="pitch" text="38°" s={0.85} />}
      {act > 0 && act < 1 && <Chip x={lerp(202, 240, act)} y={92} tone="violet" text="Fan on" s={0.85} />}
      <Label x={160} y={160} text="No round trip to the cloud" tone="mute" size={9.5} />
    </g>
  );
};

/* 04 · Geo Intelligence: a satellite pass over the map; the tiles that changed get flagged */
const geo: Draw = (t) => {
  const g = fadeEnd(t);
  const cols = 8, rows = 3;
  const scan = seg(t, 0.4, 5.2);
  const changed = new Set([3, 10, 12, 21]);
  const flagged = [...changed].filter((n) => scan * cols > (n % cols) + 1.2).length;
  return (
    <g style={{ opacity: g }}>
      {Array.from({ length: cols * rows }, (_, n) => {
        const cx = n % cols, cy = Math.floor(n / cols);
        const x = 22 + cx * 35, y = 48 + cy * 32;
        const seen = scan * cols > cx + 0.5;
        const flag = changed.has(n) && scan * cols > cx + 1.2;
        return (
          <g key={n}>
            <rect x={x} y={y} width={31} height={28} rx={5} style={{ fill: flag ? 'var(--tango-soft)' : seen ? 'var(--brand-soft)' : 'var(--fill)', stroke: flag ? C.tango : 'var(--line)', strokeWidth: flag ? 1.3 : 1 }} />
            {flag && <path d={`M${x + 15.5} ${y + 8}v8M${x + 11.5} ${y + 13}l4 4 4-4`} fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: C.tango }} />}
          </g>
        );
      })}
      <g style={{ opacity: scan > 0 && scan < 1 ? 1 : 0 }}>
        <line x1={22 + scan * 280} x2={22 + scan * 280} y1={36} y2={146} style={{ stroke: C.violet, strokeWidth: 1.6 }} />
        <Chip x={22 + scan * 280} y={26} tone="violet" text="Satellite pass" s={0.85} />
      </g>
      <Tag x={160} y={166} text={flagged ? `Water level fell in ${flagged} areas` : 'Scanning for change'} tone={flagged ? 'tango' : 'ink'} />
    </g>
  );
};

/* 05 · Defense Intelligence: verified requests get in, unknown ones are stopped at the edge */
const defense: Draw = (t) => {
  const g = fadeEnd(t);
  const attempts = [
    { a: 200, bad: true, t0: 0.3 },
    { a: 20, bad: false, t0: 1.7 },
    { a: 330, bad: true, t0: 3.1 },
    { a: 150, bad: false, t0: 4.5 },
    { a: 250, bad: true, t0: 5.8 },
  ];
  const cx = 160, cy = 88;
  return (
    <g style={{ opacity: g }}>
      <ellipse cx={cx} cy={cy} rx={96} ry={58} fill="none" style={{ stroke: C.violet, strokeWidth: 1.4, strokeDasharray: '4 5', opacity: 0.8 }} />
      <circle cx={cx} cy={cy} r={22} style={{ fill: C.violet }} />
      <Icon name="shield" x={cx} y={cy} s={1.2} tone="white" />
      {attempts.map((q, i) => {
        const u = seg(t, q.t0, q.t0 + 1.4);
        if (u <= 0 || u >= 1) return null;
        const ang = (q.a * Math.PI) / 180;
        const ex = cx + Math.cos(ang) * 96, ey = cy + Math.sin(ang) * 58;
        const sx = cx + Math.cos(ang) * 150, sy = cy + Math.sin(ang) * 90;
        const m = inOut(clamp01(u / (q.bad ? 0.55 : 1)));
        const blocked = q.bad && u > 0.55;
        return (
          <g key={i}>
            {!blocked && <Chip x={lerp(sx, q.bad ? ex : cx, m)} y={lerp(sy, q.bad ? ey : cy, m)} tone={q.bad ? 'tango' : 'pitch'} text={q.bad ? 'Unknown' : 'Verified'} s={0.8} a={q.bad ? 1 : 1 - seg(u, 0.8, 1)} />}
            {blocked && (
              <g style={{ opacity: 1 - seg(u, 0.75, 1) }}>
                <circle cx={ex} cy={ey} r={9} style={{ fill: 'var(--card)', stroke: C.tango, strokeWidth: 1.3 }} />
                <Icon name="x" x={ex} y={ey} s={0.75} tone="tango" />
              </g>
            )}
          </g>
        );
      })}
      <Label x={cx} y={170} text="Only verified requests reach the system" tone="mute" size={9.5} />
    </g>
  );
};

/* 06 · Miniature Intelligence: answers on your phone, even offline; syncs later */
const miniature: Draw = (t) => {
  const g = fadeEnd(t);
  const l = t % 4;
  const ask = inOut(seg(l, 0.1, 0.6));
  const answer = inOut(seg(l, 0.8, 1.3));
  const online = l > 2.2;
  const sync = inOut(seg(l, 2.4, 3.4));
  return (
    <g style={{ opacity: g }}>
      <rect x={210} y={22} width={96} height={34} rx={10} style={{ fill: 'var(--card)', stroke: online ? C.violet : 'var(--line-strong)' }} />
      <Label x={258} y={43} text="Cloud" tone={online ? 'violet' : 'mute'} size={10} />
      <path d="M226 118C250 118 258 96 258 56" fill="none" style={{ stroke: online ? C.violet : 'var(--line-strong)', strokeDasharray: '3 4' }} />
      <Tag x={262} y={86} text={online ? 'Back online' : 'Offline'} tone={online ? 'violet' : 'ink'} />
      <rect x={120} y={44} width={100} height={128} rx={16} style={{ fill: 'var(--card)', stroke: C.violet, strokeWidth: 1.4 }} />
      <Label x={170} y={64} text="Your phone" tone="violet" size={10} />
      <rect x={150} y={80} width={40} height={40} rx={10} style={{ fill: C.violet }} />
      <Icon name="memory" x={170} y={100} s={1} tone="white" />
      <Label x={170} y={138} text="Small model" tone="mute" size={9.5} />
      <Chip x={50} y={70} tone="ink" text="Question" a={1} s={0.9} />
      {ask > 0 && ask < 1 && <Chip x={lerp(50, 150, ask)} y={lerp(70, 100, ask)} w={16} h={9} tone="pitch" lines={false} />}
      <Chip x={50} y={130} tone="violet" text="Answer" a={smooth(seg(l, 1.2, 1.4))} s={0.9} />
      {answer > 0 && answer < 1 && <Chip x={lerp(150, 50, answer)} y={lerp(100, 130, answer)} w={16} h={9} tone="violet" lines={false} />}
      {sync > 0 && sync < 1 && <Chip x={lerp(220, 258, sync)} y={lerp(118, 56, sync)} tone="tango" text="Update" s={0.8} />}
    </g>
  );
};

export const DOMAIN_DRAWS: Draw[] = [rivinity, core, iot, geo, defense, miniature];
export const DOMAIN_LABELS = [
  'Feedback, papers, corrections and new data arrive and each is kept by the model',
  'A request from an app is routed through one core to the system that can answer it, and the answer returns',
  'A sensor reads 38 degrees, the device decides on site and switches a fan on',
  'A satellite pass scans a map and flags the areas where the water level fell',
  'Verified requests pass the perimeter; unknown ones are stopped at the edge',
  'A small model on the phone answers a question offline, then syncs an update when back online',
];
export const DOMAIN_STILL = [6.5, 1.1, 2.2, 6, 2.6, 3];
