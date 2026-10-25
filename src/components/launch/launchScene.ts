import * as THREE from 'three';
import { primePrograms, whenLinked } from '../../gl/shaderWarmup';
import { BRANDS, LAUNCH, phaseAt, shardAt, shardGrid, type Brand } from './launchPlan';

/**
 * Draws the launch (the plan and its frame-by-frame source are in launchPlan.ts) on one canvas over the page:
 *  - a backdrop shader: the page around the icon bursting outward in streaks while the bright brand colour floods in
 *    from the icon, with ripple bands running out from the middle;
 *  - the coin: a thick rounded-square rim, its face made of shards that rest as the face and then swirl away
 *    (placed on the CPU each frame from shardAt, so what the tests check is what shows), and behind the face a glow
 *    in the brand's colours that the hole opens onto and the portal zooms into.
 * Four small shaders, linked in the background when the scene is made (useLaunch makes it while the mouse is on the
 * footer's icons), so a click starts drawing at once.
 */

const GRID = 12;
const SHARDS = shardGrid(GRID, GRID, 11);
const FOV = 30;
/** the face inside the rim, as a share of the coin */
const FACE = 0.8;
/** the rim's thickness front to back, as a share of the coin */
const DEPTH = 0.14;

const SCREEN_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

// The backdrop. Inside a circle growing from the icon: the brand's colour (up to five stops, bottom-left to
// top-right) with soft bands running out from the middle. Outside it: the page, with streaks of it flying outward.
const BACKDROP_FRAGMENT = /* glsl */ `
uniform vec2 uSize;
uniform vec2 uOrigin;
uniform float uReveal;
uniform float uDebris;
uniform float uRipples;
uniform float uFade;
uniform vec3 uStops[5];
uniform float uCount;
uniform vec3 uPage;
varying vec2 vUv;
float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
vec3 ramp(float t) {
  float x = t * (uCount - 1.0);
  vec3 c = uStops[0];
  for (int i = 1; i < 5; i++) {
    if (float(i) >= uCount) break;
    c = mix(c, uStops[i], clamp(x - float(i - 1), 0.0, 1.0));
  }
  return c;
}
void main() {
  vec2 px = vUv * uSize;
  float big = length(uSize);
  vec2 d = px - uOrigin;
  float fromIcon = length(d);
  float inside = smoothstep(uReveal + 1.5, uReveal - 1.5, fromIcon);

  // the brand screen with bands running out from the middle, darker toward the edges
  float fromMiddle = distance(px, uSize * 0.5) / big;
  vec3 brand = ramp(clamp((vUv.x + vUv.y) * 0.5, 0.0, 1.0));
  float bands = sin(fromMiddle * 34.0 - uRipples * 14.0);
  brand *= 1.0 + 0.045 * bands * smoothstep(0.02, 0.12, fromMiddle);
  brand *= 1.0 - 0.22 * smoothstep(0.2, 0.75, fromMiddle);

  // the page breaking outward: thin radial streaks of it, quick and gone
  float a = atan(d.y, d.x);
  float sector = floor((a + 3.14159) / 6.28318 * 64.0);
  float h = hash(sector);
  float head = uReveal + (0.08 + h * 0.5) * big * uDebris;
  float len = (0.02 + 0.06 * hash(sector + 7.0)) * big;
  float across = abs(fract((a + 3.14159) / 6.28318 * 64.0) - 0.5);
  float streak = step(head - len, fromIcon) * step(fromIcon, head) * step(across, 0.18 + 0.2 * hash(sector + 3.0));
  streak *= (1.0 - uDebris) * step(0.3, h) * step(0.001, uDebris);
  vec3 page = mix(uPage, vec3(0.5), 0.12);

  vec3 c = mix(page, brand, inside);
  float alpha = max(inside, streak * 0.9) * (1.0 - uFade);
  gl_FragColor = vec4(c * alpha, alpha);
}`;

