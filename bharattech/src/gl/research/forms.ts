import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { CONTINENTS, INDIA, inPolygon, lonLatToVec, type LonLat } from '../geo';

/**
 * The swarm's forms: each is `count` points (x, y, z in turn) centred on the origin. Seeded, so a form is identical on
 * every load and the swarm can blend any two of them point for point.
 */

export type Rand = () => number;

// Each landmass's bounds, so most samples skip the full point-in-polygon test.
const LAND = CONTINENTS.map((poly) => {
  const lons = poly.map((p) => p[0]);
  const lats = poly.map((p) => p[1]);
  return { poly, minLon: Math.min(...lons), maxLon: Math.max(...lons), minLat: Math.min(...lats), maxLat: Math.max(...lats) };
});
const onLand = (p: LonLat) =>
  LAND.some((l) => p[0] >= l.minLon && p[0] <= l.maxLon && p[1] >= l.minLat && p[1] <= l.maxLat && inPolygon(p, l.poly));

/**
 * Geo Intelligence: the home reel's dot globe, radius 1. Land is dotted densely, India densest and turned to face
 * the viewer (+z); the oceans keep a faint scatter so the sphere still reads as a sphere.
 */
export function globeForm(count: number, rand: Rand): Float32Array {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; ) {
    // an even spread over the sphere
    const lon = rand() * 360 - 180;
    const lat = (Math.asin(rand() * 2 - 1) * 180) / Math.PI;
    const p: LonLat = [lon, lat];
    const keep = inPolygon(p, INDIA) ? 1 : onLand(p) ? 0.75 : 0.035;
    if (rand() >= keep) continue;
    out.set(lonLatToVec(lon, lat, 1), i * 3);
    i++;
  }
  return out;
}

/** A loose cloud, flatter than it is wide, for the stops between the objects. Every coordinate within ±spread. */
export function fieldForm(count: number, rand: Rand, spread: number): Float32Array {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) out.set([(rand() * 2 - 1) * spread, (rand() * 2 - 1) * spread * 0.5, (rand() * 2 - 1) * spread * 0.6], i * 3);
  return out;
}

/** A smooth value noise of a point, 0 … 1, from a hash of the lattice around it (no random draws, so pure). */
function softNoise(x: number, y: number, z: number) {
  const hash = (i: number, j: number, k: number) => {
    let h = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 2147483647);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const fx = x - xi, fy = y - yi, fz = z - zi;
  const s = (t: number) => t * t * (3 - 2 * t);
  const u = s(fx), v = s(fy), w = s(fz);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  return l(
    l(l(hash(xi, yi, zi), hash(xi + 1, yi, zi), u), l(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u), v),
    l(l(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u), l(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u), v),
    w,
  );
}

export interface SkyView {
  /** where the camera stands, relative to the form's centre, looking at it */
  eye: [number, number, number];
  /** tangents of half the view's height and of half the widest window's width */
  tanY: number;
  tanX: number;
  /** the nearest and furthest depths, along the view, that the points fill */
  near: number;
  far: number;
}

/**
 * The open sky of points for "our research": the whole view filled, edge to edge, from close to the lens to far
 * behind the stop, so the dots reach every part of the screen at many depths (the near ones larger: real parallax).
 * Their density drifts softly, in clouds and clearings, so the sky has texture rather than reading as static; even
 * the clearings keep a quarter of the density, so no part of the screen is ever empty.
 */
