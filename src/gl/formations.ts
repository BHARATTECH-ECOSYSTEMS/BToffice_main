import { distToThreads, THREAD_HALF_WIDTH } from './threads';
import { INDIA, INDIA_BBOX, INDIA_HUBS, WORLD, GLOBE_LABELS, inPolygon, onLand, lonLatToVec, type LonLat } from './geo';

/**
 * A formation is one arrangement of the same N particles.
 *  pos : xyz per particle
 *  acc : 0 (ink) … 1 (intelligence purple)
 *  grp : highlight group; -1 none, -2 animated terrain, 0…k addressable
 */
export interface Formation {
  pos: Float32Array;
  acc: Float32Array;
  grp: Float32Array;
  anchors: [number, number, number][];
  /** 1 draws this formation as flat, even dots (see uCrisp) */
  crisp?: number;
}

export type V3 = [number, number, number];

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Builder {
  i = 0;
  f: Formation;
  n: number;
  constructor(n: number) {
    this.n = n;
    this.f = { pos: new Float32Array(n * 3), acc: new Float32Array(n), grp: new Float32Array(n).fill(-1), anchors: [] };
  }
  get full() {
    return this.i >= this.n;
  }
  push(x: number, y: number, z: number, acc = 0, grp = -1) {
    if (this.i >= this.n) return;
    const k = this.i++;
    this.f.pos[k * 3] = x;
    this.f.pos[k * 3 + 1] = y;
    this.f.pos[k * 3 + 2] = z;
    this.f.acc[k] = acc;
    this.f.grp[k] = grp;
  }
  /**
   * Whatever budget is left stays invisible (acc = HIDDEN), parked on top of a
   * visible particle so it never streaks across the page while morphing.
   */
  dust(r: () => number) {
    while (!this.full) this.push(0, 0, 0, HIDDEN);
    return park(this.f, r);
  }
}

export const HIDDEN = -1;

/** Moves every hidden particle onto a random visible one. */
export function park(f: Formation, r: () => number) {
  const visible: number[] = [];
  for (let i = 0; i < f.acc.length; i++) if (f.acc[i] > HIDDEN) visible.push(i);
  if (!visible.length) return f;
  for (let i = 0; i < f.acc.length; i++) {
    if (f.acc[i] > HIDDEN) continue;
    const j = visible[Math.floor(r() * visible.length)];
    f.pos[i * 3] = f.pos[j * 3];
    f.pos[i * 3 + 1] = f.pos[j * 3 + 1];
    f.pos[i * 3 + 2] = f.pos[j * 3 + 2];
    f.grp[i] = -1;
  }
  return f;
}

export function onSphere(r: () => number): V3 {
  const u = r() * 2 - 1;
  const t = r() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return [s * Math.cos(t), u, s * Math.sin(t)];
}

// ── 1. The mark ────────────────────────────────────────────────────────────
// A purple sphere whose white threads are literal voids cut through it.

const MASK_RES = 320;
let threadMask: Uint8Array | null = null;
export function isThread(u: number, v: number): boolean {
  if (!threadMask) {
    threadMask = new Uint8Array(MASK_RES * MASK_RES);
    for (let y = 0; y < MASK_RES; y++)
      for (let x = 0; x < MASK_RES; x++) {
        const uu = (x / (MASK_RES - 1)) * 2 - 1;
        const vv = (y / (MASK_RES - 1)) * 2 - 1;
        threadMask[y * MASK_RES + x] = distToThreads(uu, vv) < THREAD_HALF_WIDTH ? 1 : 0;
      }
  }
  const x = Math.round(((u + 1) / 2) * (MASK_RES - 1));
  const y = Math.round(((v + 1) / 2) * (MASK_RES - 1));
  if (x < 0 || y < 0 || x >= MASK_RES || y >= MASK_RES) return false;
  return threadMask[y * MASK_RES + x] === 1;
}

export const LOGO_R = 1.35;

export function logo(n: number): Formation {
  const r = rng(11);
  const b = new Builder(n);
  // Only the camera-facing hemisphere: one particle per line of sight, so the
  // thread voids stay clean under perspective instead of being back-filled.
  const shell = Math.floor(n * 0.86);
  while (b.i < shell) {
    const [x, y, z] = onSphere(r);
    if (z < -0.04 || isThread(x, y)) continue;
    const rr = LOGO_R * (0.975 + r() * 0.025);
    b.push(x * rr, y * rr, z * rr, 1);
  }
  b.f.anchors = [[0, 0, 0], [LOGO_R, 0, 0]]; // centre and rim: lets HTML measure the mark
  return b.dust(r);
}

// ── 2. Fragmentation ───────────────────────────────────────────────────────
// The sphere shatters into isolated islands that no longer talk to each other.

