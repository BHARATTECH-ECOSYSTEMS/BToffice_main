import * as THREE from 'three';
import { easeOutBack, lerp, span } from '../ink';
import {
  HUE,
  TAU,
  type DomainWorld,
  arrival,
  createContactShadow,
  createPointCloud,
  createStage,
  disposeScene,
  flat,
  lacquer,
  seeded,
  setColor,
} from './kit';

/**
 * 05 · Defense Intelligence — a hex force field.
 * secure: the dome assembles from the ground up around a vault · cyber: threats strike it and ripple out ·
 * monitor: a radar sweeps the ground and flags activity · mission-critical: a heartbeat band climbs the dome.
 */

const R = 1.3;
const GROUND = -0.55;
const THREATS = 6;
const TRAIL = 7;
const BLIPS: [number, number][] = [
  [0.7, 1.7],
  [2.1, 1.55],
  [3.0, 1.85],
  [4.2, 1.6],
  [5.4, 1.9],
];
const FLIGHT = 0.7;
/** Threats appear at this distance from the dome's centre; it stays inside the radar's reach. */
const THREAT_START = 2.15;

const DOME_VERT = /* glsl */ `
  varying vec3 vLocal;
  varying vec3 vNormalV;
  varying vec3 vViewV;
  void main() {
    vLocal = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormalV = normalize(normalMatrix * normal);
    vViewV = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const DOME_FRAG = /* glsl */ `
  uniform float uBuild;
  uniform float uBeat;
  uniform float uTime;
  uniform vec4 uImpacts[${THREATS}];
  uniform vec3 uViolet;
  uniform vec3 uOrange;
  uniform vec3 uSaffron;
  varying vec3 vLocal;
  varying vec3 vNormalV;
  varying vec3 vViewV;

  float hexDist(vec2 p) {
    p = abs(p);
    return max(dot(p, normalize(vec2(1.0, 1.732))), p.x);
  }

  void main() {
    vec3 n = normalize(vLocal);
    float h = n.y;
    float top = uBuild * 1.04;
    if (h > top) discard;

    // Hex cells laid out by longitude/latitude; they fade near the crown where longitude pinches.
    vec2 uv = vec2(atan(n.z, n.x) * 3.8, asin(clamp(h, 0.0, 1.0)) * 4.4);
    vec2 r = vec2(1.0, 1.732);
    vec2 a = mod(uv, r) - r * 0.5;
    vec2 b = mod(uv - r * 0.5, r) - r * 0.5;
    vec2 cell = dot(a, a) < dot(b, b) ? a : b;
    float hexLine = smoothstep(0.41, 0.48, hexDist(cell)) * (1.0 - smoothstep(0.75, 0.95, h));

    float fresnel = pow(1.0 - abs(dot(normalize(vNormalV), normalize(vViewV))), 2.2);

    float ripple = 0.0;
    for (int i = 0; i < ${THREATS}; i++) {
      vec4 hit = uImpacts[i];
      if (hit.w < 0.0 || hit.w > 1.0) continue;
      float ang = acos(clamp(dot(n, hit.xyz), -1.0, 1.0));
      ripple += exp(-pow((ang - hit.w * 1.3) * 12.0, 2.0)) * (1.0 - hit.w);
      ripple += exp(-ang * 9.0) * (1.0 - hit.w) * 0.8;
    }
    ripple = clamp(ripple, 0.0, 1.0);

    float band = uBeat * exp(-pow((h - fract(uTime * 0.4)) * 16.0, 2.0));
    float rim = smoothstep(top - 0.05, top, h) * step(top, 1.0);

    vec3 col = mix(uViolet, uOrange, ripple);
    col = mix(col, uSaffron, clamp(band * 1.4, 0.0, 1.0));
    float alpha = 0.035 + fresnel * 0.32 + hexLine * 0.2 + ripple * 0.7 + band * 0.55 + rim * 0.7;
    gl_FragColor = vec4(col, alpha);
    #include <colorspace_fragment>
  }
`;

const RADAR_FRAG = /* glsl */ `
  uniform float uSweep;
  uniform float uOn;
  uniform vec3 uViolet;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv - 0.5;
    float d = length(p) * 2.0;
    if (d > 1.0) discard;
    float ang = atan(p.y, p.x);
    float behind = mod(uSweep - ang, 6.28318);
    float trail = exp(-behind * 2.6);
    float rings = smoothstep(0.012, 0.0, abs(fract(d * 4.0) - 0.5) - 0.48);
    float alpha = uOn * (trail * 0.28 + rings * 0.12) * smoothstep(1.0, 0.85, d);
    gl_FragColor = vec4(uViolet, alpha);
    #include <colorspace_fragment>
  }
