import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STRANDS,
  bundleDone,
  leanFor,
  nearestOnPill,
  pullBundle,
  releaseBundle,
  springStep,
  startBundle,
  stepBundle,
  strandColour,
  strandEdge,
  strandWidth,
  strandsAllowed,
  type Pill,
} from '../../src/components/inkPhysics';

// The Finale's two buttons pull out sticky strands of their own colour when the cursor leaves them (owner's
// 1A 2A 3A 4A 5A, 2026-10-25; from a reference reel): strands follow a drawn hand, thin as they stretch, snap
// back with drips past their reach, and the button leans a little toward the cursor.

const PILL: Pill = { x: 100, y: 100, w: 220, h: 54 };
const near = (a: number, b: number, eps = 0.5) => Math.abs(a - b) <= eps;
const run = (b: ReturnType<typeof startBundle>, seconds: number) => {
  for (let t = 0; t < seconds; t += 1 / 60) stepBundle(b, 1 / 60);
};

test('only a mouse-like pointer, and never with reduced motion', () => {
  assert.equal(strandsAllowed({ finePointer: true, reducedMotion: false }), true);
  assert.equal(strandsAllowed({ finePointer: false, reducedMotion: false }), false);
  assert.equal(strandsAllowed({ finePointer: true, reducedMotion: true }), false);
});

test('the nearest point on the pill sits on its outline, with the outward direction', () => {
  const right = nearestOnPill(PILL, 400, 127);
  assert.ok(near(right.x, 320) && near(right.y, 127));
  assert.ok(near(right.nx, 1, 0.01) && near(right.ny, 0, 0.01));
  const top = nearestOnPill(PILL, 210, 20);
  assert.ok(near(top.x, 210) && near(top.y, 100));
  assert.ok(near(top.ny, -1, 0.01));
  // a corner lands on the rounded end, at the end's radius from its centre
  const corner = nearestOnPill(PILL, 360, 60);
  assert.ok(near(Math.hypot(corner.x - 293, corner.y - 127), 27, 0.6));
});

test('strands thin out as they stretch, never vanishing', () => {
  assert.ok(strandWidth(0) > strandWidth(80));
  assert.ok(strandWidth(80) > strandWidth(STRANDS.reach));
  assert.ok(strandWidth(10_000) >= 0.5);
});

test('a bundle starts at the exit point, its anchors spread along the edge', () => {
  const b = startBundle(PILL, 320, 127, 1);
  assert.equal(b.strands.length, STRANDS.count);
  assert.equal(b.attached, true);
  for (const s of b.strands) {
    assert.ok(Math.abs(s.ay - 127) <= PILL.h * 0.45, 'anchor near the exit point');
    assert.ok(near(s.ex, s.ax, 0.01) && near(s.ey, s.ay, 0.01), 'starts with no length');
    assert.ok(near(Math.hypot(s.ax - 293, s.ay - 127), 27, 0.6), 'anchored on the rounded end');
  }
});

test('pulled within reach the strands follow the hand; past it they snap with drips', () => {
  const b = startBundle(PILL, 320, 127, 2);
  pullBundle(b, 420, 150);
  run(b, 0.6);
  assert.equal(b.attached, true);
  for (const s of b.strands) assert.ok(Math.hypot(s.ex - 420, s.ey - 150) < 14, 'gathered at the hand');
  pullBundle(b, 320 + STRANDS.reach + 40, 140);
  assert.equal(b.attached, false);
  assert.ok(b.drips.length > 0);
});

test('released strands spring home, the drips fall away, and the bundle ends', () => {
  const b = startBundle(PILL, 320, 127, 3);
  pullBundle(b, 470, 170);
  run(b, 0.5);
  releaseBundle(b, true);
  run(b, 2);
  for (const s of b.strands) {
    assert.ok(Number.isFinite(s.ex) && Number.isFinite(s.ey));
    assert.ok(Math.hypot(s.ex - s.ax, s.ey - s.ay) < 0.5, 'back at its anchor');
  }
  assert.equal(b.drips.length, 0);
  assert.equal(bundleDone(b), true);
});

