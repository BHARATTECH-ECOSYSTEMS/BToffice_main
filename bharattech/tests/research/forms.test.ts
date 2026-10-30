import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { fieldForm, globeForm, skyForm, surfaceForm } from '../../src/gl/research/forms';
import { seeded } from '../../src/gl/worlds/kit';
import { CONTINENTS, INDIA, inPolygon, type LonLat } from '../../src/gl/geo';

const D2R = Math.PI / 180;
/** the inverse of lonLatToVec (centre 80°E 21°N facing +z) */
function toLonLat(x: number, y2: number, z2: number): LonLat {
  const r = Math.hypot(x, y2, z2);
  const t = 21 * D2R;
  const y = (y2 * Math.cos(t) + z2 * Math.sin(t)) / r;
  const z = (-y2 * Math.sin(t) + z2 * Math.cos(t)) / r;
  return [Math.atan2(x / r, z) / D2R + 80, Math.asin(y) / D2R];
}
const each = (a: Float32Array, fn: (x: number, y: number, z: number) => void) => {
  for (let i = 0; i < a.length; i += 3) fn(a[i], a[i + 1], a[i + 2]);
};

test('globeForm lies on the unit sphere', () => {
  const g = globeForm(5000, seeded(1));
  assert.equal(g.length, 15000);
  each(g, (x, y, z) => {
    const r = Math.hypot(x, y, z);
    assert.ok(r >= 0.98 && r <= 1.02, `radius ${r}`);
  });
});

test('globeForm draws mostly land, with India facing the viewer', () => {
  const g = globeForm(5000, seeded(1));
  let land = 0;
  let india = 0;
  let indiaZ = 0;
  each(g, (x, y, z) => {
    const ll = toLonLat(x, y, z);
    if (CONTINENTS.some((poly) => inPolygon(ll, poly))) land++;
    if (inPolygon(ll, INDIA)) (india++, (indiaZ += z / Math.hypot(x, y, z)));
  });
  assert.ok(land / 5000 >= 0.7, `land share ${land / 5000}`);
  assert.ok(india > 50, `India points ${india}`);
  assert.ok(indiaZ / india > 0.5, `India mean z ${indiaZ / india}`);
});

test('fieldForm stays within its spread', () => {
  const f = fieldForm(2000, seeded(2), 3);
  assert.equal(f.length, 6000);
  each(f, (x, y, z) => assert.ok(Math.abs(x) <= 3 && Math.abs(y) <= 3 && Math.abs(z) <= 3));
});

// "our research": seen from 6.2 in front, a little above, through a 30° lens, on windows up to 2.2 times as wide as tall
const SKY = { eye: [0, 0.43, 6.2] as [number, number, number], tanY: Math.tan(15 * D2R), tanX: Math.tan(15 * D2R) * 2.2, near: 2.2, far: 14 };
/** a point's place in the view from SKY.eye looking at the origin: depth along the view, and x/y over tan × depth */
function inView(x: number, y: number, z: number) {
  const eye = new THREE.Vector3(...SKY.eye);
  const forward = eye.clone().negate().normalize();
  const right = forward.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
  const up = right.clone().cross(forward);
  const rel = new THREE.Vector3(x, y, z).sub(eye);
  const depth = rel.dot(forward);
  return { depth, sx: rel.dot(right) / depth, sy: rel.dot(up) / depth };
}

test('skyForm fills the view between its near and far depths', () => {
  const f = skyForm(4000, seeded(3), SKY);
  assert.equal(f.length, 12000);
  each(f, (x, y, z) => {
    const { depth, sx, sy } = inView(x, y, z);
    assert.ok(depth >= SKY.near - 1e-6 && depth <= SKY.far + 1e-6, `depth ${depth}`);
    assert.ok(Math.abs(sx) <= SKY.tanX * 1.1 && Math.abs(sy) <= SKY.tanY * 1.1, `off the view: ${sx}, ${sy}`);
  });
});

test('skyForm spreads over the whole screen: every part of a 16:9 window holds dots', () => {
  const f = skyForm(6000, seeded(3), SKY);
  const cells = new Array(16).fill(0);
  let shown = 0;
  each(f, (x, y, z) => {
    const { sx, sy } = inView(x, y, z);
    const u = sx / (SKY.tanY * 16 / 9);
    const v = sy / SKY.tanY;
    if (Math.abs(u) >= 1 || Math.abs(v) >= 1) return;
    shown++;
    cells[Math.floor((u + 1) * 2) * 4 + Math.floor((v + 1) * 2)]++;
  });
  cells.forEach((n, i) => assert.ok(n / shown >= 0.025, `cell ${i} holds ${((100 * n) / shown).toFixed(1)}%`));
});

test('surfaceForm samples a geometry\'s surface, centred on its bounding box', () => {
  const box = new THREE.BoxGeometry(2, 1, 1);
  box.translate(5, 5, 5);
  const s = surfaceForm(box, 1000, seeded(3));
  const bb = new THREE.Box3().setFromArray(s);
  for (const [got, want] of [[bb.min.x, -1], [bb.max.x, 1], [bb.min.y, -0.5], [bb.max.y, 0.5], [bb.min.z, -0.5], [bb.max.z, 0.5]])
    assert.ok(Math.abs(got - want) < 0.01, `${got} vs ${want}`);
});

test('the same seed gives the same form', () => {
  assert.deepEqual(globeForm(500, seeded(9)), globeForm(500, seeded(9)));
  assert.deepEqual(fieldForm(500, seeded(9), 2), fieldForm(500, seeded(9), 2));
  assert.deepEqual(skyForm(500, seeded(9), SKY), skyForm(500, seeded(9), SKY));
  assert.deepEqual(surfaceForm(new THREE.BoxGeometry(), 500, seeded(9)), surfaceForm(new THREE.BoxGeometry(), 500, seeded(9)));
});
