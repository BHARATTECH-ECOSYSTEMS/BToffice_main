import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { SAMPLED_THREADS, THREAD_HALF_WIDTH } from './threads';
import {
  SILO_CENTERS,
  ARCS,
  GLOBE_R,
  LAYER_COUNT,
  LAYER_GAP,
  LAYER_HALF,
  LAYER_SUB_SYSTEMS,
  LOGO_R,
  arcPoint,
  orbitLayout,
  rng,
} from './formations';
import { LAYERS, LAYER_FAMILIES } from '../content';
import { INDIA, INDIA_BBOX, INDIA_HUBS, inPolygon, isLandmass, lonLatToVec } from './geo';

/**
 * Solid objects. Every particle formation that describes a thing (the mark, an orbit, the layer stack, the globe,
 * the helix) has a solid, lit counterpart built from the same geometry. The particles carry the morph between
 * shapes; once a shape settles, its solid resolves in place, so each chapter ends on a real object.
 */

export interface SolidState {
  highlight: number; // group in focus, -1 for none
  hlAmt: number; // 0…1 how strongly it is in focus
  explode: number; // layer stack separation
  time: number;
  dark: number; // 0 light theme … 1 dark
  key: string; // the formation on screen (one solid can serve several, like the tools across the problem steps)
  heroMotion: number;
  dt: number;
}

export interface Solid {
  root: THREE.Group;
  mats: THREE.Material[];
  update(s: SolidState): void;
  dispose(): void;
  /** Live anchor points (screen labels follow these) when the object moves its parts around. */
  anchors?: THREE.Object3D[];
}

const C = (hex: string) => new THREE.Color(hex);

/** Light and dark versions of every surface. */
const PAL = {
  violet: [C('#5b3df5'), C('#6f55ff')],
  teal: [C('#2a7de1'), C('#5aa2f5')], // azure: the second tier (named teal for history)
  steel: [C('#5f6b78'), C('#9aa5b2')],
  violetDeep: [C('#3a1fa8'), C('#4b2fd0')],
  ceramic: [C('#fbf9f5'), C('#2a2734')],
  ceramic2: [C('#efebf6'), C('#1f1d27')],
  ink: [C('#2a2633'), C('#d9d3ea')],
  thread: [C('#fdfcff'), C('#f4f1ff')],
  amber: [C('#ea580c'), C('#ff7a29')],
  wire: [C('#8f88a6'), C('#6a6385')],
};
type Tone = keyof typeof PAL;
const tone = (t: Tone, d: number, out = new THREE.Color()) => out.lerpColors(PAL[t][0], PAL[t][1], d);

function physical(opts: THREE.MeshPhysicalMaterialParameters) {
  return new THREE.MeshPhysicalMaterial({ transparent: true, ...opts });
}

// ── The mark: a glazed violet sphere with the three threads inlaid in white ─────────────────────────────

function threadMaskTexture(): THREE.CanvasTexture {
  const S = 1024;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, S, S);
  g.strokeStyle = '#fff';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = THREAD_HALF_WIDTH * 2 * (S / 2) * 0.96;
  for (const curve of SAMPLED_THREADS) {
    g.beginPath();
    curve.forEach(([x, y], i) => {
      const px = (x * 0.5 + 0.5) * S;
      const py = (0.5 - y * 0.5) * S;
      if (i) g.lineTo(px, py);
      else g.moveTo(px, py);
    });
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

/** A physical material whose front hemisphere carries the animated thread inlay. */
function markMaterial(mask: THREE.Texture) {
  const m = physical({ roughness: 0.22, metalness: 0.08, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.45, sheenRoughness: 0.4 });
  const thread = { value: new THREE.Color('#fdfcff') };
  const uTime = { value: 0 };
  const uPulse = { value: 1 };
  m.userData.thread = thread;
  m.userData.uTime = uTime;
  m.userData.uPulse = uPulse;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uMask = { value: mask };
    sh.uniforms.uThread = thread;
    sh.uniforms.uTime = uTime;
    sh.uniforms.uPulse = uPulse;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObjN;\nvarying vec3 vWorldP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjN = normalize(position);\nvWorldP = (modelMatrix * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObjN;\nvarying vec3 vWorldP;\nuniform sampler2D uMask;\nuniform vec3 uThread;\nuniform float uTime;\nuniform float uPulse;')
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        vec2 pCoord = vObjN.z >= 0.0 ? vObjN.xy : vec2(-vObjN.x, vObjN.y);
        float th = texture2D(uMask, pCoord * 0.5 + 0.5).r;
        // Electric photon wave streaming continuously through the threads
        float stream = sin(pCoord.x * 6.0 + pCoord.y * 8.5 - uTime * 3.4);
        float pulse = smoothstep(0.35, 0.95, stream);
        vec3 photonColor = mix(vec3(0.55, 0.85, 1.0), vec3(1.0, 1.0, 1.0), pulse);
        vec3 activeThread = mix(uThread, photonColor, pulse * 0.75 * uPulse);
        diffuseColor.rgb = mix(diffuseColor.rgb, activeThread, smoothstep(0.32, 0.68, th));`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        vec2 pCoordE = vObjN.z >= 0.0 ? vObjN.xy : vec2(-vObjN.x, vObjN.y);
        float thEdge = texture2D(uMask, pCoordE * 0.5 + 0.5).r;
        float streamE = sin(pCoordE.x * 6.0 + pCoordE.y * 8.5 - uTime * 3.4);
        float pulseE = smoothstep(0.4, 0.95, streamE);
        vec3 glowCol = mix(vec3(0.4, 0.65, 1.0), vec3(1.0, 0.95, 1.0), pulseE);
        totalEmissiveRadiance += glowCol * smoothstep(0.35, 0.7, thEdge) * (0.4 + 0.6 * pulseE) * uPulse;

        // Ethereal outer rim luminescence (Fresnel aura)
        float fresnel = pow(clamp(1.0 - abs(vObjN.z), 0.0, 1.0), 2.6);
        totalEmissiveRadiance += mix(vec3(0.3, 0.15, 0.9), vec3(0.65, 0.35, 1.0), 0.5) * fresnel * 0.35;`,
      );
  };
  return m;
}

