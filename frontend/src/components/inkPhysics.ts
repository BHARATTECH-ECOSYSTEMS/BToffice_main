/**
 * Sticky ink strands for the Finale's two buttons (InkStrands.tsx draws them; tests/site/inkStrands.test.ts).
 * When the cursor leaves a button, a bundle of thin strands of the button's own colour stays stuck to the edge it
 * left by and follows a drawn hand, thinning as it stretches. Past its reach, or when the cursor goes back in, the
 * strands spring home; snapping also lets a few drops fall. Coordinates are in the section's own pixels.
 */

export type Pill = { x: number; y: number; w: number; h: number };

export const STRANDS = {
  count: 9,
  /** how far the bundle stretches from the edge before it snaps, px */
  reach: 210,
  /** the button's lean toward the cursor, degrees (owner's 5A) */
  maxLean: 6,
  // a spring with ~12% overshoot: the strands land like gum, not like a ruler
  stiffness: 300,
  damping: 19,
  /** drops falling after a snap, px/s² */
  gravity: 1400,
  dripLife: 0.7,
};

export interface Strand {
  /** where it sticks to the button */
  ax: number;
  ay: number;
  /** its free end, and that end's speed */
  ex: number;
  ey: number;
  vx: number;
  vy: number;
  /** where on the hand it is held, from the hand's grip point */
  ox: number;
  oy: number;
  /** its own wobble, so the bundle doesn't move as one */
  phase: number;
  /** its own thickness, so the bundle reads as ink rather than thread */
  weight: number;
}
export interface Drip {
  x: number;
  y: number;
  vy: number;
  r: number;
  life: number;
}
export interface Bundle {
  strands: Strand[];
  drips: Drip[];
  attached: boolean;
  /** the edge point it was pulled from, for the reach */
  px: number;
  py: number;
  /** the hand */
  hx: number;
  hy: number;
  age: number;
  random: () => number;
}

export const strandsAllowed = ({ finePointer, reducedMotion }: { finePointer: boolean; reducedMotion: boolean }) => finePointer && !reducedMotion;

/** The closest point of the pill's outline to (px, py), and the outward direction there. A pill is a line segment
 *  (between the centres of its two rounded ends) grown by half its height, so the nearest point lies half a height
 *  out from the nearest point of that segment. */
export function nearestOnPill(p: Pill, px: number, py: number) {
  const r = p.h / 2;
  const cy = p.y + r;
  const qx = Math.min(Math.max(px, p.x + r), p.x + p.w - r);
  const dx = px - qx;
  const dy = py - cy;
  const d = Math.hypot(dx, dy);
  const nx = d ? dx / d : 0;
  const ny = d ? dy / d : -1;
  return { x: qx + nx * r, y: cy + ny * r, nx, ny };
}

/** Line width: full at rest, thinner as the strand stretches, never below a hairline. */
export const strandWidth = (length: number) => Math.max(0.7, 4.2 * Math.pow(40 / (40 + Math.max(0, length)), 0.8));

