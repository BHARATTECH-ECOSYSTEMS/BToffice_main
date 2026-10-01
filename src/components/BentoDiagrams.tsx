import { useState, useRef, useEffect, type ReactNode } from 'react';

export const prefersReducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const X = {
  violet: 'var(--brand-fill, #6d4bff)',
  tango: 'var(--tango-fill, #ff8643)',
  pitch: 'var(--pitch-fill, #f59e00)',
  ink: 'var(--ink)',
  mute: 'var(--ink-3)',
  white: '#ffffff',
} as const;

export const Pu = {
  violet: 'var(--brand-text, #9480ff)',
  tango: 'var(--tango-text, #ff8643)',
  pitch: 'var(--pitch-text, #f59e00)',
  ink: 'var(--ink)',
  mute: 'var(--ink-3)',
  white: '#ffffff',
} as const;

export type Tone = keyof typeof X;

const transformStyle = (x: number, y: number, s = 1) => ({
  transform: `translate(${x}px, ${y}px) scale(${s})`,
});

const approxWidth = (text: string, size = 10) => text.length * size * 0.56;

/* ── Diagram Runner (ro) ─────────────────────────────────────────────────── */

export interface DiagramProps {
  draw: (t: number, pointer: { x: number; y: number; on: number }) => ReactNode;
  period: number;
  w?: number;
  h?: number;
  label: string;
  className?: string;
  hold?: number;
  at?: number;
  still?: number;
}

export function Diagram({
  draw,
  period,
  w = 480,
  h = 300,
  label,
  className = '',
  hold,
  at,
  still,
}: DiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [state, setState] = useState(() => ({
    t: at ?? still ?? period * 0.72,
    p: { x: 0, y: 0, on: 0 },
  }));
  const isStill = at !== undefined || prefersReducedMotion();
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const el = svgRef.current;
    if (!el || at !== undefined) return;

    const currentPointer = { x: 0, y: 0, on: 0 };
    let targetPointer = { x: 0, y: 0, on: 0 };
    let time = 0;
    let lastStamp = 0;
    let rafId = 0;
    let isIntersecting = false;
    const reduced = prefersReducedMotion();

    let lastRenderStamp = 0;
    const loop = (stamp: number) => {
      if (!isIntersecting) {
        rafId = 0;
        return;
      }
      const dt = lastStamp ? Math.min(0.05, (stamp - lastStamp) / 1000) : 0.016;
      lastStamp = stamp;
      const safePeriod = Math.max(0.1, period);
      const modT = Math.max(0, time % safePeriod);
      const isHolding =
        hold !== undefined && targetPointer.on > 0.5 && modT >= hold && modT < hold + 0.6;
      if (!isHolding && !reduced) {
        time += dt;
      }
      const smoothRate = 1 - Math.exp(-dt * 22);
      if (currentPointer.on < 0.02) {
        currentPointer.x = targetPointer.x;
        currentPointer.y = targetPointer.y;
      } else {
        currentPointer.x += (targetPointer.x - currentPointer.x) * smoothRate;
        currentPointer.y += (targetPointer.y - currentPointer.y) * smoothRate;
      }
      currentPointer.on += (targetPointer.on - currentPointer.on) * (1 - Math.exp(-dt * 9));

      if (stamp - lastRenderStamp >= 24 || targetPointer.on > 0.05) {
        lastRenderStamp = stamp;
        setState({
          t: reduced ? still ?? safePeriod * 0.72 : Math.max(0, time % safePeriod),
          p: { ...currentPointer },
        });
      }

      rafId = isIntersecting && !reduced ? requestAnimationFrame(loop) : 0;
    };

    const kick = () => {
      if (!rafId && !reduced) {
        lastStamp = performance.now();
        rafId = requestAnimationFrame(loop);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      targetPointer = {
        x: ((e.clientX - rect.left) / rect.width) * w,
        y: ((e.clientY - rect.top) / rect.height) * h,
        on: 1,
      };
      if (reduced) kick();
    };

    const handlePointerLeave = () => {
      targetPointer.on = 0;
      if (reduced) kick();
    };

    const observer = new IntersectionObserver(([entry]) => {
      isIntersecting = entry.isIntersecting;
      if (isIntersecting) {
        kick();
      } else {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    });

    observer.observe(el);
    el.addEventListener('pointermove', handlePointerMove);
    el.addEventListener('pointerdown', handlePointerMove);
    el.addEventListener('pointerleave', handlePointerLeave);
    el.addEventListener('pointercancel', handlePointerLeave);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      el.removeEventListener('pointermove', handlePointerMove);
      el.removeEventListener('pointerdown', handlePointerMove);
      el.removeEventListener('pointerleave', handlePointerLeave);
      el.removeEventListener('pointercancel', handlePointerLeave);
    };
  }, [period, hold, at, still, w, h]);

  return (
    <svg
      ref={svgRef}
      className={`dg ${isStill ? 'is-still' : ''} ${className}`}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={label}
    >
      {drawRef.current(at ?? state.t, at !== undefined ? { x: 0, y: 0, on: 0 } : state.p)}
    </svg>
  );
}