function buildMark(mask: THREE.Texture): Solid {
  const root = new THREE.Group();
  const mark = new THREE.Group();
  root.add(mark);

  // 1. The Main Core Sphere
  const mat = markMaterial(mask);
  const sphereGeo = new THREE.SphereGeometry(LOGO_R * 0.985, 128, 96);
  const sphere = new THREE.Mesh(sphereGeo, mat);
  sphere.castShadow = true;
  mark.add(sphere);

  // 2. Inner Glowing Quantum Facet Core
  const coreGeo = new THREE.IcosahedronGeometry(LOGO_R * 0.76, 2);
  const coreMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#7B5CFF'),
    wireframe: true,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const innerCore = new THREE.Mesh(coreGeo, coreMat);
  mark.add(innerCore);

  // 3. Multi-tier Celestial & Gyroscopic Astrolabe Rings
  // Ring 1: Primary Precision Astrolabe
  const ring1Geo = new THREE.TorusGeometry(LOGO_R * 1.22, 0.009, 16, 200);
  const ring1Mat = new THREE.MeshPhysicalMaterial({
    roughness: 0.15,
    metalness: 0.9,
    clearcoat: 1,
    transparent: true,
    opacity: 0.85,
    color: new THREE.Color('#9A85FF'),
  });
  const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
  mark.add(ring1);

  // Ring 2: Tilted Counter-Rotating Meridian Astrolabe
  const ring2Geo = new THREE.TorusGeometry(LOGO_R * 1.36, 0.0065, 14, 200);
  const ring2Mat = new THREE.MeshPhysicalMaterial({
    roughness: 0.2,
    metalness: 0.85,
    clearcoat: 0.8,
    transparent: true,
    opacity: 0.72,
    color: new THREE.Color('#5AA2F5'),
  });
  const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
  mark.add(ring2);

  // Ring 3: Polar Precision Latitude Ring
  const ring3Geo = new THREE.TorusGeometry(LOGO_R * 1.14, 0.005, 12, 160);
  const ring3Mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#FF8643'),
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const ring3 = new THREE.Mesh(ring3Geo, ring3Mat);
  mark.add(ring3);



  // 5. Orbiting Quantum Stardust Swarm (Sparkling Constellation)
  const sparkCount = 110;
  const sparkPositions = new Float32Array(sparkCount * 3);
  const sparkPhases = new Float32Array(sparkCount);
  const sparkRadii = new Float32Array(sparkCount);
  const sparkSpeeds = new Float32Array(sparkCount);
  const sparkJitterY = new Float32Array(sparkCount);
  const rGen = rng(47);
  for (let i = 0; i < sparkCount; i++) {
    sparkPhases[i] = rGen() * Math.PI * 2;
    sparkRadii[i] = LOGO_R * (1.12 + rGen() * 0.52);
    sparkSpeeds[i] = 0.4 + rGen() * 0.75;
    sparkJitterY[i] = (rGen() - 0.5) * 0.75;
    sparkPositions[i * 3] = sparkRadii[i] * Math.cos(sparkPhases[i]);
    sparkPositions[i * 3 + 1] = sparkJitterY[i];
    sparkPositions[i * 3 + 2] = sparkRadii[i] * Math.sin(sparkPhases[i]);
  }
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
  const sparkMat = new THREE.PointsMaterial({
    size: 0.026,
    color: new THREE.Color('#FFFFFF'),
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sparkPoints = new THREE.Points(sparkGeo, sparkMat);
  mark.add(sparkPoints);

  const c = new THREE.Color();
  return {
    root,
    mats: [mat, ring1Mat, ring2Mat, ring3Mat, coreMat, sparkMat],
    update(s) {
      const dark = s.dark;
      mat.color.copy(tone('violet', dark, c));
      (mat.userData.thread.value as THREE.Color).copy(tone('thread', dark, c));
      mat.userData.uTime.value = s.time;
      mat.userData.uPulse.value = s.heroMotion;

      // Color syncing
      ring1Mat.color.copy(tone('violet', dark, c)).lerp(new THREE.Color('#A892FF'), 0.35);
      ring2Mat.color.copy(tone('teal', dark, c));
      coreMat.color.copy(tone('violetDeep', dark, c)).lerp(new THREE.Color('#B9A6FF'), 0.5);
      sparkMat.color.lerpColors(new THREE.Color('#E3D8FF'), new THREE.Color('#FFFFFF'), 0.5 + 0.5 * Math.sin(s.time * 2.2));

      // Visibilities
      const visible = s.heroMotion > 0.005;
      ring1.visible = ring2.visible = ring3.visible = sparkPoints.visible = innerCore.visible = visible;

      // Organic Levitation & Harmonic Floating
      const lev = s.heroMotion * (Math.sin(s.time * 1.2) * 0.09 + Math.cos(s.time * 2.1) * 0.02);
      mark.position.y = lev;

      // FULL 360-DEGREE CONTINUOUS ROTATION
      mark.rotation.y = s.time * 0.48;
      mark.rotation.x = s.heroMotion * (Math.sin(s.time * 0.6) * 0.06);
      mark.rotation.z = s.heroMotion * (Math.cos(s.time * 0.7) * 0.04);

      // Inner Core Counter-Rotation & Pulse
      const coreScale = 1.0 + Math.sin(s.time * 2.4) * 0.06;
      innerCore.scale.setScalar(coreScale);
      innerCore.rotation.y = -s.time * 0.65;
      innerCore.rotation.x = Math.sin(s.time * 0.8) * 0.15;

      // Ring 1 (Astrolabe): 360-degree gyroscopic rotation
      ring1.rotation.set(0.55 + Math.sin(s.time * 0.5) * 0.05, s.time * 0.52, -0.28);

      // Ring 2 (Celestial): 360-degree counter-rotation
      ring2.rotation.set(-0.48 + Math.cos(s.time * 0.4) * 0.05, -s.time * 0.38, 0.35);

      // Ring 3 (Polar Meridian): 360-degree orbital rotation
      ring3.rotation.set(s.time * 0.3, 0.85, s.time * 0.22);



      // Orbiting Quantum Sparks Animation
      const posArr = sparkGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < sparkCount; i++) {
        const angle = sparkPhases[i] + s.time * sparkSpeeds[i] * 0.4;
        const rad = sparkRadii[i] + Math.sin(s.time * 1.5 + sparkPhases[i]) * 0.08;
        const yOff = sparkJitterY[i] + Math.sin(angle * 2.0) * 0.18;
        posArr[i * 3] = rad * Math.cos(angle);
        posArr[i * 3 + 1] = yOff;
        posArr[i * 3 + 2] = rad * Math.sin(angle);
      }
      sparkGeo.attributes.position.needsUpdate = true;
    },
    dispose() {
      sphereGeo.dispose();
      mat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      ring1Geo.dispose();
      ring1Mat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
      ring3Geo.dispose();
      ring3Mat.dispose();
      sparkGeo.dispose();
      sparkMat.dispose();
    },
  };
}

// ── Orbits: a core (the mark again), satellites on fine rings, and threads of light to the active one ───────

function buildOrbit(satellites: number, mask: THREE.Texture): Solid {
  const root = new THREE.Group();
  const { rings, sats, place, coreR } = orbitLayout(satellites);

  const coreMat = markMaterial(mask);
  const core = new THREE.Mesh(new THREE.SphereGeometry(coreR * 1.02, 96, 64), coreMat);
  root.add(core);

  // Subtle, delicate hairline orbital rings that cleanly frame the system without clutter
  const ringMat = physical({ roughness: 0.35, metalness: 0.25, opacity: satellites <= 8 ? 0.42 : 0.34 });
  const ringGeos = rings.map((r) => new THREE.TorusGeometry(r.radius, 0.0032, 8, 240));
  ringGeos.forEach((geo, i) => {
    const m = new THREE.Mesh(geo, ringMat);
    m.rotation.set(rings[i].tiltX, 0, rings[i].tiltZ, 'ZYX');
    root.add(m);
  });

  // Track orbital parameters for each satellite
  interface SatOrb {
    ring: (typeof rings)[number];
    baseAngle: number;
    speed: number;
    selfSpinSpeed: number;
  }
  const satOrbs: SatOrb[] = [];
  const RING_SPEEDS = satellites <= 8 ? [0.48, -0.38] : [0.23, -0.19, 0.15];
  let satIdx = 0;
  rings.forEach((ring, ri) => {
    for (let s = 0; s < ring.count; s++) {
      satOrbs.push({
        ring,
        baseAngle: (s / ring.count) * Math.PI * 2 + ri * 0.7,
        speed: RING_SPEEDS[ri % RING_SPEEDS.length] || 0.1,
        selfSpinSpeed: 1.2 + (satIdx % 5) * 0.25,
      });
      satIdx++;
    }
  });

  // Clean, sleek satellite spheres
  const satGeo = new THREE.SphereGeometry(0.082, 48, 32);
  const haloGeo = new THREE.TorusGeometry(0.13, 0.005, 8, 64);
  const satMats = sats.map(() => physical({ roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.1 }));
  const haloMats = sats.map(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }));
  const halos: THREE.Mesh[] = [];
  const satMeshes = sats.map((p, i) => {
    const m = new THREE.Mesh(satGeo, satMats[i]);
    m.position.set(...p);
    root.add(m);
    const h = new THREE.Mesh(haloGeo, haloMats[i]);
    h.position.set(...p);
    root.add(h);
    halos.push(h);
    return m;
  });

  // Single focused light thread: only rendered for the active satellite to keep the view clean
  const lineMats = sats.map(() => new THREE.LineBasicMaterial({ transparent: true, opacity: 0 }));
  const lineGeos = sats.map(() => new THREE.BufferGeometry());
  const updateLine = (i: number, v: THREE.Vector3, time: number) => {
    const a = v.clone().setLength(coreR * 1.02);
    const mid = v.clone().multiplyScalar(0.55).add(new THREE.Vector3(0, 0.06 * Math.sin(time * 2 + i), 0));
    const end = v.clone().setLength(v.length() - 0.08);
    const curve = new THREE.QuadraticBezierCurve3(a, mid, end);
    lineGeos[i].setFromPoints(curve.getPoints(24));
  };
  const lines = sats.map((p, i) => {
    updateLine(i, new THREE.Vector3(...p), 0);
    const line = new THREE.Line(lineGeos[i], lineMats[i]);
    line.visible = false;
    root.add(line);
    return line;
  });

  const c = new THREE.Color();
  const cam = new THREE.Quaternion();
  return {
    root,
    anchors: satMeshes,
    mats: [coreMat, ringMat, ...satMats, ...haloMats, ...lineMats],
    update(s) {
      coreMat.color.copy(tone('violet', s.dark, c));
      (coreMat.userData.thread.value as THREE.Color).copy(tone('thread', s.dark, c));
      coreMat.userData.uTime.value = s.time;
      coreMat.userData.uPulse.value = 1;
      ringMat.color.copy(tone('wire', s.dark, c));

      // 1. Central sphere active rotation on its axis & graceful levitation
      core.rotation.y = s.time * 0.45;
      core.rotation.x = Math.sin(s.time * 0.22) * 0.05;
      core.rotation.z = Math.cos(s.time * 0.18) * 0.04;
      core.position.y = Math.sin(s.time * 1.4) * 0.02;

      // 2. Satellites revolving in clean concentric orbits & rotating on their own axes
      satMeshes.forEach((m, i) => {
        const orb = satOrbs[i];
        if (orb) {
          // Orbital revolution along concentric ring track
          const angle = orb.baseAngle + orb.speed * s.time;
          const [x, y, z] = place(orb.ring, angle);
          m.position.set(x, y, z);
          halos[i].position.set(x, y, z);

          // Ball rotating on its own axis
          m.rotation.y = s.time * orb.selfSpinSpeed + i;
          m.rotation.x = s.time * (orb.selfSpinSpeed * 0.5) + i * 0.4;
          m.rotation.z = Math.sin(s.time * 0.9 + i) * 0.2;
        }

        const on = i === s.highlight ? s.hlAmt : 0;
        satMats[i].color.lerpColors(tone('ceramic', s.dark), tone('violet', s.dark), on);
        satMats[i].emissive.copy(tone('violet', s.dark, c)).multiplyScalar(on * 0.35);
        m.scale.setScalar(1 + on * 0.35);
        haloMats[i].color.copy(tone('violet', s.dark, c));
        haloMats[i].userData.target = on * 0.9;

        // Clean light connection: ONLY show thread for active satellite to keep space uncluttered
        if (on > 0.01) {
          updateLine(i, m.position, s.time);
          lineMats[i].color.copy(tone('violet', s.dark, c));
          lineMats[i].userData.target = on * 0.85;
          lines[i].visible = true;
        } else {
          lineMats[i].userData.target = 0;
          lines[i].visible = false;
        }

        // Halos always face camera
        root.getWorldQuaternion(cam).invert();
        halos[i].quaternion.copy(cam);
        halos[i].scale.setScalar(1 + 0.08 * Math.sin(s.time * 3 + i));
      });
    },
    dispose() {
      core.geometry.dispose();
      ringGeos.forEach((g) => g.dispose());
      satGeo.dispose();
      haloGeo.dispose();
      lineGeos.forEach((g) => g.dispose());
      [coreMat, ringMat, ...satMats, ...haloMats, ...lineMats].forEach((m) => m.dispose());
    },
  };
}