export function skyForm(count: number, rand: Rand, view: SkyView): Float32Array {
  const out = new Float32Array(count * 3);
  const eye = new THREE.Vector3(...view.eye);
  const forward = eye.clone().negate().normalize();
  const right = forward.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
  const up = right.clone().cross(forward);
  const p = new THREE.Vector3();
  for (let i = 0; i < count; ) {
    // a spot on the screen (a touch past its edges, so a slow drift of the camera never shows a border) and a depth,
    // leaning far so most dots are fine and a few near ones are large
    const sx = (rand() * 2 - 1) * 1.06 * view.tanX;
    const sy = (rand() * 2 - 1) * 1.06 * view.tanY;
    const depth = view.near + (view.far - view.near) * rand() ** 0.8;
    p.copy(eye).addScaledVector(forward, depth).addScaledVector(right, sx * depth).addScaledVector(up, sy * depth);
    const cloud = 0.6 * softNoise(p.x * 0.42 + 11, p.y * 0.42, p.z * 0.42) + 0.4 * softNoise(p.x * 1.1, p.y * 1.1 + 5, p.z * 1.1);
    const t = Math.min(1, Math.max(0, (cloud - 0.32) / 0.38));
    if (rand() >= 0.25 + 0.75 * t * t * (3 - 2 * t)) continue;
    p.toArray(out, i * 3);
    i++;
  }
  return out;
}

/** Points spread evenly over a geometry's surface (the hero word's letters), re-centred on its bounding box. */
export function surfaceForm(geometry: THREE.BufferGeometry, count: number, rand: Rand): Float32Array {
  const mesh = new THREE.Mesh(geometry.index ? geometry.toNonIndexed() : geometry);
  // setRandomGenerator is in three's sampler but missing from @types/three 0.185
  const seededSampler = new MeshSurfaceSampler(mesh) as MeshSurfaceSampler & { setRandomGenerator(fn: Rand): MeshSurfaceSampler };
  const sampler = seededSampler.setRandomGenerator(rand).build();
  geometry.computeBoundingBox();
  const centre = geometry.boundingBox!.getCenter(new THREE.Vector3());
  const out = new Float32Array(count * 3);
  const p = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    sampler.sample(p);
    p.sub(centre).toArray(out, i * 3);
  }
  if (mesh.geometry !== geometry) mesh.geometry.dispose();
  return out;
}

// ── the six domains' objects, after the home page's reels (src/gl/worlds), main object only, within radius 1

/** A point on a box's surface: a face picked by its area, a spot on it. */
function onBox(rand: Rand, w: number, h: number, d: number, out: number[]) {
  const faces = [w * h, w * h, w * d, w * d, h * d, h * d];
  let f = rand() * faces.reduce((a, b) => a + b, 0);
  let i = 0;
  while (f > faces[i] && i < 5) f -= faces[i++];
  const u = rand() - 0.5;
  const v = rand() - 0.5;
  const side = i % 2 ? 0.5 : -0.5;
  if (i < 2) out.splice(0, 3, u * w, v * h, side * d);
  else if (i < 4) out.splice(0, 3, u * w, side * h, v * d);
  else out.splice(0, 3, side * w, u * h, v * d);
}

/** A point on one of a box's 12 edges, picked by length. */
function onBoxEdge(rand: Rand, w: number, h: number, d: number, out: number[]) {
  const sx = rand() < 0.5 ? -0.5 : 0.5;
  const sy = rand() < 0.5 ? -0.5 : 0.5;
  const sz = rand() < 0.5 ? -0.5 : 0.5;
  const pick = rand() * (w + h + d);
  const t = rand() - 0.5;
  if (pick < w) out.splice(0, 3, t * w, sy * h, sz * d);
  else if (pick < w + h) out.splice(0, 3, sx * w, t * h, sz * d);
  else out.splice(0, 3, sx * w, sy * h, t * d);
}

