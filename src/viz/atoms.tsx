import type { CSSProperties, ReactNode } from 'react';

export type Tone = 'violet' | 'tango' | 'pitch' | 'ink' | 'mute' | 'white';
/** colours come from the page tokens, so every diagram follows the theme with no extra work */
export const C: Record<Tone, string> = {
  violet: 'var(--brand-fill)',
  tango: 'var(--tango-fill)',
  pitch: 'var(--pitch-fill)',
  ink: 'var(--ink)',
  mute: 'var(--ink-3)',
  white: '#ffffff',
};
export const TEXT: Record<Tone, string> = {
  violet: 'var(--brand-text)',
  tango: 'var(--tango-text)',
  pitch: 'var(--pitch-text)',
  ink: 'var(--ink)',
  mute: 'var(--ink-3)',
  white: '#ffffff',
};
export const SOFT: Record<Tone, string> = {
  violet: 'var(--brand-soft)',
  tango: 'var(--tango-soft)',
  pitch: 'var(--pitch-soft)',
  ink: 'var(--fill)',
  mute: 'var(--fill)',
  white: 'rgba(255,255,255,0.2)',
};

const at = (x: number, y: number, s = 1): CSSProperties => ({ transform: `translate(${x}px, ${y}px) scale(${s})` });

/** A small piece of information: a rounded chip that says what it is by its colour and lines. */
export function Chip({ x, y, w = 30, h = 14, tone = 'violet', a = 1, s = 1, lines = true }: { x: number; y: number; w?: number; h?: number; tone?: Tone; a?: number; s?: number; lines?: boolean }) {
  if (a <= 0.01) return null;
  return (
    <g style={{ ...at(x, y, s), opacity: a }}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={4} style={{ fill: C[tone] }} />
      {lines && <rect x={-w / 2 + 5} y={-1} width={w - 10} height={2} rx={1} style={{ fill: 'rgba(255,255,255,0.75)' }} />}
    </g>
  );
}

/** A quiet label. */
export function Label({ x, y, text, tone = 'mute', a = 1, anchor = 'middle', size = 11, weight = 500 }: { x: number; y: number; text: string; tone?: Tone; a?: number; anchor?: 'start' | 'middle' | 'end'; size?: number; weight?: number }) {
  if (a <= 0.01) return null;
  return (
    <text x={x} y={y} textAnchor={anchor} style={{ fill: TEXT[tone], opacity: a, fontSize: size, fontWeight: weight, fontFamily: 'var(--sans)', letterSpacing: '-0.005em' }}>
      {text}
    </text>
  );
}

/** A label with a soft pill behind it. */
export function Tag({ x, y, text, tone = 'ink', a = 1 }: { x: number; y: number; text: string; tone?: Tone; a?: number }) {
  if (a <= 0.01) return null;
  const w = text.length * 5.9 + 16;
  return (
    <g style={{ opacity: a }}>
      <rect x={x - w / 2} y={y - 10} width={w} height={20} rx={10} style={{ fill: 'var(--card)', stroke: tone === 'ink' ? 'var(--line-strong)' : C[tone], strokeWidth: 1 }} />
      <text x={x} y={y + 3.6} textAnchor="middle" style={{ fill: tone === 'ink' ? 'var(--ink-2)' : TEXT[tone], fontSize: 10.5, fontWeight: 500, fontFamily: 'var(--sans)' }}>
        {text}
      </text>
    </g>
  );
}

/** A window with a title bar, used for sessions, apps and agents. */
export function Panel({ x, y, w, h, title, active = 0, tone = 'violet', children }: { x: number; y: number; w: number; h: number; title?: string; active?: number; tone?: Tone; children?: ReactNode }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} style={{ fill: 'var(--card)', stroke: active > 0.05 ? C[tone] : 'var(--line-strong)', strokeWidth: 1 + active * 0.6, transition: 'none' }} />
      {title && <Label x={x + 12} y={y + 20} text={title} tone={active > 0.05 ? tone : 'mute'} anchor="start" />}
      {children}
    </g>
  );
}

/** Skeleton text lines, to suggest a conversation without spelling it out. */
export function Lines({ x, y, w, n = 2, a = 1, gap = 9 }: { x: number; y: number; w: number; n?: number; a?: number; gap?: number }) {
  return (
    <g style={{ opacity: a }}>
      {Array.from({ length: n }, (_, i) => (
        <rect key={i} x={x} y={y + i * gap} width={w * (i === n - 1 ? 0.62 : 1)} height={3.5} rx={1.75} style={{ fill: 'var(--line-strong)' }} />
      ))}
    </g>
  );
}

const ICON: Record<string, string> = {
  chat: 'M-7 -6h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-6l-4 3.5V5h-4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z',
  docs: 'M-5.5 -8h7l4.5 4.5V8h-11.5zM1.5 -8v4.5h4.5M-3 1h6M-3 4.5h6',
  search: 'M0 -1.5a5.5 5.5 0 1 0 0.01 0M4 3l4.5 4.5',
  voice: 'M0 -8a3 3 0 0 1 3 3v4a3 3 0 0 1-6 0v-4a3 3 0 0 1 3-3zM-6 -1a6 6 0 0 0 12 0M0 5v4M-3 9h6',
  vision: 'M-9 0c2.5-4.5 5.5-6.5 9-6.5s6.5 2 9 6.5c-2.5 4.5-5.5 6.5-9 6.5s-6.5-2-9-6.5zM0 -2.5a2.5 2.5 0 1 0 .01 0',
  code: 'M-4.5 -5l-5 5 5 5M4.5 -5l5 5-5 5M1.5 -8l-3 16',
  memory: 'M-8 -6c0-1.5 3.5-2.5 8-2.5s8 1 8 2.5-3.5 2.5-8 2.5-8-1-8-2.5zM-8 -6v6c0 1.5 3.5 2.5 8 2.5s8-1 8-2.5v-6M-8 0v6c0 1.5 3.5 2.5 8 2.5s8-1 8-2.5v-6',
  lock: 'M-5 -1h10v8h-10zM-3 -1v-3a3 3 0 0 1 6 0v3',
  snow: 'M0 -8v16M-7 -4l14 8M-7 4l14-8',
  agent: 'M-6 -3h12v9h-12zM0 -3v-4M-2 -8h4M-3 1.5h.01M3 1.5h.01M-2.5 4h5',
  shield: 'M0 -9l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10v-5l8-3zM-3.5 0.5l2.5 2.5 4.5-5',
  server: 'M-8 -8h16v6h-16zM-8 2h16v6h-16zM-4.5 -5h.01M-4.5 5h.01',
  phone: 'M-4.5 -8h9v16h-9zM-1.5 5h3',
  check: 'M-4 0l3 3 5-6',
  x: 'M-3.5 -3.5l7 7M3.5 -3.5l-7 7',
};

export function Icon({ name, x, y, s = 1, tone = 'ink', a = 1 }: { name: keyof typeof ICON | string; x: number; y: number; s?: number; tone?: Tone; a?: number }) {
  if (a <= 0.01) return null;
  return (
    <g style={{ ...at(x, y, s), opacity: a }}>
      <path d={ICON[name] ?? ''} fill="none" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: TEXT[tone] }} />
    </g>
  );
}
