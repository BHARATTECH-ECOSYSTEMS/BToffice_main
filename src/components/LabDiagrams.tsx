import {
  DiagramText,
  Badge,
  DiagramIcon,
  PillLabel,
  X,
  type Tone,
  clamp,
  lerp,
  norm,
  smooth,
  easeInOutCubic,
  pulse,
} from './BentoDiagrams';

/* ── 07 Laboratory Diagrams ──────────────────────────────────────────────── */

const QA_FEEDBACK: Array<{ text: string; tone: Tone }> = [
  { text: 'User feedback', tone: 'tango' },
  { text: 'New paper', tone: 'pitch' },
  { text: 'A correction', tone: 'tango' },
  { text: 'Fresh data', tone: 'pitch' },
];

/** 01. GI Rivinity: continuous assimilation */
function drawRivinity(n: number) {
  const safeN = Number.isFinite(n) ? Math.max(0, n) : 0;
  const s = 1 - smooth(norm(safeN, 7.4, 8.0));
  const rawO = Math.floor(safeN / 1.7);
  const o = Math.max(0, Math.min(QA_FEEDBACK.length - 1, rawO));
  const currentFeedback = QA_FEEDBACK[o] ?? QA_FEEDBACK[0];
  const i = safeN - o * 1.7;
  const l = easeInOutCubic(norm(i, 0.3, 1.2));
  const u = QA_FEEDBACK.filter((_, p) => p < o || (p === o && i > 1.2)).length;

  return (
    <g style={{ opacity: s }}>
      <DiagramText x={88} y={30} text="Something new happens" size={10} />
      {l < 1 && (
        <Badge
          x={lerp(70, 210, l)}
          y={lerp(60, 92, l)}
          tone={currentFeedback.tone}
          text={currentFeedback.text}
          s={1 - 0.35 * l}
          a={smooth(norm(i, 0, 0.25))}
        />
      )}
      <rect
        x={160}
        y={36}
        width={140}
        height={124}
        rx={12}
        style={{ fill: 'var(--card)', stroke: X.violet, strokeWidth: 1.4 }}
      />
      <DiagramText x={172} y={56} text="Model keeps it" tone="violet" anchor="start" size={10.5} />
      {QA_FEEDBACK.map((d, p) => (
        <g key={p} style={{ opacity: p < u ? 1 : 0.35 }}>
          <rect
            x={172}
            y={68 + p * 22}
            width={116}
            height={16}
            rx={5}
            style={{ fill: p < u ? 'var(--brand-soft)' : 'var(--fill)' }}
          />
          {p < u && <DiagramIcon name="check" x={182} y={76 + p * 22} s={0.6} tone="violet" />}
          <text
            x={192}
            y={80 + p * 22}
            style={{
              fill: p < u ? 'var(--ink)' : 'var(--ink-3)',
              fontSize: 9.5,
              fontWeight: 500,
              fontFamily: 'var(--sans)',
            }}
          >
            {p < u ? d.text : '—'}
          </text>
        </g>
      ))}
    </g>
  );
}

const SOURCES = ['App', 'Agent', 'API'];
const DESTINATIONS = ['Language', 'Vision', 'Geo'];
const ROUTE_DATA = [
  { from: 0, via: 2, q: 'Map this area' },
  { from: 1, via: 0, q: 'Summarise' },
  { from: 2, via: 1, q: 'Read this chart' },
];

