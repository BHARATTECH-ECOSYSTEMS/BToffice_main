import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { easeOutBack, lerp, span } from '../ink';
import {
  BRAND,
  HUE,
  type DomainWorld,
  arrival,
  createContactShadow,
  createGrowingTube,
  createPointCloud,
  createStage,
  disposeScene,
  flat,
  lacquer,
  matte,
  seeded,
  setColor,
  setGroupOpacity,
  setXYZ,
} from './kit';

/**
 * 03 · IoT Intelligence — a living city of devices.
 * online: buildings rise from downtown outward and device roofs light up · fusion: sensor masts at the
 * crossroads ripple and stream readings to a hub · automation: shuttles run the streets with light trails ·
 * smart site: a colour wave rolls across the roofs and the hub links down to every device.
 */

const N = 11;
const PITCH = 0.28;
const ROADS = [3, 7];
const PLATE = 3.3;
/** Masts stand on three of the four crossroads. */
const MASTS: [number, number][] = [
  [3, 3],
  [7, 3],
  [7, 7],
];
const HUB = new THREE.Vector3(0, 1.35, 0);
const SHUTTLES = 12;
const TRAIL = 5;
const DOWNLINKS = 6;

const cellX = (c: number) => (c - (N - 1) / 2) * PITCH;
const isRoad = (r: number, c: number) => ROADS.includes(r) || ROADS.includes(c);