// ── The layer stack: nine wafers in three families, each engraved with its name ─────────────────

/** The architecture's three families, as tones: intelligence, knowledge & trust, foundation. */
const FAMILY_TONE: Tone[] = ['violet', 'violet', 'violet'];
const familyOf = (l: number) => LAYER_FAMILIES.findIndex((f) => l >= f.from && l <= f.to);

function etchTexture(l: number, family: number): THREE.CanvasTexture {
  const S = 1024;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d')!;
  g.clearRect(0, 0, S, S);
  const r = rng(300 + l);
  const gen = LAYER_SUB_SYSTEMS[l];
  const total = 2600;
  g.fillStyle = '#fff';
  // the layer's own circuit, kept to the middle of the wafer so the type has room
  for (let k = 0; k < total; k++) {
    const [x, z] = gen(k, total, r);
    const px = (x / LAYER_HALF) * 0.36 * S + S / 2;
    const py = (z / LAYER_HALF) * 0.36 * S + S * 0.44;
    g.globalAlpha = 0.75 + r() * 0.25;
    g.fillRect(px - 2.4, py - 2.4, 4.8, 4.8);
  }
  g.globalAlpha = 1;
  g.strokeStyle = '#fff';
  g.lineWidth = 5;
  g.strokeRect(S * 0.045, S * 0.045, S * 0.91, S * 0.91);
  g.globalAlpha = 0.7;
  g.lineWidth = 2.5;
  g.strokeRect(S * 0.08, S * 0.08, S * 0.84, S * 0.84);
  // name along the front edge, where the viewer reads it
  g.globalAlpha = 1;
  g.textBaseline = 'alphabetic';
  g.font = `600 ${Math.round(S * 0.062)}px Inter, "Helvetica Neue", Arial, sans-serif`;
  g.fillText(LAYERS[l].name, S * 0.11, S * 0.875);
  g.globalAlpha = 0.6;
  g.font = `500 ${Math.round(S * 0.032)}px "Geist Mono", ui-monospace, Menlo, monospace`;
  g.fillText(LAYER_FAMILIES[family].name.toUpperCase(), S * 0.34, S * 0.79);
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildLayers(): Solid {
  const root = new THREE.Group();
  const top = ((LAYER_COUNT - 1) / 2) * LAYER_GAP;
  const slabGeo = new RoundedBoxGeometry(LAYER_HALF * 2, 0.06, LAYER_HALF * 2, 4, 0.07);
  const etchGeo = new THREE.PlaneGeometry(LAYER_HALF * 2 * 0.97, LAYER_HALF * 2 * 0.97);
  const textures: THREE.Texture[] = [];
  const slabMats: THREE.MeshPhysicalMaterial[] = [];
  const etchMats: THREE.MeshBasicMaterial[] = [];
  const slabs: THREE.Group[] = [];
  const anchors: THREE.Object3D[] = [];
  const corners: THREE.Object3D[] = [];
  const fam: number[] = [];
  for (let l = 0; l < LAYER_COUNT; l++) {
    const f = familyOf(l);
    fam.push(f);
    const g = new THREE.Group();
    const sm = physical({ roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.12 });
    const tex = etchTexture(l, f);
    const em = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    const slab = new THREE.Mesh(slabGeo, sm);
    slab.receiveShadow = true;
    const etch = new THREE.Mesh(etchGeo, em);
    etch.rotation.x = -Math.PI / 2;
    etch.position.y = 0.031;
    // where the card hangs: the middle of the wafer's right edge
    const anchor = new THREE.Object3D();
    anchor.position.set(LAYER_HALF * 1.02, 0, 0);
    // and where its name tag hangs: the front-left corner, which stays in view however the stack parts
    const corner = new THREE.Object3D();
    corner.position.set(-LAYER_HALF * 1.0, 0, LAYER_HALF * 0.55);
    g.add(slab, etch, anchor, corner);
    corners.push(corner);
    g.position.y = top - l * LAYER_GAP;
    root.add(g);
    slabs.push(g);
    slabMats.push(sm);
    etchMats.push(em);
    textures.push(tex);
    anchors.push(anchor);
  }
  const spineMat = physical({ roughness: 0.15, opacity: 0.3, clearcoat: 1 });
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, top * 2 + 0.9, 24), spineMat);
  root.add(spine);

  const c = new THREE.Color();
  const lit = new THREE.Color();
  return {
    root,
    mats: [...slabMats, ...etchMats, spineMat],
    // 0…8: each wafer's right edge (the card); 9…17: its front-left corner (the name tag)
    anchors: [...anchors, ...corners],
    update(s) {
      const hl = s.highlight;
      const k = Math.min(1, s.dt * 7);
      for (let l = 0; l < LAYER_COUNT; l++) {
        // the active wafer slides out toward the viewer like a drawer; the rest part around it
        // Opened up, the stack parts like an accordion at the active wafer: everything above it lifts well clear, so
        // its whole face (circuit and name) is in view, while the rest stay close and show their labelled edges.
        let x = 0;
        let y = top - l * LAYER_GAP;
        let z = 0;
        let tilt = 0;
        if (s.explode > 0.001 && hl > -0.5) {
          const e = s.explode;
          const diff = l - hl;
          y = top - l * LAYER_GAP * (1 - 0.12 * e); // closer together, to make room for the opening
          if (diff < -0.5) y += 1.15 * e;
          else if (Math.abs(diff) < 0.5) {
            y += 0.42 * e;
            x -= 0.22 * e;
            z += 0.22 * e;
            tilt = 0.16 * e; // tipped toward the viewer
          }
        }
        const g = slabs[l];
        g.position.set(THREE.MathUtils.lerp(g.position.x, x, k), THREE.MathUtils.lerp(g.position.y, y, k), THREE.MathUtils.lerp(g.position.z, z, k));
        g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, tilt, k);
        const on = l === hl ? s.hlAmt : 0;
        tone(FAMILY_TONE[fam[l]], s.dark, lit);
        // every wafer carries its family on its body; the active one is glazed in it
        slabMats[l].color.copy(tone('ceramic', s.dark, c)).lerp(lit, 0.08 + 0.9 * on);
        slabMats[l].emissive.copy(lit).multiplyScalar(on * 0.12);
        etchMats[l].color.copy(lit).lerp(tone('thread', s.dark, c), on);
        etchMats[l].userData.target = 0.85 + 0.15 * on;
      }
      spineMat.color.copy(tone('violet', s.dark, c));
      spine.scale.y = 1 + 0.3 * s.explode;
    },
    dispose() {
      slabGeo.dispose();
      etchGeo.dispose();
      spine.geometry.dispose();
      textures.forEach((t) => t.dispose());
      [...slabMats, ...etchMats, spineMat].forEach((m) => m.dispose());
    },
  };
}