// a small seeded generator, so a bundle's spread is the same every run of the tests
function seeded(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function startBundle(p: Pill, exitX: number, exitY: number, seed: number): Bundle {
  const random = seeded(seed);
  const edge = nearestOnPill(p, exitX, exitY);
  // spread along the edge (its tangent), then back onto the outline
  const tx = -edge.ny;
  const ty = edge.nx;
  const spread = p.h * 0.7;
  const strands: Strand[] = [];
  for (let i = 0; i < STRANDS.count; i++) {
    const along = (i / (STRANDS.count - 1) - 0.5) * spread + (random() - 0.5) * 4;
    const a = nearestOnPill(p, edge.x + tx * along + edge.nx, edge.y + ty * along + edge.ny);
    const grip = random() * Math.PI * 2;
    const held = 2 + random() * 4;
    strands.push({ ax: a.x, ay: a.y, ex: a.x, ey: a.y, vx: 0, vy: 0, ox: Math.cos(grip) * held, oy: Math.sin(grip) * held, phase: random() * Math.PI * 2, weight: 0.55 + random() * 0.9 });
  }
  return { strands, drips: [], attached: true, px: edge.x, py: edge.y, hx: edge.x, hy: edge.y, age: 0, random };
}

/** The hand moved: the strands follow it, or snap once it is past their reach. */
export function pullBundle(b: Bundle, x: number, y: number) {
  if (!b.attached) return;
  b.hx = x;
  b.hy = y;
  if (Math.hypot(x - b.px, y - b.py) > STRANDS.reach) releaseBundle(b, true);
}

/** Let go: home to the anchors, with drops falling from the middle of a few strands when it snapped. */
export function releaseBundle(b: Bundle, drip: boolean) {
  b.attached = false;
  if (!drip) return;
  const drops = 2 + Math.floor(b.random() * 2);
  for (let i = 0; i < drops; i++) {
    const s = b.strands[Math.floor(b.random() * b.strands.length)];
    const t = 0.35 + b.random() * 0.35;
    b.drips.push({
      x: s.ax + (s.ex - s.ax) * t,
      y: s.ay + (s.ey - s.ay) * t,
      vy: 40 + b.random() * 80,
      r: 1.6 + b.random() * 1.2,
      life: STRANDS.dripLife,
    });
  }
}

/** One step of a damped spring (semi-implicit Euler, steady at 60 fps). */
export function springStep(s: { x: number; v: number }, target: number, dt: number, stiffness: number, damping: number) {
  const v = s.v + (stiffness * (target - s.x) - damping * s.v) * dt;
  return { x: s.x + v * dt, v };
}

export function stepBundle(b: Bundle, dt: number) {
  b.age += dt;
  for (const s of b.strands) {
    const tx = b.attached ? b.hx + s.ox : s.ax;
    const ty = b.attached ? b.hy + s.oy : s.ay;
    const x = springStep({ x: s.ex, v: s.vx }, tx, dt, STRANDS.stiffness, STRANDS.damping);
    const y = springStep({ x: s.ey, v: s.vy }, ty, dt, STRANDS.stiffness, STRANDS.damping);
    s.ex = x.x;
    s.vx = x.v;
    s.ey = y.x;
    s.vy = y.v;
  }
  for (const d of b.drips) {
    d.vy += STRANDS.gravity * dt;
    d.y += d.vy * dt;
    d.life -= dt;
  }
  b.drips = b.drips.filter((d) => d.life > 0);
}

export const bundleDone = (b: Bundle) =>
  !b.attached && !b.drips.length && b.strands.every((s) => Math.hypot(s.ex - s.ax, s.ey - s.ay) < 0.5 && Math.hypot(s.vx, s.vy) < 5);

/** A strand as a curve: the control point sags under its own weight and wobbles a little. */
export function strandCurve(b: Bundle, s: Strand) {
  const dx = s.ex - s.ax;
  const dy = s.ey - s.ay;
  const length = Math.hypot(dx, dy);
  const wobble = Math.sin(b.age * 3 + s.phase) * length * 0.05;
  const nx = length ? -dy / length : 0;
  const ny = length ? dx / length : 0;
  return {
    cx: s.ax + dx / 2 + nx * wobble,
    cy: s.ay + dy / 2 + ny * wobble + length * (b.attached ? 0.16 : 0.08),
    width: strandWidth(length) * s.weight,
    length,
  };
}

/** The channels of an rgb()/rgba() colour, in either comma or space syntax; alpha 1 when it has none. */
const channels = (css: string) => {
  const parts = /rgba?\(([^)]*)\)/.exec(css)?.[1].split(/[\s,/]+/).filter(Boolean).map(Number) ?? [];
  return { r: parts[0] ?? 0, g: parts[1] ?? 0, b: parts[2] ?? 0, a: parts.length > 3 ? parts[3] : 1 };
};
const SOLID = 0.9;

/**
 * The button's own fill, the strands' colour (owner: "keep the original colour only"). A see-through fill (the
 * outlined button) is mixed over the section's background, so the strands match what the button looks like.
 */
export function strandColour({ background, page }: { background: string; page: string }) {
  const f = channels(background);
  if (f.a >= SOLID) return background;
  const p = channels(page);
  const mix = (top: number, under: number) => Math.round(under + (top - under) * f.a);
  return `rgb(${mix(f.r, p.r)}, ${mix(f.g, p.g)}, ${mix(f.b, p.b)})`;
}

/** A see-through button's outline (its inset ring), drawn along its strands so they read as that button; null for a
 *  solid button, whose shadow is not an outline. */
export function strandEdge({ background, boxShadow }: { background: string; boxShadow: string }) {
  if (channels(background).a >= SOLID || !/\binset\b/.test(boxShadow)) return null;
  return /rgba?\([^)]*\)/.exec(boxShadow)?.[0] ?? null;
}

/**
 * How far the button leans, in degrees about its x and y axes: the side nearest the cursor comes toward the viewer.
 * Hovering, by where the cursor is on the button; pulling (`pull` 0–1, how stretched), toward the hand.
 */
export function leanFor(p: Pill, px: number, py: number, pull?: number) {
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  let ux: number;
  let uy: number;
  let amount: number;
  if (pull === undefined) {
    ux = Math.min(Math.max((px - cx) / (p.w / 2), -1), 1);
    uy = Math.min(Math.max((py - cy) / (p.h / 2), -1), 1);
    amount = 1;
  } else {
    const d = Math.hypot(px - cx, py - cy) || 1;
    ux = (px - cx) / d;
    uy = (py - cy) / d;
    amount = Math.min(Math.max(pull, 0), 1);
  }
  let ry = ux * STRANDS.maxLean * amount;
  let rx = -uy * STRANDS.maxLean * amount;
  const angle = Math.hypot(rx, ry);
  if (angle > STRANDS.maxLean) {
    rx *= STRANDS.maxLean / angle;
    ry *= STRANDS.maxLean / angle;
  }
  return { rx, ry };
}