test('going back into the button pulls the strands in without drips', () => {
  const b = startBundle(PILL, 320, 127, 4);
  pullBundle(b, 400, 130);
  run(b, 0.3);
  releaseBundle(b, false);
  assert.equal(b.drips.length, 0);
  assert.equal(bundleDone(b), false, 'still has to retract');
});

test('the spring settles on its target with a small overshoot at most', () => {
  let s = { x: 0, v: 0 };
  let peak = 0;
  for (let i = 0; i < 120; i++) {
    s = springStep(s, 100, 1 / 60, STRANDS.stiffness, STRANDS.damping);
    peak = Math.max(peak, s.x);
  }
  assert.ok(near(s.x, 100, 0.5));
  assert.ok(peak <= 115, `overshoot ${peak}`);
});

// Owner, 2026-10-25: "keep the original colour only" = each button's own fill, never its text colour
test('strands take the button’s own fill, a see-through fill as it looks over the section', () => {
  assert.equal(strandColour({ background: 'rgb(20, 19, 15)', page: 'rgb(250, 249, 246)' }), 'rgb(20, 19, 15)');
  assert.equal(strandColour({ background: 'rgba(255, 255, 255, 0.08)', page: 'rgb(12, 11, 18)' }), 'rgb(31, 31, 37)');
  assert.equal(strandColour({ background: 'rgb(255 253 249 / 0.7)', page: 'rgb(250, 249, 246)' }), 'rgb(254, 252, 248)');
});

test('a see-through button’s outline runs along its strands; a solid button has none', () => {
  assert.equal(strandEdge({ background: 'rgba(255, 255, 255, 0.08)', boxShadow: 'rgba(255, 255, 255, 0.16) 0px 0px 0px 1px inset' }), 'rgba(255, 255, 255, 0.16)');
  assert.equal(strandEdge({ background: 'rgb(250, 249, 246)', boxShadow: 'rgba(110, 88, 245, 0.45) 0px 10px 25px -8px' }), null);
  // a solid button keeps its strands plain even when it has a ring of its own
  assert.equal(strandEdge({ background: 'rgb(20, 19, 15)', boxShadow: 'rgba(255, 255, 255, 0.2) 0px 0px 0px 1px inset' }), null);
  assert.equal(strandEdge({ background: 'rgba(255, 255, 255, 0.08)', boxShadow: 'none' }), null);
});

test('the lean stays within 6°, zero at the centre, leaning toward a pull', () => {
  const centre = leanFor(PILL, 210, 127);
  assert.ok(near(centre.rx, 0, 0.01) && near(centre.ry, 0, 0.01));
  const corner = leanFor(PILL, 320, 154);
  const angle = Math.hypot(corner.rx, corner.ry);
  assert.ok(angle > 1 && angle <= STRANDS.maxLean + 1e-9);
  const pulled = leanFor(PILL, 600, 127, 1);
  assert.ok(near(Math.hypot(pulled.rx, pulled.ry), STRANDS.maxLean, 0.01));
  assert.ok(pulled.ry > 0, 'a pull to the right turns the right edge toward the viewer');
});

test('the Finale wires the strands and hides the cursor only while pulling, on mouse-like pointers', () => {
  const finale = readFileSync('src/sections/Finale.tsx', 'utf8');
  assert.match(finale, /<InkStrands\b/);
  const css = readFileSync('src/styles/film.css', 'utf8');
  const at = css.indexOf('[data-pulling]');
  assert.ok(at > 0, 'a [data-pulling] rule');
  const gate = css.lastIndexOf('@media (hover: hover) and (pointer: fine)', at);
  assert.ok(gate > 0 && css.slice(gate, at).split('}').length <= 2, 'inside the fine-pointer gate');
  assert.match(css.slice(at, at + 120), /cursor:\s*none/);
});