export function fragments(n: number, source: Formation): Formation {
  const r = rng(23);
  const b = new Builder(n);
  const K = 17;
  const seeds: V3[] = [];
  const centers: V3[] = [];
  for (let k = 0; k < K; k++) {
    const idx = Math.floor(r() * n * 0.74);
    seeds.push([source.pos[idx * 3], source.pos[idx * 3 + 1], source.pos[idx * 3 + 2]]);
    let c: V3;
    let tries = 0;
    do {
      c = [(r() - 0.5) * 7.4, (r() - 0.5) * 3.9, (r() - 0.5) * 2.4 - 0.2];
      tries++;
    } while (tries < 60 && centers.some((o) => Math.hypot(o[0] - c[0], o[1] - c[1]) < 1.15));
    centers.push(c);
  }
  const core = Math.floor(n * 0.9);
  for (let i = 0; i < n; i++) {
    const x = source.pos[i * 3];
    const y = source.pos[i * 3 + 1];
    const z = source.pos[i * 3 + 2];
    if (i >= core) {
      b.push(0, 0, 0, HIDDEN);
      continue;
    }
    let best = 0;
    let bd = Infinity;
    for (let k = 0; k < K; k++) {
      const d = (x - seeds[k][0]) ** 2 + (y - seeds[k][1]) ** 2 + (z - seeds[k][2]) ** 2;
      if (d < bd) {
        bd = d;
        best = k;
      }
    }
    const c = centers[best];
    const s = 0.5;
    b.push(
      c[0] + (x - seeds[best][0]) * s,
      c[1] + (y - seeds[best][1]) * s,
      c[2] + (z - seeds[best][2]) * s,
      best % 5 === 0 ? 0.55 : 0.08,
      best,
    );
  }
  b.f.anchors = centers;
  return park(b.f, r);
}

// ── 3. Orbit ───────────────────────────────────────────────────────────────
// One core, many capabilities: every satellite wired back to the centre.

function rotX([x, y, z]: V3, a: number): V3 {
  return [x, y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
}
function rotZ([x, y, z]: V3, a: number): V3 {
  return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a), z];
}

export function orbit(n: number, satellites: number, seed = 5): Formation {
  const r = rng(seed);
  const b = new Builder(n);
  const coreR = 0.46;
  const rings =
    satellites > 8
      ? [
          { radius: 1.05, tiltX: 1.25, tiltZ: 0.35, count: Math.round(satellites / 3) },
          { radius: 1.6, tiltX: 1.38, tiltZ: -0.22, count: Math.round(satellites / 3) },
          { radius: 2.15, tiltX: 1.18, tiltZ: 0.12, count: 0 },
        ]
      : [
          { radius: 1.25, tiltX: 1.3, tiltZ: 0.3, count: Math.ceil(satellites / 2) },
          { radius: 1.95, tiltX: 1.22, tiltZ: -0.18, count: 0 },
        ];
  rings[rings.length - 1].count = satellites - rings.slice(0, -1).reduce((s, g) => s + g.count, 0);

  const place = (ring: (typeof rings)[number], angle: number, rad = ring.radius): V3 =>
    rotZ(rotX([Math.cos(angle) * rad, Math.sin(angle) * rad, 0], ring.tiltX), ring.tiltZ);

  const sats: V3[] = [];
  rings.forEach((ring, ri) => {
    for (let s = 0; s < ring.count; s++) sats.push(place(ring, (s / ring.count) * Math.PI * 2 + ri * 0.7));
  });

  const coreN = Math.floor(n * 0.24);
  while (b.i < coreN) {
    const [x, y, z] = onSphere(r);
    const d = b.i % 3 === 0 ? Math.cbrt(r()) : 1;
    b.push(x * coreR * d, y * coreR * d, z * coreR * d, 1, -1);
  }
  const perSat = Math.floor((n * 0.3) / satellites);
  sats.forEach((c, s) => {
    for (let k = 0; k < perSat; k++) {
      const [x, y, z] = onSphere(r);
      const d = 0.075 * (k % 4 === 0 ? Math.cbrt(r()) : 1);
      b.push(c[0] + x * d, c[1] + y * d, c[2] + z * d, 0.95, s);
    }
  });
  const ringN = b.i + Math.floor(n * 0.2);
  while (b.i < ringN) {
    const ring = rings[Math.floor(r() * rings.length)];
    const p = place(ring, r() * Math.PI * 2, ring.radius + (r() - 0.5) * 0.02);
    b.push(p[0], p[1], p[2], 0.22, -1);
  }
  const streamN = b.i + Math.floor(n * 0.14);
  while (b.i < streamN) {
    const s = Math.floor(r() * satellites);
    const c = sats[s];
    const t = r();
    const len = Math.hypot(...c);
    const from = coreR / len;
    const tt = from + (1 - from) * t;
    const bow = Math.sin(Math.PI * tt) * 0.12;
    b.push(c[0] * tt, c[1] * tt + bow, c[2] * tt, 0.6, s);
  }
  b.f.anchors = sats;
  return b.dust(r);
}

// ── 4. Exploded architecture ───────────────────────────────────────────────
// Nine layers, each drawn with its own pattern: a metaphor per layer.

export const LAYER_COUNT = 9;
const LAYER_GAP = 0.4;
const HALF = 0.95;

