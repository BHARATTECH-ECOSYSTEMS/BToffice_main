import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armForm, cubeForm, domeForm, phoneForm, slabForm } from '../../src/gl/research/forms';
import { seeded } from '../../src/gl/worlds/kit';

const N = 4000;
const pointsOf = (a: Float32Array) => Array.from({ length: a.length / 3 }, (_, i) => [a[i * 3], a[i * 3 + 1], a[i * 3 + 2]] as const);
const extent = (a: Float32Array, axis: 0 | 1 | 2) => {
  const v = pointsOf(a).map((p) => p[axis]);
  return Math.max(...v) - Math.min(...v);
};
const share = (a: Float32Array, keep: (p: readonly [number, number, number]) => boolean) => pointsOf(a).filter(keep).length / (a.length / 3);

for (const [name, form] of Object.entries({ cubeForm, slabForm, armForm, domeForm, phoneForm })) {
  test(`${name} has one point per slot, fits within radius 1 and is the same for the same seed`, () => {
    const a = form(N, seeded(5));
    assert.equal(a.length, N * 3);
    for (const [x, y, z] of pointsOf(a)) assert.ok(Math.hypot(x, y, z) <= 1.02, `${name} radius ${Math.hypot(x, y, z)}`);
    assert.deepEqual(a, form(N, seeded(5)));
  });
}

test('cubeForm is a cube whose edges are drawn densely', () => {
  const a = cubeForm(N, seeded(1));
  const h = Math.max(...pointsOf(a).map((p) => Math.max(...p.map(Math.abs))));
  const onEdge = share(a, (p) => p.filter((c) => Math.abs(Math.abs(c) - h) < 0.03).length >= 2);
  assert.ok(onEdge >= 0.4, `edge share ${onEdge}`);
});

test('slabForm is flat: its height is at most 0.35 of its width', () => {
  const a = slabForm(N, seeded(2));
  assert.ok(extent(a, 1) <= 0.35 * extent(a, 0), `${extent(a, 1)} vs ${extent(a, 0)}`);
});

test('armForm is a robot arm standing on the ground, reaching over a low conveyor', () => {
  const a = armForm(N, seeded(3));
  for (const [, y] of pointsOf(a)) assert.ok(y >= -0.02, `y ${y}`);
  // it rises well above its base (the elbow up high) …
  const top = Math.max(...pointsOf(a).map((p) => p[1]));
  assert.ok(top >= 0.75, `top ${top}`);
  // … and its conveyor is a low run of points out beyond the base, where the gripper reaches down
  const conveyor = share(a, ([x, y]) => y < 0.22 && x > 0.1);
  assert.ok(conveyor >= 0.12, `conveyor share ${conveyor}`);
  // the base is on the other side: low points near the left
  const base = share(a, ([x, y]) => y < 0.3 && x < -0.2);
  assert.ok(base >= 0.08, `base share ${base}`);
});

test('domeForm is a hemisphere on the ground, mostly on its shell', () => {
  const a = domeForm(N, seeded(4));
  for (const [, y] of pointsOf(a)) assert.ok(y >= -0.02, `y ${y}`);
  const shell = share(a, ([x, y, z]) => Math.abs(Math.hypot(x, y, z) - 1) < 0.05);
  assert.ok(shell >= 0.6, `shell share ${shell}`);
});

test('phoneForm is thin: its depth is at most 0.15 of its height', () => {
  const a = phoneForm(N, seeded(6));
  assert.ok(extent(a, 2) <= 0.15 * extent(a, 1), `${extent(a, 2)} vs ${extent(a, 1)}`);
  assert.ok(extent(a, 1) > extent(a, 0), 'taller than wide');
});