/** 02. Rivinity Core: intelligent routing */
function drawCore(n: number) {
  const safeN = Number.isFinite(n) ? Math.max(0, n) : 0;
  const s = 1 - smooth(norm(safeN, 7.4, 8.0));
  const rawO = Math.floor(safeN / 2.6);
  const o = ((rawO % ROUTE_DATA.length) + ROUTE_DATA.length) % ROUTE_DATA.length;
  const i = safeN % 2.6;
  const route = ROUTE_DATA[o] ?? ROUTE_DATA[0];
  const l = route.from ?? 0;
  const u = route.via ?? 0;
  const d = route.q ?? '';
  const p = [44, 92, 140];
  const f = easeInOutCubic(norm(i, 0.1, 0.8));
  const m = easeInOutCubic(norm(i, 0.8, 1.4));
  const v = easeInOutCubic(norm(i, 1.5, 2.3));

  return (
    <g style={{ opacity: s }}>
      {p.map((g, w) => (
        <line
          key={`a${w}`}
          x1={70}
          y1={g}
          x2={160}
          y2={92}
          style={{ stroke: w === l ? X.violet : 'var(--line-strong)' }}
        />
      ))}
      {p.map((g, w) => (
        <line
          key={`s${w}`}
          x1={160}
          y1={92}
          x2={250}
          y2={g}
          style={{ stroke: w === u && i > 0.8 ? X.violet : 'var(--line-strong)' }}
        />
      ))}
      {SOURCES.map((g, w) => (
        <g key={g}>
          <rect
            x={16}
            y={p[w] - 13}
            width={54}
            height={26}
            rx={8}
            style={{ fill: 'var(--card)', stroke: w === l ? X.violet : 'var(--line-strong)' }}
          />
          <DiagramText x={43} y={p[w] + 3.5} text={g} tone={w === l ? 'violet' : 'mute'} size={9.5} />
        </g>
      ))}
      {DESTINATIONS.map((g, w) => (
        <g key={g}>
          <rect
            x={250}
            y={p[w] - 13}
            width={58}
            height={26}
            rx={8}
            style={{ fill: 'var(--card)', stroke: w === u && i > 1.3 ? X.tango : 'var(--line-strong)' }}
          />
          <DiagramText x={279} y={p[w] + 3.5} text={g} tone={w === u && i > 1.3 ? 'tango' : 'mute'} size={9.5} />
        </g>
      ))}
      <circle cx={160} cy={92} r={20} style={{ fill: X.violet }} />
      <DiagramIcon name="memory" x={160} y={92} s={0.95} tone="white" />
      {f > 0 && f < 1 && (
        <Badge x={lerp(70, 160, f)} y={lerp(p[l], 92, f)} tone="pitch" text={d} s={0.9} />
      )}
      {m > 0 && m < 1 && (
        <Badge x={lerp(160, 250, m)} y={lerp(92, p[u], m)} tone="pitch" text={d} s={0.9} />
      )}
      {v > 0 && v < 1 && (
        <Badge x={lerp(250, 70, v)} y={lerp(p[u], p[l], v)} tone="violet" text="Answer" s={0.9} />
      )}
      <DiagramText x={160} y={172} text="Sends each request to the right system" tone="mute" size={9.5} />
    </g>
  );
}

/** 03. IoT Intelligence: local edge decision */
function drawIoT(n: number) {
  const safeN = Number.isFinite(n) ? Math.max(0, n) : 0;
  const s = 1 - smooth(norm(safeN, 7.4, 8.0));
  const o = safeN % 4;
  const i = easeInOutCubic(norm(o, 0.2, 1.1));
  const l = easeInOutCubic(norm(o, 1.7, 2.5));
  const u = pulse(o, 2.5, 3.9, 0.2);
  const d = Math.round(lerp(31, 38, norm(o, 0, 1)) - 7 * norm(o, 2.6, 3.6));

  return (
    <g style={{ opacity: s }}>
      <rect
        x={16}
        y={60}
        width={70}
        height={64}
        rx={12}
        style={{ fill: 'var(--card)', stroke: o < 1.2 ? X.pitch : 'var(--line-strong)' }}
      />
      <DiagramText x={51} y={52} text="Sensor" size={9.5} />
      <text
        x={51}
        y={98}
        textAnchor="middle"
        style={{
          fill: d >= 36 ? 'var(--tango-text)' : 'var(--ink)',
          fontSize: 18,
          fontWeight: 600,
          fontFamily: 'var(--sans)',
        }}
      >
        {d}°
      </text>
      <line x1={86} y1={92} x2={124} y2={92} style={{ stroke: 'var(--line-strong)' }} />
      <rect
        x={124}
        y={60}
        width={78}
        height={64}
        rx={12}
        style={{ fill: 'var(--card)', stroke: X.violet, strokeWidth: 1.4 }}
      />
      <DiagramText x={163} y={52} text="Decides on site" tone="violet" size={9.5} />
      <text
        x={163}
        y={90}
        textAnchor="middle"
        style={{ fill: 'var(--ink)', fontSize: 10, fontWeight: 500, fontFamily: 'var(--sans)' }}
      >
        Too hot?
      </text>
      <text
        x={163}
        y={106}
        textAnchor="middle"
        style={{
          fill: 'var(--brand-text)',
          fontSize: 10,
          fontWeight: 600,
          fontFamily: 'var(--sans)',
          opacity: smooth(norm(o, 1.2, 1.5)),
        }}
      >
        Yes → cool
      </text>
      <line x1={202} y1={92} x2={240} y2={92} style={{ stroke: 'var(--line-strong)' }} />
      <rect
        x={240}
        y={60}
        width={64}
        height={64}
        rx={12}
        style={{
          fill: u > 0.05 ? 'var(--pitch-soft)' : 'var(--card)',
          stroke: u > 0.05 ? X.pitch : 'var(--line-strong)',
        }}
      />
      <DiagramText x={272} y={52} text="Machine" size={9.5} />
      <g
        style={{
          transform: `rotate(${u > 0.05 ? o * 540 : 0}deg)`,
          transformOrigin: '272px 92px',
        }}
      >
        <path
          d="M272 92l0-14a7 7 0 0 1 0 14zM272 92l12 7a7 7 0 0 1-12-7zM272 92l-12 7a7 7 0 0 1 12-7z"
          style={{ fill: u > 0.05 ? X.pitch : 'var(--ink-3)' }}
        />
      </g>
      {i > 0 && i < 1 && <Badge x={lerp(86, 124, i)} y={92} tone="pitch" text="38°" s={0.85} />}
      {l > 0 && l < 1 && <Badge x={lerp(202, 240, l)} y={92} tone="violet" text="Fan on" s={0.85} />}
      <DiagramText x={160} y={160} text="No round trip to the cloud" tone="mute" size={9.5} />
    </g>
  );
}

