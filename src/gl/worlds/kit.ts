import * as THREE from 'three';
import { easeOut, lerp, span } from '../ink';

/**
 * Shared building blocks for the six research-domain 3D worlds.
 *
 * Every world follows the same contract: four chapters (matching src/data/reelScreenplays.ts),
 * where chapter N brings in a new element and everything before it stays on screen.
 */

export interface WorldFrame {
  /** Current chapter, 0–3. */
  act: number;
  /** Progress through the current chapter, 0–1. */
  progress: number;
  /** Seconds, for ambient motion that runs independently of the chapters. */
  t: number;
  /** Pointer over the reel, -1…1 on each axis (0 when it isn't over it). */
  pointer: { x: number; y: number };
}

export interface DomainWorld {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Reports the reel's safe area; call before `update`. */
  frame(view: SafeView): void;
  update(frame: WorldFrame): void;
  dispose(): void;
}

export const HUE = {
  violet: new THREE.Color('#6E58F5'),
  orange: new THREE.Color('#FF8643'),
  saffron: new THREE.Color('#F59E00'),
  ink: new THREE.Color('#14130F'),
  mist: new THREE.Color('#B9B3DA'),
  paper: new THREE.Color('#FFFFFF'),
};

export const BRAND = [HUE.violet, HUE.orange, HUE.saffron];
export const TAU = Math.PI * 2;

/** How far chapter `i`'s element has arrived: 0 before its chapter, eases in over the first `len` of it, then holds. */
export const arrival = (f: WorldFrame, i: number, len = 0.5) =>
  i < f.act ? 1 : i === f.act ? easeOut(span(f.progress, 0, len)) : 0;

/** Like `arrival`, but linear in chapter time: for choreographed sequences that apply their own easing per step. */
export const timeline = (f: WorldFrame, i: number, len = 1) => (i < f.act ? 1 : i === f.act ? span(f.progress, 0, len) : 0);

/** Small, fast, seedable PRNG so every world lays out identically on every load. */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Stage ─────────────────────────────────────────────────────────────────────

/**
 * One piece of the space a world draws in, relative to the stage target: a vertical cylinder
 * (`radius` in the ground plane, `bottom`/`top` along y), or with `round` a sphere filling that span.
 * Both hold for any spin about y, so the framing stays put while a world turns. A world lists a few
 * of these so its bounds hug its shape (a tall phone plus a wide ring of devices, say).
 */
export interface BoundsShape {
  radius: number;
  bottom: number;
  top: number;
  round?: boolean;
}

/** Half-extents of the visible safe area, as tangents of the angle from the view axis. */
export interface SafeView {
  tanH: number;
  tanV: number;
}

export interface Stage {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** The renderer reports the safe area of the reel each frame; `rig` then frames the bounds inside it. */
  frame(view: SafeView): void;
  /** Eases the camera toward its pose, nudged by the pointer, so the world feels held rather than fixed. */
  rig(f: WorldFrame, drift?: number): void;
}

const FIT_SAMPLES = 16;

export function createStage(bounds: BoundsShape[], elevation: number, fov = 30, target = new THREE.Vector3()): Stage {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.05, 100);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xe6e2f5, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(2.5, 4, 3.5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffe7cf, 0.45);
  rim.position.set(-3, 1.5, -2.5);
  scene.add(rim);

  // Outline points of every bounds shape, relative to the target. Sample polygons sit inside the true
  // curves, so each point is pushed out by 1/cos(π/n) to cover them fully.
  const cover = 1 / Math.cos(Math.PI / FIT_SAMPLES);
  const samples: THREE.Vector3[] = [];
  bounds.forEach(({ radius, bottom, top, round }) => {
    if (round) {
      const centre = (bottom + top) / 2;
      for (let j = 1; j < FIT_SAMPLES / 2; j++) {
        const lat = (j / (FIT_SAMPLES / 2)) * Math.PI - Math.PI / 2;
        for (let i = 0; i < FIT_SAMPLES; i++) {
          const a = (i / FIT_SAMPLES) * TAU;
          const r = radius * cover * cover;
          samples.push(new THREE.Vector3(Math.cos(a) * Math.cos(lat) * r, centre + Math.sin(lat) * r, Math.sin(a) * Math.cos(lat) * r));
        }
      }
      samples.push(new THREE.Vector3(0, centre + radius * cover, 0), new THREE.Vector3(0, centre - radius * cover, 0));
      return;
    }
    for (let i = 0; i < FIT_SAMPLES; i++) {
      const a = (i / FIT_SAMPLES) * TAU;
      samples.push(new THREE.Vector3(Math.cos(a) * radius * cover, bottom, Math.sin(a) * radius * cover));
      samples.push(new THREE.Vector3(Math.cos(a) * radius * cover, top, Math.sin(a) * radius * cover));
    }
  });

  let view: SafeView = { tanH: Math.tan(THREE.MathUtils.degToRad(fov / 2)), tanV: Math.tan(THREE.MathUtils.degToRad(fov / 2)) };
  const look = { yaw: 0, pitch: 0 };
  const back = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const worldUp = new THREE.Vector3(0, 1, 0);

  const rig = (f: WorldFrame, drift = 0) => {
    look.yaw = lerp(look.yaw, f.pointer.x * 0.32, 0.06);
    look.pitch = lerp(look.pitch, -f.pointer.y * 0.14, 0.06);
    const yaw = look.yaw + Math.sin(f.t * 0.12) * drift;
    const pitch = elevation + look.pitch;
    back.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    right.crossVectors(worldUp, back).normalize();
    up.crossVectors(back, right);

    // The closest distance at which every rim point projects inside the safe area.
    let distance = 0;
    for (const p of samples) {
      const depth = p.dot(back);
      distance = Math.max(distance, Math.abs(p.dot(right)) / view.tanH + depth, Math.abs(p.dot(up)) / view.tanV + depth);
    }
    camera.position.copy(target).addScaledVector(back, distance);
    camera.lookAt(target);
  };
  rig({ act: 0, progress: 0, t: 0, pointer: { x: 0, y: 0 } });

  return {
    scene,
    camera,
    frame(next) {
      view = next;
    },
    rig,
  };
}