export function createIotGrid(): DomainWorld {
  const { scene, camera, rig, frame } = createStage(
    [
      { radius: 2.36, bottom: -0.5, top: 0.45 },
      { radius: 1.45, bottom: -0.5, top: 1.0 },
      { radius: 0.75, bottom: -0.5, top: 1.5 },
    ],
    0.56,
    30,
    new THREE.Vector3(0, -0.37, 0),
    1.15
  );
  const world = new THREE.Group();
  world.position.y = -0.4;
  scene.add(world);

  const shadow = createContactShadow(2.2, 0.18);
  shadow.position.y = -0.07;
  world.add(shadow);

  // Ground plate, streets and lane markings
  const plate = new THREE.Mesh(new RoundedBoxGeometry(PLATE, 0.06, PLATE, 3, 0.03), matte(HUE.paper, 0.8));
  plate.position.y = -0.03;
  world.add(plate);
  const streetMat = matte(HUE.mist.clone().lerp(HUE.paper, 0.55), 0.9);
  const streets = new THREE.Group();
  ROADS.forEach((road) => {
    const along = new THREE.Mesh(new THREE.BoxGeometry(PLATE - 0.12, 0.004, PITCH * 0.9), streetMat);
    along.position.set(0, 0.002, cellX(road));
    const across = new THREE.Mesh(new THREE.BoxGeometry(PITCH * 0.9, 0.004, PLATE - 0.12), streetMat);
    across.position.set(cellX(road), 0.002, 0);
    streets.add(along, across);
  });
  const dashes: number[] = [];
  ROADS.forEach((road) => {
    for (let d = -PLATE / 2 + 0.12; d < PLATE / 2 - 0.2; d += 0.16) {
      dashes.push(d, 0.006, cellX(road), d + 0.08, 0.006, cellX(road));
      dashes.push(cellX(road), 0.006, d, cellX(road), 0.006, d + 0.08);
    }
  });
  const dashGeo = new THREE.BufferGeometry();
  dashGeo.setAttribute('position', new THREE.Float32BufferAttribute(dashes, 3));
  streets.add(new THREE.LineSegments(dashGeo, new THREE.LineBasicMaterial({ color: HUE.paper, transparent: true, opacity: 0.95 })));
  world.add(streets);

  // Buildings
  const rnd = seeded(3);
  const cells: { x: number; z: number; base: number; dist: number; device: number }[] = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (isRoad(r, c)) continue;
      const x = cellX(c);
      const z = cellX(r);
      const dist = Math.hypot(x, z);
      // Taller downtown; roughly one building in five is a coloured device.
      const base = 0.16 + rnd() * 0.3 + Math.max(0, 0.75 - dist * 0.4);
      cells.push({ x, z, base, dist, device: rnd() < 0.2 ? Math.floor(rnd() * 3) : -1 });
    }
  }
  const maxDist = Math.max(...cells.map((c) => c.dist));
  const deviceCells = cells.map((c, i) => (c.device >= 0 ? i : -1)).filter((i) => i >= 0);

  const blocks = new THREE.InstancedMesh(new RoundedBoxGeometry(0.21, 1, 0.21, 2, 0.025), matte(HUE.mist.clone().lerp(HUE.paper, 0.2), 0.55), cells.length);
  blocks.geometry.translate(0, 0.5, 0);
  const roofs = new THREE.InstancedMesh(new RoundedBoxGeometry(0.22, 0.03, 0.22, 2, 0.012), lacquer(HUE.paper), cells.length);
  world.add(blocks, roofs);
  const leds = createPointCloud(cells.length);
  world.add(leds.points);

  // Sensor masts, their ripples and their readings
  const masts = MASTS.map(([r, c], i) => {
    const colour = BRAND[(i + 1) % 3];
    const group = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.026, 0.85, 12), lacquer(HUE.violet));
    pole.position.y = 0.425;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.065, 20, 14), lacquer(colour));
    head.position.y = 0.88;
    group.add(pole, head);
    const ripples = [0, 1, 2].map(() => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 56), flat(colour, 0.6));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.01;
      group.add(ring);
      return ring;
    });
    group.position.set(cellX(c), 0, cellX(r));
    world.add(group);
    const top = new THREE.Vector3(cellX(c), 0.88, cellX(r));
    const mid = top.clone().lerp(HUB, 0.5).add(new THREE.Vector3(0, 0.4, 0));
    const link = createGrowingTube(new THREE.QuadraticBezierCurve3(top, mid, HUB), 0.008, flat(colour, 0.8), 48);
    world.add(link.mesh);
    return { group, ripples, link, colour };
  });
  const readings = createPointCloud(MASTS.length * 5);
  world.add(readings.points);

  const hub = new THREE.Mesh(new THREE.OctahedronGeometry(0.17, 0), lacquer(HUE.violet));
  hub.position.copy(HUB);
  const hubRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.008, 8, 64), flat(HUE.violet, 0.6));
  hubRing.position.copy(HUB);
  hubRing.rotation.x = Math.PI / 2;
  world.add(hub, hubRing);

  // Downlinks from the hub to device buildings (last chapter); their ends follow the roofs.
  const downlinkCells = deviceCells.filter((_, k) => k % Math.max(1, Math.floor(deviceCells.length / DOWNLINKS)) === 0).slice(0, DOWNLINKS);
  const downlinks = createPointCloud(downlinkCells.length * 18);
  world.add(downlinks.points);

  // Shuttles with light trails
  const shuttles = new THREE.InstancedMesh(new RoundedBoxGeometry(0.15, 0.07, 0.1, 2, 0.025), lacquer(HUE.paper), SHUTTLES);
  for (let k = 0; k < SHUTTLES; k++) shuttles.setColorAt(k, BRAND[k % 3]);
  world.add(shuttles);
  const trails = createPointCloud(SHUTTLES * TRAIL);
  world.add(trails.points);
  const roadLen = PLATE - 0.3;
  const shuttlePath = (k: number, u: number, out: THREE.Vector3) => {
    const road = ROADS[Math.floor(k / 2) % 2];
    const alongRow = Math.floor(k / 4) % 2 === 0;
    const dir = k % 2 ? 1 : -1;
    const d = (u - 0.5) * roadLen * dir;
    const lane = dir * 0.05;
    return alongRow ? out.set(d, 0.045, cellX(road) + lane) : out.set(cellX(road) + lane, 0.045, d);
  };

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const turn = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const colour = new THREE.Color();
  const tint = new THREE.Color();
  const yAxis = new THREE.Vector3(0, 1, 0);
  const heights = new Float32Array(cells.length);
  const bez = new THREE.QuadraticBezierCurve3(HUB.clone(), new THREE.Vector3(), new THREE.Vector3());

  return {
    scene,
    camera,
    frame,
    update(f) {
      const { t } = f;
      rig(f, 0.4);
      world.rotation.y = 0.6 + t * 0.05;

      const online = arrival(f, 0, 0.75);
      const fusion = arrival(f, 1, 0.5);
      const automate = arrival(f, 2, 0.4);
      const smart = arrival(f, 3, 0.6);

      setGroupOpacity(streets, span(online, 0, 0.4));

      cells.forEach((cell, i) => {
        const front = online * 1.5 - cell.dist / maxDist;
        const rise = easeOutBack(span(front, 0, 0.5));
        let ripple = 0;
        MASTS.forEach(([r, c], si) => {
          const d = Math.hypot(cell.x - cellX(c), cell.z - cellX(r));
          ripple += Math.max(0, Math.sin(d * 9 - t * 4 + si * 2)) * Math.exp(-d * 1.6);
        });
        const wave = 0.5 + 0.5 * Math.sin(cell.dist * 3.6 - t * 2.4);
        const h = Math.max(0.0001, cell.base * (1 + ripple * 0.35 * fusion) * lerp(1, 0.8 + wave * 0.45, smart) * rise);
        heights[i] = h;
        p.set(cell.x, 0, cell.z);
        m.compose(p, q, s.set(1, h, 1));
        blocks.setMatrixAt(i, m);
        p.y = h;
        m.compose(p, q, s.setScalar(rise > 0.01 ? 1 : 0.0001));
        roofs.setMatrixAt(i, m);

        // Device roofs carry their colour once online; in the last chapter a colour wave rolls over every roof.
        const lit = cell.device >= 0 ? span(front, 0.35, 0.5) : 0;
        colour.copy(HUE.paper).lerp(BRAND[Math.max(0, cell.device)], lit);
        if (smart > 0) {
          if (wave < 0.5) tint.copy(BRAND[0]).lerp(BRAND[1], wave * 2);
          else tint.copy(BRAND[1]).lerp(BRAND[2], wave * 2 - 1);
          colour.lerp(tint, smart * (0.25 + 0.75 * wave));
        }
        roofs.setColorAt(i, colour);

        setXYZ(leds.pos, i, cell.x, h + 0.07, cell.z);
        setColor(leds.col, i, BRAND[Math.max(0, cell.device)]);
        leds.size[i] = 0.06;
        leds.alpha[i] = lit * (0.55 + 0.45 * Math.sin(t * 5 + i * 1.7));
      });
      blocks.instanceMatrix.needsUpdate = true;
      roofs.instanceMatrix.needsUpdate = true;
      if (roofs.instanceColor) roofs.instanceColor.needsUpdate = true;
      leds.commit();

      masts.forEach(({ group, ripples, link, colour: c }, i) => {
        group.scale.setScalar(Math.max(0.0001, easeOutBack(span(fusion, i * 0.1, i * 0.1 + 0.4))));
        ripples.forEach((ring, k) => {
          const u = (t * 0.55 + k / 3 + i * 0.2) % 1;
          ring.scale.setScalar(0.05 + u * 0.7);
          (ring.material as THREE.MeshBasicMaterial).opacity = fusion * (1 - u) * 0.6;
        });
        link.grow(span(fusion, 0.35 + i * 0.1, 0.8 + i * 0.1));
        for (let k = 0; k < 5; k++) {
          const j = i * 5 + k;
          const u = (t * 0.5 + k / 5 + i * 0.13) % 1;
          link.curve.getPoint(u, p);
          setXYZ(readings.pos, j, p.x, p.y, p.z);
          setColor(readings.col, j, c);
          readings.size[j] = 0.055;
          readings.alpha[j] = span(fusion, 0.8, 1) * span(u, 0, 0.1) * (1 - span(u, 0.9, 1));
        }
      });
      readings.commit();

      const hubIn = easeOutBack(span(fusion, 0.5, 0.9));
      hub.scale.setScalar(Math.max(0.0001, hubIn * (1 + 0.1 * smart * Math.sin(t * 5))));
      hub.rotation.y = t * 0.8;
      const ringU = (t * 0.8) % 1;
      hubRing.scale.setScalar(Math.max(0.0001, hubIn * (1 + 0.3 * ringU)));
      setGroupOpacity(hubRing, hubIn * (1 - ringU) * 0.8);

      for (let k = 0; k < SHUTTLES; k++) {
        const u = (t * (0.09 + (k % 3) * 0.02) + k / SHUTTLES) % 1;
        shuttlePath(k, u, p);
        const alongRow = Math.floor(k / 4) % 2 === 0;
        turn.setFromAxisAngle(yAxis, alongRow ? 0 : Math.PI / 2);
        const fade = span(automate, (k / SHUTTLES) * 0.5, (k / SHUTTLES) * 0.5 + 0.3) * span(u, 0, 0.05) * (1 - span(u, 0.95, 1));
        m.compose(p, turn, s.setScalar(Math.max(0.0001, fade)));
        shuttles.setMatrixAt(k, m);
        for (let tr = 0; tr < TRAIL; tr++) {
          const j = k * TRAIL + tr;
          shuttlePath(k, Math.max(0, u - (tr + 1) * 0.012), p);
          setXYZ(trails.pos, j, p.x, p.y, p.z);
          setColor(trails.col, j, BRAND[k % 3]);
          trails.size[j] = 0.06 * (1 - tr / TRAIL);
          trails.alpha[j] = fade * 0.6 * (1 - tr / TRAIL);
        }
      }
      shuttles.instanceMatrix.needsUpdate = true;
      trails.commit();

      downlinkCells.forEach((ci, k) => {
        const cell = cells[ci];
        bez.v2.set(cell.x, heights[ci] + 0.03, cell.z);
        bez.v1.copy(HUB).lerp(bez.v2, 0.5).setY(HUB.y + 0.1);
        const drawn = span(smart, 0.2 + k * 0.08, 0.6 + k * 0.08);
        const packet = (t * 0.7 + k / downlinkCells.length) % 1;
        for (let b = 0; b < 18; b++) {
          const j = k * 18 + b;
          const u = b / 17;
          bez.getPoint(u, p);
          setXYZ(downlinks.pos, j, p.x, p.y, p.z);
          const head = Math.exp(-Math.pow((u - packet) * 12, 2)) * span(smart, 0.8, 1);
          setColor(downlinks.col, j, colour.copy(HUE.violet).lerp(HUE.saffron, head));
          downlinks.size[j] = 0.022 + head * 0.045;
          downlinks.alpha[j] = (u <= drawn ? 0.7 : 0) + head * 0.3;
        }
      });
      downlinks.commit();
    },
    dispose: () => disposeScene(scene),
  };
}
