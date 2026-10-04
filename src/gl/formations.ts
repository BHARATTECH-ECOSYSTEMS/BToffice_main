import { distToThreads, THREAD_HALF_WIDTH } from './threads';
import { INDIA, INDIA_BBOX, INDIA_HUBS, WORLD, GLOBE_LABELS, inPolygon, lonLatToVec, isLandmass, type LonLat } from './geo';

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

/** The rings and satellite positions of an orbit; shared by the particle formation and the solid object. */
export function orbitLayout(satellites: number) {
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
  return { rings, sats, place, coreR: 0.46 };
}

export function orbit(n: number, satellites: number, seed = 5): Formation {
  const r = rng(seed);
  const b = new Builder(n);
  const { rings, sats, place, coreR } = orbitLayout(satellites);

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
// Nine structured operating system layers.
// Each layer is rendered as an architectural wafer slab with a crisp perimeter boundary,
// precision bevel, corner alignment pads, and dedicated technological subsystem circuitry.

export const LAYER_COUNT = 9;
export const LAYER_GAP = 0.35;
export const LAYER_HALF = 0.92;
const HALF = LAYER_HALF;

/** Generates points along a rounded square boundary in the X-Z plane */
function roundedRectEdge(w: number, h: number, cr: number, t: number): [number, number] {
  const sw = Math.max(0.01, w - 2 * cr);
  const sh = Math.max(0.01, h - 2 * cr);
  const corner = (Math.PI / 2) * cr;
  const perim = 2 * sw + 2 * sh + 4 * corner;
  let d = ((t % 1) + 1) % 1 * perim;

  if (d < sw) return [-w / 2 + cr + d, -h / 2];
  d -= sw;
  if (d < corner) {
    const a = -Math.PI / 2 + (d / corner) * (Math.PI / 2);
    return [w / 2 - cr + Math.cos(a) * cr, -h / 2 + cr + Math.sin(a) * cr];
  }
  d -= corner;
  if (d < sh) return [w / 2, -h / 2 + cr + d];
  d -= sh;
  if (d < corner) {
    const a = (d / corner) * (Math.PI / 2);
    return [w / 2 - cr + Math.cos(a) * cr, h / 2 - cr + Math.sin(a) * cr];
  }
  d -= corner;
  if (d < sw) return [w / 2 - cr - d, h / 2];
  d -= sw;
  if (d < corner) {
    const a = Math.PI / 2 + (d / corner) * (Math.PI / 2);
    return [-w / 2 + cr + Math.cos(a) * cr, h / 2 - cr + Math.sin(a) * cr];
  }
  d -= corner;
  if (d < sh) return [-w / 2, h / 2 - cr - d];
  d -= sh;
  const a = Math.PI + (d / corner) * (Math.PI / 2);
  return [-w / 2 + cr + Math.cos(a) * cr, -h / 2 + cr + Math.sin(a) * cr];
}

export type LayerGen = (index: number, total: number, r: () => number) => [number, number];

export const LAYER_SUB_SYSTEMS: LayerGen[] = [
  // 0. Applications: 3x3 organized grid of app modules with frames & active cores
  (i, total, r) => {
    const tile = i % 9;
    const tx = (tile % 3 - 1) * 0.52;
    const tz = (Math.floor(tile / 3) - 1) * 0.52;
    const within = Math.floor(i / 9);
    const subTotal = Math.floor(total / 9);
    if (within < subTotal * 0.65) {
      const [ex, ez] = roundedRectEdge(0.38, 0.38, 0.04, within / (subTotal * 0.65));
      return [tx + ex, tz + ez];
    }
    // Active core point with subtle jitter
    return [tx + (r() - 0.5) * 0.12, tz + (r() - 0.5) * 0.12];
  },

  // 1. Reasoning Engine: Concentric neural inference rings with radial synaptic rays & nodes
  (i, total, r) => {
    const phase = i / total;
    if (phase < 0.6) {
      // 3 concentric inference orbits
      const ringIdx = i % 3;
      const radius = 0.22 + ringIdx * 0.23;
      const a = (Math.floor(i / 3) / (total * 0.2)) * Math.PI * 2;
      return [Math.cos(a) * radius, Math.sin(a) * radius];
    }
    if (phase < 0.85) {
      // 8 radial synaptic interconnect lines
      const ray = (i % 8) * (Math.PI / 4);
      const dist = 0.15 + r() * 0.55;
      return [Math.cos(ray) * dist, Math.sin(ray) * dist];
    }
    // Satellite reasoning nodes
    const a = r() * Math.PI * 2;
    const d = 0.35 + (i % 2) * 0.3;
    return [Math.cos(a) * d + (r() - 0.5) * 0.05, Math.sin(a) * d + (r() - 0.5) * 0.05];
  },

  // 2. Memory Engine: Ultra-clean crossbar memory lattice (address bus & word/bit lines)
  (i, total) => {
    const isHorizontal = i % 2 === 0;
    const line = Math.floor(i / 2) % 18;
    const span = 0.72;
    const offset = (line / 17) * 2 * span - span;
    const t = ((Math.floor(i / 36)) / (total / 36)) * 2 * span - span;
    return isHorizontal ? [t, offset] : [offset, t];
  },

  // 3. Knowledge Engine: Semantic graph with 16 prominent nodes & connecting relationship vectors
  (() => {
    const nr = rng(101);
    const nodes: [number, number][] = Array.from({ length: 16 }, () => [
      (nr() - 0.5) * 1.3,
      (nr() - 0.5) * 1.3,
    ]);
    const edges: [number, number][] = [];
    for (let a = 0; a < nodes.length; a++) {
      for (let c = a + 1; c < nodes.length; c++) {
        if (Math.hypot(nodes[a][0] - nodes[c][0], nodes[a][1] - nodes[c][1]) < 0.65) {
          edges.push([a, c]);
        }
      }
    }
    return (i: number, total: number, r: () => number): [number, number] => {
      if (i < total * 0.35) {
        // Node clusters
        const node = nodes[i % nodes.length];
        const a = r() * Math.PI * 2;
        const d = r() * 0.06;
        return [node[0] + Math.cos(a) * d, node[1] + Math.sin(a) * d];
      }
      // Edge connections
      const edge = edges[i % edges.length];
      const t = r();
      return [
        nodes[edge[0]][0] + (nodes[edge[1]][0] - nodes[edge[0]][0]) * t,
        nodes[edge[0]][1] + (nodes[edge[1]][1] - nodes[edge[0]][1]) * t,
      ];
    };
  })(),

  // 4. Research Engine: Archimedean golden spiral of deep inquiry with cardinal radar crosshairs
  (i, total) => {
    if (i < total * 0.7) {
      const t = i / (total * 0.7);
      const angle = t * Math.PI * 8;
      const rad = 0.08 + t * 0.64;
      return [Math.cos(angle) * rad, Math.sin(angle) * rad];
    }
    // Cardinal crosshairs
    const axis = i % 4;
    const dist = ((i - total * 0.7) / (total * 0.3)) * 0.72;
    if (axis === 0) return [dist, 0];
    if (axis === 1) return [-dist, 0];
    if (axis === 2) return [0, dist];
    return [0, -dist];
  },

  // 5. Security Layer: Concentric cryptographic shields & perimeter firewall barriers
  (i, total) => {
    const phase = i / total;
    if (phase < 0.38) {
      // 45-degree rotated diamond shield
      const t = i / (total * 0.38);
      const s = 0.68;
      const e = (t * 4) % 4;
      const d = (e % 1);
      if (e < 1) return [d * s, (1 - d) * s];
      if (e < 2) return [(1 - d) * s, -d * s];
      if (e < 3) return [-d * s, -(1 - d) * s];
      return [-(1 - d) * s, d * s];
    }
    if (phase < 0.72) {
      // Inner octagonal shield
      const a = (i / (total * 0.34)) * Math.PI * 2;
      const rad = 0.42;
      return [Math.cos(a) * rad, Math.sin(a) * rad];
    }
    // Inner secure cryptographic vault core
    const a = (i / (total * 0.28)) * Math.PI * 2;
    const rad = 0.2;
    return [Math.cos(a) * rad, Math.sin(a) * rad];
  },

  // 6. Infrastructure Layer: High-speed parallel optical data buses with cross-switching junctions
  (i, total) => {
    const rails = 10;
    const railIdx = i % rails;
    const yRail = (railIdx / (rails - 1)) * 1.3 - 0.65;
    const progress = Math.floor(i / rails) / (total / rails);
    const xRail = progress * 1.4 - 0.7;
    // Periodic switching junctions
    const junction = Math.sin(progress * Math.PI * 6) > 0.85 ? Math.sin(xRail * 20) * 0.05 : 0;
    return [xRail, yRail + junction];
  },

  // 7. Compute Layer: 4x4 matrix of dense neural processor cores & interconnect channels
  (i, total, r) => {
    const core = i % 16;
    const cx = (core % 4 - 1.5) * 0.38;
    const cz = (Math.floor(core / 4) - 1.5) * 0.38;
    const within = Math.floor(i / 16);
    const subTotal = Math.floor(total / 16);
    if (within < subTotal * 0.6) {
      const [ex, ez] = roundedRectEdge(0.26, 0.26, 0.03, within / (subTotal * 0.6));
      return [cx + ex, cz + ez];
    }
    // Internal core density
    return [cx + (r() - 0.5) * 0.16, cz + (r() - 0.5) * 0.16];
  },

  // 8. Sovereign Cloud: Bounded sovereign foundation disc with radial sector partitions
  (i, total, r) => {
    const phase = i / total;
    if (phase < 0.45) {
      // Outer sovereign boundary ring
      const a = (i / (total * 0.45)) * Math.PI * 2;
      return [Math.cos(a) * 0.72, Math.sin(a) * 0.72];
    }
    if (phase < 0.75) {
      // Intermediate security ring
      const a = (i / (total * 0.3)) * Math.PI * 2;
      return [Math.cos(a) * 0.48, Math.sin(a) * 0.48];
    }
    // Dense sovereign national hub core
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 0.25;
    return [Math.cos(a) * d, Math.sin(a) * d];
  },
];

export function layers(n: number): Formation {
  const r = rng(41);
  const b = new Builder(n);

  // Reserve particles for the vertical central data spine
  const spineCount = Math.floor(n * 0.06);
  const perLayer = Math.floor((n - spineCount) / LAYER_COUNT);
  const top = ((LAYER_COUNT - 1) / 2) * LAYER_GAP;

  for (let l = 0; l < LAYER_COUNT; l++) {
    const y = top - l * LAYER_GAP;
    const layerStart = b.i;
    const layerTarget = layerStart + perLayer;

    // 1. Crisp Outer Perimeter Wafer Border (rounded square)
    const outerCount = 280;
    for (let k = 0; k < outerCount; k++) {
      const [px, pz] = roundedRectEdge(HALF * 2, HALF * 2, 0.16, k / outerCount);
      b.push(px, y, pz, 0.85, l);
    }

    // 2. Inner Beveled Wafer Rim
    const innerCount = 180;
    for (let k = 0; k < innerCount; k++) {
      const [px, pz] = roundedRectEdge(HALF * 1.72, HALF * 1.72, 0.1, k / innerCount);
      b.push(px, y, pz, 0.5, l);
    }

    // 3. Corner Alignment Fiducials & Edge Connectors
    const corners: [number, number][] = [
      [-HALF * 0.9, -HALF * 0.9],
      [HALF * 0.9, -HALF * 0.9],
      [HALF * 0.9, HALF * 0.9],
      [-HALF * 0.9, HALF * 0.9],
      [0, -HALF * 0.96],
      [0, HALF * 0.96],
      [-HALF * 0.96, 0],
      [HALF * 0.96, 0],
    ];
    corners.forEach(([cx, cz]) => {
      for (let k = 0; k < 6; k++) {
        b.push(cx + (r() - 0.5) * 0.04, y, cz + (r() - 0.5) * 0.04, 1.0, l);
      }
    });

    // 4. Specialized Technological Subsystem Circuitry
    const gen = LAYER_SUB_SYSTEMS[l];
    const remaining = layerTarget - b.i;
    for (let k = 0; k < remaining; k++) {
      const [cx, cz] = gen(k, remaining, r);
      b.push(cx + (r() - 0.5) * 0.005, y, cz + (r() - 0.5) * 0.005, 0.9, l);
    }

    // Anchor on the right-hand edge of the slab, where a callout can hang off it
    b.f.anchors.push([HALF * 1.02, y, 0]);
  }

  // 5. Central Vertical Data Spine / High-Speed Inter-Layer Bus
  const spineHeight = top * 2 + 0.8;
  while (b.i < n - 8) {
    const t = r();
    const sy = top + 0.4 - t * spineHeight;
    // 4 pillar conduits and 1 dense optical fiber core
    const col = Math.floor(r() * 5);
    let sx = 0;
    let sz = 0;
    if (col === 0) { sx = -0.05; sz = -0.05; }
    else if (col === 1) { sx = 0.05; sz = -0.05; }
    else if (col === 2) { sx = 0.05; sz = 0.05; }
    else if (col === 3) { sx = -0.05; sz = 0.05; }
    else {
      // Center fiber with subtle scatter
      const a = r() * Math.PI * 2;
      const d = r() * 0.025;
      sx = Math.cos(a) * d;
      sz = Math.sin(a) * d;
    }
    b.push(sx, sy, sz, 1.0, -1);
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
  const r = rng(67);
  const b = new Builder(n);
  const dotSpacing = 0.058;
  const a = (dotSpacing / GLOBE_R) * (180 / Math.PI);
  let l = 0;

  // 1. Continental landmasses and global coordinate grid
  for (let lat = -84; lat <= 84; lat += a, l++) {
    const ringCount = Math.max(1, Math.round((360 * Math.cos((lat * Math.PI) / 180)) / a));
    const offset = l % 2 ? 0.5 : 0;
    for (let g = 0; g < ringCount; g++) {
      const lon = ((g + offset) / ringCount) * 360 - 180;
      const pt: LonLat = [lon, lat];
      const vec = lonLatToVec(lon, lat, GLOBE_R);
      if (!inPolygon(pt, INDIA)) {
        // land in ink, the ocean as a faint graticule of dots: the continents read by contrast, India by colour
        if (isLandmass(pt)) {
          b.push(vec[0], vec[1], vec[2], 0.0, -1);
        } else if (l % 4 === 0 && g % 4 === 0) {
          b.push(vec[0], vec[1], vec[2], 0.0, -1);
        }
      }
    }
  }

  // 2. High-Density India Sovereign Core
  const indiaR = GLOBE_R * 1.008;
  const dIndia = a * 0.62;
  for (let lat = INDIA_BBOX.minLat; lat <= INDIA_BBOX.maxLat; lat += dIndia) {
    for (let lon = INDIA_BBOX.minLon; lon <= INDIA_BBOX.maxLon; lon += dIndia / Math.cos((lat * Math.PI) / 180)) {
      if (inPolygon([lon, lat], INDIA)) {
        const v = lonLatToVec(lon, lat, indiaR);
        b.push(v[0], v[1], v[2], 0.9, 0);
      }
    }
  }

  // 3. Crisp Outline Perimeter Border of India
  for (let i = 0; i < INDIA.length; i++) {
    const [lon1, lat1] = INDIA[i];
    const [lon2, lat2] = INDIA[(i + 1) % INDIA.length];
    const segCount = Math.max(1, Math.round(Math.hypot(lon2 - lon1, lat2 - lat1) / (dIndia * 0.55)));
    for (let k = 0; k < segCount; k++) {
      const interLon = lon1 + ((lon2 - lon1) * k) / segCount;
      const interLat = lat1 + ((lat2 - lat1) * k) / segCount;
      const v = lonLatToVec(interLon, interLat, indiaR * 1.002);
      b.push(v[0], v[1], v[2], 1.0, 0);
    }
  }

  // 4. India National Hub Clusters
  INDIA_HUBS.forEach((hub) => {
    const v = lonLatToVec(hub.at[0], hub.at[1], indiaR * 1.004);
    for (let k = 0; k < 3; k++) b.push(v[0], v[1], v[2], 1.0, 0);
  });

  // 5. Global Arcs between India Hubs and Worldwide Partner Nodes
  ARCS.forEach(([h1, h2]) => {
    const p1 = arcPoint(h1, h2, 0);
    const p2 = arcPoint(h1, h2, 1);
    const count = Math.max(6, Math.round((Math.hypot(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]) * 1.25) / (dotSpacing * 1.4)));
    for (let c = 1; c < count; c++) {
      const p = arcPoint(h1, h2, c / count);
      b.push(p[0], p[1], p[2], 0.9, 1);
    }
  });

  // 6. Tilted Cosmic Orbital Rings with Active Satellite Beads
  const orbits: [number, number, number][] = [
    [1.2, 0.42, -0.26],
    [1.3, -0.3, 0.4],
  ];
  orbits.forEach(([scale, tiltX, tiltZ], g) => {
    const rad = GLOBE_R * scale;
    const ringDots = Math.round((2 * Math.PI * rad) / (dotSpacing * 1.6));
    for (let k = 0; k < ringDots; k++) {
      const theta = (k / ringDots) * Math.PI * 2;
      const p = rotZ(rotX([Math.cos(theta) * rad, 0, Math.sin(theta) * rad], tiltX), tiltZ);
      const isSatellite = k % Math.round(ringDots / 3) === g * 4;
      b.push(p[0], p[1], p[2], isSatellite ? 1.0 : 0.35, isSatellite ? 1 : -1);
    }
  });

  b.f.anchors = GLOBE_LABELS.map((h) => lonLatToVec(h.at[0], h.at[1], GLOBE_R * 1.02));
  b.f.crisp = 1;
  return b.dust(r);
}

// ── 6. The laboratory ──────────────────────────────────────────────────────
// A double helix running left to right: six segments, six research domains.

export function helix(n: number, segments = 6): Formation {
  const r = rng(83);
  const b = new Builder(n);
  const L = 4.85;
  const rad = 0.55;
  const strands = Math.floor(n * 0.62);
  while (b.i < strands) {
    const t = r();
    const x = -L + t * 2 * L;
    const phase = x * 1.55 + (b.i % 2) * Math.PI;
    const jitter = (r() - 0.5) * 0.03;
    const seg = Math.min(segments - 1, Math.floor(t * segments));
    b.push(x, Math.cos(phase) * (rad + jitter), Math.sin(phase) * (rad + jitter), b.i % 2 ? 1 : 0.45, seg);
  }
  const rungs = b.i + Math.floor(n * 0.16);
  while (b.i < rungs) {
    const k = Math.floor(r() * 64);
    const x = -L + (k / 63) * 2 * L;
    const phase = x * 1.55;
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
  [-1.52, 0.84, 0], [0, 0.84, 0], [1.52, 0.84, 0],
  [-1.52, -0.84, 0], [0, -0.84, 0], [1.52, -0.84, 0],
];

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

// Badges sit cleanly above each symbol in both rows (matching the reference photo)
// anchors 0–5: badge positions; 6–11: symbol centres
const siloAnchors = (): V3[] => [...SILO_CENTERS.map(([x, y]): V3 => [x, y + 0.60, 0]), ...SILO_CENTERS];

/** Step 2: 6 distinct symbolic living particle formations */
export function silos(n: number, _source: Formation): Formation {
  const r = rng(101);
  const b = new Builder(n);
  for (let i = 0; i < n; i++) {
    b.push(0, 0, 0, HIDDEN);
  }
  b.f.anchors = siloAnchors();
  return park(b.f, r);
}

/** Step 3: the 6 distinct symbolic formations frozen and crystallised */
export function frozen(n: number, source: Formation, stubs = false): Formation {
  const r = rng(103);
  const b = new Builder(n);
  const member = siloMembership(n, source);
  const adjacent = [[1, 3], [0, 2, 4], [1, 5], [0, 4], [3, 5, 1], [4, 2]];
  for (let i = 0; i < n; i++) {
    const k = member[i];
    if (k < 0) {
      b.push(0, 0, 0, HIDDEN);
      continue;
    }
    if (stubs && i % 5 === 0) {
      // reaching for a neighbour, stopping short: connections that never land
      const a = SILO_CENTERS[k];
      const o = SILO_CENTERS[adjacent[k][(i >> 3) % adjacent[k].length]];
      const t = 0.24 + Math.pow(r(), 1.6) * 0.16;
      b.push(a[0] + (o[0] - a[0]) * t, a[1] + (o[1] - a[1]) * t, 0, 0.9, k);
      continue;
    }
    b.push(0, 0, 0, HIDDEN);
  }
  b.f.anchors = siloAnchors();
  return park(b.f, r);
}