type Pattern = (r: () => number) => [number, number];
const grid = (cells: number, r: () => number, span = HALF): [number, number] => {
  const gx = Math.floor(r() * cells);
  const gz = Math.floor(r() * cells);
  return [(gx / (cells - 1)) * 2 * span - span, (gz / (cells - 1)) * 2 * span - span];
};
const PATTERNS: Pattern[] = [
  // Applications: a 3×3 field of tiles
  (r) => {
    const tx = Math.floor(r() * 3);
    const tz = Math.floor(r() * 3);
    const [x, z] = grid(6, r, 0.22);
    return [(tx - 1) * 0.64 + x, (tz - 1) * 0.64 + z];
  },
  // Reasoning: concentric orbits of thought
  (r) => {
    const ring = 1 + Math.floor(r() * 5);
    const a = r() * Math.PI * 2;
    return [Math.cos(a) * ring * 0.19, Math.sin(a) * ring * 0.19];
  },
  // Memory: dense, even lattice
  (r) => grid(26, r),
  // Knowledge: nodes and the edges between them
  (() => {
    const nr = rng(77);
    const nodes = Array.from({ length: 22 }, () => [(nr() - 0.5) * 1.8, (nr() - 0.5) * 1.8] as [number, number]);
    const edges: [number, number][] = [];
    nodes.forEach((a, i) =>
      nodes.forEach((c, j) => {
        if (j > i && Math.hypot(a[0] - c[0], a[1] - c[1]) < 0.55) edges.push([i, j]);
      }),
    );
    return (r: () => number): [number, number] => {
      if (r() < 0.45) {
        const p = nodes[Math.floor(r() * nodes.length)];
        const a = r() * Math.PI * 2;
        const d = r() * 0.05;
        return [p[0] + Math.cos(a) * d, p[1] + Math.sin(a) * d];
      }
      const [i, j] = edges[Math.floor(r() * edges.length)];
      const t = r();
      return [nodes[i][0] + (nodes[j][0] - nodes[i][0]) * t, nodes[i][1] + (nodes[j][1] - nodes[i][1]) * t];
    };
  })(),
  // Research: an expanding spiral of inquiry
  (r) => {
    const t = r();
    const a = t * Math.PI * 9;
    return [Math.cos(a) * t * 0.95, Math.sin(a) * t * 0.95];
  },
  // Security: nested perimeters
  (r) => {
    const s = [0.95, 0.66, 0.37][Math.floor(r() * 3)];
    const e = r() * 4;
    const t = (e % 1) * 2 - 1;
    const side = Math.floor(e);
    return side === 0 ? [t * s, -s] : side === 1 ? [s, t * s] : side === 2 ? [-t * s, s] : [-s, -t * s];
  },
  // Infrastructure: parallel rails
  (r) => [(r() * 2 - 1) * HALF, (Math.floor(r() * 12) / 11) * 2 * HALF - HALF],
  // Compute: a die of dense blocks
  (r) => {
    const bx = Math.floor(r() * 4);
    const bz = Math.floor(r() * 4);
    const [x, z] = grid(7, r, 0.17);
    return [(bx - 1.5) * 0.47 + x, (bz - 1.5) * 0.47 + z];
  },
  // Sovereign cloud: a bounded disc of distributed nodes
  (r) => {
    if (r() < 0.25) {
      const a = r() * Math.PI * 2;
      return [Math.cos(a) * 0.98, Math.sin(a) * 0.98];
    }
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 0.9;
    return [Math.cos(a) * d, Math.sin(a) * d];
  },
];

export function layers(n: number): Formation {
  const r = rng(41);
  const b = new Builder(n);
  const per = Math.floor((n * 0.88) / LAYER_COUNT);
  const top = ((LAYER_COUNT - 1) / 2) * LAYER_GAP;
  for (let l = 0; l < LAYER_COUNT; l++) {
    const y = top - l * LAYER_GAP;
    for (let k = 0; k < per; k++) {
      const [x, z] = PATTERNS[l](r);
      b.push(x + (r() - 0.5) * 0.006, y, z + (r() - 0.5) * 0.006, 0.7, l);
    }
    b.f.anchors.push([-HALF, y, HALF]); // left corner: the tag reaches back toward the list
  }
  const conduit = b.i + Math.floor(n * 0.04);
  while (b.i < conduit) {
    const a = r() * Math.PI * 2;
    b.push(Math.cos(a) * 0.025, (r() - 0.5) * (top * 2 + 0.9), Math.sin(a) * 0.025, 1, -1);
  }
  return b.dust(r);
}

// ── 5. The network ─────────────────────────────────────────────────────────

export const GLOBE_R = 1.45;

export function arcPoint(a: LonLat, c: LonLat, t: number): V3 {
  const p = lonLatToVec(a[0], a[1], 1);
  const q = lonLatToVec(c[0], c[1], 1);
  const dot = Math.min(1, Math.max(-1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2]));
  const om = Math.acos(dot);
  const so = Math.sin(om) || 1e-6;
  const k1 = Math.sin((1 - t) * om) / so;
  const k2 = Math.sin(t * om) / so;
  const lift = 1 + Math.sin(Math.PI * t) * Math.min(0.1, 0.03 + om * 0.05);
  return [
    (p[0] * k1 + q[0] * k2) * GLOBE_R * lift,
    (p[1] * k1 + q[1] * k2) * GLOBE_R * lift,
    (p[2] * k1 + q[2] * k2) * GLOBE_R * lift,
  ];
}

