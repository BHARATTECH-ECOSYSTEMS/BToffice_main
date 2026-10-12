import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { easeOutBack, lerp, span } from '../ink';
import {
  BRAND,
  HUE,
  TAU,
  type DomainWorld,
  arrival,
  createGrowingTube,
  createPointCloud,
  createStage,
  disposeScene,
  flat,
  frosted,
  lacquer,
  seeded,
  setColor,
  setGroupOpacity,
  timeline,
} from './kit';

/**
 * 01 · GI Rivinity — a glass memory cube.
 * learn: light streams in and the first cells light up · remember: the lattice fills layer by layer ·
 * reason: a beam zig-zags cell to cell through what it knows · decide: one cell slides out and turns saffron.
 */

const N = 4;
const PITCH = 0.4;
const CELL = 0.3;
const LEARNED = 12;
const REMEMBERED = 48;
const INFLOW = 160;
/** The reasoning route through the lattice, cell to adjacent cell, ending on the front face. */
const ROUTE: [number, number, number][] = [
  [0, 0, 0],
  [0, 0, 1],
  [1, 0, 1],
  [1, 1, 1],
  [1, 1, 2],
  [2, 1, 2],
  [2, 2, 2],
  [2, 2, 3],
];
const EJECT = 0.72;
/** Incoming light arcs slightly upward on its way in. */
const INFLOW_LIFT = new THREE.Vector3(0, 0.25, 0);
const LAYER_HUES = [HUE.violet, HUE.orange, HUE.saffron, HUE.violet];

const cellPos = (x: number, y: number, z: number, out = new THREE.Vector3()) =>
  out.set((x - (N - 1) / 2) * PITCH, (y - (N - 1) / 2) * PITCH, (z - (N - 1) / 2) * PITCH);