// lit like the reel's coin rim: dark, with a soft sheen where it faces the light
const RIM_VERTEX = /* glsl */ `
varying vec3 vNormal;
void main() {
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const RIM_FRAGMENT = /* glsl */ `
uniform vec3 uRim;
uniform float uFade;
varying vec3 vNormal;
void main() {
  vec3 n = normalize(vNormal);
  vec3 l = normalize(vec3(-0.45, 0.6, 0.66));
  float diff = 0.55 + 0.45 * max(dot(n, l), 0.0);
  float sheen = pow(max(dot(n, normalize(l + vec3(0.0, 0.0, 1.0))), 0.0), 30.0) * 0.45;
  float edge = pow(1.0 - abs(n.z), 3.0) * 0.12;
  vec3 c = uRim * diff + sheen + edge;
  float a = 1.0 - uFade;
  gl_FragColor = vec4(c * a, a);
}`;

const SHARD_VERTEX = /* glsl */ `
attribute float alpha;
varying vec2 vUv;
varying vec3 vNormal;
varying float vAlpha;
void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vAlpha = alpha;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
// facing the viewer: exactly the face's colours; turned: darker, or catching a glint
const SHARD_FRAGMENT = /* glsl */ `
uniform sampler2D uMap;
uniform float uFade;
varying vec2 vUv;
varying vec3 vNormal;
varying float vAlpha;
void main() {
  vec4 t = texture2D(uMap, vUv);
  vec3 n = normalize(vNormal);
  if (!gl_FrontFacing) n = -n;
  float lit = 0.62 + 0.38 * max(n.z, 0.0) + 0.1 * n.y;
  float glint = pow(max(dot(n, normalize(vec3(-0.45, 0.6, 0.66))), 0.0), 24.0) * (1.0 - n.z) * 1.4;
  vec3 c = t.rgb * min(lit, 1.0) + glint;
  float a = t.a * vAlpha * (1.0 - uFade);
  gl_FragColor = vec4(c * a, a);
}`;

const GLOW_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
// what the hole opens onto and the portal zooms into: the brand's colour lit from the middle, deepening toward the
// edges, breathing a little. Smooth on purpose: shapes in it (it once had out-of-focus lights) were blown up by the
// zoom into blurry streaks across the screen at the end of the launch.
const GLOW_FRAGMENT = /* glsl */ `
uniform vec3 uStops[5];
uniform float uCount;
uniform float uTime;
uniform float uFade;
varying vec2 vUv;
vec3 ramp(float t) {
  float x = t * (uCount - 1.0);
  vec3 c = uStops[0];
  for (int i = 1; i < 5; i++) {
    if (float(i) >= uCount) break;
    c = mix(c, uStops[i], clamp(x - float(i - 1), 0.0, 1.0));
  }
  return c;
}
void main() {
  float r = distance(vUv, vec2(0.5));
  vec3 brand = ramp(clamp((vUv.x + vUv.y) * 0.5, 0.0, 1.0));
  vec3 deep = mix(vec3(0.02, 0.025, 0.05), brand, 0.35);
  vec3 lit = mix(brand, vec3(1.0), 0.18 + 0.04 * sin(uTime * 3.0));
  vec3 c = mix(lit, deep, smoothstep(0.0, 0.7, r));
  float a = 1.0 - uFade;
  gl_FragColor = vec4(c * a, a);
}`;

/** A rounded square as a path, centred on 0, `side` across. */
function roundedSquare<T extends THREE.Path>(path: T, side: number, radius: number): T {
  const h = side / 2;
  path.moveTo(-h + radius, -h);
  path.lineTo(h - radius, -h);
  path.quadraticCurveTo(h, -h, h, -h + radius);
  path.lineTo(h, h - radius);
  path.quadraticCurveTo(h, h, h - radius, h);
  path.lineTo(-h + radius, h);
  path.quadraticCurveTo(-h, h, -h, h - radius);
  path.lineTo(-h, -h + radius);
  path.quadraticCurveTo(-h, -h, -h + radius, -h);
  return path;
}

