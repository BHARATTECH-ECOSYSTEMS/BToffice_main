import { isThread, park, rng, HIDDEN, type Formation, type V3 } from './formations';
import { INDIA, INDIA_BBOX, INDIA_HUBS, inPolygon } from './geo';
import { ROLES } from '../content';

/**
 * The panel figures: flat illustrations printed as even dots, one particle per dot, the way a
 * dot-matrix diagram is drawn. Each figure shows one familiar thing a reader can name at a glance.
 * Frame: roughly x ±1.9, y ±2.2 (portrait), facing the camera.
 */

export const GRID = 0.078;

interface Dot {
  x: number;
  y: number;
  z: number;
  acc: number;
  grp: number;
}

type Pt = [number, number];

class Plot {
  dots: Dot[] = [];
  private cells = new Map<string, number>();
  anchors: V3[] = [];

  private key(x: number, y: number) {
    return `${Math.round(x / GRID)},${Math.round(y / GRID)}`;
  }

  /** A dot on the grid (the default) or exactly at x, y; skipped where the grid cell is already used. */
  put(x: number, y: number, acc: number, grp = -1, exact = false, z = 0) {
    const k = this.key(x, y);
    const at = this.cells.get(k);
    if (at !== undefined) {
      if (!exact) Object.assign(this.dots[at], { acc, grp });
      return;
    }
    const gx = exact ? x : Math.round(x / GRID) * GRID;
    const gy = exact ? y : Math.round(y / GRID) * GRID;
    this.cells.set(k, this.dots.length);
    this.dots.push({ x: gx, y: gy, z, acc, grp });
  }

  has(x: number, y: number) {
    return this.cells.has(this.key(x, y));
  }

  /** Every grid cell inside the box for which `inside` holds. */
  fill(x0: number, y0: number, x1: number, y1: number, inside: (x: number, y: number) => boolean, acc: number, grp = -1) {
    for (let x = Math.ceil(x0 / GRID) * GRID; x <= x1; x += GRID)
      for (let y = Math.ceil(y0 / GRID) * GRID; y <= y1; y += GRID) if (inside(x, y)) this.put(x, y, acc, grp);
  }

  /** Dots spaced evenly along a path (not snapped, so curves stay smooth). */
  stroke(pts: Pt[], closed: boolean, acc: number, grp = -1, gap = GRID * 1.05) {
    const n = closed ? pts.length : pts.length - 1;
    let carry = 0;
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      for (let d = carry; d <= len; d += gap) {
        const t = d / len;
        this.put(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, acc, grp, true);
      }
      carry = (((carry - len) % gap) + gap) % gap;
    }
  }

  dotted(a: Pt, b: Pt, acc: number, grp = -1, gap = GRID * 1.9) {
    this.stroke([a, b], false, acc, grp, gap);
  }

  disc(cx: number, cy: number, r: number, acc: number, grp = -1, hole = 0) {
    this.fill(cx - r, cy - r, cx + r, cy + r, (x, y) => {
      const d = Math.hypot(x - cx, y - cy);
      return d <= r && d >= hole;
    }, acc, grp);
  }

  ring(cx: number, cy: number, r: number, acc: number, grp = -1) {
    const steps = Math.max(8, Math.round((2 * Math.PI * r) / (GRID * 1.05)));
    const pts: Pt[] = Array.from({ length: steps }, (_, i) => [cx + Math.cos((i / steps) * Math.PI * 2) * r, cy + Math.sin((i / steps) * Math.PI * 2) * r]);
    this.stroke(pts, true, acc, grp, (2 * Math.PI * r) / steps);
  }

  toFormation(n: number, seed: number): Formation {
    const f: Formation = { pos: new Float32Array(n * 3), acc: new Float32Array(n).fill(HIDDEN), grp: new Float32Array(n).fill(-1), anchors: this.anchors, crisp: 1 };
    this.dots.slice(0, n).forEach((d, i) => {
      f.pos[i * 3] = d.x;
      f.pos[i * 3 + 1] = d.y;
      f.pos[i * 3 + 2] = d.z;
      f.acc[i] = d.acc;
      f.grp[i] = d.grp;
    });
    return park(f, rng(seed));
  }
}

const inRoundRect = (x: number, y: number, cx: number, cy: number, w: number, h: number, r: number) => {
  const dx = Math.max(Math.abs(x - cx) - (w / 2 - r), 0);
  const dy = Math.max(Math.abs(y - cy) - (h / 2 - r), 0);
  return Math.hypot(dx, dy) <= r;
};