export const ARCS: [LonLat, LonLat][] = WORLD.map((w, i) => [INDIA_HUBS[i % INDIA_HUBS.length].at, w.at]);

export function globe(n: number): Formation {
  const r = rng(61);
  const b = new Builder(n);
  const lattice = Math.floor(n * 0.5);
  while (b.i < lattice) {
    const lat = Math.round((r() * 180 - 90) / 4) * 4;
    const ringCount = Math.max(1, Math.round(90 * Math.cos((lat * Math.PI) / 180)));
    const lon = (Math.floor(r() * ringCount) / ringCount) * 360 - 180;
    const [x, y, z] = lonLatToVec(lon, lat, GLOBE_R);
    b.push(x, y, z, 0.08, -1);
  }
  const india = b.i + Math.floor(n * 0.3);
  while (b.i < india) {
    const lon = INDIA_BBOX.minLon + r() * (INDIA_BBOX.maxLon - INDIA_BBOX.minLon);
    const lat = INDIA_BBOX.minLat + r() * (INDIA_BBOX.maxLat - INDIA_BBOX.minLat);
    if (!inPolygon([lon, lat], INDIA)) continue;
    const [x, y, z] = lonLatToVec(lon, lat, GLOBE_R * 1.004);
    b.push(x, y, z, 1, 0);
  }
  const hubs = b.i + Math.floor(n * 0.04);
  while (b.i < hubs) {
    const h = INDIA_HUBS[Math.floor(r() * INDIA_HUBS.length)];
    const a = r() * Math.PI * 2;
    const d = r() * 0.5;
    const [x, y, z] = lonLatToVec(h.at[0] + Math.cos(a) * d, h.at[1] + Math.sin(a) * d, GLOBE_R * 1.02);
    b.push(x, y, z, 1, 0);
  }
  const arcs = b.i + Math.floor(n * 0.1);
  while (b.i < arcs) {
    const [a, c] = ARCS[Math.floor(r() * ARCS.length)];
    const [x, y, z] = arcPoint(a, c, r());
    b.push(x, y, z, 0.7, 1);
  }
  b.f.anchors = GLOBE_LABELS.map((h) => lonLatToVec(h.at[0], h.at[1], GLOBE_R * 1.03));
  return b.dust(r);
}

// ── 6. The laboratory ──────────────────────────────────────────────────────
// A double helix running left to right: six segments, six research domains.

export function helix(n: number, segments = 6): Formation {
  const r = rng(83);
  const b = new Builder(n);
  const L = 3.4;
  const rad = 0.55;
  const strands = Math.floor(n * 0.62);
  while (b.i < strands) {
    const t = r();
    const x = -L + t * 2 * L;
    const phase = x * 2.1 + (b.i % 2) * Math.PI;
    const jitter = (r() - 0.5) * 0.03;
    const seg = Math.min(segments - 1, Math.floor(t * segments));
    b.push(x, Math.cos(phase) * (rad + jitter), Math.sin(phase) * (rad + jitter), b.i % 2 ? 1 : 0.45, seg);
  }
  const rungs = b.i + Math.floor(n * 0.16);
  while (b.i < rungs) {
    const k = Math.floor(r() * 64);
    const x = -L + (k / 63) * 2 * L;
    const phase = x * 2.1;
    const t = r() * 2 - 1;
    const seg = Math.min(segments - 1, Math.floor(((x + L) / (2 * L)) * segments));
    b.push(x, Math.cos(phase) * rad * t, Math.sin(phase) * rad * t, 0.25, seg);
  }
  for (let sgi = 0; sgi < segments; sgi++) b.f.anchors.push([-L + ((sgi + 0.5) * 2 * L) / segments, rad + 0.28, 0]);
  return b.dust(r);
}

// ── 7. Terrain ─────────────────────────────────────────────────────────────
// A calm field where builders work; nodes of purple are people and ideas.

export function field(n: number): Formation {
  const r = rng(97);
  const b = new Builder(n);
  const cells = Math.floor(Math.sqrt(n * 0.86));
  for (let gz = 0; gz < cells && !b.full; gz++)
    for (let gx = 0; gx < cells && !b.full; gx++) {
      const x = (gx / (cells - 1)) * 11 - 5.5;
      const z = (gz / (cells - 1)) * 7.5 - 6;
      const lit = r() < 0.035;
      b.push(x, -1.35, z, lit ? 1 : 0.1, -2);
    }
  return b.dust(r);
}

// ── 8. The flow ────────────────────────────────────────────────────────────
// One request through five stations, each wired down to the same memory.