export function createGiRivinity(): DomainWorld {
  // The lattice tilts and spins freely, so its bounds are its full circumsphere plus the ejected cell.
  const { scene, camera, rig, frame } = createStage([{ radius: 1.52, bottom: -1.52, top: 1.52, round: true }], 0.3);
  const lattice = new THREE.Group();
  lattice.rotation.x = 0.38;
  scene.add(lattice);

  // Cells, ordered so the lattice fills from the bottom layer up, each layer from one corner outward.
  const cells: { x: number; y: number; z: number; pos: THREE.Vector3 }[] = [];
  for (let y = 0; y < N; y++)
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) cells.push({ x, y, z, pos: cellPos(x, y, z) });
  const fillOrder = [...cells.keys()].sort(
    (a, b) => cells[a].y - cells[b].y || cells[a].x + cells[a].z - (cells[b].x + cells[b].z) || a - b
  );
  const rank = new Map(fillOrder.map((cell, k) => [cell, k]));
  const cellIndex = (x: number, y: number, z: number) => y * N * N + z * N + x;
  const routeCells = ROUTE.map(([x, y, z]) => cellIndex(x, y, z));
  const routeStep = new Map(routeCells.map((c, k) => [c, k]));
  const chosen = routeCells[routeCells.length - 1];

  // Glass shells with blueprint edges
  const glass = new THREE.InstancedMesh(new RoundedBoxGeometry(CELL, CELL, CELL, 2, 0.03), frosted(HUE.mist, 0.16), cells.length);
  const m = new THREE.Matrix4();
  cells.forEach(({ pos }, i) => glass.setMatrixAt(i, m.makeTranslation(pos.x, pos.y, pos.z)));
  const edgeSource = new THREE.EdgesGeometry(new THREE.BoxGeometry(CELL, CELL, CELL));
  const edgePositions: number[] = [];
  const edgeArray = edgeSource.getAttribute('position').array;
  cells.forEach(({ pos }) => {
    for (let k = 0; k < edgeArray.length; k += 3) edgePositions.push(edgeArray[k] + pos.x, edgeArray[k + 1] + pos.y, edgeArray[k + 2] + pos.z);
  });
  edgeSource.dispose();
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
  const edges = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: HUE.ink, transparent: true, opacity: 0.16 }));
  lattice.add(glass, edges);

  // Lit memory cores inside the shells
  const cores = new THREE.InstancedMesh(new RoundedBoxGeometry(CELL * 0.82, CELL * 0.82, CELL * 0.82, 2, 0.03), lacquer(HUE.paper), cells.length);
  lattice.add(cores);

  // Incoming light, travelling in lattice space so it lands on cells as they turn
  const rnd = seeded(13);
  const inflow = createPointCloud(INFLOW);
  const streams = Array.from({ length: INFLOW }, (_, i) => {
    const dir = new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize();
    return { from: dir.multiplyScalar(1.45), to: cells[fillOrder[i % LEARNED]].pos, phase: rnd(), colour: BRAND[i % 3] };
  });
  lattice.add(inflow.points);

  // Reasoning beam and the ejected decision
  const routePath = new THREE.CurvePath<THREE.Vector3>();
  routeCells.slice(1).forEach((c, k) => routePath.add(new THREE.LineCurve3(cells[routeCells[k]].pos, cells[c].pos)));
  const beam = createGrowingTube(routePath, 0.024, flat(HUE.violet, 0.9), 140);
  lattice.add(beam.mesh);
  const chosenHome = cells[chosen].pos.clone();
  const chosenOut = chosenHome.clone().add(new THREE.Vector3(0, 0, EJECT));
  const tail = createGrowingTube(new THREE.LineCurve3(chosenHome, chosenOut), 0.016, flat(HUE.saffron, 0.9), 12);
  lattice.add(tail.mesh);
  const decision = new THREE.Mesh(new RoundedBoxGeometry(CELL, CELL, CELL, 3, 0.04), lacquer(HUE.saffron));
  lattice.add(decision);
  const rings = [0, 1, 2].map(() => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 8, 64), frosted(HUE.saffron, 0.8));
    lattice.add(ring);
    return ring;
  });
  const pulse = createPointCloud(1);
  lattice.add(pulse.points);

  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const ctrl = new THREE.Vector3();
  const bez = new THREE.QuadraticBezierCurve3(new THREE.Vector3(), ctrl, new THREE.Vector3());
  const tone = new THREE.Color();

  return {
    scene,
    camera,
    frame,
    update(f) {
      const { t } = f;
      rig(f, 0.4);
      lattice.rotation.y = t * 0.16;

      const learn = timeline(f, 0, 0.95);
      const remember = timeline(f, 1, 0.85);
      const reason = arrival(f, 2, 0.6);
      const decide = timeline(f, 3, 0.7);
      const eject = easeOutBack(span(decide, 0.1, 0.55));

      cells.forEach(({ pos, y }, i) => {
        const k = rank.get(i)!;
        const lit =
          k < LEARNED
            ? span(learn, 0.15 + (k / LEARNED) * 0.7, 0.25 + (k / LEARNED) * 0.7)
            : k < REMEMBERED
              ? span(remember, ((k - LEARNED) / (REMEMBERED - LEARNED)) * 0.85, ((k - LEARNED) / (REMEMBERED - LEARNED)) * 0.85 + 0.12)
              : 0;
        const step = routeStep.get(i);
        const onBeam = step === undefined ? 0 : span(reason, step / ROUTE.length, (step + 1) / ROUTE.length);
        const isChosen = i === chosen && eject > 0;
        const size = isChosen ? 0 : easeOutBack(lit) * (1 + 0.12 * onBeam);
        m.compose(pos, q, s.setScalar(Math.max(0.0001, size)));
        cores.setMatrixAt(i, m);
        tone.copy(LAYER_HUES[y]).lerp(HUE.violet, onBeam * 0.8).lerp(HUE.mist, decide * 0.45 * (1 - onBeam));
        cores.setColorAt(i, tone);
      });
      cores.instanceMatrix.needsUpdate = true;
      if (cores.instanceColor) cores.instanceColor.needsUpdate = true;

      streams.forEach(({ from, to, phase, colour }, i) => {
        const u = (t * 0.35 + phase) % 1;
        ctrl.copy(from).multiplyScalar(0.55).add(INFLOW_LIFT);
        bez.v0.copy(from);
        bez.v2.copy(to);
        bez.getPoint(u, p);
        inflow.pos.set([p.x, p.y, p.z], i * 3);
        setColor(inflow.col, i, colour);
        inflow.size[i] = 0.035;
        // Strong while learning, a gentle trickle after: learning never stops.
        inflow.alpha[i] = span(learn, 0, 0.15) * lerp(1, 0.25, remember) * span(u, 0, 0.15) * (1 - span(u, 0.85, 1));
      });
      inflow.commit();

      beam.grow(reason);
      const head = (t * 0.3) % 1;
      routePath.getPointAt(head, p);
      pulse.pos.set([p.x, p.y, p.z], 0);
      setColor(pulse.col, 0, HUE.saffron);
      pulse.size[0] = 0.11;
      pulse.alpha[0] = span(reason, 0.95, 1) * (1 - decide);
      pulse.commit();

      tail.grow(span(decide, 0.1, 0.5));
      decision.position.lerpVectors(chosenHome, chosenOut, eject);
      decision.scale.setScalar(Math.max(0.0001, eject > 0 ? 0.82 + 0.25 * span(decide, 0.4, 0.7) : 0));
      decision.rotation.z = span(decide, 0.1, 0.55) * TAU * 0.25;
      rings.forEach((ring, k) => {
        const u = (t * 0.6 + k / 3) % 1;
        ring.position.copy(chosenOut);
        ring.scale.setScalar(0.0001 + span(decide, 0.5, 0.8) * (0.2 + u * 0.22));
        setGroupOpacity(ring, span(decide, 0.5, 0.8) * (1 - u));
      });
    },
    dispose: () => disposeScene(scene),
  };
}