/** The face drawn into a canvas: the brand's colour or gradient, its glyph in white. */
function faceTexture(brand: Brand, size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.16);
  if (brand.colours.length > 1) {
    const g = ctx.createLinearGradient(0, size, size, 0);
    brand.colours.forEach((c, i) => g.addColorStop(i / (brand.colours.length - 1), c));
    ctx.fillStyle = g;
  } else ctx.fillStyle = brand.colours[0];
  ctx.fill();
  const k = (size * 0.58) / 24;
  ctx.setTransform(k, 0, 0, k, (size - 24 * k) / 2, (size - 24 * k) / 2);
  ctx.fillStyle = ctx.strokeStyle = '#fff';
  // as the footer draws the envelope's fold: round ends and corners
  ctx.lineCap = ctx.lineJoin = 'round';
  for (const g of brand.glyph) {
    const path = new Path2D(g.d);
    if (g.stroke) {
      ctx.lineWidth = g.stroke;
      ctx.stroke(path);
    } else ctx.fill(path);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

const rgb = (css: string) => {
  const c = new THREE.Color().setStyle(css, THREE.NoColorSpace);
  return new THREE.Vector3(c.r, c.g, c.b);
};
const stops = (brand: Brand) => {
  const list = brand.colours.map(rgb);
  while (list.length < 5) list.push(list[list.length - 1].clone());
  return list;
};

const easeOutBack = (x: number) => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2);
const easeOutExpo = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const easeInCubic = (x: number) => x * x * x;
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

export interface Play {
  brand: Brand;
  /** the icon on screen, CSS px */
  from: { x: number; y: number; size: number };
  /** the page's background, for the pieces of it that fly off */
  page: string;
  /** the mouse, CSS px, read each frame for the lean */
  pointer: () => { x: number; y: number };
  onOpen: () => void;
  onDone: () => void;
}

export interface LaunchScene {
  play(p: Play): void;
  /** ends at once: opens the tab if it hadn't, then clears the screen */
  finish(): void;
  readonly playing: boolean;
  dispose(): void;
}