/* ── Primitives ─────────────────────────────────────────────────────────── */

export interface BadgeProps {
  x: number;
  y: number;
  w?: number;
  h?: number;
  tone?: Tone;
  a?: number;
  s?: number;
  lines?: boolean;
  text?: string;
  size?: number;
}

export function Badge({
  x,
  y,
  w,
  h,
  tone = 'violet',
  a = 1,
  s = 1,
  lines = true,
  text,
  size = 10,
}: BadgeProps) {
  if (a <= 0.01) return null;
  const width = w ?? (text ? approxWidth(text, size) + 16 : 30);
  const height = h ?? (text ? size + 10 : 14);
  const textColor = tone === 'pitch' ? '#2a1a00' : tone === 'ink' ? 'var(--bg)' : '#ffffff';
  return (
    <g style={{ ...transformStyle(x, y, s), opacity: a }}>
      <rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        rx={Math.min(6, height / 2)}
        style={{ fill: X[tone] }}
      />
      {text ? (
        <text
          y={size * 0.36}
          textAnchor="middle"
          style={{
            fill: textColor,
            fontSize: size,
            fontWeight: 600,
            fontFamily: 'var(--sans)',
            letterSpacing: '-0.01em',
          }}
        >
          {text}
        </text>
      ) : (
        lines && (
          <rect
            x={-width / 2 + 5}
            y={-1}
            width={width - 10}
            height={2}
            rx={1}
            style={{ fill: 'rgba(255,255,255,0.75)' }}
          />
        )
      )}
    </g>
  );
}

export interface DiagramTextProps {
  x: number;
  y: number;
  text: string;
  tone?: Tone;
  a?: number;
  anchor?: 'start' | 'middle' | 'end';
  size?: number;
  weight?: number;
  transform?: string;
}

export function DiagramText({
  x,
  y,
  text,
  tone = 'mute',
  a = 1,
  anchor = 'middle',
  size = 11,
  weight = 500,
  transform,
}: DiagramTextProps) {
  if (a <= 0.01) return null;
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      transform={transform}
      style={{
        fill: Pu[tone],
        opacity: a,
        fontSize: size,
        fontWeight: weight,
        fontFamily: 'var(--sans)',
        letterSpacing: '-0.005em',
      }}
    >
      {text}
    </text>
  );
}

export interface PillLabelProps {
  x: number;
  y: number;
  text: string;
  tone?: Tone;
  a?: number;
}