export function flow(n: number, stations = 5): Formation {
  const r = rng(71);
  const b = new Builder(n);
  const span = 1.9;
  const xs = Array.from({ length: stations }, (_, i) => -span + (i * 2 * span) / (stations - 1));
  const yOf = (x: number) => 0.3 - 0.12 * (x / span) ** 2;
  const MEM = -0.62;
  const per = Math.floor((n * 0.42) / stations);
  xs.forEach((x, i) => {
    for (let k = 0; k < per; k++) {
      const [a, c, d] = onSphere(r);
      const rad = 0.21 * (k % 3 === 0 ? Math.cbrt(r()) : 1);
      b.push(x + a * rad, yOf(x) + c * rad, d * rad, 1, i);
    }
  });
  const line = b.i + Math.floor(n * 0.12);
  while (b.i < line) {
    const x = -span + r() * 2 * span;
    b.push(x, yOf(x) + (r() - 0.5) * 0.012, (r() - 0.5) * 0.012, 0.55, -1);
  }
  const plate = b.i + Math.floor(n * 0.24);
  while (b.i < plate) b.push((r() * 2 - 1) * (span + 0.25), MEM, (r() * 2 - 1) * 0.4, 0.14, -1);
  const threads = b.i + Math.floor(n * 0.08);
  while (b.i < threads) {
    const i = Math.floor(r() * stations);
    const top = yOf(xs[i]) - 0.21;
    b.push(xs[i], top - r() * (top - MEM), 0, 0.45, i);
  }
  b.f.anchors = xs.map((x): V3 => [x, yOf(x), 0]);
  return b.dust(r);
}

// ── Silos: today's AI, as six tools that never talk ───────────────────────

export const SILO_CENTERS: V3[] = [
  [-1.15, 0.62, 0], [0, 0.62, 0], [1.15, 0.62, 0],
  [-1.15, -0.62, 0], [0, -0.62, 0], [1.15, -0.62, 0],
];
const SILO_R = 0.26;
const CUBE = 0.23;

/** Which silo each particle belongs to, chosen by where it sat in the mark. */
function siloMembership(n: number, source: Formation) {
  const member = new Int8Array(n).fill(-1);
  const core = Math.floor(n * 0.84);
  for (let i = 0; i < core; i++) {
    const x = source.pos[i * 3] * 0.95;
    const y = source.pos[i * 3 + 1] * 0.95;
    let best = 0;
    let bd = Infinity;
    SILO_CENTERS.forEach((c, k) => {
      const d = (x - c[0]) ** 2 + (y - c[1]) ** 2;
      if (d < bd) {
        bd = d;
        best = k;
      }
    });
    member[i] = best;
  }
  return member;
}

// labels sit on the outside of the grid so the gaps between rows stay clear
// anchors 0–5: label positions; 6–11: silo centres
const siloAnchors = (): V3[] => [...SILO_CENTERS.map(([x, y]): V3 => [x, y > 0 ? y + 0.46 : y - 0.46, 0]), ...SILO_CENTERS];

/** Step 2: soft, living spheres, each alone. */
export function silos(n: number, source: Formation): Formation {
  const r = rng(101);
  const b = new Builder(n);
  const member = siloMembership(n, source);
  for (let i = 0; i < n; i++) {
    const k = member[i];
    if (k < 0) {
      b.push(0, 0, 0, HIDDEN);
      continue;
    }
    const [x, y, z] = onSphere(r);
    const d = SILO_R * (i % 3 === 0 ? Math.cbrt(r()) : 1);
    const c = SILO_CENTERS[k];
    b.push(c[0] + x * d, c[1] + y * d, c[2] + z * d, k === 1 ? 0.7 : 0.35, k);
  }
  b.f.anchors = siloAnchors();
  return park(b.f, r);
}

function cubeLattice(steps: number): V3[] {
  const pts: V3[] = [];
  for (let a = 0; a < steps; a++)
    for (let bb = 0; bb < steps; bb++)
      for (let c = 0; c < steps; c++) {
        const edge = [a, bb, c].filter((v) => v === 0 || v === steps - 1).length;
        if (edge >= 1) pts.push([(a / (steps - 1)) * 2 - 1, (bb / (steps - 1)) * 2 - 1, (c / (steps - 1)) * 2 - 1]);
      }
  return pts;
}

/** Step 3: the same silos, crystallised into rigid cubes: trained, then frozen. */
export function frozen(n: number, source: Formation, stubs = false): Formation {
  const r = rng(103);
  const b = new Builder(n);
  const member = siloMembership(n, source);
  const lattice = cubeLattice(7);
  const adjacent = [[1, 3], [0, 2, 4], [1, 5], [0, 4], [3, 5, 1], [4, 2]];
  const rot = (p: V3, k: number): V3 => {
    const a = 0.5 + k * 0.35;
    return [p[0] * Math.cos(a) - p[2] * Math.sin(a), p[1], p[0] * Math.sin(a) + p[2] * Math.cos(a)];
  };
  for (let i = 0; i < n; i++) {
    const k = member[i];
    if (k < 0) {
      b.push(0, 0, 0, HIDDEN);
      continue;
    }
    const c = SILO_CENTERS[k];
    if (stubs && i % 5 === 0) {
      // reaching for a neighbour, stopping short: connections that never land
      const a = SILO_CENTERS[k];
      const o = SILO_CENTERS[adjacent[k][(i >> 3) % adjacent[k].length]];
      const t = 0.24 + Math.pow(r(), 1.6) * 0.16;
      b.push(a[0] + (o[0] - a[0]) * t, a[1] + (o[1] - a[1]) * t, 0, 0.5, k);
      continue;
    }
    const p = rot(lattice[(i * 7919) % lattice.length], k);
    b.push(c[0] + p[0] * CUBE, c[1] + p[1] * CUBE, c[2] + p[2] * CUBE, 0.1, k);
  }
  b.f.anchors = siloAnchors();
  return park(b.f, r);
}