export async function createLaunchScene(): Promise<LaunchScene> {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.className = 'launch-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 50000);
  const fade = { value: 0 };
  const brandStops = { value: stops({ colours: ['#000'], rim: '#000', glyph: [] }) };
  const brandCount = { value: 1 };

  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      vertexShader: SCREEN_VERTEX,
      fragmentShader: BACKDROP_FRAGMENT,
      uniforms: {
        uSize: { value: new THREE.Vector2(1, 1) },
        uOrigin: { value: new THREE.Vector2() },
        uReveal: { value: 0 },
        uDebris: { value: 0 },
        uRipples: { value: 0 },
        uFade: fade,
        uStops: brandStops,
        uCount: brandCount,
        uPage: { value: new THREE.Vector3(1, 1, 1) },
      },
      depthTest: false,
      depthWrite: false,
      transparent: true,
      premultipliedAlpha: true,
    }),
  );
  backdrop.frustumCulled = false;
  backdrop.renderOrder = -1;
  scene.add(backdrop);

  // the coin, one unit across; placed, sized and turned as a whole
  const coin = new THREE.Group();
  scene.add(coin);

  const rimShape = roundedSquare(new THREE.Shape(), 1, 0.24);
  rimShape.holes.push(roundedSquare(new THREE.Path(), FACE, 0.16));
  const rimGeometry = new THREE.ExtrudeGeometry(rimShape, { depth: DEPTH, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.02, bevelSegments: 3, curveSegments: 10 });
  rimGeometry.translate(0, 0, -DEPTH);
  const rimMaterial = new THREE.ShaderMaterial({ vertexShader: RIM_VERTEX, fragmentShader: RIM_FRAGMENT, uniforms: { uRim: { value: new THREE.Vector3() }, uFade: fade }, transparent: true, premultipliedAlpha: true });
  const rim = new THREE.Mesh(rimGeometry, rimMaterial);
  rim.renderOrder = 1;
  coin.add(rim);

  // behind the face, inside the rim: what the hole opens onto
  const glowMaterial = new THREE.ShaderMaterial({
    vertexShader: GLOW_VERTEX,
    fragmentShader: GLOW_FRAGMENT,
    uniforms: { uStops: brandStops, uCount: brandCount, uTime: { value: 0 }, uFade: fade },
    transparent: true,
    premultipliedAlpha: true,
  });
  const glow = new THREE.Mesh(new THREE.ShapeGeometry(roundedSquare(new THREE.Shape(), FACE + 0.02, 0.16), 10), glowMaterial);
  // ShapeGeometry's uvs are its x/y: bring them to 0…1
  const glowUv = glow.geometry.attributes.uv;
  for (let i = 0; i < glowUv.count; i++) glowUv.setXY(i, glowUv.getX(i) / (FACE + 0.02) + 0.5, glowUv.getY(i) / (FACE + 0.02) + 0.5);
  glow.position.z = -DEPTH * 0.6;
  coin.add(glow);

  // the face: three corners a shard, placed every frame
  const count = SHARDS.length * 3;
  const geometry = new THREE.BufferGeometry();
  const position = new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const normal = new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const alpha = new THREE.BufferAttribute(new Float32Array(count), 1).setUsage(THREE.DynamicDrawUsage);
  const uv = new THREE.BufferAttribute(new Float32Array(count * 2), 2);
  SHARDS.forEach((s, i) => s.points.forEach(([x, y], k) => uv.setXY(i * 3 + k, x + 0.5, y + 0.5)));
  geometry.setAttribute('position', position);
  geometry.setAttribute('normal', normal);
  geometry.setAttribute('alpha', alpha);
  geometry.setAttribute('uv', uv);
  const placeholder = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
  placeholder.needsUpdate = true;
  const shardMaterial = new THREE.ShaderMaterial({
    vertexShader: SHARD_VERTEX,
    fragmentShader: SHARD_FRAGMENT,
    uniforms: { uMap: { value: placeholder as THREE.Texture }, uFade: fade },
    side: THREE.DoubleSide,
    transparent: true,
    premultipliedAlpha: true,
    depthWrite: false,
  });
  const face = new THREE.Mesh(geometry, shardMaterial);
  face.frustumCulled = false;
  face.renderOrder = 2;
  coin.add(face);

  let size = { w: 1, h: 1 };
  const fit = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w === size.w && h === size.h) return;
    size = { w, h };
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.set(0, 0, h / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    camera.updateProjectionMatrix();
    backdrop.material.uniforms.uSize.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
  };

  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const axis = new THREE.Vector3();
  /** Puts every shard of the face where shardAt says, in the coin's own units. */
  const placeShards = (p: number) => {
    SHARDS.forEach((s, i) => {
      const m = shardAt(s, p);
      q.setFromAxisAngle(axis.set(...s.axis), m.angle);
      v.set(0, 0, 1).applyQuaternion(q);
      const nx = v.x;
      const ny = v.y;
      const nz = v.z;
      for (let k = 0; k < 3; k++) {
        const [x, y] = s.points[k];
        v.set((x - s.cx) * FACE, (y - s.cy) * FACE, 0).applyQuaternion(q);
        position.setXYZ(i * 3 + k, (s.cx + m.x) * FACE + v.x, (s.cy + m.y) * FACE + v.y, 0.002 + m.z * FACE + v.z);
        normal.setXYZ(i * 3 + k, nx, ny, nz);
        alpha.setX(i * 3 + k, m.opacity);
      }
    });
    position.needsUpdate = normal.needsUpdate = alpha.needsUpdate = true;
  };

  // link the programs now, off the page's main path, with everything hidden. The canvas joins the page now too and
  // stays (hidden): adding a full-screen canvas at the click cost the launch's first frame its own layer set-up
  fit();
  canvas.style.visibility = 'hidden';
  document.body.append(canvas);
  placeShards(0);
  coin.scale.setScalar(1);
  const materials = [backdrop.material, rimMaterial, glowMaterial, shardMaterial];
  await renderer.compileAsync(scene, camera);
  await whenLinked(renderer, new Set(materials), 3000);
  await primePrograms(renderer, materials);
  // each brand's face drawn and on the GPU now: done at the click, it cost the launch's first frame ~0.25 s on a slow CPU
  const faces = new Map<Brand, THREE.Texture>();
  for (const brand of Object.values(BRANDS)) {
    const texture = faceTexture(brand);
    renderer.initTexture(texture);
    faces.set(brand, texture);
    await new Promise((r) => window.setTimeout(r, 0));
  }

  let frame = 0;
  let current: (Play & { start: number; opened: boolean; lean: { x: number; y: number } }) | null = null;

  const end = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    const was = current;
    current = null;
    canvas.style.visibility = 'hidden';
    if (!was) return;
    if (!was.opened) {
      was.opened = true;
      was.onOpen();
    }
    was.onDone();
  };

  const tick = (now: number) => {
    const c = current;
    if (!c) return;
    const t = now - c.start;
    const ph = phaseAt(t);
    fit();
    const coinSize = Math.min(size.w, size.h) * 0.46;

    // pop: out of the icon to the middle, a little past full size and back, turning in from the side
    const pop = easeOutBack(ph.pop);
    const travel = easeOutExpo(ph.pop);
    const cx = c.from.x + (size.w / 2 - c.from.x) * travel;
    const cy = c.from.y + (size.h / 2 - c.from.y) * travel;
    // the portal: the coin grows past the screen, the glow inside it taking everything
    const zoom = 1 + easeInCubic(ph.portal) * (Math.hypot(size.w, size.h) / (coinSize * FACE) * 1.6);
    const side = (c.from.size + (coinSize - c.from.size) * pop) * zoom;
    // the hold: floating and wobbling, leaning toward the mouse; flat again for the break and the portal
    const pointer = c.pointer();
    const settle = 1 - Math.min(ph.shards * 3, 1);
    const wob = t / 1000;
    const want = {
      x: (Math.sin(wob * 5.1) * 0.12 + ((pointer.y - size.h / 2) / size.h) * 0.45) * settle,
      y: (Math.cos(wob * 4.3) * 0.16 + ((pointer.x - size.w / 2) / size.w) * 0.45) * settle,
    };
    c.lean.x += (want.x - c.lean.x) * 0.14;
    c.lean.y += (want.y - c.lean.y) * 0.14;
    const turnIn = (1 - travel) * 0.9;
    coin.position.set(cx - size.w / 2, size.h / 2 - cy + Math.sin(wob * 3.2) * coinSize * 0.025 * settle, 0);
    coin.rotation.set(c.lean.x + turnIn * 0.4, c.lean.y - turnIn, 0);
    coin.scale.set(side, side, side);
    placeShards(ph.shards);

    const dpr = renderer.getPixelRatio();
    const u = backdrop.material.uniforms;
    u.uOrigin.value.set(c.from.x * dpr, (size.h - c.from.y) * dpr);
    // the brand floods in a little behind the coin, so the page can be seen breaking away first
    u.uReveal.value = easeOutCubic(ph.pop) * Math.hypot(size.w, size.h) * dpr * 1.05;
    u.uDebris.value = easeOutExpo(ph.debris);
    u.uRipples.value = t / 1000;
    glowMaterial.uniforms.uTime.value = t / 1000;
    fade.value = ph.fade;
    renderer.render(scene, camera);

    if (!c.opened && t >= LAUNCH.openAt) {
      c.opened = true;
      c.onOpen();
    }
    if (ph.done) end();
    else frame = requestAnimationFrame(tick);
  };

  return {
    play(p) {
      if (current) end();
      shardMaterial.uniforms.uMap.value = faces.get(p.brand) ?? placeholder;
      brandStops.value = stops(p.brand);
      brandCount.value = p.brand.colours.length;
      rimMaterial.uniforms.uRim.value = rgb(p.brand.rim);
      backdrop.material.uniforms.uPage.value = rgb(p.page);
      current = { ...p, start: performance.now(), opened: false, lean: { x: 0, y: 0 } };
      if (!canvas.isConnected) document.body.append(canvas);
      canvas.style.visibility = '';
      frame = requestAnimationFrame(tick);
    },
    finish: end,
    get playing() {
      return !!current;
    },
    dispose() {
      end();
      canvas.remove();
      for (const m of materials) m.dispose();
      for (const g of [geometry, rimGeometry, glow.geometry, backdrop.geometry]) g.dispose();
      placeholder.dispose();
      faces.forEach((t) => t.dispose());
      renderer.dispose();
    },
  };
}