export function PillLabel({ x, y, text, tone = 'ink', a = 1 }: PillLabelProps) {
  if (a <= 0.01) return null;
  const w = approxWidth(text, 10.5) + 18;
  return (
    <g style={{ opacity: a }}>
      <rect
        x={x - w / 2}
        y={y - 10}
        width={w}
        height={20}
        rx={10}
        style={{
          fill: 'var(--card)',
          stroke: tone === 'ink' ? 'var(--line-strong)' : X[tone],
          strokeWidth: 1,
        }}
      />
      <text
        x={x}
        y={y + 3.6}
        textAnchor="middle"
        style={{
          fill: tone === 'ink' ? 'var(--ink-2)' : Pu[tone],
          fontSize: 10.5,
          fontWeight: 500,
          fontFamily: 'var(--sans)',
        }}
      >
        {text}
      </text>
    </g>
  );
}

export interface BentoBoxProps {
  x: number;
  y: number;
  w: number;
  h: number;
  title?: string;
  active?: number;
  tone?: Tone;
  children?: ReactNode;
}

export function BentoBox({
  x,
  y,
  w,
  h,
  title,
  active = 0,
  tone = 'violet',
  children,
}: BentoBoxProps) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={10}
        style={{
          fill: 'var(--card)',
          stroke: active > 0.05 ? X[tone] : 'var(--line-strong)',
          strokeWidth: 1 + active * 0.6,
          transition: 'none',
        }}
      />
      {title && (
        <DiagramText
          x={x + 12}
          y={y + 20}
          text={title}
          tone={active > 0.05 ? tone : 'mute'}
          anchor="start"
        />
      )}
      {children}
    </g>
  );
}

export const ICONS: Record<string, string> = {
  chat: 'M-7 -6h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-6l-4 3.5V5h-4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z',
  docs: 'M-5.5 -8h7l4.5 4.5V8h-11.5zM1.5 -8v4.5h4.5M-3 1h6M-3 4.5h6',
  search: 'M0 -1.5a5.5 5.5 0 1 0 0.01 0M4 3l4.5 4.5',
  voice: 'M0 -8a3 3 0 0 1 3 3v4a3 3 0 0 1-6 0v-4a3 3 0 0 1 3-3zM-6 -1a6 6 0 0 0 12 0M0 5v4M-3 9h6',
  vision: 'M-9 0c2.5-4.5 5.5-6.5 9-6.5s6.5 2 9 6.5c-2.5 4.5-5.5 6.5-9 6.5s-6.5-2-9-6.5zM0 -2.5a2.5 2.5 0 1 0 .01 0',
  code: 'M-4.5 -5l-5 5 5 5M4.5 -5l5 5-5 5M1.5 -8l-3 16',
  memory:
    'M-8 -6c0-1.5 3.5-2.5 8-2.5s8 1 8 2.5-3.5 2.5-8 2.5-8-1-8-2.5zM-8 -6v6c0 1.5 3.5 2.5 8 2.5s8-1 8-2.5v-6M-8 0v6c0 1.5 3.5 2.5 8 2.5s8-1 8-2.5v-6',
  lock: 'M-5 -1h10v8h-10zM-3 -1v-3a3 3 0 0 1 6 0v3',
  snow: 'M0 -8v16M-7 -4l14 8M-7 4l14-8',
  agent: 'M-6 -3h12v9h-12zM0 -3v-4M-2 -8h4M-3 1.5h.01M3 1.5h.01M-2.5 4h5',
  shield: 'M0 -9l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10v-5l8-3zM-3.5 0.5l2.5 2.5 4.5-5',
  server: 'M-8 -8h16v6h-16zM-8 2h16v6h-16zM-4.5 -5h.01M-4.5 5h.01',
  phone: 'M-4.5 -8h9v16h-9zM-1.5 5h3',
  check: 'M-4 0l3 3 5-6',
  x: 'M-3.5 -3.5l7 7M3.5 -3.5l-7 7',
};

export interface IconProps {
  name: string;
  x: number;
  y: number;
  s?: number;
  tone?: Tone;
  a?: number;
}

export function DiagramIcon({ name, x, y, s = 1, tone = 'ink', a = 1 }: IconProps) {
  if (a <= 0.01) return null;
  return (
    <g style={{ ...transformStyle(x, y, s), opacity: a }}>
      <path
        d={ICONS[name] ?? ''}
        fill="none"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ stroke: Pu[tone] }}
      />
    </g>
  );
}

