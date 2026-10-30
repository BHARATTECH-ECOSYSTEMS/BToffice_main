import * as THREE from 'three';
import { HUE } from './palette';

/**
 * The Contact page's office card: a small daylight diorama of the city around our Kanpur headquarters.
 * A violet tower under a floating pin, the street grid around it, the Ganga along the north edge, traffic,
 * and a route that runs in to the door. Stylised, not to scale: we only know the city, so no street is named.
 *
 * World units: x = east, z = south, y = up. One city block every CELL units, the office in block (0, 0).
 */

const CELL = 6;
const ROAD = 1.5;
// The same city by day (light theme) and by night (dark theme); only the colours and the light change.
const DAY = {
  bg: '#F4F1EA',
  sky: '#ffffff',
  earth: '#ded7c8',
  skyI: 1.45,
  sun: '#fff6e8',
  sunI: 2.1,
  ground: '#E5E0D5',
  plinth: '#F1EDE4',
  park: '#DCE4CC',
  tree: '#A9BD92',
  buildings: ['#FFFFFF', '#F3F0EA'],
  tintMix: ['#ffffff', 0.55] as [string, number],
  river: '#D3DAF3',
  streak: ['#ffffff', 0.75] as [string, number],
  dash: '#ffffff',
  windows: 'rgba(255,255,255,0.42)',
  windowGlow: 0,
  routePale: '#C8BFFB',
  bridge: '#EFEAE0',
  rail: '#ffffff',
  carNeutrals: ['#ffffff', '#ffffff', '#D9D3C6'],
  clothesNeutrals: ['#ffffff', '#5C574E', '#8EA3D6', '#C9C1B2'],
  halo: 0.38,
};
const NIGHT: typeof DAY = {
  bg: '#12111B',
  sky: '#A49DFF',
  earth: '#0B0A12',
  skyI: 1.25,
  sun: '#C2BCFF',
  sunI: 1.2,
  ground: '#1A1927',
  plinth: '#222031',
  park: '#1C2B25',
  tree: '#35553F',
  buildings: ['#312F45', '#2A283C'],
  tintMix: ['#1c1b28', 0.62],
  river: '#1D2347',
  streak: ['#8C9BE0', 0.45],
  dash: '#45425F',
  // lit windows: warm light in the violet tower, which glows a little so it reads against the dark city
  windows: 'rgba(255,232,180,0.85)',
  windowGlow: 0.55,
  routePale: '#3A3270',
  bridge: '#2C2A3B',
  rail: '#55516E',
  carNeutrals: ['#ECEAF7', '#C9C4E8', '#8A86A6'],
  clothesNeutrals: ['#ECEAF7', '#A39FC2', '#8EA3D6', '#C9C1B2'],
  halo: 0.6,
};
const OFFICE = { x: 0, z: 0, w: 2.6, h: 7.2 };
const RIVER_Z = -16;
const riverZ = (x: number) => RIVER_Z + Math.sin(x * 0.045) * 2.6;

interface OfficeMapOptions {
  /** Pin label lines, top to bottom. */
  label: [string, string];
  /** Visitors who asked for less motion get one still frame. */
  reduced: boolean;
  /** The site's dark theme: the city at night. */
  dark?: boolean;
  /** Called once the first frame is on screen, so the card can swap its fallback for the canvas. */
  onReady?: () => void;
}