// ── The globe: a white planet with raised dot continents, India in violet, routes of light ──────────────────

function buildGlobe(): Solid {
  const root = new THREE.Group();
  const planetMat = physical({ roughness: 0.55, clearcoat: 0.4, clearcoatRoughness: 0.4, sheen: 0.6 });
  const planet = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_R * 0.995, 128, 96), planetMat);
  root.add(planet);

  // dots: the same lattice as the particle globe, raised slightly off the surface
  const land: THREE.Vector3[] = [];
  const india: THREE.Vector3[] = [];
  const spacing = 0.052;
  const a = (spacing / GLOBE_R) * (180 / Math.PI);
  let row = 0;
  for (let lat = -84; lat <= 84; lat += a, row++) {
    const n = Math.max(1, Math.round((360 * Math.cos((lat * Math.PI) / 180)) / a));
    for (let g = 0; g < n; g++) {
      const lon = ((g + (row % 2 ? 0.5 : 0)) / n) * 360 - 180;
      if (inPolygon([lon, lat], INDIA)) continue;
      if (isLandmass([lon, lat])) land.push(new THREE.Vector3(...lonLatToVec(lon, lat, GLOBE_R)));
    }
  }
  const dI = a * 0.6;
  for (let lat = INDIA_BBOX.minLat; lat <= INDIA_BBOX.maxLat; lat += dI) {
    for (let lon = INDIA_BBOX.minLon; lon <= INDIA_BBOX.maxLon; lon += dI / Math.cos((lat * Math.PI) / 180)) {
      if (inPolygon([lon, lat], INDIA)) india.push(new THREE.Vector3(...lonLatToVec(lon, lat, GLOBE_R)));
    }
  }
  const dotGeo = new THREE.CylinderGeometry(0.0125, 0.0125, 0.014, 10);
  dotGeo.translate(0, 0.007, 0);
  const landMat = physical({ roughness: 0.5 });
  const indiaMat = physical({ roughness: 0.35, clearcoat: 1 });
  const up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion();
  const mtx = new THREE.Matrix4();
  const one = new THREE.Vector3(1, 1, 1);
  const place = (pts: THREE.Vector3[], mat: THREE.Material, scale = 1) => {
    const mesh = new THREE.InstancedMesh(dotGeo, mat, pts.length);
    pts.forEach((p, i) => {
      q.setFromUnitVectors(up, p.clone().normalize());
      mtx.compose(p, q, one.clone().multiplyScalar(scale));
      mesh.setMatrixAt(i, mtx);
    });
    root.add(mesh);
    return mesh;
  };
  const landMesh = place(land, landMat);
  const indiaMesh = place(india, indiaMat, 0.85);

  // the hubs in India, and routes of light out to the world with a pulse travelling each one
  const hubMat = physical({ roughness: 0.3, clearcoat: 1, emissiveIntensity: 1 });
  const hubGeo = new THREE.SphereGeometry(0.03, 24, 16);
  INDIA_HUBS.forEach((h) => {
    const m = new THREE.Mesh(hubGeo, hubMat);
    m.position.set(...lonLatToVec(h.at[0], h.at[1], GLOBE_R * 1.012));
    root.add(m);
  });
  const routeMat = physical({ roughness: 0.3, opacity: 0.75, emissiveIntensity: 1 });
  const pulseMat = new THREE.MeshBasicMaterial({ transparent: true });
  const pulseGeo = new THREE.SphereGeometry(0.022, 16, 12);
  const routes = ARCS.map(([p, c]) => {
    const curve = new THREE.CatmullRomCurve3(Array.from({ length: 33 }, (_, i) => new THREE.Vector3(...arcPoint(p, c, i / 32))));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 96, 0.0042, 6, false), routeMat);
    const pulse = new THREE.Mesh(pulseGeo, pulseMat);
    root.add(tube, pulse);
    return { curve, tube, pulse };
  });

  const c = new THREE.Color();
  return {
    root,
    mats: [planetMat, landMat, indiaMat, hubMat, routeMat, pulseMat],
    update(s) {
      planetMat.color.copy(tone('ceramic', s.dark, c));
      planetMat.sheenColor.copy(tone('ceramic2', s.dark, c));
      landMat.color.copy(tone('ink', s.dark, c));
      indiaMat.color.copy(tone('violet', s.dark, c));
      indiaMat.emissive.copy(tone('violet', s.dark, c)).multiplyScalar(0.25 + 0.2 * s.dark);
      hubMat.color.copy(tone('amber', s.dark, c));
      hubMat.emissive.copy(tone('amber', s.dark, c)).multiplyScalar(0.5);
      routeMat.color.copy(tone('violet', s.dark, c));
      routeMat.emissive.copy(tone('violet', s.dark, c)).multiplyScalar(0.3 + 0.3 * s.dark);
      pulseMat.color.copy(tone('violet', s.dark, c)).lerp(tone('thread', s.dark), 0.25);
      routes.forEach((r, i) => {
        const t = (s.time * 0.22 + i * 0.37) % 1;
        r.pulse.position.copy(r.curve.getPointAt(t));
      });
    },
    dispose() {
      planet.geometry.dispose();
      dotGeo.dispose();
      hubGeo.dispose();
      pulseGeo.dispose();
      routes.forEach((r) => r.tube.geometry.dispose());
      landMesh.dispose();
      indiaMesh.dispose();
      [planetMat, landMat, indiaMat, hubMat, routeMat, pulseMat].forEach((m) => m.dispose());
    },
  };
}