// ═════════════════════════════════════════════════════════════════════════
// Second generation: every figure is drawn as a dot matrix. Each visible "dot"
// is a small cluster of particles on an even grid, so shapes read as clean,
// printed diagrams instead of clouds.
// ═════════════════════════════════════════════════════════════════════════

/** A crisp dot at p: `k` particles within `j` of it. */
function dot(b: Builder, r: () => number, p: V3, k: number, acc: number, grp = -1, j = 0.006) {
  for (let i = 0; i < k && !b.full; i++) b.push(p[0] + (r() - 0.5) * j, p[1] + (r() - 0.5) * j, p[2] + (r() - 0.5) * j, acc, grp);
}

/** The point a share `t` of the way along a polyline, by length (closed when `loop`). */
const lengths = new WeakMap<V3[], number[]>();
function along(pts: V3[], t: number, loop = false): V3 {
  const segs = loop ? pts.length : pts.length - 1;
  let acc = lengths.get(pts);
  if (!acc) {
    acc = [0];
    for (let i = 0; i < segs; i++) {
      const a = pts[i];
      const c = pts[(i + 1) % pts.length];
      acc.push(acc[i] + Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]));
    }
    lengths.set(pts, acc);
  }
  const d = t * acc[segs];
  let i = 0;
  while (i < segs - 1 && acc[i + 1] < d) i++;
  const a = pts[i];
  const c = pts[(i + 1) % pts.length];
  const u = (d - acc[i]) / Math.max(1e-9, acc[i + 1] - acc[i]);
  return [a[0] + (c[0] - a[0]) * u, a[1] + (c[1] - a[1]) * u, a[2] + (c[2] - a[2]) * u];
}

/** A rounded rectangle outline in the xy plane, as a closed polyline. */
function roundRect(w: number, h: number, rad: number, steps = 6): V3[] {
  const out: V3[] = [];
  const cs: [number, number, number][] = [
    [w / 2 - rad, h / 2 - rad, 0],
    [-w / 2 + rad, h / 2 - rad, Math.PI / 2],
    [-w / 2 + rad, -h / 2 + rad, Math.PI],
    [w / 2 - rad, -h / 2 + rad, (3 * Math.PI) / 2],
  ];
  cs.forEach(([cx, cy, a0]) => {
    for (let s = 0; s <= steps; s++) {
      const a = a0 + (s / steps) * (Math.PI / 2);
      out.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, 0]);
    }
  });
  return out;
}

// ── 02 · Shatter: the mark itself, broken into six pieces that no longer meet ──

export const SHARDS = 6;

export function shatter(n: number, source: Formation): Formation {
  const r = rng(131);
  const f: Formation = { pos: new Float32Array(n * 3), acc: new Float32Array(n), grp: new Float32Array(n).fill(-1), anchors: [] };
  const dir = (k: number): V3 => {
    const a = (k / SHARDS) * Math.PI * 2 + Math.PI / 2;
    return [Math.cos(a), Math.sin(a), 0];
  };
  const push = 0.58;
  const spare: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = source.pos[i * 3];
    const y = source.pos[i * 3 + 1];
    const z = source.pos[i * 3 + 2];
    if (source.acc[i] <= HIDDEN) {
      spare.push(i);
      f.acc[i] = HIDDEN;
      continue;
    }
    let a = Math.atan2(y, x) - Math.PI / 2;
    a = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const k = Math.round((a / (Math.PI * 2)) * SHARDS) % SHARDS;
    const d = dir(k);
    f.pos[i * 3] = x * 0.9 + d[0] * push;
    f.pos[i * 3 + 1] = y * 0.9 + d[1] * push;
    f.pos[i * 3 + 2] = z * 0.9 - 0.15;
    f.acc[i] = 0.62;
    f.grp[i] = k;
  }
  // between neighbours, a thread reaches out and stops short
  spare.slice(0, Math.floor(spare.length * 0.45)).forEach((i, s) => {
    const k = s % SHARDS;
    const a = dir(k);
    const c = dir((k + 1) % SHARDS);
    const from: V3 = [a[0] * (LOGO_R * 0.95 + push), a[1] * (LOGO_R * 0.95 + push), 0];
    const to: V3 = [c[0] * (LOGO_R * 0.95 + push), c[1] * (LOGO_R * 0.95 + push), 0];
    const t = Math.pow(r(), 0.8) * 0.3;
    f.pos[i * 3] = from[0] + (to[0] - from[0]) * t;
    f.pos[i * 3 + 1] = from[1] + (to[1] - from[1]) * t;
    f.pos[i * 3 + 2] = (r() - 0.5) * 0.01;
    f.acc[i] = 0.35;
    f.grp[i] = k;
  });
  f.anchors = Array.from({ length: SHARDS }, (_, k): V3 => {
    const d = dir(k);
    return [d[0] * (LOGO_R * 0.62 + push), d[1] * (LOGO_R * 0.62 + push), 0.4];
  });
  return park(f, r);
}

// ── 05 · Plates: nine dot-matrix layers, stacked ─────────────────────────────