/* ── Math / Easing Utilities ────────────────────────────────────────────── */

export const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));
export const lerp = (n: number, o: number, t: number) => n + (o - n) * t;
export const norm = (n: number, min: number, max: number) => clamp((n - min) / (max - min));
export const smooth = (n: number) => n * n * (3 - 2 * n);
export const easeInOutCubic = (n: number) =>
  n < 0.5 ? 4 * n * n * n : 1 - Math.pow(-2 * n + 2, 3) / 2;
export const easeOutCubic = (n: number) => 1 - Math.pow(1 - n, 3);
export const pulse = (n: number, start: number, end: number, fade = 0.3) =>
  smooth(norm(n, start, start + fade)) * (1 - smooth(norm(n, end - fade, end)));
export const easeOutBack = (n: number) =>
  1 + (1.70158 + 1) * Math.pow(n - 1, 3) + 1.70158 * Math.pow(n - 1, 2);
export const smoothPulse = (n: number, start: number, end: number) =>
  1 - Math.abs(norm(n, start, end) * 2 - 1);

/* ── 01. Diagram: It Remembers (tx) ─────────────────────────────────────── */

const SESSIONS = [
  { x: 16, when: 'Monday', t0: 0.2, t1: 3.9 },
  { x: 170, when: 'Thursday', t0: 4.0, t1: 7.4 },
  { x: 324, when: 'Next week', t0: 7.6, t1: 11.6 },
];
const CARD_W = 140;
const NOTES: Array<{ text: string; tone: Tone; from: number; born: number; fly: number; slot: number }> = [
  { text: '40 districts', tone: 'tango', from: 0, born: 0.6, fly: 2.0, slot: 92 },
  { text: '7 flagged critical', tone: 'pitch', from: 0, born: 1.1, fly: 2.6, slot: 210 },
  { text: 'New satellite data', tone: 'violet', from: 1, born: 4.6, fly: 5.8, slot: 350 },
];
const MEMORY_Y = 222;