`;

const RADAR_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export function createDefenseDome(): DomainWorld {
  const { scene, camera, rig, frame } = createStage(
    [
      { radius: 2.25, bottom: -0.56, top: 0.0 },
      { radius: 1.95, bottom: -0.56, top: 0.6 },
      { radius: 1.55, bottom: -0.56, top: 1.15 },
    ],
    0.4
  );
  const world = new THREE.Group();
  world.position.y = 0.05;
  scene.add(world);

  const shadow = createContactShadow(1.8, 0.2);
  shadow.position.y = GROUND + 0.002;
  world.add(shadow);

  // Vault
  const vaultMat = lacquer(HUE.ink);
  vaultMat.emissive = HUE.saffron.clone();
  vaultMat.emissiveIntensity = 0;
  const vault = new THREE.Mesh(new THREE.OctahedronGeometry(0.36, 0), vaultMat);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.08, 48), lacquer(HUE.paper));
  plinth.position.y = GROUND + 0.04;
  world.add(vault, plinth);

  // Dome
  const impacts = Array.from({ length: THREATS }, () => new THREE.Vector4(0, 1, 0, -1));
  const domeMat = new THREE.ShaderMaterial({
    uniforms: {
      uBuild: { value: 0 },
      uBeat: { value: 0 },
      uTime: { value: 0 },
      uImpacts: { value: impacts },
      uViolet: { value: HUE.violet },
      uOrange: { value: HUE.orange },
      uSaffron: { value: HUE.saffron },
    },
    vertexShader: DOME_VERT,
    fragmentShader: DOME_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 64, 0, TAU, 0, Math.PI / 2), domeMat);
  dome.position.y = GROUND;
  world.add(dome);

  // Radar
  const radarMat = new THREE.ShaderMaterial({
    uniforms: { uSweep: { value: 0 }, uOn: { value: 0 }, uViolet: { value: HUE.violet } },
    vertexShader: RADAR_VERT,
    fragmentShader: RADAR_FRAG,
    transparent: true,
    depthWrite: false,
  });
  const radar = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.4), radarMat);
  radar.rotation.x = -Math.PI / 2;
  radar.position.y = GROUND + 0.004;
  world.add(radar);
  const sweepArm = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.012), flat(HUE.violet, 0.7));
  sweepArm.geometry.translate(1.1, 0, 0);
  sweepArm.rotation.x = -Math.PI / 2;
  sweepArm.position.y = GROUND + 0.006;
  world.add(sweepArm);

  // Threats (with comet trails) and radar blips share one point cloud.
  const sparks = createPointCloud(THREATS * TRAIL + BLIPS.length);
  world.add(sparks.points);
  const rnd = seeded(5);
  const threatPhase = Array.from({ length: THREATS }, () => rnd());
  /** A fresh approach direction for every pass, upper hemisphere only. */
  const approach = (i: number, pass: number, out: THREE.Vector3) => {
    const r1 = Math.sin((i + 1) * 91.7 + pass * 17.3) * 43758.5453;
    const r2 = Math.sin((i + 1) * 37.1 + pass * 59.9) * 12345.678;
    const az = (r1 - Math.floor(r1)) * TAU;
    const el = 0.2 + (r2 - Math.floor(r2)) * 0.62;
    return out.set(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el));
  };

  const dir = new THREE.Vector3();

  return {
    scene,
    camera,
    frame,
    update(f) {
      const { t } = f;
      rig(f, 0.35);
      world.rotation.y = t * 0.07;

      const secure = arrival(f, 0, 0.6);
      const cyber = arrival(f, 1, 0.3);
      const monitor = arrival(f, 2, 0.4);
      const critical = arrival(f, 3, 0.5);

      vault.position.y = GROUND + 0.5 + Math.sin(t * 1.4) * 0.05;
      vault.rotation.y = t * 0.6;
      vault.scale.setScalar(Math.max(0.0001, easeOutBack(span(secure, 0, 0.5))));
      const beat = Math.pow(Math.max(0, Math.sin(t * 4.2)), 12) + 0.6 * Math.pow(Math.max(0, Math.sin(t * 4.2 - 0.6)), 12);
      vaultMat.emissiveIntensity = critical * (0.15 + 0.6 * beat);

      domeMat.uniforms.uBuild.value = span(secure, 0.1, 1);
      domeMat.uniforms.uTime.value = t;
      domeMat.uniforms.uBeat.value = critical;

      let n = 0;
      for (let i = 0; i < THREATS; i++) {
        const cycle = t * 0.32 + threatPhase[i];
        const pass = Math.floor(cycle);
        const k = cycle - pass;
        approach(i, pass, dir);
        const flying = k < FLIGHT;
        impacts[i].set(dir.x, dir.y, dir.z, cyber > 0 && !flying ? (k - FLIGHT) / (1 - FLIGHT) : -1);
        for (let s = 0; s < TRAIL; s++) {
          const kk = Math.max(0, k - s * 0.012);
          const r = lerp(THREAT_START, R, kk / FLIGHT);
          sparks.pos.set([dir.x * r, GROUND + dir.y * r, dir.z * r], n * 3);
          setColor(sparks.col, n, HUE.orange);
          sparks.size[n] = 0.07 * (1 - s / TRAIL);
          sparks.alpha[n] = flying ? cyber * span(k, 0, 0.12) * (1 - s / TRAIL) : 0;
          n++;
        }
      }

      const sweep = (t * 1.2) % TAU;
      radarMat.uniforms.uSweep.value = sweep;
      radarMat.uniforms.uOn.value = monitor;
      // Laid flat, the planes' local angle runs from +x toward −z; blips below use the same convention.
      sweepArm.rotation.z = sweep;
      (sweepArm.material as THREE.MeshBasicMaterial).opacity = 0.7 * monitor;
      sweepArm.visible = monitor > 0;
      BLIPS.forEach(([angle, dist]) => {
        const since = (sweep - angle + TAU) % TAU;
        const glow = Math.pow(1 - since / TAU, 3);
        sparks.pos.set([Math.cos(angle) * dist, GROUND + 0.03, -Math.sin(angle) * dist], n * 3);
        setColor(sparks.col, n, HUE.violet);
        sparks.size[n] = 0.06 + glow * 0.06;
        sparks.alpha[n] = monitor * (0.2 + 0.8 * glow);
        n++;
      });
      sparks.commit();
    },
    dispose: () => disposeScene(scene),
  };
}
