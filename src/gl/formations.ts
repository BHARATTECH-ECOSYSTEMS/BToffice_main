import { distToThreads, THREAD_HALF_WIDTH } from './threads';
import { INDIA, INDIA_BBOX, INDIA_HUBS, WORLD, inPolygon, lonLatToVec, type LonLat } from './geo';

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

function onSphere(r: () => number): V3 {
  const u = r() * 2 - 1;
  const t = r() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return [s * Math.cos(t), u, s * Math.sin(t)];
}

// ── 1. The mark ────────────────────────────────────────────────────────────
// A purple sphere whose white threads are literal voids cut through it.

const MASK_RES = 320;
let threadMask: Uint8Array | null = null;
function isThread(u: number, v: number): boolean {
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
  const lift = 1 + Math.sin(Math.PI * t) * (0.04 + om * 0.08);
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
  b.f.anchors = INDIA_HUBS.map((h) => lonLatToVec(h.at[0], h.at[1], GLOBE_R * 1.02));
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
const siloAnchors = (): V3[] => SILO_CENTERS.map(([x, y]) => [x, y > 0 ? y + 0.46 : y - 0.46, 0]);

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