export function drawRemember(t: number) {
  const safeT = Number.isFinite(t) ? t : 0;
  const fadeOut = 1 - smooth(norm(safeT, 11.4, 12));
  const sessionActives = SESSIONS.map((s) => pulse(safeT, s.t0, s.t1, 0.3));
  const memoryActive = pulse(safeT, 8.4, 11.6, 0.3);

  return (
    <g style={{ opacity: fadeOut }}>
      {SESSIONS.map((s, idx) => (
        <BentoBox
          key={s.when}
          x={s.x}
          y={16}
          w={CARD_W}
          h={100}
          title={s.when}
          active={sessionActives[idx]}
          tone="violet"
        />
      ))}
      <g style={{ opacity: smooth(norm(safeT, 7.9, 8.3)) }}>
        <text
          x={SESSIONS[2].x + 12}
          y={58}
          style={{
            fill: 'var(--ink)',
            fontSize: 10.5,
            fontWeight: 500,
            fontFamily: 'var(--sans)',
          }}
        >
          Which districts changed?
        </text>
      </g>
      <g style={{ opacity: smooth(norm(safeT, 10.2, 10.6)) }}>
        <rect
          x={SESSIONS[2].x + 10}
          y={84}
          width={CARD_W - 20}
          height={22}
          rx={6}
          style={{ fill: 'var(--brand-soft)' }}
        />
        <DiagramIcon name="check" x={SESSIONS[2].x + 22} y={95} s={0.8} tone="violet" />
        <text
          x={SESSIONS[2].x + 32}
          y={99}
          style={{
            fill: 'var(--brand-text)',
            fontSize: 10.5,
            fontWeight: 600,
            fontFamily: 'var(--sans)',
          }}
        >
          3 of 7 declined
        </text>
      </g>
      <rect
        x={16}
        y={MEMORY_Y - 50}
        width={448}
        height={96}
        rx={12}
        style={{
          fill: 'var(--card)',
          stroke: memoryActive > 0.05 ? X.violet : 'var(--line-strong)',
          strokeWidth: 1 + memoryActive * 0.6,
        }}
      />
      <DiagramIcon
        name="memory"
        x={34}
        y={MEMORY_Y - 30}
        s={0.75}
        tone={memoryActive > 0.05 ? 'violet' : 'mute'}
      />
      <DiagramText
        x={48}
        y={MEMORY_Y - 26}
        text="Memory"
        tone={memoryActive > 0.05 ? 'violet' : 'mute'}
        anchor="start"
      />
      <DiagramText
        x={452}
        y={MEMORY_Y - 26}
        text="Kept between sessions"
        tone="mute"
        anchor="end"
        size={10}
        a={smooth(norm(safeT, 3, 3.6))}
      />
      {NOTES.map((note, idx) => {
        const startX = SESSIONS[note.from].x + CARD_W / 2;
        const startY = 62 + (note.from === 0 ? (idx === 0 ? -6 : 22) : 8);
        const flyProgress = easeInOutCubic(norm(safeT, note.fly, note.fly + 1.1));
        const birthProgress = easeOutCubic(norm(safeT, note.born, note.born + 0.35));
        const isRecalled = memoryActive > 0.05 && safeT > 8.6 + idx * 0.25;
        return (
          <Badge
            key={note.text}
            x={lerp(startX, note.slot, flyProgress)}
            y={lerp(startY, MEMORY_Y + 8, flyProgress)}
            tone={note.tone}
            text={note.text}
            s={0.7 + 0.3 * birthProgress * (isRecalled ? 1.06 : 1)}
            a={birthProgress}
          />
        );
      })}
      {NOTES.map((note, idx) => {
        const recallStart = 8.7 + idx * 0.25;
        const recallProgress = easeInOutCubic(norm(safeT, recallStart, recallStart + 1));
        if (recallProgress <= 0 || recallProgress >= 1) return null;
        return (
          <Badge
            key={`r${idx}`}
            x={lerp(note.slot, SESSIONS[2].x + 30 + idx * 40, recallProgress)}
            y={lerp(MEMORY_Y + 8, 76, recallProgress)}
            w={30}
            h={10}
            tone={note.tone}
            lines={false}
          />
        );
      })}
    </g>
  );
}

/* ── 02. Diagram: It Connects (rx) ───────────────────────────────────────── */

const CONNECT_TOOLS: Array<{ name: string; icon: string; tone: Tone }> = [
  { name: 'Chat', icon: 'chat', tone: 'violet' },
  { name: 'Docs', icon: 'docs', tone: 'tango' },
  { name: 'Search', icon: 'search', tone: 'pitch' },
  { name: 'Voice', icon: 'voice', tone: 'violet' },
  { name: 'Vision', icon: 'vision', tone: 'tango' },
  { name: 'Code', icon: 'code', tone: 'pitch' },
];

const HUB = { x: 240, y: 136, r: 28 };
const TOOL_POSITIONS = CONNECT_TOOLS.map((_, i) => {
  const angle = ((-90 + 60 * i) * Math.PI) / 180;
  return {
    x: 240 + 176 * Math.cos(angle),
    y: 136 + 88 * Math.sin(angle),
  };
});

const PACKETS = [
  { src: 1, item: 'Survey PDF' },
  { src: 3, item: 'Call notes' },
  { src: 4, item: 'Map image' },
];