/** GI Rivinity: the glass memory cube, its edges drawn bright, a 4 × 4 × 4 lattice of memory cells inside. */
export function cubeForm(count: number, rand: Rand): Float32Array {
  const side = 1.14; // its corners just inside radius 1
  const pitch = side / 4;
  const out = new Float32Array(count * 3);
  const p = [0, 0, 0];
  for (let i = 0; i < count; i++) {
    const r = rand();
    if (r < 0.48) onBoxEdge(rand, side, side, side, p);
    else if (r < 0.58) onBox(rand, side, side, side, p);
    else {
      // a cell: a small cube's surface at one lattice position
      const cx = (Math.floor(rand() * 4) - 1.5) * pitch;
      const cy = (Math.floor(rand() * 4) - 1.5) * pitch;
      const cz = (Math.floor(rand() * 4) - 1.5) * pitch;
      onBox(rand, pitch * 0.42, pitch * 0.42, pitch * 0.42, p);
      p[0] += cx;
      p[1] += cy;
      p[2] += cz;
    }
    out.set(p, i * 3);
  }
  return out;
}

/** Rivinity Core: the flat operating slab, its rim drawn bright, with six modules docked on top. */
export function slabForm(count: number, rand: Rand): Float32Array {
  const k = 0.56; // the home slab (2.9 × 0.12 × 1.9) scaled to fit within radius 1
  const slab = { w: 2.9 * k, h: 0.12 * k, d: 1.9 * k };
  const mod = { w: 0.5 * k, h: 0.22 * k, d: 0.5 * k };
  const slots = [-0.9, 0, 0.9].flatMap((x) => [-0.45, 0.45].map((z) => [x * k, z * k]));
  const lift = slab.h / 2 + mod.h / 2 + 0.02 * k;
  const out = new Float32Array(count * 3);
  const p = [0, 0, 0];
  for (let i = 0; i < count; i++) {
    const r = rand();
    if (r < 0.25) onBoxEdge(rand, slab.w, slab.h, slab.d, p);
    else if (r < 0.6) onBox(rand, slab.w, slab.h, slab.d, p);
    else {
      const [x, z] = slots[Math.floor(rand() * slots.length)];
      if (rand() < 0.4) onBoxEdge(rand, mod.w, mod.h, mod.d, p);
      else onBox(rand, mod.w, mod.h, mod.d, p);
      p[0] += x;
      p[1] += lift;
      p[2] += z;
    }
    // centred on its height, modules included
    p[1] -= mod.h / 2;
    out.set(p, i * 3);
  }
  return out;
}

type Vec = [number, number, number];

/** A point on the surface of a tube of radius r from a to b (its side only; joints cover the ends). */
function onTube(rand: Rand, a: Vec, b: Vec, r: number): Vec {
  const axis = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const t = rand();
  const u = new THREE.Vector3(0, 0, 1).cross(axis);
  if (u.lengthSq() < 1e-6) u.set(1, 0, 0);
  u.normalize();
  const v = axis.clone().cross(u).normalize();
  const turn = rand() * Math.PI * 2;
  const p = new THREE.Vector3(...a).addScaledVector(axis, t).addScaledVector(u, Math.cos(turn) * r).addScaledVector(v, Math.sin(turn) * r);
  return [p.x, p.y, p.z];
}

/** A point on a sphere's surface. */
function onSphere(rand: Rand, c: Vec, r: number): Vec {
  const y = rand() * 2 - 1;
  const turn = rand() * Math.PI * 2;
  const ring = Math.sqrt(1 - y * y);
  return [c[0] + Math.cos(turn) * ring * r, c[1] + y * r, c[2] + Math.sin(turn) * ring * r];
}

/** A point on an upright cylinder standing at (x, y0, z): its side, or its top by its share of the area. */
function onDrum(rand: Rand, x: number, y0: number, z: number, r: number, h: number): Vec {
  const turn = rand() * Math.PI * 2;
  if (rand() < h / (h + r / 2)) return [x + Math.cos(turn) * r, y0 + rand() * h, z + Math.sin(turn) * r];
  const d = Math.sqrt(rand()) * r;
  return [x + Math.cos(turn) * d, y0 + h, z + Math.sin(turn) * d];
}

/**
 * IoT Intelligence, "into the physical world": an industrial robot arm on its turret, reaching over a conveyor to pick
 * up a box, on a faint ring of floor. Standing on y = 0, its reach along +x; within radius 1.
 */