export function plates(n: number): Formation {
  const r = rng(43);
  const b = new Builder(n);
  const H = 0.95;
  const top = ((LAYER_COUNT - 1) / 2) * LAYER_GAP;
  const per = Math.floor((n * 0.9) / LAYER_COUNT);
  const edge = roundRect(2 * H, 2 * H, 0.16, 5);
  const cells = 9;
  for (let l = 0; l < LAYER_COUNT; l++) {
    const y = top - l * LAYER_GAP;
    const start = b.i;
    // outline
    while (b.i < start + per * 0.4) {
      const p = along(edge, r(), true);
      b.push(p[0], y, p[1], 0.85, l);
    }
    // an even field of dots
    const k = Math.max(3, Math.floor((per * 0.55) / (cells * cells)));
    for (let gx = 0; gx < cells; gx++)
      for (let gz = 0; gz < cells; gz++) {
        const x = ((gx + 0.5) / cells) * 2 * H * 0.86 - H * 0.86;
        const z = ((gz + 0.5) / cells) * 2 * H * 0.86 - H * 0.86;
        dot(b, r, [x, y, z], k, 0.45, l, 0.012);
      }
    b.f.anchors.push([-H, y, H]);
  }
  const spine = b.i + Math.floor(n * 0.04);
  while (b.i < spine) b.push(0, (r() - 0.5) * (top * 2 + 0.6), 0, 1, -1);
  return b.dust(r);
}

// ── 06 · Dot globe: the Earth printed as one even grid of dots ──────────────
// Land in the accent, the sea as a sparse grain, India on the same grid in the highlight, dotted routes
// out to each region and two thin orbits. Drawn as flat, even dots; the far side is hidden (see uCull).

const GLOBE_STEP = 0.058; // a fine, even pitch along the surface; the dots are printed smaller to match (params.dot)

export function dotGlobe(n: number): Formation {
  const r = rng(67);
  const b = new Builder(n);
  const dLat = (GLOBE_STEP / GLOBE_R) * (180 / Math.PI);
  let row = 0;
  for (let lat = -84; lat <= 84; lat += dLat, row++) {
    const ring = Math.max(1, Math.round((360 * Math.cos((lat * Math.PI) / 180)) / dLat));
    const shift = row % 2 ? 0.5 : 0; // rows interleave, so the dots sit in a honeycomb rather than columns
    for (let k = 0; k < ring; k++) {
      const lon = ((k + shift) / ring) * 360 - 180;
      const p = lonLatToVec(lon, lat, GLOBE_R);
      if (inPolygon([lon, lat], INDIA)) b.push(p[0], p[1], p[2], 1, 0);
      else if (onLand([lon, lat])) b.push(p[0], p[1], p[2], 0.8, -1);
      else if (row % 3 === 0 && k % 3 === 0) b.push(p[0], p[1], p[2], 0.22, -1); // a sparse sea grain keeps the sphere round
    }
  }
  // routes from India's hubs to each region, dotted at the same pitch
  ARCS.forEach(([a, c]) => {
    const [x0, y0, z0] = arcPoint(a, c, 0);
    const [x1, y1, z1] = arcPoint(a, c, 1);
    const steps = Math.max(6, Math.round((Math.hypot(x1 - x0, y1 - y0, z1 - z0) * 1.25) / (GLOBE_STEP * 1.4)));
    for (let k = 1; k < steps; k++) {
      const p = arcPoint(a, c, k / steps);
      b.push(p[0], p[1], p[2], 0.9, 1);
    }
  });
  // two thin orbits around the planet, each with a few satellites
  const orbits: [number, number, number][] = [
    [1.2, 0.42, -0.26],
    [1.3, -0.3, 0.4],
  ];
  orbits.forEach(([rad, tx, tz], o) => {
    const R = GLOBE_R * rad;
    const count = Math.round((2 * Math.PI * R) / (GLOBE_STEP * 1.6));
    for (let k = 0; k < count; k++) {
      const a = (k / count) * Math.PI * 2;
      const p = rotZ(rotX([Math.cos(a) * R, 0, Math.sin(a) * R], tx), tz);
      const sat = k % Math.round(count / 3) === o * 4;
      b.push(p[0], p[1], p[2], sat ? 1 : 0.35, sat ? 1 : -1);
    }
  });
  b.f.anchors = GLOBE_LABELS.map((h) => lonLatToVec(h.at[0], h.at[1], GLOBE_R * 1.02));
  b.f.crisp = 1;
  return b.dust(r);
}

// ── 09 · Build: half the mark finished, half still scaffolding ───────────────