export function drawConnect(t: number) {
  const safeT = Number.isFinite(t) ? Math.max(0, t) : 0;
  const rawIdx = Math.floor(safeT / 4) % PACKETS.length;
  const packetIndex = ((rawIdx % PACKETS.length) + PACKETS.length) % PACKETS.length;
  const packet = PACKETS[packetIndex] ?? PACKETS[0];
  const { src, item } = packet;
  const phase = safeT % 4;
  const inProgress = easeInOutCubic(norm(phase, 0.3, 1.3));
  const glowProgress = norm(phase, 1.3, 2);
  const srcPos = TOOL_POSITIONS[src] ?? TOOL_POSITIONS[0];
  const srcTone = CONNECT_TOOLS[src]?.tone ?? 'violet';

  return (
    <g>
      {TOOL_POSITIONS.map((pos, idx) => (
        <line
          key={idx}
          x1={HUB.x}
          y1={HUB.y}
          x2={pos.x}
          y2={pos.y}
          style={{ stroke: 'var(--line-strong)', strokeWidth: 1.2 }}
        />
      ))}
      <circle
        cx={HUB.x}
        cy={HUB.y}
        r={HUB.r + 22 * easeOutCubic(glowProgress)}
        style={{
          fill: 'none',
          stroke: X.violet,
          strokeWidth: 1.4,
          opacity: glowProgress > 0 && glowProgress < 1 ? 0.5 * (1 - glowProgress) : 0,
        }}
      />
      <circle cx={HUB.x} cy={HUB.y} r={HUB.r} style={{ fill: X.violet }} />
      <DiagramIcon name="memory" x={HUB.x} y={HUB.y - 1} s={1.2} tone="white" />

      {CONNECT_TOOLS.map((tool, idx) => {
        const pos = TOOL_POSITIONS[idx];
        const isSource = idx === src;
        const waveDelay = 0.05 * ((idx - src + 6) % 6);
        const outWave = easeInOutCubic(norm(phase, 1.6 + waveDelay, 2.5 + waveDelay));
        const checkOpacity = isSource ? 0 : pulse(phase, 2.5 + waveDelay, 3.9, 0.25);
        const cardActive = isSource ? pulse(phase, 0.05, 1.6, 0.25) : checkOpacity;
        const labelAbove = pos.y < HUB.y - 10;

        return (
          <g key={tool.name}>
            <rect
              x={pos.x - 22}
              y={pos.y - 22}
              width={44}
              height={44}
              rx={11}
              style={{
                fill: 'var(--card)',
                stroke: cardActive > 0.05 ? X[tool.tone] : 'var(--line-strong)',
                strokeWidth: 1 + cardActive * 0.8,
              }}
            />
            <DiagramIcon
              name={tool.icon}
              x={pos.x}
              y={pos.y}
              s={1.15}
              tone={cardActive > 0.05 ? tool.tone : 'ink'}
            />
            <DiagramText
              x={pos.x}
              y={labelAbove ? pos.y - 30 : pos.y + 38}
              text={tool.name}
              tone={cardActive > 0.05 ? tool.tone : 'mute'}
            />
            {checkOpacity > 0.05 && (
              <g style={{ opacity: checkOpacity }}>
                <circle cx={pos.x + 18} cy={pos.y - 18} r={7.5} style={{ fill: X[srcTone] }} />
                <DiagramIcon
                  name="check"
                  x={pos.x + 18}
                  y={pos.y - 18}
                  s={0.75}
                  tone={srcTone === 'pitch' ? 'ink' : 'white'}
                />
              </g>
            )}
            {!isSource && outWave > 0 && outWave < 1 && (
              <Badge
                x={lerp(HUB.x, pos.x, outWave)}
                y={lerp(HUB.y, pos.y, outWave)}
                w={18}
                h={9}
                tone={srcTone}
                lines={false}
              />
            )}
          </g>
        );
      })}

      {inProgress > 0 && inProgress < 1 && (
        <Badge
          x={lerp(srcPos.x, HUB.x, inProgress)}
          y={lerp(srcPos.y, HUB.y, inProgress)}
          tone={srcTone}
          text={item}
        />
      )}

      <PillLabel
        x={240}
        y={288}
        text={
          phase < 1.6
            ? `${CONNECT_TOOLS[src]?.name ?? 'Chat'} learns “${item}”`
            : `Now all 6 systems know “${item}”`
        }
        tone={phase < 1.6 ? 'ink' : 'violet'}
        a={pulse(phase, 0.2, 3.9, 0.25)}
      />
    </g>
  );
}

/* ── 03. Diagram: It Keeps Learning (ix) ─────────────────────────────────── */