// ── The helix: two strands of glazed beads with rungs between them; the active segment lit ─────────────────

function buildHelix(segments = 6): Solid {
  const root = new THREE.Group();
  const L = 4.85;
  const rad = 0.55;
  const beadsPer = 150;
  const rungCount = 64;
  const beadGeo = new THREE.SphereGeometry(0.05, 20, 14);
  const rungGeo = new THREE.CylinderGeometry(0.014, 0.014, 1, 8);
  const beadMat = physical({ roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12 });
  const rungMat = physical({ roughness: 0.4, clearcoat: 0.5 });
  const beads = new THREE.InstancedMesh(beadGeo, beadMat, beadsPer * 2);
  const rungs = new THREE.InstancedMesh(rungGeo, rungMat, rungCount);
  const beadSeg: number[] = [];
  const rungSeg: number[] = [];
  const mtx = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  let bi = 0;
  for (let strand = 0; strand < 2; strand++) {
    for (let k = 0; k < beadsPer; k++) {
      const x = -L + (k / (beadsPer - 1)) * 2 * L;
      const ph = x * 1.55 + strand * Math.PI;
      mtx.makeTranslation(x, Math.cos(ph) * rad, Math.sin(ph) * rad);
      beads.setMatrixAt(bi++, mtx);
      beadSeg.push(Math.min(segments - 1, Math.floor(((x + L) / (2 * L)) * segments)));
    }
  }
  for (let k = 0; k < rungCount; k++) {
    const x = -L + (k / (rungCount - 1)) * 2 * L;
    const ph = x * 1.55;
    const a = new THREE.Vector3(x, Math.cos(ph) * rad, Math.sin(ph) * rad);
    const b = new THREE.Vector3(x, Math.cos(ph + Math.PI) * rad, Math.sin(ph + Math.PI) * rad);
    const dir = b.clone().sub(a);
    q.setFromUnitVectors(up, dir.clone().normalize());
    mtx.compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, dir.length(), 1));
    rungs.setMatrixAt(k, mtx);
    rungSeg.push(Math.min(segments - 1, Math.floor(((x + L) / (2 * L)) * segments)));
  }
  root.add(beads, rungs);
  const lit = new THREE.Color();
  const base = new THREE.Color();
  const tmp = new THREE.Color();
  let lastKey = '';
  return {
    root,
    mats: [beadMat, rungMat],
    update(s) {
      const key = `${s.highlight}:${s.hlAmt.toFixed(2)}:${s.dark.toFixed(2)}`;
      if (key === lastKey) return;
      lastKey = key;
      tone('violet', s.dark, lit);
      tone('ceramic2', s.dark, base);
      beadSeg.forEach((sg, i) => beads.setColorAt(i, tmp.lerpColors(base, lit, sg === s.highlight ? s.hlAmt : s.highlight < 0 ? 0.35 : 0.1)));
      rungSeg.forEach((sg, i) => rungs.setColorAt(i, tmp.lerpColors(base, lit, sg === s.highlight ? s.hlAmt * 0.8 : 0.05)));
      if (beads.instanceColor) beads.instanceColor.needsUpdate = true;
      if (rungs.instanceColor) rungs.instanceColor.needsUpdate = true;
    },
    dispose() {
      beadGeo.dispose();
      rungGeo.dispose();
      beads.dispose();
      rungs.dispose();
      beadMat.dispose();
      rungMat.dispose();
    },
  };
}