/** 04. Geo Intelligence: satellite change detection */
function drawGeo(n: number) {
  const safeN = Number.isFinite(n) ? Math.max(0, n) : 0;
  const s = 1 - smooth(norm(safeN, 7.4, 8.0));
  const o = 8;
  const i = 3;
  const l = norm(safeN, 0.4, 5.2);
  const u = new Set([3, 10, 12, 21]);
  const d = [...u].filter((p) => l * o > (p % o) + 1.2).length;

  return (
    <g style={{ opacity: s }}>
      {Array.from({ length: o * i }, (_, f) => {
        const m = f % o;
        const v = Math.floor(f / o);
        const g = 22 + m * 35;
        const w = 48 + v * 32;
        const j = l * o > m + 0.5;
        const k = u.has(f) && l * o > m + 1.2;
        return (
          <g key={f}>
            <rect
              x={g}
              y={w}
              width={31}
              height={28}
              rx={5}
              style={{
                fill: k ? 'var(--tango-soft)' : j ? 'var(--brand-soft)' : 'var(--fill)',
                stroke: k ? X.tango : 'var(--line)',
                strokeWidth: k ? 1.3 : 1,
              }}
            />
            {k && (
              <path
                d={`M${g + 15.5} ${w + 8}v8M${g + 11.5} ${w + 13}l4 4 4-4`}
                fill="none"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ stroke: X.tango }}
              />
            )}
          </g>
        );
      })}
      <g style={{ opacity: l > 0 && l < 1 ? 1 : 0 }}>
        <line x1={22 + l * 280} x2={22 + l * 280} y1={36} y2={146} style={{ stroke: X.violet, strokeWidth: 1.6 }} />
        <Badge x={22 + l * 280} y={26} tone="violet" text="Satellite pass" s={0.85} />
      </g>
      <PillLabel
        x={160}
        y={166}
        text={d ? `Water level fell in ${d} areas` : 'Scanning for change'}
        tone={d ? 'tango' : 'ink'}
      />
    </g>
  );
}

/** 05. Defense Intelligence: perimeter security */
function drawDefense(n: number) {
  const safeN = Number.isFinite(n) ? Math.max(0, n) : 0;
  const s = 1 - smooth(norm(safeN, 7.4, 8.0));
  const o = [
    { a: 200, bad: true, t0: 0.3 },
    { a: 20, bad: false, t0: 1.7 },
    { a: 330, bad: true, t0: 3.1 },
    { a: 150, bad: false, t0: 4.5 },
    { a: 250, bad: true, t0: 5.8 },
  ];
  const i = 160;
  const l = 88;

  return (
    <g style={{ opacity: s }}>
      <ellipse
        cx={i}
        cy={l}
        rx={96}
        ry={58}
        fill="none"
        style={{
          stroke: X.violet,
          strokeWidth: 1.4,
          strokeDasharray: '4 5',
          opacity: 0.8,
        }}
      />
      <circle cx={i} cy={l} r={22} style={{ fill: X.violet }} />
      <DiagramIcon name="shield" x={i} y={l} s={1.2} tone="white" />
      {o.map((u, d) => {
        const p = norm(safeN, u.t0, u.t0 + 1.4);
        if (p <= 0 || p >= 1) return null;
        const f = (u.a * Math.PI) / 180;
        const m = i + Math.cos(f) * 96;
        const v = l + Math.sin(f) * 58;
        const g = i + Math.cos(f) * 150;
        const w = l + Math.sin(f) * 90;
        const j = easeInOutCubic(clamp(p / (u.bad ? 0.55 : 1)));
        const k = u.bad && p > 0.55;
        return (
          <g key={d}>
            {!k && (
              <Badge
                x={lerp(g, u.bad ? m : i, j)}
                y={lerp(w, u.bad ? v : l, j)}
                tone={u.bad ? 'tango' : 'pitch'}
                text={u.bad ? 'Unknown' : 'Verified'}
                s={0.8}
                a={u.bad ? 1 : 1 - norm(p, 0.8, 1)}
              />
            )}
            {k && (
              <g style={{ opacity: 1 - norm(p, 0.75, 1) }}>
                <circle cx={m} cy={v} r={9} style={{ fill: 'var(--card)', stroke: X.tango, strokeWidth: 1.3 }} />
                <DiagramIcon name="x" x={m} y={v} s={0.75} tone="tango" />
              </g>
            )}
          </g>
        );
      })}
      <DiagramText x={i} y={170} text="Only verified requests reach the system" tone="mute" size={9.5} />
    </g>
  );
}

