/**
 * Shared 2D "ink" drawing kit: hand-drawn strokes that reveal progressively,
 * in the brand palette. Used by the How we work landscape and the domain reels.
 */

export type Pt = [number, number];

export type Palette = {
  ink: string;
  paper: string;
  faint: string;
  violet: string;
  orange: string;
  saffron: string;
  glow: string;
};

export const isDarkTheme = () =>
  document.documentElement.getAttribute('data-theme') === 'dark' ||
  document.documentElement.classList.contains('dark');

/** Pass `false` for surfaces that stay light in both themes. */
export const getPalette = (isDark = isDarkTheme()): Palette => {
  return {
    ink: isDark ? '#FAF9F6' : '#14130F',
    paper: isDark ? '#161523' : '#FFFFFF',
    faint: isDark ? 'rgba(250, 249, 246, 0.22)' : 'rgba(20, 19, 15, 0.22)',
    violet: isDark ? '#8E7BFF' : '#6E58F5',
    orange: isDark ? '#FFA066' : '#FF8643',
    saffron: isDark ? '#FFB733' : '#F59E00',
    glow: isDark ? '142, 123, 255' : '110, 88, 245',
  };
};

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutBack = (t: number) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);
/** Maps `v` from the window [a, b] onto 0–1. */
export const span = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));

export const line = (a: Pt, b: Pt, n = 10): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => [lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n)]);

export const arc = (cx: number, cy: number, r: number, a0: number, a1: number, n = 28): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = lerp(a0, a1, i / n);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });

/** Deterministic jitter so strokes look inked by hand but never flicker between frames. */
export const wobble = (pts: Pt[], seed: number, amp: number): Pt[] =>
  pts.map(([x, y], i) =>
    i === 0 || i === pts.length - 1
      ? [x, y]
      : [x + Math.sin(seed + i * 2.3) * amp * 0.5, y + Math.cos(seed * 1.3 + i * 1.7) * amp]
  );

export const pathLength = (pts: Pt[]) =>
  pts.reduce((sum, p, i) => (i ? sum + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);

/** The point `f` (0–1) of the way along a polyline, by length. */
export function pointAlong(pts: Pt[], f: number): Pt {
  let d = pathLength(pts) * clamp01(f);
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const seg = Math.hypot(x1 - x0, y1 - y0);
    if (d <= seg) {
      const k = seg ? d / seg : 0;
      return [lerp(x0, x1, k), lerp(y0, y1, k)];
    }
    d -= seg;
  }
  return pts[pts.length - 1];
}

/** Strokes a set of paths in order, stopping `reveal` (0–1) of the way through — the "being drawn" effect. */
export function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Pt[][], reveal: number) {
  if (reveal <= 0) return;
  let budget = strokes.reduce((sum, s) => sum + pathLength(s), 0) * clamp01(reveal);
  for (const pts of strokes) {
    if (budget <= 0) return;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const d = Math.hypot(x1 - x0, y1 - y0);
      if (d <= budget) {
        ctx.lineTo(x1, y1);
        budget -= d;
      } else {
        const k = budget / d;
        ctx.lineTo(lerp(x0, x1, k), lerp(y0, y1, k));
        budget = 0;
        break;
      }
    }
    ctx.stroke();
  }
}

export function glowDot(ctx: CanvasRenderingContext2D, c: Palette, x: number, y: number, r: number, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
  g.addColorStop(0, `rgba(${c.glow}, ${0.5 * alpha})`);
  g.addColorStop(1, `rgba(${c.glow}, 0)`);
  ctx.globalAlpha = 1;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = c.violet;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}