// ── The six tools of the problem chapter: real objects that the story does things to ───────────────────
//    fragmented: frosted glass walls rise between them · stops learning: each is sealed in ice and stops moving
//    works alone: tubes reach from each toward its neighbours and stop short, capped in red

function buildTools(): Solid {
  const root = new THREE.Group();
  const body = physical({ roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.15 });
  const accent = physical({ roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 });
  const dark = physical({ roughness: 0.45, clearcoat: 0.6 });
  const mats: THREE.Material[] = [body, accent, dark];
  const geos: THREE.BufferGeometry[] = [];
  const G = <T extends THREE.BufferGeometry>(g: T) => (geos.push(g), g);
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => {
    const o = new THREE.Mesh(g, m);
    o.position.set(x, y, z);
    return o;
  };
  const bar = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, rz = 0) => {
    const o = mesh(G(new THREE.BoxGeometry(w, h, d)), m, x, y, z);
    o.rotation.z = rz;
    return o;
  };

  const chat = new THREE.Group();
  chat.add(mesh(G(new RoundedBoxGeometry(0.62, 0.44, 0.14, 4, 0.08)), body));
  const tail = mesh(G(new THREE.ConeGeometry(0.075, 0.16, 4)), body, -0.17, -0.26, 0);
  tail.rotation.z = Math.PI * 0.85;
  chat.add(tail);
  [-0.14, 0, 0.14].forEach((x) => chat.add(mesh(G(new THREE.SphereGeometry(0.04, 20, 14)), accent, x, 0, 0.075)));

  const search = new THREE.Group();
  search.add(mesh(G(new THREE.TorusGeometry(0.19, 0.05, 20, 48)), accent, -0.05, 0.05, 0));
  const lens = mesh(G(new THREE.CircleGeometry(0.19, 48)), physical({ roughness: 0.05, clearcoat: 1, opacity: 0.35 }), -0.05, 0.05, 0);
  mats.push(lens.material as THREE.Material);
  search.add(lens);
  const handle = mesh(G(new THREE.CylinderGeometry(0.045, 0.055, 0.3, 20)), body, 0.17, -0.17, 0);
  handle.rotation.z = Math.PI / 4;
  search.add(handle);

  const docs = new THREE.Group();
  [2, 1, 0].forEach((k) => docs.add(mesh(G(new RoundedBoxGeometry(0.44, 0.56, 0.035, 3, 0.03)), body, k * 0.05, -k * 0.05, -k * 0.07)));
  [0.16, 0.08, 0, -0.08, -0.16].forEach((y, i) => docs.add(bar(i === 0 ? 0.2 : 0.3, 0.024, 0.012, i === 0 ? accent : dark, i === 0 ? -0.05 : 0, y, 0.024)));

  const code = new THREE.Group();
  code.add(mesh(G(new RoundedBoxGeometry(0.66, 0.46, 0.12, 4, 0.06)), body));
  code.add(mesh(G(new RoundedBoxGeometry(0.56, 0.36, 0.02, 2, 0.03)), dark, 0, 0, 0.06));
  code.add(bar(0.12, 0.028, 0.02, accent, -0.15, 0.04, 0.08, 0.7), bar(0.12, 0.028, 0.02, accent, -0.15, -0.04, 0.08, -0.7));
  code.add(bar(0.12, 0.028, 0.02, accent, 0.15, 0.04, 0.08, -0.7), bar(0.12, 0.028, 0.02, accent, 0.15, -0.04, 0.08, 0.7));
  code.add(bar(0.2, 0.028, 0.02, accent, 0, 0, 0.08, 1.2));

  const vision = new THREE.Group();
  const eye = mesh(G(new THREE.SphereGeometry(0.2, 40, 24)), body);
  eye.scale.set(1.75, 0.95, 0.55);
  vision.add(eye);
  const iris = mesh(G(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 40)), accent, 0, 0, 0.1);
  iris.rotation.x = Math.PI / 2;
  vision.add(iris, mesh(G(new THREE.SphereGeometry(0.055, 20, 14)), dark, 0, 0, 0.115), mesh(G(new THREE.SphereGeometry(0.018, 12, 8)), body, 0.03, 0.03, 0.15));

  const voice = new THREE.Group();
  voice.add(mesh(G(new THREE.CapsuleGeometry(0.1, 0.2, 8, 24)), accent, 0, 0.08, 0));
  const cradle = mesh(G(new THREE.TorusGeometry(0.17, 0.022, 10, 40, Math.PI)), body, 0, 0.04, 0);
  cradle.rotation.z = Math.PI;
  voice.add(cradle, mesh(G(new THREE.CylinderGeometry(0.022, 0.022, 0.14, 12)), body, 0, -0.2, 0), mesh(G(new THREE.CylinderGeometry(0.13, 0.14, 0.03, 32)), body, 0, -0.28, 0));

  const tools = [chat, search, docs, code, vision, voice];
  tools.forEach((t, i) => {
    t.position.set(...SILO_CENTERS[i]);
    t.rotation.set(0.12, -0.32, 0);
    root.add(t);
  });

  // fragmented: frosted glass walls between every tool
  const glass = physical({ roughness: 0.12, clearcoat: 1, opacity: 0.22 });
  const walls = new THREE.Group();
  walls.add(mesh(G(new THREE.BoxGeometry(0.018, 3.2, 1.0)), glass, -0.76, 0, 0), mesh(G(new THREE.BoxGeometry(0.018, 3.2, 1.0)), glass, 0.76, 0, 0));
  walls.add(mesh(G(new THREE.BoxGeometry(4.6, 0.018, 1.0)), glass, 0, 0, 0));
  root.add(walls);

  // stops learning: a block of ice around each tool
  const ice = physical({ roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.05, opacity: 0.4, sheen: 0.5 });
  const iceGeo = G(new RoundedBoxGeometry(0.86, 0.8, 0.62, 4, 0.07));
  const blocks = SILO_CENTERS.map((c) => {
    const b = mesh(iceGeo, ice, ...c);
    b.rotation.set(0.12, -0.32, 0);
    root.add(b);
    return b;
  });

  // works alone: from each tool, a tube reaches toward each neighbour and stops short with a red cap
  const LINKS: [number, number][] = [[0, 1], [1, 2], [3, 4], [4, 5], [0, 3], [1, 4], [2, 5]];
  const tubeMat = physical({ roughness: 0.3, clearcoat: 1 });
  const capMat = physical({ roughness: 0.25, clearcoat: 1, emissiveIntensity: 1 });
  const tubeGeo = G(new THREE.CylinderGeometry(0.02, 0.02, 1, 12));
  tubeGeo.translate(0, 0.5, 0);
  const capGeo = G(new THREE.SphereGeometry(0.045, 20, 14));
  const up = new THREE.Vector3(0, 1, 0);
  const stubs: { tube: THREE.Mesh; cap: THREE.Mesh; from: THREE.Vector3; dir: THREE.Vector3; gap: number; phase: number }[] = [];
  LINKS.forEach(([a, b], k) => {
    const A = new THREE.Vector3(...SILO_CENTERS[a]);
    const B = new THREE.Vector3(...SILO_CENTERS[b]);
    [[A, B], [B, A]].forEach(([p, q], side) => {
      const dir = q.clone().sub(p).normalize();
      const from = p.clone().addScaledVector(dir, 0.42);
      const tube = mesh(tubeGeo, tubeMat);
      tube.position.copy(from);
      tube.quaternion.setFromUnitVectors(up, dir);
      const cap = mesh(capGeo, capMat);
      root.add(tube, cap);
      stubs.push({ tube, cap, from, dir, gap: p.distanceTo(q) - 0.84, phase: k * 0.9 + side * 2.1 });
    });
  });
  mats.push(glass, ice, tubeMat, capMat);

  const fade = { walls: 0, ice: 0, links: 0, still: 0 };
  const c = new THREE.Color();
  const ceramic = new THREE.Color();
  const frost = new THREE.Color('#cfdcef');
  return {
    root,
    mats,
    update(s) {
      const k = Math.min(1, s.dt * 4);
      fade.walls += ((s.key === 'silos' ? 1 : 0) - fade.walls) * k;
      fade.ice += ((s.key === 'frozen' ? 1 : 0) - fade.ice) * k;
      fade.links += ((s.key === 'alone' ? 1 : 0) - fade.links) * k;
      fade.still += ((s.key === 'frozen' ? 1 : 0) - fade.still) * k;
      tone('ceramic', s.dark, ceramic);
      body.color.copy(ceramic).lerp(frost, fade.ice * 0.6);
      accent.color.copy(tone('violet', s.dark, c)).lerp(frost, fade.ice * 0.55);
      dark.color.copy(tone('ink', s.dark, c));
      glass.color.copy(tone('ceramic', s.dark, c));
      glass.userData.target = 0.24 * fade.walls;
      walls.visible = fade.walls > 0.01;
      ice.color.set('#dcebff');
      ice.userData.target = 0.42 * fade.ice;
      blocks.forEach((b) => (b.visible = fade.ice > 0.01));
      tubeMat.color.copy(tone('wire', s.dark, c));
      capMat.color.copy(tone('violet', s.dark, c));
      capMat.emissive.copy(capMat.color).multiplyScalar(0.3);
      tubeMat.userData.target = fade.links;
      capMat.userData.target = fade.links;
      stubs.forEach((st) => {
        const reach = st.gap * (0.24 + 0.1 * Math.sin(s.time * 1.6 + st.phase)) * fade.links;
        st.tube.scale.set(1, Math.max(0.0001, reach), 1);
        st.cap.position.copy(st.from).addScaledVector(st.dir, reach);
        st.tube.visible = st.cap.visible = fade.links > 0.01;
      });
      // alive while fragmented or alone; frozen solid in the ice
      tools.forEach((t, i) => {
        const live = 1 - fade.still;
        t.position.y = SILO_CENTERS[i][1] + Math.sin(s.time * 1.3 + i * 1.1) * 0.035 * live;
        t.rotation.y = -0.32 + Math.sin(s.time * 0.7 + i) * 0.18 * live;
      });
    },
    dispose() {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    },
  };
}

