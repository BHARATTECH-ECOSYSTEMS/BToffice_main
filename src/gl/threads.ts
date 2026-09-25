// The three white threads of the Bharattech Origin mark, traced from the logo
// in unit-disk space (x right, y up, radius 1). All three meet at ORIGIN_POINT,
// the notch of the "B": the site's visual thesis is built on that convergence.

export type Vec2 = [number, number];

export const ORIGIN_POINT: Vec2 = [0.42, 0.37];

export const THREADS: Vec2[][] = [
  // upper thread: enters left, arcs over the first cap, lands in the notch
  [[-1.25, -0.08], [-0.99, 0.03], [-0.62, 0.22], [-0.36, 0.44], [-0.19, 0.64], [0.04, 0.76], [0.28, 0.66], [0.4, 0.5], ORIGIN_POINT],
  // middle thread: rises under the first cap straight into the notch
  [[-1.2, -0.62], [-0.96, -0.49], [-0.62, -0.36], [-0.3, -0.19], [0.0, 0.03], [0.24, 0.22], ORIGIN_POINT],
  // lower thread: sweeps around the second cap and climbs back up to the notch
  [[-0.6, -1.12], [-0.35, -0.94], [0.05, -0.76], [0.42, -0.55], [0.7, -0.3], [0.8, -0.02], [0.68, 0.24], ORIGIN_POINT],
];

/** Half-width of a thread (the white gap) in unit-disk space. */
export const THREAD_HALF_WIDTH = 0.1;

function catmullRom(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const t2 = t * t;
  const t3 = t2 * t;
  const f = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])];
}

/** Resample a control polyline into a smooth, dense curve. */
export function sampleThread(points: Vec2[], perSegment = 24): Vec2[] {
  const out: Vec2[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    for (let s = 0; s < perSegment; s++) out.push(catmullRom(p0, p1, p2, p3, s / perSegment));
  }
  out.push(points[points.length - 1]);
  return out;
}

export const SAMPLED_THREADS = THREADS.map((t) => sampleThread(t));

function distToSegment(px: number, py: number, a: Vec2, b: Vec2) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy || 1e-9;
  let t = ((px - a[0]) * dx + (py - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const x = a[0] + dx * t - px;
  const y = a[1] + dy * t - py;
  return Math.sqrt(x * x + y * y);
}

/** Distance from a unit-disk point to the nearest thread centreline. */
export function distToThreads(x: number, y: number): number {
  let best = Infinity;
  for (const curve of SAMPLED_THREADS) {
    for (let i = 0; i < curve.length - 1; i++) {
      const d = distToSegment(x, y, curve[i], curve[i + 1]);
      if (d < best) best = d;
    }
  }
  return best;
}

/** SVG path data for each thread in a viewBox of "-1 -1 2 2" (y flipped for SVG). */
export function threadPaths(): string[] {
  return SAMPLED_THREADS.map((curve) =>
    curve.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(4)} ${(-y).toFixed(4)}`).join(''),
  );
}