export function build(n: number): Formation {
  const r = rng(151);
  const b = new Builder(n);
  const R = LOGO_R;
  // the finished lower half: a dense shell
  const shell = Math.floor(n * 0.5);
  while (b.i < shell) {
    const [x, y, z] = onSphere(r);
    if (y > 0.02) continue;
    b.push(x * R, y * R, z * R, 1, -1);
  }
  // the upper half: latitude rings and meridians, as a wire frame
  const lats = [0.18, 0.38, 0.58, 0.78, 0.94];
  const wire = b.i + Math.floor(n * 0.3);
  while (b.i < wire) {
    if (r() < 0.55) {
      const s = lats[Math.floor(r() * lats.length)];
      const a = r() * Math.PI * 2;
      const c = Math.sqrt(1 - s * s);
      b.push(Math.cos(a) * c * R, s * R, Math.sin(a) * c * R, 0.35, -1);
    } else {
      const m = (Math.floor(r() * 10) / 10) * Math.PI * 2;
      const t = r() * (Math.PI / 2);
      b.push(Math.cos(m) * Math.cos(t) * R, Math.sin(t) * R, Math.sin(m) * Math.cos(t) * R, 0.35, -1);
    }
  }
  // three joints where work is happening: research, engineering, operations
  const joints: V3[] = [
    [Math.cos(0.5) * 0.92 * R, 0.38 * R, Math.sin(0.5) * 0.92 * R],
    [Math.cos(2.4) * 0.8 * R, 0.58 * R, Math.sin(2.4) * 0.8 * R],
    [Math.cos(4.2) * 0.98 * R, 0.18 * R, Math.sin(4.2) * 0.98 * R],
  ];
  joints.forEach((j, k) => dot(b, r, j, 90, 1, k, 0.05));
  b.f.anchors = joints;
  return b.dust(r);
}

// ── 10 · Pages: three sheets of notes, fanned ────────────────────────────────

export function pages(n: number): Formation {
  const r = rng(173);
  const b = new Builder(n);
  const W = 1.3;
  const Hh = 1.7;
  const edge = roundRect(W, Hh, 0.08, 4);
  const sheets = 3;
  const per = Math.floor((n * 0.92) / sheets);
  const place = (s: number, p: V3): V3 => {
    // fanned like cards in a hand: each sheet steps right, down and back, turning a little
    const a = -s * 0.22;
    const x = p[0] * Math.cos(a) - p[2] * Math.sin(a) + (s - 1) * 0.95;
    const z = p[0] * Math.sin(a) + p[2] * Math.cos(a) - s * 0.35;
    return [x, p[1] + (s - 1) * -0.38, z];
  };
  for (let s = 0; s < sheets; s++) {
    const start = b.i;
    const acc = s === 0 ? 1 : 0.5;
    while (b.i < start + per * 0.35) {
      const p = along(edge, r(), true);
      b.push(...place(s, p), acc * 0.9, s);
    }
    // a heading, then lines of text of varying length
    const lines = [0.62, 0.9, 0.84, 0.7, 0.88, 0.5, 0.86, 0.66];
    const rows = b.i;
    while (b.i < start + per) {
      const li = Math.floor(r() * lines.length);
      const y = Hh / 2 - 0.3 - li * 0.2;
      const len = (W - 0.36) * lines[li];
      const x = -W / 2 + 0.18 + r() * len;
      const thick = li === 0 ? 0.035 : 0.012;
      b.push(...place(s, [x, y + (r() - 0.5) * thick, 0]), li === 0 ? acc : acc * 0.55, s);
    }
    void rows;
    b.f.anchors.push(place(s, [-W / 2, Hh / 2, 0]));
  }
  return b.dust(r);
}

// ── 11 · Conversation: a question, and an answer on its way ──────────────────

export function bubble(n: number): Formation {
  const r = rng(191);
  const b = new Builder(n);
  const ask = roundRect(2.0, 1.1, 0.5, 8).map((p): V3 => [p[0] - 0.45, p[1] + 0.62, 0]);
  const reply = roundRect(2.3, 1.25, 0.56, 8).map((p): V3 => [p[0] + 0.35, p[1] - 0.72, -0.2]);
  const outline = (pts: V3[], count: number, acc: number, g: number) => {
    const end = b.i + count;
    while (b.i < end) {
      const p = along(pts, r(), true);
      b.push(p[0], p[1], p[2], acc, g);
    }
  };
  outline(ask, Math.floor(n * 0.2), 0.45, 0);
  outline(reply, Math.floor(n * 0.26), 1, 1);
  // tails
  const tail = (from: V3, to: V3, count: number, acc: number, g: number) => {
    for (let i = 0; i < count; i++) {
      const t = r();
      b.push(from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2], acc, g);
    }
  };
  tail([-1.1, 0.12, 0], [-1.35, -0.12, 0], Math.floor(n * 0.015), 0.45, 0);
  tail([1.25, -1.3, -0.2], [1.55, -1.55, -0.2], Math.floor(n * 0.015), 1, 1);
  // the question: two short lines of text
  const qa = b.i + Math.floor(n * 0.07);
  while (b.i < qa) {
    const row = r() < 0.5 ? 0 : 1;
    const len = row ? 0.9 : 1.3;
    b.push(-0.45 - 0.65 + r() * len, 0.74 - row * 0.24, 0, 0.35, 0);
  }
  // the answer being written: three dots
  [-0.2, 0.35, 0.9].forEach((x, k) => {
    for (let i = 0; i < Math.floor(n * 0.035); i++) {
      const [a, c, d] = onSphere(r);
      const rad = 0.1 * Math.cbrt(r());
      b.push(x + a * rad, -0.72 + c * rad, -0.2 + d * rad, 1, 2 + k);
    }
  });
  b.f.anchors = [
    [-1.45, 1.2, 0],
    [1.5, -0.1, -0.2],
  ];
  return b.dust(r);
}
