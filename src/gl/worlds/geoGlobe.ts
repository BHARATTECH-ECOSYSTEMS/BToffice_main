import * as THREE from 'three';
import { easeOutBack, span } from '../ink';
import { CONTINENTS, INDIA, INDIA_BBOX, inPolygon, type LonLat } from '../geo';
import {
  HUE,
  TAU,
  type DomainWorld,
  arrival,
  createContactShadow,
  createGrowingTube,
  createPointCloud,
  createStage,
  disposeScene,
  flat,
  frosted,
  lacquer,
  matte,
  seeded,
  setColor,
  setGroupOpacity,
} from './kit';

/**
 * 04 · Geo Intelligence — a dot-matrix Earth with India turned towards the viewer.
 * sensing: a satellite crosses the front of the globe and paints a swath across the land · imagery: the survey
 * spreads out from that swath, India fills in at high resolution and mountain ranges rise as relief ·
 * networks: routes arc out of Indian cities with traffic on them · climate: a heat zone pulses over Arabia,
 * a cyclone turns in the Bay of Bengal and the westerlies stream across the north.
 */

const R = 1.2;
const ORBIT = 1.45;
const DOTS = 3600;
/** India is resampled on its own, denser grid (degrees) so its outline reads at this size. */
const INDIA_STEP = 1;
/** Where the globe faces: India's centre, turned towards the camera. */
const FACE: LonLat = [80, 21];
/** The camera looks down by about this much (radians), so the facing point sits this far above the globe's equator. */
const FACE_ELEVATION = 0.2;
/** The globe rocks gently about its axis instead of spinning, so the near side stays the detailed one. */
const SWAY = 0.3;
/** How close (cosine of the angle) a dot must be to the satellite's nadir to count as scanned: the swath's half-width. */
const SWATH = 0.935;
/** Marks a dot the first pass never reaches; finite so `span` stays defined. */
const NEVER = 99;

/** The satellite's angle on its orbit at reel time `c` (chapters, 0–4): one pass across the front of the globe in the
 * first chapter, then a slower drift round the back so it never covers the later chapters. */
const orbitAngle = (c: number) => 0.5 + Math.min(1, c) * 2.2 + Math.max(0, c - 1) * 0.9;
/** Held still through the satellite's pass, so the precomputed swath lines up with the live beam, then eased in. */
const swayAt = (c: number, t: number) => Math.sin(t * 0.16) * SWAY * span(c, 1, 1.6);
const TRAIL = 5;
const JET = 40;
const JET_TRAIL = 4;
const CYCLONE = 90;
const RING_DOTS = 36;
const RINGS = 2;
/** Land at or above this elevation gets a relief column in the imagery chapter. */
const RELIEF_MIN = 0.42;
/** Mountain spines as [longitude, latitude]: the Himalaya and Hindu Kush, Zagros, Alps and the East African highlands. */
const RIDGES: LonLat[] = [
  [70.5, 35.8], [73.5, 35.6], [76.5, 33.8], [79.2, 31.2], [82, 29.6], [85, 28.4], [88, 27.9], [91, 28], [94, 28.6], [96.5, 28.6],
  [47, 34], [51, 31.5], [55, 28.5],
  [7, 46], [10.5, 46.5], [14, 47],
  [37.5, 9], [38.5, 5], [37, 0], [36, -4],
];
const RIDGE_WIDTH = 0.07;
/** Beyond three widths a ridge adds nothing visible, so dots that far away skip the arccosine. */
const RIDGE_REACH = Math.cos(RIDGE_WIDTH * 3);
const CITIES: Record<string, [number, number]> = {
  delhi: [28.61, 77.21],
  mumbai: [19.08, 72.88],
  bengaluru: [12.97, 77.59],
  chennai: [13.08, 80.27],
  kolkata: [22.57, 88.36],
  london: [51.51, -0.13],
  dubai: [25.2, 55.27],
  nairobi: [-1.29, 36.82],
  singapore: [1.35, 103.82],
  tokyo: [35.69, 139.69],
  sydney: [-33.87, 151.21],
};
const ROUTES: [string, string][] = [
  ['delhi', 'mumbai'],
  ['delhi', 'kolkata'],
  ['mumbai', 'dubai'],
  ['chennai', 'singapore'],
  ['delhi', 'london'],
  ['kolkata', 'tokyo'],
  ['mumbai', 'nairobi'],
  ['bengaluru', 'sydney'],
];
/** An Arabian heat zone (west of India) and a Bay of Bengal cyclone (east), as [latitude, longitude]: either side of the routes. */
const HEAT: [number, number] = [23.5, 47];
const STORM: [number, number] = [15, 88.5];