/** 06. Miniature Intelligence: on-device model + sync */
function drawMiniature(n: number) {
  const safeN = Number.isFinite(n) ? Math.max(0, n) : 0;
  const s = 1 - smooth(norm(safeN, 7.4, 8.0));
  const o = safeN % 4;
  const i = easeInOutCubic(norm(o, 0.1, 0.6));
  const l = easeInOutCubic(norm(o, 0.8, 1.3));
  const u = o > 2.2;
  const d = easeInOutCubic(norm(o, 2.4, 3.4));

  return (
    <g style={{ opacity: s }}>
      <rect
        x={210}
        y={22}
        width={96}
        height={34}
        rx={10}
        style={{ fill: 'var(--card)', stroke: u ? X.violet : 'var(--line-strong)' }}
      />
      <DiagramText x={258} y={43} text="Cloud" tone={u ? 'violet' : 'mute'} size={10} />
      <path
        d="M226 118C250 118 258 96 258 56"
        fill="none"
        style={{ stroke: u ? X.violet : 'var(--line-strong)', strokeDasharray: '3 4' }}
      />
      <PillLabel x={262} y={86} text={u ? 'Back online' : 'Offline'} tone={u ? 'violet' : 'ink'} />
      <rect
        x={120}
        y={44}
        width={100}
        height={128}
        rx={16}
        style={{ fill: 'var(--card)', stroke: X.violet, strokeWidth: 1.4 }}
      />
      <DiagramText x={170} y={64} text="Your phone" tone="violet" size={10} />
      <rect x={150} y={80} width={40} height={40} rx={10} style={{ fill: X.violet }} />
      <DiagramIcon name="memory" x={170} y={100} s={1} tone="white" />
      <DiagramText x={170} y={138} text="Small model" tone="mute" size={9.5} />
      <Badge x={50} y={70} tone="ink" text="Question" a={1} s={0.9} />
      {i > 0 && i < 1 && (
        <Badge x={lerp(50, 150, i)} y={lerp(70, 100, i)} w={16} h={9} tone="pitch" lines={false} />
      )}
      <Badge x={50} y={130} tone="violet" text="Answer" a={smooth(norm(o, 1.2, 1.4))} s={0.9} />
      {l > 0 && l < 1 && (
        <Badge x={lerp(150, 50, l)} y={lerp(100, 130, l)} w={16} h={9} tone="violet" lines={false} />
      )}
      {d > 0 && d < 1 && (
        <Badge x={lerp(220, 258, d)} y={lerp(118, 56, d)} tone="tango" text="Update" s={0.8} />
      )}
    </g>
  );
}

export const LAB_DIAGRAMS = [
  {
    draw: drawRivinity,
    period: 8,
    w: 320,
    h: 180,
    still: 6.5,
    label: 'Feedback, papers, corrections and new data arrive and each is kept by the model',
  },
  {
    draw: drawCore,
    period: 8,
    w: 320,
    h: 180,
    still: 1.1,
    label: 'A request from an app is routed through one core to the system that can answer it, and the answer returns',
  },
  {
    draw: drawIoT,
    period: 8,
    w: 320,
    h: 180,
    still: 2.2,
    label: 'A sensor reads 38 degrees, the device decides on site and switches a fan on',
  },
  {
    draw: drawGeo,
    period: 8,
    w: 320,
    h: 180,
    still: 6,
    label: 'A satellite pass scans a map and flags the areas where the water level fell',
  },
  {
    draw: drawDefense,
    period: 8,
    w: 320,
    h: 180,
    still: 2.6,
    label: 'Verified requests pass the perimeter; unknown ones are stopped at the edge',
  },
  {
    draw: drawMiniature,
    period: 8,
    w: 320,
    h: 180,
    still: 3,
    label: 'A small model on the phone answers a question offline, then syncs an update when back online',
  },
];