function roundRectPath(cx: number, cy: number, w: number, h: number, r: number): Pt[] {
  const out: Pt[] = [];
  const corners: [number, number, number][] = [
    [cx + w / 2 - r, cy + h / 2 - r, 0],
    [cx - w / 2 + r, cy + h / 2 - r, Math.PI / 2],
    [cx - w / 2 + r, cy - h / 2 + r, Math.PI],
    [cx + w / 2 - r, cy - h / 2 + r, (3 * Math.PI) / 2],
  ];
  corners.forEach(([x, y, a0]) => {
    for (let s = 0; s <= 6; s++) {
      const a = a0 + (s / 6) * (Math.PI / 2);
      out.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
  });
  return out;
}

// ── 01 · The mark: the sphere with its three threads, printed flat ──────────
export function markFigure(n: number) {
  const p = new Plot();
  const R = 1.6;
  p.fill(-R, -R, R, R, (x, y) => Math.hypot(x, y) <= R && !isThread(x / R, y / R), 1);
  p.anchors = [0.62, 0, -0.62].map((a): V3 => [Math.cos(a) * R, Math.sin(a) * R, 0]);
  return p.toFormation(n, 201);
}

// ── 02 · Four puzzle pieces that do not fit together ───────────────────────
export function puzzleFigure(n: number) {
  const p = new Plot();
  const S = 1.02;
  const pieces = [
    { cx: -0.86, cy: 0.9, rot: -0.1 },
    { cx: 0.9, cy: 0.96, rot: 0.08 },
    { cx: -0.94, cy: -0.94, rot: 0.07 },
    { cx: 0.88, cy: -0.88, rot: -0.12 },
  ];
  pieces.forEach(({ cx, cy, rot }, i) => {
    // a knob out on the side facing the next piece, a notch where the previous one would plug in
    const right = i % 2 === 0;
    const top = i < 2;
    const knob: Pt = right ? [S / 2 + 0.13, 0] : [-S / 2 - 0.13, 0];
    const notch: Pt = top ? [0, -S / 2 + 0.1] : [0, S / 2 - 0.1];
    const c = Math.cos(-rot);
    const s = Math.sin(-rot);
    p.fill(cx - 1, cy - 1, cx + 1, cy + 1, (x, y) => {
      const lx = (x - cx) * c - (y - cy) * s;
      const ly = (x - cx) * s + (y - cy) * c;
      const body = inRoundRect(lx, ly, 0, 0, S, S, 0.12) || Math.hypot(lx - knob[0], ly - knob[1]) <= 0.2;
      return body && Math.hypot(lx - notch[0], ly - notch[1]) > 0.2;
    }, 0.55, i);
    p.anchors.push([cx, cy - S / 2 - 0.2, 0]);
  });
  return p.toFormation(n, 202);
}

// ── 03 · A home screen: fifteen capability icons in three columns ──────────
export const APP_COLS = [-1.35, -0.62, 0.11];
export const APP_ROWS = [1.44, 0.72, 0, -0.72, -1.44];
export function appsFigure(n: number) {
  const p = new Plot();
  const size = 0.54;
  APP_COLS.forEach((x, g) =>
    APP_ROWS.forEach((y) => {
      p.fill(x - size, y - size, x + size, y + size, (px, py) => inRoundRect(px, py, x, y, size, size, 0.14) && Math.hypot(px - x, py - y) > 0.1, 0.8, g);
    }),
  );
  p.anchors = [...APP_COLS.map((x): V3 => [x, 1.92, 0]), ...APP_ROWS.map((y): V3 => [0.52, y, 0])];
  return p.toFormation(n, 203);
}

// ── 04 · A route: five stations, one shared memory beside them ─────────────
export const ROUTE_Y = [1.64, 0.82, 0, -0.82, -1.64];
export function routeFigure(n: number) {
  const p = new Plot();
  const x = 0.25;
  // shared memory: a tall rounded bar
  p.fill(-1.6, -2, -0.9, 2, (px, py) => inRoundRect(px, py, -1.25, 0, 0.62, 3.9, 0.3), 0.3);
  ROUTE_Y.forEach((y, i) => {
    p.ring(x, y, 0.27, 0.95, i);
    p.disc(x, y, 0.1, 1, i);
    p.dotted([-0.86, y], [x - 0.34, y], 0.4, i);
    if (i < ROUTE_Y.length - 1) p.dotted([x, y - 0.34], [x, ROUTE_Y[i + 1] + 0.34], 0.55);
  });
  p.anchors = [...ROUTE_Y.map((y): V3 => [x + 0.34, y, 0]), [-1.25, 2.0, 0]];
  return p.toFormation(n, 204);
}

// ── 05 · A building: nine floors, the foundation widest ────────────────────
export const FLOOR_Y = Array.from({ length: 9 }, (_, i) => 1.76 - i * 0.44);
export function floorsFigure(n: number) {
  const p = new Plot();
  const cx = -0.78;
  FLOOR_Y.forEach((y, i) => {
    const w = 1.3 + (i / 8) * 0.95;
    p.fill(cx - w / 2, y - 0.2, cx + w / 2, y + 0.2, (px, py) => inRoundRect(px, py, cx, y, w, 0.3, 0.13), 0.7, i);
  });
  p.anchors = FLOOR_Y.map((y, i): V3 => [cx + (1.3 + (i / 8) * 0.95) / 2 + 0.06, y, 0]);
  return p.toFormation(n, 205);
}

// ── 06 · India, in dots, with lines out to the world ──────────────────────
export const REGIONS: { name: string; angle: number }[] = [
  { name: 'Americas', angle: 128 },
  { name: 'Europe', angle: 152 },
  { name: 'Middle East', angle: 180 },
  { name: 'Africa', angle: 212 },
  { name: 'Oceania', angle: 305 },
  { name: 'Southeast Asia', angle: 338 },
  { name: 'East Asia', angle: 30 },
];
export function indiaFigure(n: number) {
  const p = new Plot();
  const k = 0.086;
  const mid: Pt = [(INDIA_BBOX.minLon + INDIA_BBOX.maxLon) / 2, (INDIA_BBOX.minLat + INDIA_BBOX.maxLat) / 2];
  const at = (lon: number, lat: number): Pt => [(lon - mid[0]) * k, (lat - mid[1]) * k];
  const half = ((INDIA_BBOX.maxLon - INDIA_BBOX.minLon) * k) / 2 + 0.1;
  p.fill(-half, -half, half, half, (x, y) => inPolygon([x / k + mid[0], y / k + mid[1]], INDIA), 0.42);
  INDIA_HUBS.forEach((h, i) => {
    const [x, y] = at(h.at[0], h.at[1]);
    p.disc(x, y, i === 0 ? 0.1 : 0.06, 1, 0);
  });
  const [dx, dy] = at(INDIA_HUBS[0].at[0], INDIA_HUBS[0].at[1]);
  p.ring(dx, dy, 0.2, 1, 0);
  // lines out to the regions, ending in small rings on an oval around the map
  REGIONS.forEach(({ angle }) => {
    const a = (angle * Math.PI) / 180;
    const from: Pt = [Math.cos(a) * 1.38, Math.sin(a) * 1.46];
    const to: Pt = [Math.cos(a) * 1.58, Math.sin(a) * 2.0];
    p.dotted(from, to, 0.5, 1, GRID * 1.6);
    p.ring(to[0], to[1], 0.07, 0.9, 1);
  });
  p.anchors = [
    [dx, dy, 0],
    ...REGIONS.map(({ angle }): V3 => {
      const a = (angle * Math.PI) / 180;
      return [Math.cos(a) * 1.58, Math.sin(a) * 2.0, 0];
    }),
  ];
  return p.toFormation(n, 206);
}

// ── 07 · A molecule: six domains bonded to one core ─────────────────────────
export const ATOMS: Pt[] = Array.from({ length: 6 }, (_, i) => {
  const a = (i / 6) * Math.PI * 2 + Math.PI / 2;
  return [Math.cos(a) * 1.3, Math.sin(a) * 1.3];
});
export function moleculeFigure(n: number) {
  const p = new Plot();
  p.disc(0, 0, 0.36, 1);
  ATOMS.forEach(([x, y], i) => {
    const [nx, ny] = ATOMS[(i + 1) % 6];
    p.dotted([x * 0.3, y * 0.3], [x * 0.8, y * 0.8], 0.45);
    p.dotted([x + (nx - x) * 0.2, y + (ny - y) * 0.2], [x + (nx - x) * 0.8, y + (ny - y) * 0.8], 0.3);
    p.disc(x, y, 0.22, 0.75, i);
  });
  p.anchors = ATOMS.map(([x, y]): V3 => [x, y - 0.3, 0]);
  return p.toFormation(n, 207);
}

// ── 08 · People: six kinds of work around one core ─────────────────────────
export const PEOPLE: Pt[] = Array.from({ length: 6 }, (_, i) => {
  const a = (i / 6) * Math.PI * 2 + Math.PI / 2;
  return [Math.cos(a) * 1.42, Math.sin(a) * 1.5];
});
export function peopleFigure(n: number) {
  const p = new Plot();
  p.disc(0, 0, 0.36, 1);
  PEOPLE.forEach(([x, y], i) => {
    p.dotted([x * 0.3, y * 0.3], [x * 0.7, y * 0.7], 0.35);
    p.disc(x, y + 0.14, 0.13, 0.8, i);
    // shoulders: the top half of a disc
    p.fill(x - 0.3, y - 0.34, x + 0.3, y - 0.02, (px, py) => Math.hypot(px - x, py - (y - 0.3)) <= 0.27 && py >= y - 0.3, 0.8, i);
  });
  p.anchors = PEOPLE.map(([x, y]): V3 => [x, y - 0.4, 0]);
  return p.toFormation(n, 208);
}

// ── 09 · Tables with empty seats: the open roles, by team ──────────────────
export const TEAMS = (() => {
  const counts = new Map<string, number>();
  ROLES.forEach((r) => counts.set(r.dept, (counts.get(r.dept) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
})();
export const TABLE_Y = [1.5, 0, -1.5];
export function seatsFigure(n: number) {
  const p = new Plot();
  const cx = -0.62;
  TEAMS.forEach(([, open], t) => {
    const y = TABLE_Y[t];
    p.disc(cx, y, 0.42, 0.35, t);
    // seats around the table: hollow rings are open roles
    for (let s = 0; s < open; s++) {
      const a = (s / Math.max(open, 1)) * Math.PI * 2 + Math.PI / 2;
      p.ring(cx + Math.cos(a) * 0.72, y + Math.sin(a) * 0.72, 0.14, 1, t);
    }
  });
  p.anchors = TABLE_Y.map((y): V3 => [cx + 0.95, y, 0]);
  return p.toFormation(n, 209);
}

// ── 10 · Notes: three pages, the newest on top ─────────────────────────────
export const NOTE_POS: Pt[] = [
  [0.42, -0.4],
  [0, 0.02],
  [-0.42, 0.44],
];
export function notesFigure(n: number) {
  const p = new Plot();
  const W = 2.0;
  const H = 2.5;
  const drawn: Pt[] = [];
  const covered = (x: number, y: number) => drawn.some(([cx, cy]) => inRoundRect(x, y, cx, cy, W + 0.1, H + 0.1, 0.14));
  NOTE_POS.forEach(([cx, cy], i) => {
    // pages behind only show where the pages in front do not cover them
    const outline = roundRectPath(cx, cy, W, H, 0.14).filter(([x, y]) => !covered(x, y));
    const acc = i === 0 ? 0.9 : 0.4;
    if (i === 0) p.stroke(roundRectPath(cx, cy, W, H, 0.14), true, acc, i);
    else {
      // split the visible outline into runs so gaps are not bridged
      let run: Pt[] = [];
      roundRectPath(cx, cy, W, H, 0.14).forEach((q) => {
        if (covered(q[0], q[1])) {
          if (run.length > 1) p.stroke(run, false, acc, i);
          run = [];
        } else run.push(q);
      });
      if (run.length > 1) p.stroke(run, false, acc, i);
      void outline;
    }
    if (i === 0) {
      p.fill(cx - W / 2 + 0.2, cy + H / 2 - 0.46, cx - W / 2 + 1.3, cy + H / 2 - 0.3, () => true, 1, i);
      [0.92, 0.8, 0.88, 0.62, 0.84, 0.5].forEach((len, r) => {
        const y = cy + H / 2 - 0.72 - r * 0.26;
        p.fill(cx - W / 2 + 0.2, y - 0.01, cx - W / 2 + 0.2 + (W - 0.4) * len, y + 0.01, () => true, 0.45, i);
      });
    }
    drawn.push([cx, cy]);
    p.anchors.push([cx, cy + H / 2 + 0.02, 0]);
  });
  return p.toFormation(n, 210);
}

// ── 11 · A conversation: a question, and an answer being written ───────────
export function dialogueFigure(n: number) {
  const p = new Plot();
  // the question: an outline with two lines of text
  p.stroke(roundRectPath(-0.4, 1.0, 2.5, 1.05, 0.46), true, 0.55, 0);
  p.stroke([[-1.2, 0.47], [-1.45, 0.15], [-0.85, 0.47]], false, 0.55, 0);
  [1.6, 1.1].forEach((len, r) => {
    const y = 1.12 - r * 0.26;
    p.fill(-1.35, y - 0.01, -1.35 + len, y + 0.01, () => true, 0.4, 0);
  });
  // the answer: a solid bubble, three dots left open while it is being written
  p.fill(-1.0, -1.35, 1.9, -0.05, (x, y) => {
    const body = inRoundRect(x, y, 0.45, -0.7, 2.7, 1.2, 0.52) || (y < -1.2 && y > -1.62 && x > 1.1 && x < 1.1 + (-1.2 - y) * 0.9);
    const typing = [-0.25, 0.45, 1.15].some((tx) => Math.hypot(x - tx, y + 0.7) < 0.14);
    return body && !typing;
  }, 0.9, 1);
  p.fill(1.05, -1.7, 1.5, -1.25, (x, y) => y < -1.28 && x > 1.1 && x - 1.1 < (-1.28 - y) * 0.9 + 0.05, 0.9, 1);
  p.anchors = [
    [-0.4, 1.56, 0],
    [0.45, -1.35, 0],
  ];
  return p.toFormation(n, 211);
}
