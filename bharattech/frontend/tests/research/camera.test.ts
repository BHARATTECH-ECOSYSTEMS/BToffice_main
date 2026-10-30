import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { FOV, LAST, sideOf, stopCentre, storyPath } from '../../src/gl/research/path';

const hero = { width: 2.7, letter: [0.31, 0.12, 0] as [number, number, number] };
const poseAt = storyPath(hero);
const ASPECTS = [16 / 9, 16 / 10, 1100 / 720];

/** where a stop's form centre lands across the screen (−1 left … 1 right) from a pose */
function screenX(s: number, aspect: number, k: number) {
  const pose = poseAt(s, aspect, 0);
  const cam = new THREE.PerspectiveCamera(FOV, aspect, 0.05, 200);
  cam.position.set(...pose.pos);
  cam.lookAt(new THREE.Vector3(...pose.look));
  cam.rotateZ(THREE.MathUtils.degToRad(pose.roll));
  cam.updateMatrixWorld();
  return new THREE.Vector3(...stopCentre(k)).project(cam).x;
}

test('sideOf: hero, our research and the end stay centred; the domains alternate, the first form on the right', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(sideOf), [0, 0, 1, -1, 1, -1, 1, -1, 0, 0]);
});

test('poseAt is deterministic', () => {
  assert.deepEqual(poseAt(3.37, 16 / 9, 0.05), poseAt(3.37, 16 / 9, 0.05));
});

test('at each domain stop the form sits in the screen half sideOf gives it', () => {
  for (const aspect of ASPECTS)
    for (let k = 2; k <= 7; k++) {
      const x = screenX(k, aspect, k);
      assert.ok(Math.sign(x) === sideOf(k) && Math.abs(x) > 0.15, `stop ${k} aspect ${aspect.toFixed(2)}: x ${x.toFixed(2)}`);
    }
});

test('a whole form stays clear of the copy column, even on narrow or tall desktop windows', () => {
  // The copy column ends 47% of the way across (research.css: 5vw gutter + 42vw column at ≤1150px), so on the
  // screen's −1…1 scale the form's near edge must stay past ∓0.06. A unit sphere round the form's centre encloses
  // every form (forms.test checks radius ≤ 1).
  const COPY_EDGE = 0.06;
  const sphere = Array.from({ length: 400 }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / 400;
    const r = Math.sqrt(1 - y * y);
    const a = i * 2.39996;
    return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
  });
  for (const [w, h] of [[1440, 900], [1280, 720], [1100, 900], [960, 1032], [901, 720]])
    for (let k = 2; k <= 7; k++)
      for (const orbit of [-0.09, 0, 0.09]) {
        const pose = poseAt(k, w / h, orbit);
        const cam = new THREE.PerspectiveCamera(FOV, w / h, 0.05, 200);
        cam.position.set(...pose.pos);
        cam.lookAt(new THREE.Vector3(...pose.look));
        cam.rotateZ(THREE.MathUtils.degToRad(pose.roll));
        cam.updateMatrixWorld();
        const xs = sphere.map((p) => p.clone().add(new THREE.Vector3(...stopCentre(k))).project(cam).x);
        const nearEdge = sideOf(k) > 0 ? Math.min(...xs) : -Math.max(...xs);
        assert.ok(nearEdge >= -COPY_EDGE, `${w}×${h} stop ${k} orbit ${orbit}: form reaches ${nearEdge.toFixed(2)} into the copy`);
      }
});

test('halfway between two stops the camera is inside the form it is diving through', () => {
  for (let k = 1; k < LAST; k++) {
    const { pos } = poseAt(k + 0.5, 16 / 9, 0);
    const d = new THREE.Vector3(...pos).distanceTo(new THREE.Vector3(...stopCentre(k)));
    assert.ok(d < 0.6, `stop ${k}: ${d.toFixed(2)} from its centre`);
  }
});

test('the camera never jumps: small scroll steps move it a little', () => {
  let last = new THREE.Vector3(...poseAt(0, 16 / 9, 0).pos);
  for (let s = 0.01; s <= LAST; s += 0.01) {
    const now = new THREE.Vector3(...poseAt(s, 16 / 9, 0.08).pos);
    assert.ok(now.distanceTo(last) < 0.5, `jump of ${now.distanceTo(last).toFixed(2)} at s ${s.toFixed(2)}`);
    last = now;
  }
});

test('the frame never leans more than 6 degrees', () => {
  for (let s = 0; s <= LAST; s += 0.05) assert.ok(Math.abs(poseAt(s, 16 / 9, 0.1).roll) <= 6, `roll at ${s}`);
});