const GRAPH_X0 = 48;
const GRAPH_X1 = 452;
const GRAPH_BASE_Y = 236;
const T_DEPLOY = 0.3;

const mapX = (normX: number) => lerp(GRAPH_X0, GRAPH_X1, normX);
const trainCurve = (normX: number) => 30 + 88 * smooth(clamp(normX / T_DEPLOY));
const originCurve = (normX: number) =>
  normX <= T_DEPLOY
    ? trainCurve(normX)
    : 118 + 86 * (1 - Math.exp((-3.2 * (normX - T_DEPLOY)) / (1 - T_DEPLOY)));
const frozenCurve = (normX: number) => (normX <= T_DEPLOY ? trainCurve(normX) : 118);
const toGraphY = (curveY: number) => GRAPH_BASE_Y - curveY;

const DATA_POINTS = [0.42, 0.53, 0.64, 0.75, 0.86, 0.96];

const makePathD = (fn: (x: number) => number, startX: number, endX: number) => {
  const steps = Math.max(2, Math.ceil((endX - startX) * 70));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const fraction = lerp(startX, endX, i / steps);
    return `${i ? 'L' : 'M'}${mapX(fraction).toFixed(1)} ${toGraphY(fn(fraction)).toFixed(1)}`;
  }).join('');
};