export function buildSolids() {
  const mask = threadMaskTexture();
  return {
    solids: {
      logo: buildMark(mask),
      orbit15: buildOrbit(15, mask),
      orbit6: buildOrbit(6, mask),
      layers: buildLayers(),
      globe: buildGlobe(),
      helix: buildHelix(),
      tools: buildTools(),
    },
    dispose: () => mask.dispose(),
  };
}

/** Sets a solid's overall opacity, keeping each material's own resting opacity as its ceiling. */
export function setSolidOpacity(s: Solid, a: number) {
  for (const m of s.mats) {
    const base = (m.userData.base ??= m.opacity) as number;
    const target = (m.userData.target as number | undefined) ?? base;
    m.opacity = a * target;
    m.depthWrite = a > 0.6 && target > 0.9;
  }
}

// ── The studio: softboxes built in code, baked into the environment every surface reflects ─────────────

/** A product-photography studio: a broad overhead softbox, a long key strip from the left, a narrow rim from
 *  the right, a low fill from the front and a dark floor, so glaze reads as glaze and chrome as chrome. */
export function studioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#d9d4cc');
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const panel = (w: number, h: number, power: number, pos: [number, number, number], rot: [number, number, number], color = '#ffffff') => {
    const g = new THREE.PlaneGeometry(w, h);
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(...pos);
    mesh.rotation.set(...rot);
    scene.add(mesh);
    geos.push(g);
    mats.push(m);
  };
  panel(12, 12, 2.6, [0, 7, 0], [Math.PI / 2, 0, 0]); // overhead
  panel(5, 7, 3.4, [-7, 2.5, 3], [0, Math.PI / 2, 0]); // key strip, left
  panel(2, 6, 2.0, [7, 1.5, -2], [0, -Math.PI / 2, 0]); // rim, right
  panel(10, 3, 1.0, [0, 1, 9], [0, 0, 0]); // front fill
  panel(40, 40, 0.55, [0, -3, 0], [-Math.PI / 2, 0, 0], '#8c8780'); // floor
  panel(30, 0.8, 0.6, [0, 0.6, -10], [0, 0, 0], '#3a3b40'); // a dark line on the back wall
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(scene, 0.02).texture;
  pmrem.dispose();
  geos.forEach((g) => g.dispose());
  mats.forEach((m) => m.dispose());
  return tex;
}