export function mountOfficeMap(host: HTMLElement, { label, reduced, dark = false, onReady }: OfficeMapOptions) {
  const C = dark ? NIGHT : DAY;
  const BG = C.bg;
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(BG);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // reading back every shader's log makes the page wait on the GPU, and on Windows it only prints compiler noise
  renderer.debug.checkShaderErrors = import.meta.env.DEV;
  renderer.domElement.className = 'visit-map__canvas';
  host.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  // the far city fades into the card's own colour instead of ending at an edge (the camera sits ~50 out)
  scene.fog = new THREE.Fog(BG, 62, 112);
  const camera = new THREE.PerspectiveCamera(30, 1.6, 0.5, 200);
  const target = new THREE.Vector3(OFFICE.x - 1, 2.6, OFFICE.z + 1);

  scene.add(new THREE.HemisphereLight(C.sky, C.earth, C.skyI));
  const sun = new THREE.DirectionalLight(C.sun, C.sunI);
  sun.position.set(-16, 30, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 90 });
  sun.shadow.bias = -0.0006;
  sun.shadow.radius = 4;
  scene.add(sun);

  // ---------- ground: the roads are the ground, every block is a low plinth on it ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 260).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: C.ground }));
  ground.receiveShadow = true;
  scene.add(ground);

  const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const plinths: THREE.Matrix4[] = [];
  const parks: THREE.Matrix4[] = [];
  const blocks: { x: number; z: number; size: number; h: number; c: THREE.Color }[] = [];
  const trees: THREE.Matrix4[] = [];
  // blocks near the office that people walk round, by centre
  const walkable: [number, number][] = [];
  const m4 = (x: number, y: number, z: number, sx: number, sy: number, sz: number) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz));
  const tints: string[] = [HUE.violet, HUE.tangerine, HUE.saffron];
  const PARK_CELLS = new Set(['-3,1', '2,-2', '4,3']);
  const inner = CELL - ROAD;

  for (let gx = -8; gx <= 8; gx++) {
    for (let gz = -6; gz <= 6; gz++) {
      const cx = gx * CELL;
      const cz = gz * CELL;
      // the river runs between the blocks; nothing is built on its banks
      if (Math.abs(cz - riverZ(cx)) < CELL * 0.95) continue;
      if (Math.abs(gx) <= 3 && Math.abs(gz) <= 3) walkable.push([cx, cz]);
      if (PARK_CELLS.has(`${gx},${gz}`)) {
        parks.push(m4(cx, 0, cz, inner, 0.14, inner));
        for (let k = 0; k < 9; k++) trees.push(m4(cx + (rand() - 0.5) * inner * 0.8, 0.14, cz + (rand() - 0.5) * inner * 0.8, 0.5 + rand() * 0.35, 0.9 + rand() * 0.9, 0.5 + rand() * 0.35));
        continue;
      }
      plinths.push(m4(cx, 0, cz, inner, 0.12, inner));
      if (gx === 0 && gz === 0) continue;
      // one building filling the block, or up to four on its quarter lots; taller towards the middle of town
      const near = Math.max(0, 1 - Math.hypot(gx, gz) / 9);
      const lots = rand() < 0.3 ? [[0, 0, inner - 0.6]] : [[-1, -1], [1, -1], [-1, 1], [1, 1]].filter(() => rand() > 0.18).map(([qx, qz]) => [qx * (inner / 4), qz * (inner / 4), inner / 2 - 0.45]);
      for (const [ox, oz, size] of lots) {
        // kept low so the streets, the route and the office tower read over the roofs
        const h = 0.5 + rand() * 1.1 + near * near * rand() * 2.2;
        // a few buildings pick up a pale brand colour; the rest are white and warm grey
        const c = rand() < 0.07 ? new THREE.Color(tints[Math.floor(rand() * 3)]).lerp(new THREE.Color(C.tintMix[0]), C.tintMix[1]) : new THREE.Color(rand() < 0.5 ? C.buildings[0] : C.buildings[1]);
        blocks.push({ x: cx + ox, z: cz + oz, size, h, c });
      }
    }
  }

  const instanced = (geo: THREE.BufferGeometry, mat: THREE.Material, list: THREE.Matrix4[], cast = false) => {
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  };
  instanced(box, new THREE.MeshLambertMaterial({ color: C.plinth }), plinths);
  instanced(box, new THREE.MeshLambertMaterial({ color: C.park }), parks);
  instanced(new THREE.ConeGeometry(0.5, 1, 7).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: C.tree }), trees, true);
  const buildings = instanced(box, new THREE.MeshLambertMaterial({ color: '#ffffff' }), blocks.map((b) => m4(b.x, 0.12, b.z, b.size, b.h, b.size)), true);
  // the intro grows the city up from the ground in a wave that starts at the office and runs outwards
  const growDelay = blocks.map((b) => Math.min(1.1, Math.hypot(b.x - OFFICE.x, b.z - OFFICE.z) * 0.03));
  const growP = new THREE.Vector3();
  const growS = new THREE.Vector3();
  const growQ = new THREE.Quaternion();
  const growM = new THREE.Matrix4();
  let grown = false;
  const growCity = (t: number) => {
    let done = true;
    blocks.forEach((b, i) => {
      const k = Math.min(1, Math.max(0, (t - growDelay[i]) / 0.55));
      if (k < 1) done = false;
      // eased with a slight overshoot, so each building settles rather than stops
      const e = k === 1 ? 1 : 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
      buildings.setMatrixAt(i, growM.compose(growP.set(b.x, 0.12, b.z), growQ, growS.set(b.size, Math.max(0.001, b.h * e), b.size)));
    });
    buildings.instanceMatrix.needsUpdate = true;
    grown = done;
  };
  blocks.forEach((b, i) => buildings.setColorAt(i, b.c));

  // ---------- the Ganga: a ribbon along the north edge, with slow white streaks for its current ----------
  const RIVER_W = 7;
  const riverShape = new THREE.Shape();
  const xs = Array.from({ length: 81 }, (_, i) => -130 + i * 3.25);
  // the shape is drawn in x/y and laid flat, where its y becomes -z: so it is drawn at y = -z
  xs.forEach((x, i) => (i ? riverShape.lineTo(x, -(riverZ(x) - RIVER_W / 2)) : riverShape.moveTo(x, -(riverZ(x) - RIVER_W / 2))));
  [...xs].reverse().forEach((x) => riverShape.lineTo(x, -(riverZ(x) + RIVER_W / 2)));
  const river = new THREE.Mesh(new THREE.ShapeGeometry(riverShape).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: C.river }));
  river.position.y = 0.02;
  scene.add(river);
  const STREAKS = 26;
  const streaks = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.6, 0.09).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: C.streak[0], transparent: true, opacity: C.streak[1] }), STREAKS);
  const streakAt = Array.from({ length: STREAKS }, () => ({ x: -70 + rand() * 140, off: (rand() - 0.5) * (RIVER_W - 2), v: 0.6 + rand() * 0.8 }));
  scene.add(streaks);

  // ---------- road markings on the two streets that meet at the office ----------
  const dashes: THREE.Matrix4[] = [];
  const AVENUE_Z = OFFICE.z + CELL / 2;
  const STREET_X = OFFICE.x - CELL / 2;
  for (let x = -60; x <= 60; x += 2.2) dashes.push(m4(x, 0.03, AVENUE_Z, 0.9, 0.01, 0.12));
  for (let z = riverZ(STREET_X) + RIVER_W; z <= 50; z += 2.2) dashes.push(m4(STREET_X, 0.03, z, 0.12, 0.01, 0.9));
  instanced(box, new THREE.MeshBasicMaterial({ color: C.dash }), dashes);

  // ---------- the office: a violet tower with lit floors, under a floating pin ----------
  const floors = document.createElement('canvas');
  floors.width = 64;
  floors.height = 256;
  const g = floors.getContext('2d')!;
  g.fillStyle = HUE.violet;
  g.fillRect(0, 0, 64, 256);
  g.fillStyle = C.windows;
  for (let y = 10; y < 250; y += 16) for (let x = 6; x < 60; x += 14) g.fillRect(x, y, 9, 7);
  const floorTex = new THREE.CanvasTexture(floors);
  floorTex.colorSpace = THREE.SRGBColorSpace;
  const towerSide = new THREE.MeshLambertMaterial({ map: floorTex, emissive: '#ffffff', emissiveMap: floorTex, emissiveIntensity: C.windowGlow });
  const towerTop = new THREE.MeshLambertMaterial({ color: '#8F7DF8' });
  const tower = new THREE.Mesh(box, [towerSide, towerSide, towerTop, towerTop, towerSide, towerSide]);
  tower.scale.set(OFFICE.w, OFFICE.h, OFFICE.w);
  tower.position.set(OFFICE.x, 0.12, OFFICE.z);
  tower.castShadow = true;
  scene.add(tower);

  const pin = new THREE.Group();
  const violet = new THREE.MeshLambertMaterial({ color: HUE.violet, emissive: HUE.violet, emissiveIntensity: 0.25 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.62, 28, 20), violet);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.9, 24).rotateX(Math.PI).translate(0, -0.62, 0), violet);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  dot.position.set(0, 0.06, 0.5);
  pin.add(head, tip, dot);
  const PIN_Y = OFFICE.h + 2.4;
  pin.position.set(OFFICE.x, PIN_Y, OFFICE.z);
  pin.scale.setScalar(1.35);
  scene.add(pin);

  // a soft violet halo behind the pin, and rings that pulse out across the ground from the door
  const glow = document.createElement('canvas');
  glow.width = glow.height = 128;
  const gg = glow.getContext('2d')!;
  const grad = gg.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, `rgba(110,88,245,${C.halo})`);
  grad.addColorStop(1, 'rgba(110,88,245,0)');
  gg.fillStyle = grad;
  gg.fillRect(0, 0, 128, 128);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(glow), depthWrite: false }));
  halo.scale.setScalar(4.2);
  pin.add(halo);
  const rings = [0, 1, 2].map(() => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: HUE.violet, transparent: true, depthWrite: false }));
    ring.position.set(OFFICE.x, 0.16, OFFICE.z);
    scene.add(ring);
    return ring;
  });

  // ---------- the route in: from the west along the avenue, up the side street, to the door ----------
  const way = [new THREE.Vector3(-58, 0, AVENUE_Z), new THREE.Vector3(STREET_X, 0, AVENUE_Z), new THREE.Vector3(STREET_X, 0, OFFICE.z), new THREE.Vector3(OFFICE.x - OFFICE.w / 2 - 0.2, 0, OFFICE.z)];
  const route = new THREE.CurvePath<THREE.Vector3>();
  for (let i = 1; i < way.length; i++) route.add(new THREE.LineCurve3(way[i - 1], way[i]));
  const STEPS = 120;
  const routeDots = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.06, 0.22), new THREE.MeshBasicMaterial({ color: '#ffffff' }), STEPS);
  const routeColor = new THREE.Color();
  const pale = new THREE.Color(C.routePale);
  const bright = new THREE.Color(HUE.violet);
  for (let i = 0; i < STEPS; i++) {
    const u = i / (STEPS - 1);
    const p = route.getPointAt(u);
    const t = route.getTangentAt(u);
    // offset to the right-hand side of the road's centre line, so the route doesn't sit on the dashes
    const side = new THREE.Vector3(-t.z, 0, t.x).multiplyScalar(-0.4);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), t);
    routeDots.setMatrixAt(i, new THREE.Matrix4().compose(p.add(side).setY(0.06), q, new THREE.Vector3(1, 1, 1)));
    routeDots.setColorAt(i, pale);
  }
  scene.add(routeDots);

  // ---------- a bridge carries the side street over the Ganga ----------
  const BRIDGE_DECK = 0.32;
  const bridgeZ0 = riverZ(STREET_X) - RIVER_W / 2 - 0.9;
  const bridgeZ1 = riverZ(STREET_X) + RIVER_W / 2 + 0.9;
  const bridgeLen = bridgeZ1 - bridgeZ0;
  const bridgeMid = (bridgeZ0 + bridgeZ1) / 2;
  const bridgeMat = new THREE.MeshLambertMaterial({ color: C.bridge });
  const railMat = new THREE.MeshLambertMaterial({ color: C.rail });
  const deck = new THREE.Mesh(box, bridgeMat);
  deck.scale.set(2.1, BRIDGE_DECK, bridgeLen);
  deck.position.set(STREET_X, 0, bridgeMid);
  const rails = [-1, 1].map((sx) => {
    const rail = new THREE.Mesh(box, railMat);
    rail.scale.set(0.1, 0.26, bridgeLen);
    rail.position.set(STREET_X + sx * 1.0, BRIDGE_DECK, bridgeMid);
    return rail;
  });
  const piers = [-1, 1].map((sz) => {
    const pier = new THREE.Mesh(box, bridgeMat);
    pier.scale.set(1.5, BRIDGE_DECK, 0.5);
    pier.position.set(STREET_X, -0.05, bridgeMid + sz * RIVER_W * 0.22);
    return pier;
  });
  [deck, ...rails, ...piers].forEach((m) => {
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
  });
  // height of the side street at z: up onto the deck over a short ramp at each end
  const streetY = (z: number) => {
    const out = Math.max(bridgeZ0 - z, z - bridgeZ1, 0);
    return BRIDGE_DECK * Math.max(0, 1 - out / 1.4);
  };

  // ---------- traffic: four lanes, each with its own speed, its cars evenly spaced so none overlap ----------
  const carColors = [HUE.tangerine, HUE.saffron, ...C.carNeutrals];
  const LANES = [
    { alongX: true, dir: 1, v: 2.6 },
    { alongX: true, dir: -1, v: 2.1 },
    { alongX: false, dir: 1, v: 1.8 },
    { alongX: false, dir: -1, v: 2.3 },
  ];
  const PER_LANE = 4;
  const cars = LANES.flatMap((l) =>
    Array.from({ length: PER_LANE }, (_, k) => ({
      alongX: l.alongX,
      // traffic keeps to the left: heading east that is the north side (-z), heading south it is the east side (+x)
      lane: l.alongX ? -l.dir * 0.38 : l.dir * 0.38,
      pos: -64 + (k + rand() * 0.4) * (128 / PER_LANE),
      v: l.v * l.dir,
      c: new THREE.Color(carColors[Math.floor(rand() * carColors.length)]),
    })),
  );
  const carMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.85, 0.42, 0.44).translate(0, 0.21, 0), new THREE.MeshLambertMaterial({ color: '#ffffff' }), cars.length);
  carMesh.castShadow = true;
  cars.forEach((c, i) => carMesh.setColorAt(i, c.c));
  scene.add(carMesh);
  const carM = new THREE.Matrix4();
  const turned = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  const flat = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  const carP = new THREE.Vector3();

  // ---------- people: walking round the blocks near the office, and a few heading in at the door ----------
  const clothes = [HUE.violet, HUE.tangerine, HUE.saffron, ...C.clothesNeutrals];
  const skin = ['#E9C6A4', '#C99A72', '#9A6B4A', '#F1D6BD'];
  const SIDEWALK = inner / 2 - 0.22;
  const walkers = walkable.flatMap(([cx, cz]) =>
    Array.from({ length: 2 + Math.floor(rand() * 2) }, () => ({ cx, cz, s: rand() * 4, v: (0.32 + rand() * 0.22) * (rand() < 0.5 ? -1 : 1), phase: rand() * 6 })),
  );
  // the way in: from the street corner along the office block's edge to the door, over and over
  const doorPath = [new THREE.Vector3(STREET_X + 0.97, 0, AVENUE_Z - 0.97), new THREE.Vector3(STREET_X + 0.97, 0, OFFICE.z), new THREE.Vector3(OFFICE.x - OFFICE.w / 2 - 0.15, 0, OFFICE.z)];
  const doorFirst = doorPath[0].distanceTo(doorPath[1]);
  const doorLen = doorFirst + doorPath[1].distanceTo(doorPath[2]);
  const arrivals = Array.from({ length: 4 }, (_, k) => ({ u: k / 4, phase: rand() * 6 }));
  const PEOPLE = walkers.length + arrivals.length;
  const bodies = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.12, 0.27, 3, 8).translate(0, 0.3, 0), new THREE.MeshLambertMaterial({ color: '#ffffff' }), PEOPLE);
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 10, 8).translate(0, 0.63, 0), new THREE.MeshLambertMaterial({ color: '#ffffff' }), PEOPLE);
  bodies.castShadow = true;
  for (let i = 0; i < PEOPLE; i++) {
    bodies.setColorAt(i, new THREE.Color(clothes[Math.floor(rand() * clothes.length)]));
    heads.setColorAt(i, new THREE.Color(skin[Math.floor(rand() * skin.length)]));
  }
  scene.add(bodies, heads);
  const personP = new THREE.Vector3();
  const personS = new THREE.Vector3();
  // a point on a block's sidewalk, walking its square edge: s runs 0 to 4, one unit per side
  const onSidewalk = (cx: number, cz: number, s: number, out: THREE.Vector3) => {
    const side = Math.floor(s) % 4;
    const a = -SIDEWALK + (s - Math.floor(s)) * 2 * SIDEWALK;
    if (side === 0) return out.set(cx + a, 0, cz - SIDEWALK);
    if (side === 1) return out.set(cx + SIDEWALK, 0, cz + a);
    if (side === 2) return out.set(cx - a, 0, cz + SIDEWALK);
    return out.set(cx - SIDEWALK, 0, cz - a);
  };
  // a small bob in step, standing on the block's plinth
  const stepY = (t: number, phase: number) => 0.12 + Math.abs(Math.sin(t * 7 + phase)) * 0.035;
  const placePeople = (t: number, dt: number) => {
    walkers.forEach((w, i) => {
      w.s = (((w.s + (w.v * dt) / (2 * SIDEWALK)) % 4) + 4) % 4;
      onSidewalk(w.cx, w.cz, w.s, personP).setY(stepY(t, w.phase));
      carM.compose(personP, flat, one);
      bodies.setMatrixAt(i, carM);
      heads.setMatrixAt(i, carM);
    });
    arrivals.forEach((a, k) => {
      a.u = (a.u + (0.42 * dt) / doorLen) % 1;
      const d = a.u * doorLen;
      if (d < doorFirst) personP.lerpVectors(doorPath[0], doorPath[1], d / doorFirst);
      else personP.lerpVectors(doorPath[1], doorPath[2], (d - doorFirst) / (doorLen - doorFirst));
      personP.setY(stepY(t, a.phase));
      // they grow in at the corner and shrink away at the door rather than popping in and out
      const size = Math.min(1, a.u / 0.08, (1 - a.u) / 0.08);
      carM.compose(personP, flat, personS.setScalar(Math.max(0.001, size)));
      bodies.setMatrixAt(walkers.length + k, carM);
      heads.setMatrixAt(walkers.length + k, carM);
    });
    bodies.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
  };

  // ---------- HTML tags pinned to points in the scene ----------
  const tag = (cls: string, html: string, at: THREE.Vector3) => {
    const el = document.createElement('div');
    el.className = `visit-map__tag ${cls}`;
    el.innerHTML = html;
    host.append(el);
    return { el, at };
  };
  const escape = (s: string) => s.replace(/[&<>"]/g, (ch) => `&#${ch.charCodeAt(0)};`);
  const tags = [
    tag('is-pin', `<b>${escape(label[0])}</b><span>${escape(label[1])}</span>`, new THREE.Vector3(OFFICE.x, PIN_Y + 1.6, OFFICE.z)),
    tag('is-place', 'Ganga', new THREE.Vector3(6, 0, riverZ(6))),
  ];
  const v = new THREE.Vector3();
  let W = 1;
  let H = 1;
  const placeTags = (shown: number) => {
    for (const t of tags) {
      v.copy(t.at).project(camera);
      t.el.style.transform = `translate3d(${((v.x + 1) / 2) * W}px, ${((1 - v.y) / 2) * H + (1 - shown) * 10}px, 0)`;
      t.el.style.opacity = shown.toFixed(3);
    }
  };

  // ---------- camera: a slow drift round the office, leaning towards the pointer ----------
  const look = { az: -0.62, pol: 0.92, r: 46 };
  const lean = { x: 0, y: 0, tx: 0, ty: 0 };
  const placeCamera = (t: number, intro: number) => {
    const az = look.az + Math.sin(t * 0.08) * 0.06 + lean.x * 0.12;
    const pol = look.pol + lean.y * 0.06;
    const r = look.r + (1 - intro) * 18;
    camera.position.set(target.x + Math.sin(az) * Math.sin(pol) * r, target.y + Math.cos(pol) * r, target.z + Math.cos(az) * Math.sin(pol) * r);
    camera.lookAt(target);
  };
  const onPointer = (e: PointerEvent) => {
    const b = host.getBoundingClientRect();
    lean.tx = ((e.clientX - b.left) / b.width - 0.5) * 2;
    lean.ty = ((e.clientY - b.top) / b.height - 0.5) * 2;
  };
  const onLeave = () => {
    lean.tx = 0;
    lean.ty = 0;
  };
  host.addEventListener('pointermove', onPointer);
  host.addEventListener('pointerleave', onLeave);

  const resize = () => {
    W = Math.max(1, host.clientWidth);
    H = Math.max(1, host.clientHeight);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  };
  // Nothing is drawn until the shaders are compiled (see the end), so a resize before then only resizes.
  let compiled = false;
  const ro = new ResizeObserver(() => {
    resize();
    if (!running && compiled) frame(performance.now());
  });
  ro.observe(host);
  resize();

  // ---------- one frame ----------
  // the intro's clock starts once the card is a third on screen; the scene is built well before that
  const clock = { start: -1, last: 0 };
  const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
  let ready = false;
  const frame = (now: number) => {
    const t = reduced ? 30 : clock.start < 0 ? 0 : (now - clock.start) / 1000;
    const dt = Math.min(0.05, clock.last ? (now - clock.last) / 1000 : 0);
    clock.last = now;
    const intro = reduced ? 1 : ease(t / 2.6);
    if (!grown) growCity(t);

    lean.x += (lean.tx - lean.x) * 0.06;
    lean.y += (lean.ty - lean.y) * 0.06;
    placeCamera(t, intro);

    // the tower rises in, then the pin drops onto it and bobs
    const rise = reduced ? 1 : ease((t - 0.5) / 1.2);
    tower.scale.y = Math.max(0.001, OFFICE.h * rise);
    const drop = reduced ? 1 : ease((t - 1.5) / 0.7);
    pin.position.y = PIN_Y + (1 - drop) * 4 + Math.sin(t * 2) * 0.18;
    // its white dot always faces the visitor
    pin.lookAt(camera.position.x, pin.position.y, camera.position.z);
    pin.scale.setScalar(Math.max(0.001, drop * 1.35));

    rings.forEach((ring, i) => {
      const k = (t * 0.45 + i / rings.length) % 1;
      ring.scale.setScalar(1.6 + k * 5.5);
      (ring.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.45 * drop;
    });

    // a bright stretch runs along the route towards the door, again and again
    const front = (t * 0.32) % 1.25;
    for (let i = 0; i < STEPS; i++) {
      const u = i / (STEPS - 1);
      const k = Math.max(0, 1 - Math.abs(u - front) / 0.16);
      routeDots.setColorAt(i, routeColor.copy(pale).lerp(bright, k * intro));
    }
    routeDots.instanceColor!.needsUpdate = true;

    cars.forEach((c, i) => {
      c.pos += c.v * dt;
      if (c.pos > 64) c.pos -= 128;
      if (c.pos < -64) c.pos += 128;
      if (c.alongX) carP.set(c.pos, 0, AVENUE_Z + c.lane);
      // over the Ganga the side street's cars ride up onto the bridge
      else carP.set(STREET_X + c.lane, streetY(c.pos), c.pos);
      carMesh.setMatrixAt(i, carM.compose(carP, c.alongX ? flat : turned, one));
    });
    carMesh.instanceMatrix.needsUpdate = true;
    placePeople(t, dt);

    streakAt.forEach((s, i) => {
      s.x += s.v * dt;
      if (s.x > 70) s.x -= 140;
      carM.compose(carP.set(s.x, 0.05, riverZ(s.x) + s.off), flat, one);
      streaks.setMatrixAt(i, carM);
    });
    streaks.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);
    placeTags(reduced ? 1 : ease((t - 1.9) / 0.6));
    if (!ready) {
      ready = true;
      onReady?.();
    }
  };

  // ---------- run only while the card is on screen ----------
  let raf = 0;
  let running = false;
  let visible = false;
  const loop = (now: number) => {
    frame(now);
    raf = requestAnimationFrame(loop);
  };
  const sync = () => {
    const should = compiled && visible && !document.hidden && !reduced;
    if (should && !running) {
      running = true;
      clock.last = 0;
      raf = requestAnimationFrame(loop);
    } else if (!should && running) {
      running = false;
      cancelAnimationFrame(raf);
    }
  };
  const io = new IntersectionObserver(
    ([e]) => {
      visible = e.isIntersecting;
      if (clock.start < 0 && e.intersectionRatio >= 0.35) clock.start = performance.now();
      sync();
    },
    { threshold: [0, 0.35] },
  );
  io.observe(host);
  document.addEventListener('visibilitychange', sync);
  // The first draw used to compile every shader at once, holding the page for most of a second as the card scrolled
  // in. They compile in the background first, where the browser can; the cap covers browsers where that never
  // reports back, which then compile on the first draw as before.
  let disposed = false;
  Promise.race([renderer.compileAsync(scene, camera).catch(() => undefined), new Promise((done) => setTimeout(done, 1500))]).then(() => {
    if (disposed) return;
    compiled = true;
    frame(performance.now());
    sync();
  });

  return () => {
    disposed = true;
    running = false;
    cancelAnimationFrame(raf);
    io.disconnect();
    ro.disconnect();
    document.removeEventListener('visibilitychange', sync);
    host.removeEventListener('pointermove', onPointer);
    host.removeEventListener('pointerleave', onLeave);
    tags.forEach((t) => t.el.remove());
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
      mats.forEach((m) => {
        (m as THREE.MeshBasicMaterial).map?.dispose();
        m.dispose();
      });
    });
    sun.shadow.dispose();
    renderer.dispose();
    // the canvas is ours and never reused, so free its context now rather than whenever it is collected
    renderer.forceContextLoss();
    renderer.domElement.remove();
  };
}
