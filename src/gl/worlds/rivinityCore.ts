import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { easeOutBack, lerp, span } from '../ink';
import {
  BRAND,
  HUE,
  type DomainWorld,
  arrival,
  createContactShadow,
  createPointCloud,
  createStage,
  disposeScene,
  flat,
  frosted,
  lacquer,
  setColor,
  setGroupOpacity,
  setXYZ,
} from './kit';

/**
 * 02 · Rivinity Core — a glass operating layer.
 * layer: a frosted slab sweeps open · plug in: coloured modules drop and dock onto it ·
 * route: packets run between modules across the slab · fabric: a living lattice underneath links them all.
 */

const SLAB = { w: 2.9, h: 0.12, d: 1.9 };
const MODULE_SLOTS: [number, number][] = [
  [-0.9, -0.45],
  [0, -0.45],
  [0.9, -0.45],
  [-0.9, 0.45],
  [0, 0.45],
  [0.9, 0.45],
];
const MODULE_Y = SLAB.h / 2 + 0.11;
/** Module index pairs that exchange packets. */
const ROUTES: [number, number][] = [
  [0, 5],
  [3, 2],
  [1, 4],
  [5, 0],
  [2, 3],
];
const PACKETS_PER_ROUTE = 6;
const FABRIC_X = 34;
const FABRIC_Z = 22;
const FABRIC_Y = -0.6;