const D2R = Math.PI / 180;

/** Same convention as `toLonLat` below: longitude turns from +x towards -z. */
const setLatLon = (out: THREE.Vector3, lat: number, lon: number, r: number) => {
  const la = lat * D2R;
  const lo = lon * D2R;
  return out.set(Math.cos(la) * Math.cos(lo) * r, Math.sin(la) * r, -Math.cos(la) * Math.sin(lo) * r);
};
const fromLatLon = (lat: number, lon: number, r: number) => setLatLon(new THREE.Vector3(), lat, lon, r);
const toLonLat = (d: THREE.Vector3): LonLat => [Math.atan2(-d.z, d.x) / D2R, Math.asin(d.y) / D2R];
// A bounding-box check first: testing every edge of every continent for each ocean dot made the build take ~60 ms.
const LANDMASSES = CONTINENTS.map((poly) => {
  const lons = poly.map((p) => p[0]);
  const lats = poly.map((p) => p[1]);
  return { poly, minLon: Math.min(...lons), maxLon: Math.max(...lons), minLat: Math.min(...lats), maxLat: Math.max(...lats) };
});
const isLand = (p: LonLat) =>
  LANDMASSES.some((b) => p[0] >= b.minLon && p[0] <= b.maxLon && p[1] >= b.minLat && p[1] <= b.maxLat && inPolygon(p, b.poly));
const inIndia = (p: LonLat) =>
  p[0] >= INDIA_BBOX.minLon && p[0] <= INDIA_BBOX.maxLon && p[1] >= INDIA_BBOX.minLat && p[1] <= INDIA_BBOX.maxLat && inPolygon(p, INDIA);

/** A small circle of angular radius `rho` around `centre` (unit), at bearing `angle`, scaled to `r`. */
const onCircle = (out: THREE.Vector3, frame: { c: THREE.Vector3; e: THREE.Vector3; n: THREE.Vector3 }, rho: number, angle: number, r: number) =>
  out
    .copy(frame.c)
    .multiplyScalar(Math.cos(rho))
    .addScaledVector(frame.e, Math.cos(angle) * Math.sin(rho))
    .addScaledVector(frame.n, Math.sin(angle) * Math.sin(rho))
    .multiplyScalar(r);
const tangentFrame = (c: THREE.Vector3) => {
  const e = new THREE.Vector3(0, 1, 0).cross(c).normalize();
  return { c, e, n: c.clone().cross(e) };
};

const ridgeDirs = RIDGES.map(([lon, lat]) => fromLatLon(lat, lon, 1));
const elevation = (dir: THREE.Vector3) => {
  let near = 0;
  for (const r of ridgeDirs) {
    const d = dir.dot(r);
    if (d < RIDGE_REACH) continue;
    const a = Math.acos(Math.min(1, d)) / RIDGE_WIDTH;
    near = Math.max(near, Math.exp(-a * a));
  }
  // A little broad texture so the uplands aren't only the named ranges.
  const texture = Math.sin(dir.x * 7.1 + 0.4) * Math.cos(dir.y * 6.3 - 0.3) * Math.sin(dir.z * 5.7 + 1.1);
  return near + Math.max(0, texture) * 0.3;
};

interface Spot {
  dir: THREE.Vector3;
  land: boolean;
  india: boolean;
  elev: number;
  /** 0 at India's southern tip, 1 at its northern edge: the order its map fills in. */
  north: number;
  heat: number;
}