export function armForm(count: number, rand: Rand): Float32Array {
  const shift = -0.085; // centres it across its width
  const S: Vec = [-0.42, 0.3, 0]; // shoulder
  const E: Vec = [-0.2, 0.86, 0]; // elbow
  const W: Vec = [0.3, 0.66, 0]; // wrist
  const G: Vec = [0.34, 0.48, 0]; // the gripper's plate
  const box: number[] = [0, 0, 0];
  // each part with its share of the points: the arm's long links and the belt carry the silhouette
  const parts: [number, () => Vec][] = [
    [0.1, () => onDrum(rand, -0.42, 0, 0, 0.2, 0.08)],
    [0.06, () => onDrum(rand, -0.42, 0.08, 0, 0.12, 0.14)],
    [0.05, () => onSphere(rand, S, 0.1)],
    [0.17, () => onTube(rand, S, E, 0.065)],
    [0.05, () => onSphere(rand, E, 0.08)],
    [0.13, () => onTube(rand, E, W, 0.05)],
    [0.03, () => onSphere(rand, W, 0.055)],
    [0.03, () => onTube(rand, W, G, 0.035)],
    [
      0.05,
      () => {
        // two fingers, open round the box below
        const side = rand() < 0.5 ? -1 : 1;
        if (rand() < 0.3) return (onBox(rand, 0.12, 0.02, 0.16, box), [G[0] + box[0], G[1] + box[1], box[2]]);
        return onTube(rand, [G[0], G[1], side * 0.06], [G[0], G[1] - 0.12, side * 0.075], 0.014);
      },
    ],
    [
      0.18,
      () => {
        // the belt, its edges drawn bright
        if (rand() < 0.5) onBoxEdge(rand, 0.74, 0.04, 0.3, box);
        else onBox(rand, 0.74, 0.04, 0.3, box);
        return [0.38 + box[0], 0.12 + box[1], box[2]];
      },
    ],
    [
      0.04,
      () => {
        // a roller at each end of the belt, across it
        const x = rand() < 0.5 ? 0.01 : 0.75;
        return onTube(rand, [x, 0.1, -0.16], [x, 0.1, 0.16], 0.04);
      },
    ],
    [
      0.06,
      () => {
        // the box being picked up, under the gripper
        if (rand() < 0.6) onBoxEdge(rand, 0.13, 0.13, 0.13, box);
        else onBox(rand, 0.13, 0.13, 0.13, box);
        return [0.34 + box[0], 0.205 + box[1], box[2]];
      },
    ],
    [
      0.05,
      () => {
        // a faint ring on the floor, round the whole cell
        const turn = rand() * Math.PI * 2;
        const r = 0.84 + (rand() - 0.5) * 0.02;
        return [Math.cos(turn) * r - shift, 0, Math.sin(turn) * r];
      },
    ],
  ];
  const total = parts.reduce((a, [w]) => a + w, 0);
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    let pick = rand() * total;
    let k = 0;
    while (k < parts.length - 1 && pick > parts[k][0]) pick -= parts[k++][0];
    const p = parts[k][1]();
    out.set([p[0] + shift, Math.max(0, p[1]), p[2]], i * 3);
  }
  return out;
}