export function createRivinityCore(): DomainWorld {
  const { scene, camera, rig, frame } = createStage(
    [
      { radius: 1.95, bottom: -0.82, top: 0.45 },
      { radius: 1.3, bottom: -0.82, top: 1.15 },
    ],
    0.6,
    30,
    new THREE.Vector3(0, -0.29, 0),
    1.45
  );
  const world = new THREE.Group();
  world.position.y = 0.25;
  scene.add(world);

  const shadow = createContactShadow(1.7, 0.14);
  shadow.position.y = FABRIC_Y - 0.25;
  shadow.scale.set(1.15, 1, 0.8);
  world.add(shadow);

  // Chapter 1 — the capability layer
  const slab = new THREE.Group();
  const glass = new THREE.Mesh(new RoundedBoxGeometry(SLAB.w, SLAB.h, SLAB.d, 4, 0.05), frosted(HUE.paper, 0.72));
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(SLAB.w, SLAB.h, SLAB.d)),
    new THREE.LineBasicMaterial({ color: HUE.violet, transparent: true, opacity: 0.6 })
  );
  const etch: number[] = [];
  for (let x = -SLAB.w / 2 + 0.25; x < SLAB.w / 2; x += 0.3) etch.push(x, SLAB.h / 2 + 0.002, -SLAB.d / 2 + 0.1, x, SLAB.h / 2 + 0.002, SLAB.d / 2 - 0.1);
  for (let z = -SLAB.d / 2 + 0.25; z < SLAB.d / 2; z += 0.3) etch.push(-SLAB.w / 2 + 0.1, SLAB.h / 2 + 0.002, z, SLAB.w / 2 - 0.1, SLAB.h / 2 + 0.002, z);
  const etchGeo = new THREE.BufferGeometry();
  etchGeo.setAttribute('position', new THREE.Float32BufferAttribute(etch, 3));
  const grid = new THREE.LineSegments(etchGeo, new THREE.LineBasicMaterial({ color: HUE.violet, transparent: true, opacity: 0.16 }));
  slab.add(glass, edges, grid);
  world.add(slab);

  // Chapter 2 — modules
  const moduleGeo = new RoundedBoxGeometry(0.5, 0.22, 0.5, 4, 0.06);
  const modules = MODULE_SLOTS.map(([x, z], i) => {
    const mat = lacquer(BRAND[i % 3]);
    mat.emissive = BRAND[i % 3].clone();
    mat.emissiveIntensity = 0;
    const mesh = new THREE.Mesh(moduleGeo, mat);
    mesh.position.set(x, MODULE_Y, z);
    const socket = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.33, 40), flat(BRAND[i % 3], 0.55));
    socket.rotation.x = -Math.PI / 2;
    socket.position.set(x, SLAB.h / 2 + 0.004, z);
    world.add(mesh, socket);
    return { mesh, mat, socket };
  });

  // Chapter 3 — packets on L-shaped routes across the slab surface
  const packets = createPointCloud(ROUTES.length * PACKETS_PER_ROUTE);
  world.add(packets.points);
  const routePaths = ROUTES.map(([from, to]) => {
    const y = SLAB.h / 2 + 0.03;
    const [x0, z0] = MODULE_SLOTS[from];
    const [x1, z1] = MODULE_SLOTS[to];
    const corner = new THREE.Vector3(x1, y, z0);
    const path = new THREE.CurvePath<THREE.Vector3>();
    path.add(new THREE.LineCurve3(new THREE.Vector3(x0, y, z0), corner));
    path.add(new THREE.LineCurve3(corner, new THREE.Vector3(x1, y, z1)));
    return path;
  });
  const traces = routePaths.map((path, i) => {
    const geo = new THREE.BufferGeometry().setFromPoints(path.getSpacedPoints(40));
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: BRAND[i % 3], transparent: true, opacity: 0.5 }));
    world.add(line);
    return line;
  });

  // Chapter 4 — shared fabric: an undulating lattice below, tied up to every module
  const fabric = createPointCloud(FABRIC_X * FABRIC_Z);
  world.add(fabric.points);
  const tethers = new THREE.Group();
  modules.forEach(({ mesh }, i) => {
    const tether = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 8), flat(BRAND[i % 3], 0.55));
    tether.position.set(mesh.position.x, FABRIC_Y / 2, mesh.position.z);
    tether.scale.y = -FABRIC_Y;
    tethers.add(tether);
  });
  world.add(tethers);

  const tmp = new THREE.Vector3();

  return {
    scene,
    camera,
    frame,
    update(f) {
      const { t } = f;
      rig(f, 0.35);
      world.rotation.y = -0.5 + Math.sin(t * 0.15) * 0.25;

      const layer = arrival(f, 0, 0.55);
      slab.scale.set(Math.max(0.0001, easeOutBack(span(layer, 0, 0.8))), 1, Math.max(0.0001, span(layer, 0, 0.5)));
      slab.position.y = lerp(-0.35, 0, layer);
      setGroupOpacity(slab, span(layer, 0, 0.3));

      const plug = arrival(f, 1, 0.75);
      const fabricOn = arrival(f, 3, 0.6);
      const beat = Math.pow(0.5 + 0.5 * Math.sin(t * 3.4), 3);
      modules.forEach(({ mesh, mat, socket }, i) => {
        const drop = span(plug, i * 0.1, i * 0.1 + 0.45);
        mesh.visible = drop > 0;
        mesh.position.y = MODULE_Y + (1 - easeOutBack(drop)) * 0.6;
        mesh.rotation.y = (1 - drop) * 1.2;
        setGroupOpacity(socket, span(drop, 0.7, 1) * (0.6 + 0.4 * beat * fabricOn));
        mat.emissiveIntensity = 0.22 * beat * fabricOn;
      });

      const route = arrival(f, 2, 0.4);
      traces.forEach((line, i) => {
        const drawn = span(route, i * 0.08, i * 0.08 + 0.5);
        line.geometry.setDrawRange(0, Math.round(drawn * 41));
        (line.material as THREE.LineBasicMaterial).opacity = 0.45 * drawn;
      });
      routePaths.forEach((path, ri) => {
        for (let k = 0; k < PACKETS_PER_ROUTE; k++) {
          const i = ri * PACKETS_PER_ROUTE + k;
          const u = (t * 0.28 + k / PACKETS_PER_ROUTE + ri * 0.13) % 1;
          path.getPointAt(u, tmp);
          setXYZ(packets.pos, i, tmp.x, tmp.y, tmp.z);
          setColor(packets.col, i, BRAND[ri % 3]);
          packets.size[i] = 0.07;
          packets.alpha[i] = span(route, 0.3, 1) * span(u, 0, 0.08) * (1 - span(u, 0.92, 1));
        }
      });
      packets.commit();

      // until its chapter arrives every point is fully transparent, so it is neither computed nor drawn
      fabric.points.visible = fabricOn > 0;
      if (fabricOn > 0) {
        for (let ix = 0; ix < FABRIC_X; ix++) {
          for (let iz = 0; iz < FABRIC_Z; iz++) {
            const i = ix * FABRIC_Z + iz;
            const x = (ix / (FABRIC_X - 1) - 0.5) * 3.2;
            const z = (iz / (FABRIC_Z - 1) - 0.5) * 2.1;
            const wave = Math.sin(x * 2.1 + t * 1.6) * 0.06 + Math.cos(z * 2.7 - t * 1.2) * 0.05;
            // The lattice unrolls from the centre outward as the chapter arrives.
            const reach = span(fabricOn * 2.4 - Math.hypot(x / 1.6, z / 1.05), 0, 0.4);
            setXYZ(fabric.pos, i, x, FABRIC_Y + wave - (1 - reach) * 0.3, z);
            setColor(fabric.col, i, wave > 0.04 ? HUE.violet : HUE.mist);
            fabric.size[i] = 0.035;
            fabric.alpha[i] = reach * 0.8;
          }
        }
        fabric.commit();
      }
      setGroupOpacity(tethers, span(fabricOn, 0.4, 1) * (0.5 + 0.5 * beat));
    },
    dispose: () => disposeScene(scene),
  };
}