export function createGeoGlobe(): DomainWorld {
  const { scene, camera, rig, frame } = createStage([{ radius: 1.56, bottom: -1.56, top: 1.56, round: true }], 0.22, 30, new THREE.Vector3(0, -0.12, 0), 1.08);
  const world = new THREE.Group();
  scene.add(world);
  // Longitude L sits at angle L + yaw from +x, so this yaw brings India's meridian round to +z, towards the camera;
  // the tilt then lowers India's latitude to the camera's line of sight.
  const faceYaw = -Math.PI / 2 - FACE[0] * D2R;
  const tilt = new THREE.Group();
  tilt.rotation.x = FACE[1] * D2R - FACE_ELEVATION;
  world.add(tilt);
  const earth = new THREE.Group();
  tilt.add(earth);

  const shadow = createContactShadow(1.2, 0.16);
  shadow.position.y = -R - 0.2;
  world.add(shadow);

  // An opaque core hides the far side, so only the hemisphere facing us is drawn. A hint of mist separates it
  // from the white stage.
  const core = new THREE.Mesh(new THREE.SphereGeometry(R * 0.99, 64, 48), matte(HUE.paper.clone().lerp(HUE.mist, 0.12), 0.9));
  earth.add(core);

  // ── Surface: a Fibonacci sphere over the world, plus India on its own finer grid
  const heatDir = fromLatLon(...HEAT, 1);
  const spot = (dir: THREE.Vector3, land: boolean, india: boolean): Spot => {
    const [, lat] = toLonLat(dir);
    return {
      dir,
      land,
      india,
      elev: land ? elevation(dir) : 0,
      north: india ? span(lat, INDIA_BBOX.minLat, INDIA_BBOX.maxLat) : 0,
      heat: span(dir.dot(heatDir), Math.cos(0.24), Math.cos(0.04)),
    };
  };
  const surface: Spot[] = [];
  for (let i = 0; i < DOTS; i++) {
    const y = 1 - (2 * (i + 0.5)) / DOTS;
    const r = Math.sqrt(1 - y * y);
    const a = i * 2.39996;
    const dir = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    const ll = toLonLat(dir);
    if (inIndia(ll)) continue;
    surface.push(spot(dir, isLand(ll), false));
  }
  for (let lat = INDIA_BBOX.minLat; lat <= INDIA_BBOX.maxLat; lat += INDIA_STEP) {
    // Columns are spaced by ground distance, not degrees, so the grid stays even towards the north.
    const step = INDIA_STEP / Math.cos(lat * D2R);
    for (let lon = INDIA_BBOX.minLon; lon <= INDIA_BBOX.maxLon; lon += step) {
      if (inPolygon([lon, lat], INDIA)) surface.push(spot(fromLatLon(lat, lon, 1), true, true));
    }
  }
  const count = surface.length;
  const dots = createPointCloud(count);
  surface.forEach(({ dir }, i) => {
    dots.pos[i * 3] = dir.x * R * 1.004;
    dots.pos[i * 3 + 1] = dir.y * R * 1.004;
    dots.pos[i * 3 + 2] = dir.z * R * 1.004;
  });
  earth.add(dots.points);

  // Relief columns along the mountain ranges, one colour so they read as terrain rather than a heat map.
  const peaks = surface.filter((d) => d.elev >= RELIEF_MIN);
  const relief = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.007, 0.011, 1, 6), lacquer(HUE.violet), peaks.length);
  relief.geometry.translate(0, 0.5, 0);
  const peakTurn = peaks.map(({ dir }) => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
  earth.add(relief);

  // ── Satellite on an orbit that crosses the front of the globe, north of the equator
  const satellite = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.18), lacquer(HUE.paper));
  const panelMat = lacquer(HUE.violet);
  const panels = [-1, 1].map((side) => {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.014, 0.12), panelMat);
    panel.position.x = side * 0.2;
    return panel;
  });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1, 40, 1, true), frosted(HUE.violet, 0.18));
  cone.geometry.translate(0, -0.5, 0);
  satellite.add(body, ...panels, cone);
  world.add(satellite);
  const orbitTilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.32, 0, -0.3));
  const orbitNormal = new THREE.Vector3(0, 1, 0).applyQuaternion(orbitTilt);
  const orbit = createGrowingTube(
    new THREE.CatmullRomCurve3(
      Array.from({ length: 64 }, (_, i) => new THREE.Vector3(Math.cos((i / 64) * TAU) * ORBIT, 0, Math.sin((i / 64) * TAU) * ORBIT).applyQuaternion(orbitTilt)),
      true
    ),
    0.004,
    flat(HUE.ink, 0.16),
    128
  );
  world.add(orbit.mesh);

  // When the first pass reaches each dot, in reel time. Worked out once rather than painted frame by frame, so a
  // paused reel, a seek, reduced motion or a dropped frame all show the right swath, and each loop starts clean.
  // In the globe's resting frame the nadir at orbit angle `a` is cos(a)·u + sin(a)·w, so a dot d is under the beam
  // while ρ·cos(a − φ) > SWATH, with ρ and φ the length and angle of (d·u, d·w): an arc of half-width acos(SWATH / ρ).
  const scanAt = new Float32Array(count).fill(NEVER);
  {
    const toRest = tilt.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), faceYaw)).invert();
    const u = new THREE.Vector3(1, 0, 0).applyQuaternion(orbitTilt).applyQuaternion(toRest);
    const w = new THREE.Vector3(0, 0, 1).applyQuaternion(orbitTilt).applyQuaternion(toRest);
    const from = orbitAngle(0);
    const to = orbitAngle(1); // the pass is linear in reel time over the first chapter
    for (let i = 0; i < count; i++) {
      const du = surface[i].dir.dot(u);
      const dw = surface[i].dir.dot(w);
      const rho = Math.hypot(du, dw);
      if (rho <= SWATH) continue;
      const half = Math.acos(SWATH / rho);
      const phi = Math.atan2(dw, du);
      for (const turn of [-TAU, 0, TAU]) {
        const enter = Math.max(from, phi + turn - half);
        if (enter <= Math.min(to, phi + turn + half)) scanAt[i] = Math.min(scanAt[i], (enter - from) / (to - from));
      }
    }
  }

  // ── Cities and routes
  const cityNames = Object.keys(CITIES);
  const cityPins = cityNames.map((name, i) => {
    const pin = new THREE.Group();
    pin.add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), lacquer(HUE.orange)));
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 12), frosted(HUE.orange, 0.25));
    const haloMat = halo.material as THREE.MeshPhysicalMaterial;
    pin.add(halo);
    pin.position.copy(fromLatLon(...CITIES[name], R * 1.02));
    earth.add(pin);
    return { pin, halo, haloMat, i };
  });
  const routes = ROUTES.map(([a, b]) => {
    const start = fromLatLon(...CITIES[a], R * 1.02);
    const end = fromLatLon(...CITIES[b], R * 1.02);
    // Longer hops fly higher. The control point is set so the arc's apex sits exactly that far off the surface.
    const lift = 0.05 + 0.2 * (start.angleTo(end) / Math.PI);
    const chordMid = start.clone().add(end).length() / 2;
    const control = start.clone().add(end).normalize().multiplyScalar(2 * R * (1 + lift) - chordMid);
    const tube = createGrowingTube(new THREE.QuadraticBezierCurve3(start, control, end), 0.007, flat(HUE.orange, 0.85), 56);
    earth.add(tube.mesh);
    return tube;
  });
  const traffic = createPointCloud(ROUTES.length * TRAIL);
  earth.add(traffic.points);

  // ── Climate: westerlies across the north, a cyclone in the Bay of Bengal, heat rings over Arabia
  const weather = createPointCloud(JET * JET_TRAIL + CYCLONE + RINGS * RING_DOTS);
  earth.add(weather.points);
  const rnd = seeded(7);
  const jets = Array.from({ length: JET }, () => ({ lat: 34 + rnd() * 18, phase: rnd(), speed: 0.7 + rnd() * 0.5 }));
  const swirl = Array.from({ length: CYCLONE }, () => ({ phase: rnd(), arm: Math.floor(rnd() * 3) }));
  const storm = tangentFrame(fromLatLon(...STORM, 1));
  const heatFrame = tangentFrame(heatDir.clone());

  const sat = new THREE.Vector3();
  const v = new THREE.Vector3();
  const up = new THREE.Vector3();
  const footprint = new THREE.Vector3();
  const plane = new THREE.Vector3();
  const toEarth = new THREE.Quaternion();
  const tone = new THREE.Color();
  const m = new THREE.Matrix4();
  const s = new THREE.Vector3();
  const viewer = new THREE.Vector3();
  let lastMapped = -1;

  const setPoint = (cloud: typeof weather, i: number, p: THREE.Vector3) => {
    cloud.pos[i * 3] = p.x;
    cloud.pos[i * 3 + 1] = p.y;
    cloud.pos[i * 3 + 2] = p.z;
  };

  return {
    scene,
    camera,
    frame,
    update(f) {
      const { t } = f;
      rig(f, 0.12);
      const chapters = f.act + f.progress;
      earth.rotation.y = faceYaw + swayAt(chapters, t);
      world.updateMatrixWorld(true);

      const sensing = arrival(f, 0, 0.5);
      const mapped = arrival(f, 1, 0.75);
      const networks = arrival(f, 2, 0.55);
      const climate = arrival(f, 3, 0.5);

      const a = orbitAngle(chapters);
      sat.set(Math.cos(a) * ORBIT, 0, Math.sin(a) * ORBIT).applyQuaternion(orbitTilt);
      satellite.position.copy(sat);
      // Beam straight down, panels square to the orbit: a full basis, so the panels don't roll during the pass.
      up.copy(sat).normalize();
      m.makeBasis(orbitNormal, up, s.crossVectors(orbitNormal, up));
      satellite.quaternion.setFromRotationMatrix(m);
      cone.scale.set(1, sat.length() - R, 1);
      satellite.scale.setScalar(Math.max(0.0001, easeOutBack(span(sensing, 0, 0.6))));
      setGroupOpacity(cone, span(sensing, 0.3, 1));
      orbit.grow(span(sensing, 0, 0.8));
      // Its front arc crosses India, so it steps back once the satellite has done its pass.
      setGroupOpacity(orbit.mesh, 1 - 0.6 * mapped);

      // Work in the globe's own frame, so each dot is a dot product rather than a matrix multiply.
      earth.getWorldQuaternion(toEarth).invert();
      footprint.copy(sat).normalize().applyQuaternion(toEarth);
      plane.copy(orbitNormal).applyQuaternion(toEarth);
      viewer.copy(camera.position).normalize().applyQuaternion(toEarth);

      // The pass leaves a lasting swath; in the imagery chapter the survey spreads outwards from it.
      const heatPulse = climate * (0.75 + 0.25 * Math.sin(t * 3));
      for (let i = 0; i < count; i++) {
        const { dir, land, india, north, heat } = surface[i];
        const scan = sensing * span(dir.dot(footprint), SWATH - 0.035, SWATH + 0.035);
        const off = Math.abs(dir.dot(plane));
        const seen = Math.max(span(chapters - scanAt[i], 0, 0.05), span(mapped * 1.4, off, off + 0.4));

        if (india) {
          const fill = span(mapped, 0.2 + north * 0.5, 0.45 + north * 0.5);
          tone.copy(HUE.mist).lerp(HUE.violet, Math.max(seen, scan)).lerp(HUE.saffron, fill);
          dots.size[i] = 0.019 + scan * 0.01;
          dots.alpha[i] = 0.6 + 0.4 * seen;
        } else if (land) {
          tone.copy(HUE.mist).lerp(HUE.violet, 0.25 + 0.75 * seen);
          dots.size[i] = 0.03 + scan * 0.02;
          dots.alpha[i] = 0.55 + 0.45 * seen;
        } else {
          tone.copy(HUE.mist).lerp(HUE.violet, scan * 0.6);
          dots.size[i] = 0.017 + scan * 0.012;
          dots.alpha[i] = 0.36 + 0.4 * scan;
        }
        if (heat > 0 && climate > 0) {
          tone.lerp(HUE.saffron, heat * heatPulse);
          dots.alpha[i] = Math.max(dots.alpha[i], heat * climate);
        }
        setColor(dots.col, i, tone);
        dots.alpha[i] *= span(sensing, 0, 0.3);
      }
      dots.commit();

      if (mapped !== lastMapped) {
        lastMapped = mapped;
        peaks.forEach(({ dir, elev }, k) => {
          const order = span(elev, RELIEF_MIN, 1.1) * 0.35;
          const grow = easeOutBack(span(mapped, 0.25 + order, 0.65 + order));
          v.copy(dir).multiplyScalar(R);
          m.compose(v, peakTurn[k], s.set(1, Math.max(0.0001, (elev - RELIEF_MIN * 0.5) * 0.16 * grow), 1));
          relief.setMatrixAt(k, m);
        });
        relief.instanceMatrix.needsUpdate = true;
        relief.visible = mapped > 0.25;
      }

      cityPins.forEach(({ pin, halo, haloMat, i }) => {
        pin.scale.setScalar(Math.max(0.0001, easeOutBack(span(networks, i * 0.04, i * 0.04 + 0.3))));
        // The halo swells and fades out together, so restarting the pulse never shows as a snap.
        const pulse = (t * 0.9 + i * 0.3) % 1;
        halo.scale.setScalar(1 + 0.6 * pulse);
        haloMat.opacity = 0.3 * (1 - pulse);
      });
      routes.forEach((route, i) => {
        const drawn = span(networks, 0.12 + i * 0.06, 0.5 + i * 0.06);
        route.grow(drawn);
        const u = (t * 0.3 + i * 0.17) % 1;
        for (let k = 0; k < TRAIL; k++) {
          const j = i * TRAIL + k;
          const at = Math.max(0, u - k * 0.022);
          route.curve.getPoint(at, v);
          setPoint(traffic, j, v);
          setColor(traffic.col, j, HUE.orange);
          traffic.size[j] = 0.07 * (1 - k / TRAIL);
          // Traffic only runs on road that has been drawn.
          traffic.alpha[j] = at <= drawn ? span(networks, 0.6, 0.9) * (1 - k / TRAIL) : 0;
        }
      });
      traffic.commit();

      weather.points.visible = climate > 0;
      if (climate === 0) return;
      // Westerlies: short streaks flowing east along a wavering band.
      let w = 0;
      jets.forEach(({ lat, phase, speed }) => {
        const lon = (phase * 360 + t * 9 * speed) % 360;
        for (let k = 0; k < JET_TRAIL; k++, w++) {
          const at = lon - k * 2.4;
          setLatLon(v, lat + Math.sin(at * D2R * 3 + phase * TAU) * 4, at, R * 1.05);
          setPoint(weather, w, v);
          setColor(weather.col, w, HUE.violet);
          weather.size[w] = 0.024 * (1 - k / (JET_TRAIL + 1));
          weather.alpha[w] = climate * 0.6 * (1 - k / JET_TRAIL) * span(v.dot(viewer) / v.length(), -0.05, 0.3);
        }
      });
      // Cyclone: three arms winding in towards the eye.
      swirl.forEach(({ phase, arm }) => {
        const life = (t * 0.14 + phase) % 1;
        const rho = 0.03 + (1 - life) * 0.19;
        const angle = (arm / 3) * TAU + rho * 14 + t * 0.9;
        onCircle(v, storm, rho, angle, R * 1.04);
        setPoint(weather, w, v);
        setColor(weather.col, w, HUE.violet);
        weather.size[w] = 0.032;
        weather.alpha[w] = climate * 0.85 * span(life, 0, 0.2) * span(life, 1, 0.8) * span(v.dot(viewer) / v.length(), -0.05, 0.3);
        w++;
      });
      // Heat: isotherm rings spreading out from the hot spot.
      for (let ring = 0; ring < RINGS; ring++) {
        const life = (t * 0.35 + ring / RINGS) % 1;
        const rho = 0.04 + life * 0.2;
        for (let k = 0; k < RING_DOTS; k++, w++) {
          onCircle(v, heatFrame, rho, (k / RING_DOTS) * TAU, R * 1.012);
          setPoint(weather, w, v);
          setColor(weather.col, w, HUE.saffron);
          weather.size[w] = 0.026;
          weather.alpha[w] = climate * (1 - life) * span(v.dot(viewer) / v.length(), -0.05, 0.3);
        }
      }
      weather.commit();
    },
    dispose: () => disposeScene(scene),
  };
}