// ── Materials ─────────────────────────────────────────────────────────────────

export const matte = (color: THREE.Color, roughness = 0.5) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.05, envMapIntensity: 0.9 });

// Glossy surfaces pick up a lot of studio light, so the base colour is held back to keep brand hues from washing out.
export const lacquer = (color: THREE.Color) =>
  new THREE.MeshPhysicalMaterial({ color: color.clone().multiplyScalar(0.8), roughness: 0.28, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.15, envMapIntensity: 0.75 });

export const frosted = (color: THREE.Color, opacity = 0.55) =>
  new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.15,
    metalness: 0,
    clearcoat: 1,
    transparent: true,
    opacity,
    depthWrite: false,
    envMapIntensity: 1.2,
  });

export const flat = (color: THREE.Color, opacity = 1) =>
  new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });

// ── Points ────────────────────────────────────────────────────────────────────

/** Pixels per world unit at distance 1; the reel renderer sets it for each frame from the viewport height. */
export const pointScale = { value: 400 };

const POINTS_VERT = /* glsl */ `
  attribute vec3 color;
  attribute float aSize;
  attribute float aAlpha;
  uniform float uScale;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uScale / -mv.z;
    vColor = color;
    vAlpha = aAlpha;
  }
`;

const POINTS_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.36, d) * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor, a);
    #include <colorspace_fragment>
  }
`;

export interface PointCloud {
  points: THREE.Points;
  pos: Float32Array;
  col: Float32Array;
  size: Float32Array;
  alpha: Float32Array;
  count: number;
  /** Uploads whatever the world changed this frame. */
  commit(): void;
}

/** Round, soft-edged points sized in world units; positions, colours, sizes and alphas are written by the CPU each frame. */
export function createPointCloud(count: number): PointCloud {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const size = new Float32Array(count).fill(0.03);
  const alpha = new Float32Array(count).fill(1);
  const geometry = new THREE.BufferGeometry();
  const attrs = {
    position: new THREE.BufferAttribute(pos, 3),
    color: new THREE.BufferAttribute(col, 3),
    aSize: new THREE.BufferAttribute(size, 1),
    aAlpha: new THREE.BufferAttribute(alpha, 1),
  };
  Object.entries(attrs).forEach(([name, attr]) => {
    attr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute(name, attr);
  });
  // Points move every frame; a generous fixed bound avoids recomputing it.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);
  const material = new THREE.ShaderMaterial({
    uniforms: { uScale: pointScale },
    vertexShader: POINTS_VERT,
    fragmentShader: POINTS_FRAG,
    transparent: true,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  return {
    points,
    pos,
    col,
    size,
    alpha,
    count,
    commit() {
      Object.values(attrs).forEach((attr) => (attr.needsUpdate = true));
    },
  };
}

export function setColor(arr: Float32Array, i: number, c: THREE.Color) {
  arr[i * 3] = c.r;
  arr[i * 3 + 1] = c.g;
  arr[i * 3 + 2] = c.b;
}

// ── Growing tubes ─────────────────────────────────────────────────────────────

export interface GrowingTube {
  mesh: THREE.Mesh;
  curve: THREE.Curve<THREE.Vector3>;
  /** Shows the tube from its start up to `f` (0–1) of its length. */
  grow(f: number): void;
}

/** A tube that can be drawn along its length, the 3D version of an ink stroke being laid down. */
export function createGrowingTube(
  curve: THREE.Curve<THREE.Vector3>,
  radius: number,
  material: THREE.Material,
  segments = 64
): GrowingTube {
  const radial = 6;
  const geometry = new THREE.TubeGeometry(curve, segments, radius, radial, false);
  const mesh = new THREE.Mesh(geometry, material);
  const perSegment = radial * 6;
  const grow = (f: number) => {
    const n = Math.round(Math.max(0, Math.min(1, f)) * segments) * perSegment;
    geometry.setDrawRange(0, n);
    mesh.visible = n > 0;
  };
  grow(0);
  return { mesh, curve, grow };
}

// ── Misc ──────────────────────────────────────────────────────────────────────

/** Soft round shadow that grounds a world on the light stage without a shadow-map pass. */
export function createContactShadow(radius: number, opacity = 0.18): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, `rgba(30, 24, 70, ${opacity})`);
    g.addColorStop(0.55, `rgba(30, 24, 70, ${opacity * 0.4})`);
    g.addColorStop(1, 'rgba(30, 24, 70, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

/** Fades every material in a group by `alpha`, remembering each one's own base opacity. */
export function setGroupOpacity(group: THREE.Object3D, alpha: number) {
  group.visible = alpha > 0.001;
  group.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.material) return;
    (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => {
      if (m.userData.baseOpacity === undefined) {
        m.userData.baseOpacity = m.opacity;
        m.userData.baseDepthWrite = m.depthWrite;
      }
      m.transparent = true;
      m.opacity = m.userData.baseOpacity * alpha;
      // Opaque parts stop writing depth while fading so they don't punch holes in what's behind them.
      m.depthWrite = alpha >= 1 && m.userData.baseDepthWrite;
    });
  });
}

export function disposeScene(scene: THREE.Scene) {
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose();
    const mats = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
    mats.forEach((m) => {
      Object.values(m).forEach((v) => v instanceof THREE.Texture && v.dispose());
      m.dispose();
    });
  });
}