/** Defense Intelligence: the hex force field, a hemisphere of radius 1 on the ground, round a vault at its heart. */
export function domeForm(count: number, rand: Rand): Float32Array {
  // how far a point is from its hex cell's centre (0.5 on the cell's edge), cells laid out as the home dome's shader
  // lays them, by longitude and latitude
  const hexDist = (x: number, y: number) => Math.max(Math.abs(x) * 0.5 + Math.abs(y) * 0.866, Math.abs(x));
  const wrap = (x: number, m: number) => ((x % m) + m) % m;
  const hexEdge = (u: number, v: number) =>
    Math.min(hexDist(wrap(u, 1) - 0.5, wrap(v, 1.732) - 0.866), hexDist(wrap(u - 0.5, 1) - 0.5, wrap(v - 0.866, 1.732) - 0.866));
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; ) {
    if (rand() < 0.14) {
      // the vault: an octahedron's surface, standing on the ground
      const a = rand() * 2 - 1;
      const b = (rand() * 2 - 1) * (1 - Math.abs(a));
      const c = (1 - Math.abs(a) - Math.abs(b)) * (rand() < 0.5 ? -1 : 1);
      out.set([a * 0.24, 0.26 + b * 0.24, c * 0.24], i * 3);
      i++;
      continue;
    }
    // the shell: an even spread over the upper hemisphere, kept densely on the hex lines
    const y = rand();
    const lon = rand() * Math.PI * 2;
    const ring = Math.sqrt(1 - y * y);
    const onLine = hexEdge(lon * 1.9, Math.asin(y) * 2.2) > 0.41;
    if (!onLine && rand() > 0.12) continue;
    out.set([Math.cos(lon) * ring, y, Math.sin(lon) * ring], i * 3);
    i++;
  }
  return out;
}

/** Miniature Intelligence: the phone, upright, its outline drawn bright and its screen a grid of pixels. */
export function phoneForm(count: number, rand: Rand): Float32Array {
  // the home phone (0.88 × 1.76 × 0.08) already fits within radius 1
  const w = 0.88;
  const h = 1.76;
  const d = 0.08;
  const corner = 0.1;
  const cols = 13;
  const rows = 26;
  const screen = { w: 0.78, h: 1.62 };
  const sw = w - 2 * corner;
  const sh = h - 2 * corner;
  const arc = (Math.PI / 2) * corner;
  const quarter = (u: number) => [Math.sin((u * Math.PI) / 2), Math.cos((u * Math.PI) / 2)];
  // the rounded outline, as runs of length with a point at u (0–1) along each
  const runs: [number, (u: number) => [number, number]][] = [
    [sw, (u) => [-sw / 2 + u * sw, h / 2]],
    [arc, (u) => [sw / 2 + corner * quarter(u)[0], sh / 2 + corner * quarter(u)[1]]],
    [sh, (u) => [w / 2, sh / 2 - u * sh]],
    [arc, (u) => [sw / 2 + corner * quarter(u)[1], -sh / 2 - corner * quarter(u)[0]]],
    [sw, (u) => [sw / 2 - u * sw, -h / 2]],
    [arc, (u) => [-sw / 2 - corner * quarter(u)[0], -sh / 2 - corner * quarter(u)[1]]],
    [sh, (u) => [-w / 2, -sh / 2 + u * sh]],
    [arc, (u) => [-sw / 2 - corner * quarter(u)[1], sh / 2 + corner * quarter(u)[0]]],
  ];
  const perimeter = runs.reduce((a, [len]) => a + len, 0);
  const outline = (t: number): [number, number] => {
    let s = t * perimeter;
    for (const [len, at] of runs) {
      if (s <= len) return at(s / len);
      s -= len;
    }
    return runs[0][1](0);
  };
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = rand();
    if (r < 0.35) {
      const [x, y] = outline(rand());
      out.set([x, y, (rand() < 0.5 ? -0.5 : 0.5) * d], i * 3);
    } else if (r < 0.85) {
      // a pixel of the screen: a small cluster at one grid cell
      const cx = (Math.floor(rand() * cols) + 0.5) / cols - 0.5;
      const cy = (Math.floor(rand() * rows) + 0.5) / rows - 0.5;
      out.set([(cx + ((rand() - 0.5) * 0.32) / cols) * screen.w, (cy + ((rand() - 0.5) * 0.32) / rows) * screen.h, d / 2 + 0.005], i * 3);
    } else {
      // the back, faint
      out.set([(rand() - 0.5) * (w - corner), (rand() - 0.5) * (h - corner), -d / 2], i * 3);
    }
  }
  return out;
}