// ── The plinth: a turned ceramic disc on a violet base, engraved around its rim ───────────────────────

const RIM_WORDS = ['BHARATTECH ORIGIN', 'MEMORY', 'REASONING', 'AGENTS', 'SOVEREIGN COMPUTE', 'MADE IN BHARAT'];

function engravingTexture(): THREE.CanvasTexture {
  const S = 1024;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d')!;
  const c = S / 2;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, S, S);
  // hairlines framing the type, like a turned rim
  g.strokeStyle = 'rgba(70, 52, 170, 0.28)';
  g.lineWidth = 1.6;
  [0.79, 0.94].forEach((r) => {
    g.beginPath();
    g.arc(c, c, c * r, 0, Math.PI * 2);
    g.stroke();
  });
  g.strokeStyle = 'rgba(70, 52, 170, 0.12)';
  g.lineWidth = 1;
  g.beginPath();
  g.arc(c, c, c * 0.62, 0, Math.PI * 2);
  g.stroke();
  // the words, each set along its own share of the circle, with a small diamond between them
  const radius = c * 0.865;
  g.fillStyle = 'rgba(70, 52, 170, 0.62)';
  g.font = `600 ${Math.round(S * 0.026)}px "Geist Mono", ui-monospace, Menlo, monospace`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const step = (Math.PI * 2) / RIM_WORDS.length;
  RIM_WORDS.forEach((word, k) => {
    const spacing = S * 0.006;
    const widths = [...word].map((ch) => g.measureText(ch).width + spacing);
    const total = widths.reduce((s, w) => s + w, 0);
    let a = -k * step + total / radius / 2;
    [...word].forEach((ch, i) => {
      a -= widths[i] / radius / 2;
      g.save();
      g.translate(c, c);
      g.rotate(a);
      g.translate(0, radius);
      g.fillText(ch, 0, 0);
      g.restore();
      a -= widths[i] / radius / 2;
    });
    g.save();
    g.translate(c, c);
    g.rotate(-k * step - step / 2);
    g.translate(0, radius);
    g.rotate(Math.PI / 4);
    const d = S * 0.008;
    g.fillRect(-d / 2, -d / 2, d, d);
    g.restore();
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** A soft round shadow: dark at the centre, gone at the edge. */
function blobTexture(): THREE.CanvasTexture {
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d')!;
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grad.addColorStop(0, 'rgba(0,0,0,1)');
  grad.addColorStop(0.35, 'rgba(0,0,0,0.55)');
  grad.addColorStop(0.7, 'rgba(0,0,0,0.12)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(cv);
}

export interface Plinth {
  root: THREE.Group;
  top: THREE.Mesh;
  update(opacity: number, dark: number): void;
  dispose(): void;
}

/** Unit radius; the engine scales it to whatever stands on it. */
export function buildPlinth(): Plinth {
  const root = new THREE.Group();
  const H = 0.13;
  const engraving = engravingTexture();
  const blob = blobTexture();
  const baseMat = physical({ roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08, metalness: 0.05 });
  const capMat = physical({ roughness: 0.38, clearcoat: 0.8, clearcoatRoughness: 0.18, map: engraving });
  const lipMat = physical({ roughness: 0.2, clearcoat: 1, metalness: 0.1 });
  const contactMat = new THREE.MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false, color: 0x1c1430 });
  const groundMat = new THREE.MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false, color: 0x1c1430 });

  const baseGeo = new THREE.CylinderGeometry(1, 0.97, H, 160, 1);
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = -H / 2;
  const capGeo = new THREE.CylinderGeometry(0.965, 0.965, 0.028, 160, 1);
  const top = new THREE.Mesh(capGeo, capMat);
  top.position.y = 0.006;
  top.receiveShadow = true;
  base.receiveShadow = true;
  const lipGeo = new THREE.TorusGeometry(0.965, 0.011, 12, 200);
  const lip = new THREE.Mesh(lipGeo, lipMat);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 0.02;
  const planeGeo = new THREE.PlaneGeometry(2, 2);
  const contact = new THREE.Mesh(planeGeo, contactMat);
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.022;
  contact.scale.setScalar(0.55);
  const ground = new THREE.Mesh(planeGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -H - 0.01;
  ground.scale.setScalar(1.45);
  ground.renderOrder = -3;
  root.add(ground, base, top, lip, contact);

  const mats = [baseMat, capMat, lipMat, contactMat, groundMat];
  return {
    root,
    top,
    update() {
      root.visible = false;
    },
    dispose() {
      [baseGeo, capGeo, lipGeo, planeGeo].forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      engraving.dispose();
      blob.dispose();
    },
  };
}