export function drawLearn(t: number) {
  const safeT = Number.isFinite(t) ? t : 0;
  const fadeOut = 1 - smooth(norm(safeT, 11.3, 12));
  const simProgress = easeInOutCubic(norm(safeT, 0.6, 9.8));
  const deployedPassed = smooth(norm(simProgress, T_DEPLOY - 0.02, T_DEPLOY + 0.02));
  const firstDataProgress = norm(simProgress, DATA_POINTS[0] - 0.1, DATA_POINTS[0]);

  return (
    <g style={{ opacity: fadeOut }}>
      <path
        d={`M${GRAPH_X0} 30V${GRAPH_BASE_Y}H${GRAPH_X1}`}
        fill="none"
        style={{ stroke: 'var(--line-strong)', strokeWidth: 1.2 }}
      />
      <text
        x={22}
        y={134}
        textAnchor="middle"
        transform="rotate(-90 22 134)"
        style={{
          fill: 'var(--ink-3)',
          fontSize: 10.5,
          fontWeight: 500,
          fontFamily: 'var(--sans)',
        }}
      >
        How much it knows
      </text>
      <DiagramText x={GRAPH_X1} y={GRAPH_BASE_Y + 20} text="Time" anchor="end" size={10.5} />
      <line
        x1={mapX(T_DEPLOY)}
        x2={mapX(T_DEPLOY)}
        y1={42}
        y2={GRAPH_BASE_Y}
        style={{
          stroke: 'var(--tango-fill)',
          strokeWidth: 1.2,
          strokeDasharray: '3 4',
          opacity: 0.8,
        }}
      />
      <PillLabel x={mapX(T_DEPLOY)} y={30} text="Deployed" tone="tango" />
      <DiagramText
        x={mapX(T_DEPLOY / 2)}
        y={GRAPH_BASE_Y + 20}
        text="Training"
        size={10.5}
      />

      <path
        d={makePathD(trainCurve, 0, Math.min(simProgress, T_DEPLOY))}
        fill="none"
        strokeWidth={2.4}
        strokeLinecap="round"
        style={{ stroke: 'var(--ink-2)' }}
      />

      {simProgress > T_DEPLOY && (
        <>
          <path
            d={makePathD(frozenCurve, T_DEPLOY, simProgress)}
            fill="none"
            strokeWidth={2.2}
            strokeLinecap="round"
            style={{ stroke: 'var(--ink-3)', strokeDasharray: '2 6' }}
          />
          <path
            d={makePathD(originCurve, T_DEPLOY, simProgress)}
            fill="none"
            strokeWidth={2.8}
            strokeLinecap="round"
            style={{ stroke: X.violet }}
          />
        </>
      )}

      {DATA_POINTS.map((pt, idx) => {
        const dropProgress = norm(simProgress, pt - 0.1, pt);
        if (dropProgress <= 0 || simProgress <= T_DEPLOY) return null;
        const ptX = mapX(pt);
        const originY = toGraphY(originCurve(pt));
        const frozenY = toGraphY(frozenCurve(pt));
        const fallT = easeInOutCubic(clamp(dropProgress / 0.6));
        const fadeAfterHit = norm(dropProgress, 0.6, 1);
        const crossShow = norm(simProgress, pt, pt + 0.05);

        return (
          <g key={idx}>
            <circle
              cx={ptX}
              cy={lerp(40, originY, fallT)}
              r={4.4}
              style={{
                fill: X.pitch,
                opacity: dropProgress < 0.6 ? 1 : 1 - norm(dropProgress, 0.6, 0.7),
              }}
            />
            {fadeAfterHit > 0 && (
              <>
                <circle
                  cx={ptX}
                  cy={lerp(originY, frozenY, fadeAfterHit)}
                  r={4.4}
                  style={{
                    fill: 'none',
                    stroke: 'var(--ink-3)',
                    strokeWidth: 1.2,
                    opacity: 0.85 * (1 - crossShow),
                  }}
                />
                <g
                  style={{
                    opacity:
                      crossShow > 0 ? 0.9 * (1 - norm(simProgress, pt + 0.05, pt + 0.1)) : 0,
                  }}
                >
                  <DiagramIcon name="x" x={ptX} y={frozenY} s={0.9} tone="tango" />
                </g>
              </>
            )}
            {dropProgress >= 0.6 && (
              <circle
                cx={ptX}
                cy={originY}
                r={4 + 9 * norm(dropProgress, 0.6, 1)}
                style={{
                  fill: 'none',
                  stroke: X.violet,
                  strokeWidth: 1.4,
                  opacity: 0.6 * (1 - norm(dropProgress, 0.6, 1)),
                }}
              />
            )}
          </g>
        );
      })}

      <Badge
        x={mapX(DATA_POINTS[0]) + 34}
        y={48}
        tone="pitch"
        text="New data"
        a={firstDataProgress > 0 ? 1 - smooth(norm(simProgress, 0.62, 0.7)) : 0}
      />
      <DiagramText
        x={mapX(0.6)}
        y={toGraphY(118) + 22}
        text="Frozen model ignores it"
        tone="mute"
        size={10}
        a={smooth(norm(simProgress, 0.5, 0.56))}
      />
      {simProgress > 0.01 && (
        <circle
          cx={mapX(simProgress)}
          cy={toGraphY(simProgress > T_DEPLOY ? originCurve(simProgress) : trainCurve(simProgress))}
          r={4.8}
          style={{ fill: simProgress > T_DEPLOY ? X.violet : 'var(--ink)' }}
        />
      )}
      <DiagramText
        x={GRAPH_X1 - 4}
        y={toGraphY(frozenCurve(1)) - 10}
        text="Frozen model"
        tone="mute"
        anchor="end"
        a={deployedPassed}
      />
      <DiagramText
        x={mapX(0.5) - 10}
        y={toGraphY(originCurve(0.5)) - 12}
        text="Origin learns from it"
        tone="violet"
        anchor="end"
        a={smooth(norm(simProgress, 0.5, 0.56))}
      />
    </g>
  );
}

/* ── Diagram Config for Bento Cards ─────────────────────────────────────── */

export const BENTO_DIAGRAMS = [
  {
    draw: drawRemember,
    h: 280,
    still: 10.8,
    label:
      'Notes from Monday and Thursday are kept in memory; next week a question is answered from them',
  },
  {
    draw: drawConnect,
    h: 300,
    still: 2.8,
    label: 'One system learns something and the shared memory hands it to the other five',
  },
  {
    draw: drawLearn,
    h: 270,
    still: 10,
    label:
      'After deployment the same new data reaches both: Origin rises, a frozen model stays flat',
  },
];
