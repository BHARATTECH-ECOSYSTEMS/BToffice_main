import * as THREE from 'three';
import { CONTINENTS, INDIA, INDIA_BBOX, INDIA_HUBS, WORLD, GLOBE_LABELS, inPolygon, lonLatToVec, type LonLat } from './geo';

/**
 * The site's 3D layer: a physically lit globe, a ceramic planet with raised dot-matrix continents, India in
 * violet and live routes to the world. Each section asks for it (or nothing) at a place on the page; it folds
 * away when no longer wanted, unfolds when it is, and the pose glides between stages.
 */

type ObjectKey = 'globe' | 'none';

interface Pose {
  x: number;
  y: number;
  s: number;
}

export interface Target {
  key: ObjectKey;
  pose?: Partial<Pose>;
  /** extra turn (radians) added to the object's idle rotation, usually driven by scroll */
  spin?: number;
  /** how tightly the pose tracks its goal; high values pin the object to its stage while scrolling, and
   *  Infinity places it exactly (for poses already computed from this frame's scroll) */
  follow?: number;
  /** how much of the object shows (opacity only, 1 by default), for one that fades while still in place */
  fade?: number;
  /** the globe only: how much of its place names show (1 by default) */
  labels?: number;
  /** how much of the object's contact shadow shows (1 by default) */
  shadow?: number;
  /**
   * The globe only: its dots leave it and pour into the shape set by `Engine.setDust`. `progress` 0…1 is the
   * dots' own clock, `at` the viewport point (CSS px) that shape is centred on this frame, `break` how far the
   * globe's body has dissolved (the dots show only as it goes), `show` their overall opacity.
   */
  dust?: { progress: number; at: [number, number]; break: number; show: number };
}

const GLOBE_R = 1.45;
/** Footprints in world units, for fitting an object into its stage. */
export const GLOBE_SIZE = GLOBE_R * 2.35;
/** Radius of a continent dot on the globe. */
const DOT_R = 0.019;
/** The dots' colours as sRGB 0…1, written straight to the screen by the dust shader. */
const DOT_INK: [number, number, number] = [0x2b / 255, 0x26 / 255, 0x40 / 255];
const DOT_INDIA: [number, number, number] = [0xff / 255, 0x86 / 255, 0x43 / 255];

const damp = (a: number, b: number, lambda: number, dt: number) => a + (b - a) * (1 - Math.exp(-lambda * dt));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

// ── Studio light ─────────────────────────────────────────────────────────────

/** A product-photography studio built from softboxes and baked into an environment map. */
function studio(renderer: THREE.WebGLRenderer): THREE.Texture {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#cfc9c0');
  const trash: { dispose(): void }[] = [];
  const panel = (w: number, h: number, power: number, pos: [number, number, number], rot: [number, number, number], color = '#ffffff') => {
    const g = new THREE.PlaneGeometry(w, h);
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(...pos);
    mesh.rotation.set(...rot);
    scene.add(mesh);
    trash.push(g, m);
  };
  panel(10, 10, 2.2, [0, 7, 1], [Math.PI / 2, 0, 0]); // overhead softbox
  panel(4, 7, 3.2, [-7, 2.5, 4], [0, Math.PI / 2.4, 0]); // key strip, front left
  panel(1.6, 7, 2.4, [7, 1.5, -1], [0, -Math.PI / 2, 0]); // rim, right
  panel(12, 2.5, 0.8, [0, 0.5, 9], [0, 0, 0], '#fff6ea'); // warm front fill
  panel(40, 40, 0.5, [0, -3, 0], [-Math.PI / 2, 0, 0], '#9a9288'); // floor bounce
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(scene, 0.035).texture;
  pmrem.dispose();
  trash.forEach((t) => t.dispose());
  return tex;
}

/** A soft contact shadow: a radial falloff seen from the front, just below and behind an object. */
function contactShadow(): THREE.Mesh {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const g = cv.getContext('2d')!;
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(32,22,60,0.55)');
  grd.addColorStop(0.35, 'rgba(32,22,60,0.28)');
  grd.addColorStop(1, 'rgba(32,22,60,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(cv);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  return mesh;
}

// ── The globe ────────────────────────────────────────────────────────────────

function arcPoint(a: LonLat, c: LonLat, t: number, r: number): THREE.Vector3 {
  const p = new THREE.Vector3(...lonLatToVec(a[0], a[1], 1));
  const q = new THREE.Vector3(...lonLatToVec(c[0], c[1], 1));
  const om = Math.acos(THREE.MathUtils.clamp(p.dot(q), -1, 1));
  const so = Math.sin(om) || 1e-6;
  const v = p.multiplyScalar(Math.sin((1 - t) * om) / so).add(q.multiplyScalar(Math.sin(t * om) / so));
  const lift = 1 + Math.sin(Math.PI * t) * Math.min(0.22, 0.05 + om * 0.09);
  return v.multiplyScalar(r * lift);
}

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
  }
}

function createGlobeLabelSprite(text: string, isHome = false): {
  sprite: THREE.Sprite;
  mat: THREE.SpriteMaterial;
  texture: THREE.CanvasTexture;
} {
  const dpr = 2;
  const fontSize = 18 * dpr;
  const margin = 10 * dpr;
  const h = 46 * dpr;

  // Measure with the exact rendered font
  const scratch = document.createElement('canvas');
  const sCtx = scratch.getContext('2d')!;
  const fontStr = `800 ${fontSize}px "Figtree", "Geist Mono", system-ui, -apple-system, sans-serif`;
  sCtx.font = fontStr;
  const textWidth = Math.ceil(sCtx.measureText(text).width);

  const padLeft = 14 * dpr;
  const dotR = 4 * dpr;
  const dotGap = 9 * dpr;
  const padRight = 18 * dpr; // generous buffer so the final alphabet is never clipped
  const badgeW = padLeft + dotR * 2 + dotGap + textWidth + padRight;

  const canvasW = Math.ceil(badgeW + margin * 2);
  const canvasH = Math.ceil(h + margin * 2);

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d')!;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const badgeX = margin;
  const badgeY = margin;
  const radius = h / 2;

  // Drop shadow behind the badge
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
  ctx.shadowBlur = 8 * dpr;
  ctx.shadowOffsetY = 3 * dpr;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  drawRoundRect(ctx, badgeX, badgeY, badgeW, h, radius);
  ctx.fill();
  ctx.restore();

  // Crisp contrasting border
  ctx.strokeStyle = isHome ? '#FF8643' : 'rgba(0, 0, 0, 0.26)';
  ctx.lineWidth = isHome ? 2.4 * dpr : 1.8 * dpr;
  ctx.beginPath();
  drawRoundRect(ctx, badgeX, badgeY, badgeW, h, radius);
  ctx.stroke();

  // Indicator dot
  const dotX = badgeX + padLeft + dotR;
  const dotY = badgeY + h / 2;
  ctx.fillStyle = isHome ? '#FF8643' : '#F59E00';
  ctx.beginPath();
  ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
  ctx.fill();

  // Deep solid black, extra bold text for maximum clarity (#000000)
  ctx.font = fontStr;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#000000';
  const textX = dotX + dotR + dotGap;
  const textY = badgeY + h / 2;
  ctx.fillText(text, textX, textY);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(mat);
  const aspect = canvas.width / canvas.height;
  const spriteH = 0.16;
  sprite.scale.set(spriteH * aspect, spriteH, 1);

  return { sprite, mat, texture };
}

function buildGlobe() {
  const group = new THREE.Group();
  const spinner = new THREE.Group();
  group.add(spinner);
  const trash: { dispose(): void }[] = [];
  const mats: THREE.Material[] = [];

  // 1. a ceramic planet
  const bodyGeo = new THREE.SphereGeometry(GLOBE_R, 128, 96);
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: '#f4f1fb', roughness: 0.55, clearcoat: 0.6, clearcoatRoughness: 0.25, sheen: 0.5, sheenColor: new THREE.Color('#d9d0ff'), transparent: true });
  spinner.add(new THREE.Mesh(bodyGeo, bodyMat));
  trash.push(bodyGeo, bodyMat);
  mats.push(bodyMat);

  // 2. continents as raised dots, India denser and in violet
  const world: THREE.Vector3[] = [];
  const india: THREE.Vector3[] = [];
  const step = 2.6;
  let row = 0;
  for (let lat = -62; lat <= 80; lat += step, row++) {
    const n = Math.max(1, Math.round((360 * Math.cos((lat * Math.PI) / 180)) / step));
    for (let k = 0; k < n; k++) {
      const lon = ((k + (row % 2 ? 0.5 : 0)) / n) * 360 - 180;
      const pt: LonLat = [lon, lat];
      if (inPolygon(pt, INDIA)) continue;
      if (CONTINENTS.some((c) => inPolygon(pt, c))) world.push(new THREE.Vector3(...lonLatToVec(lon, lat, GLOBE_R)));
    }
  }
  const di = 1.15;
  for (let lat = INDIA_BBOX.minLat; lat <= INDIA_BBOX.maxLat; lat += di) {
    for (let lon = INDIA_BBOX.minLon; lon <= INDIA_BBOX.maxLon; lon += di / Math.cos((lat * Math.PI) / 180)) {
      if (inPolygon([lon, lat], INDIA)) india.push(new THREE.Vector3(...lonLatToVec(lon, lat, GLOBE_R)));
    }
  }
  const dots = (pts: THREE.Vector3[], radius: number, color: string, rough: number) => {
    const g = new THREE.CylinderGeometry(radius, radius * 1.05, 0.016, 14);
    g.rotateX(Math.PI / 2); // the disc's axis along +z, so lookAt stands it on the surface
    const m = new THREE.MeshPhysicalMaterial({ color, roughness: rough, clearcoat: 0.4, transparent: true });
    const inst = new THREE.InstancedMesh(g, m, pts.length);
    const o = new THREE.Object3D();
    pts.forEach((p, i) => {
      o.position.copy(p).multiplyScalar(1.002);
      o.lookAt(p.clone().multiplyScalar(2));
      o.updateMatrix();
      inst.setMatrixAt(i, o.matrix);
    });
    spinner.add(inst);
    trash.push(g, m);
    mats.push(m);
  };
  dots(world, DOT_R, '#2b2640', 0.5);
  dots(india, DOT_R * 0.84, '#FF8643', 0.4);
  // where every dot sits and its colour, for the dust that leaves from them
  const dotsAt = { pos: new Float32Array((world.length + india.length) * 3), col: new Float32Array((world.length + india.length) * 3) };
  [...world.map((v) => [v, DOT_INK] as const), ...india.map((v) => [v, DOT_INDIA] as const)].forEach(([v, c], i) => {
    dotsAt.pos.set([v.x * 1.002, v.y * 1.002, v.z * 1.002], i * 3);
    dotsAt.col.set(c, i * 3);
  });

  // 3. hubs in India, with rings that breathe
  const ringGeo = new THREE.RingGeometry(0.03, 0.04, 40);
  const ringMats: THREE.MeshBasicMaterial[] = [];
  const rings: THREE.Mesh[] = [];
  INDIA_HUBS.slice(0, 6).forEach((h, i) => {
    const p = new THREE.Vector3(...lonLatToVec(h.at[0], h.at[1], GLOBE_R * 1.012));
    const m = new THREE.MeshBasicMaterial({ color: '#FF8643', transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const r = new THREE.Mesh(ringGeo, m);
    r.position.copy(p);
    r.lookAt(p.clone().multiplyScalar(2));
    r.userData.phase = i * 0.37;
    spinner.add(r);
    rings.push(r);
    ringMats.push(m);
    trash.push(m);
  });
  trash.push(ringGeo);

  // 4. routes of light from India to the world, each with a travelling signal
  const arcMat = new THREE.MeshBasicMaterial({ color: '#F59E00', transparent: true, opacity: 0.65, depthWrite: false });
  const headGeo = new THREE.SphereGeometry(0.022, 16, 12);
  const headMat = new THREE.MeshBasicMaterial({ color: '#FF8643', transparent: true });
  const heads: { mesh: THREE.Mesh; curve: THREE.CatmullRomCurve3; phase: number; speed: number }[] = [];
  trash.push(arcMat, headGeo, headMat);
  mats.push(arcMat, headMat);
  WORLD.forEach((w, i) => {
    const from = INDIA_HUBS[i % INDIA_HUBS.length].at;
    const pts = Array.from({ length: 48 }, (_, k) => arcPoint(from, w.at, k / 47, GLOBE_R * 1.004));
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.TubeGeometry(curve, 96, 0.0055, 6, false);
    spinner.add(new THREE.Mesh(tube, arcMat));
    trash.push(tube);
    const head = new THREE.Mesh(headGeo, headMat);
    spinner.add(head);
    heads.push({ mesh: head, curve, phase: (i * 0.173) % 1, speed: 0.16 + (i % 4) * 0.03 });
  });

  // 5. a thin atmosphere at the limb, so the planet reads as round against the paper
  const atmoGeo = new THREE.SphereGeometry(GLOBE_R * 1.06, 64, 48);
  const atmoMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    uniforms: { uOpacity: { value: 1 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float uOpacity; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 3.0); gl_FragColor = vec4(0.55,0.47,1.0, f*0.16*uOpacity); }`,
  });
  group.add(new THREE.Mesh(atmoGeo, atmoMat));
  trash.push(atmoGeo, atmoMat);

  // 6. names directly on the globe
  const labelSprites: { sprite: THREE.Sprite; pos: THREE.Vector3; mat: THREE.SpriteMaterial }[] = [];
  GLOBE_LABELS.forEach((lbl) => {
    const { sprite, mat, texture } = createGlobeLabelSprite(lbl.name, !!lbl.home);
    const p = new THREE.Vector3(...lonLatToVec(lbl.at[0], lbl.at[1], GLOBE_R * 1.055));
    sprite.position.copy(p);
    spinner.add(sprite);
    labelSprites.push({ sprite, pos: p, mat });
    trash.push(mat, texture);
    mats.push(mat);
  });

  // India faces the viewer at rest; the globe idles around its axis from there
  spinner.rotation.x = 0.12;

  return {
    group,
    spinner,
    mats,
    dotsAt,
    atmo: atmoMat,
    update(time: number, spin: number, show = 1) {
      spinner.rotation.y = Math.sin(time * 0.12) * 0.55 + spin;
      heads.forEach((h) => {
        const t = (((h.phase + time * h.speed) % 1) + 1) % 1;
        h.mesh.position.copy(h.curve.getPointAt(t));
        h.mesh.scale.setScalar(Math.sin(Math.PI * t) * 1.2 + 0.2);
      });
      rings.forEach((r, i) => {
        const k = (time * 0.6 + r.userData.phase) % 1;
        r.scale.setScalar(1 + k * 2.4);
        ringMats[i].opacity = (1 - k) * 0.9;
      });
      const euler = new THREE.Euler(spinner.rotation.x, spinner.rotation.y, 0, 'YXZ');
      labelSprites.forEach(({ sprite, pos, mat }) => {
        const rotatedPos = pos.clone().applyEuler(euler);
        const facing = Math.max(0, Math.min(1, (rotatedPos.z - 0.1) / 0.4));
        // set here every frame, so the names follow the globe's own opacity rather than the engine's pass
        mat.opacity = facing * show;
        sprite.visible = mat.opacity > 0.02;
      });
    },
    dispose: () => trash.forEach((t) => t.dispose()),
  };
}

// ── Dust: the globe breaking into its dots, which pour into a shape on the page ─────────────

/** Share of the dots' clock each one spends travelling; the rest staggers their departures. */
const DUST_SPAN = 0.42;

const DUST_VS = /* glsl */ `
attribute vec3 aFrom;     // a dot on the globe, in the globe's own space
attribute vec3 aFromCol;
attribute vec2 aTo;       // its place in the target shape: CSS px from the shape's centre, y down
attribute vec3 aToCol;
attribute vec4 aSeed;     // x departure, y swirl angle, z depth, w size
uniform mat4 uFromM;      // the globe's world matrix this frame
uniform vec3 uFromC;      // the globe's centre
uniform vec2 uToC;        // the shape's centre, world units
uniform float uK;         // world units per CSS px
uniform float uP;
uniform float uBreak;
uniform float uShow;
uniform float uDotPx;
uniform float uTextPx;
uniform float uDpr;
varying vec3 vCol;
varying float vA;
float ease(float t) { return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0; }
void main() {
  vec3 from = (uFromM * vec4(aFrom, 1.0)).xyz;
  vec3 to = vec3(uToC + aTo * vec2(uK, -uK), 0.0);
  float t = clamp((uP - aSeed.x) / ${DUST_SPAN.toFixed(3)}, 0.0, 1.0);
  float e = ease(t);
  // a curved path: each dot swings out to its own side, and toward or away from the viewer, on the way down
  vec3 bend = vec3(cos(aSeed.y), sin(aSeed.y) * 0.5, aSeed.z * 0.5) * length(to - from) * 0.14;
  vec3 mid = mix(from, to, 0.5) + bend;
  vec3 pos = mix(mix(from, mid, e), mix(mid, to, e), e);
  // still on the globe, a dot on its far side stays hidden behind where the body was
  vec3 n = normalize(from - uFromC);
  float facing = smoothstep(-0.05, 0.3, dot(n, normalize(cameraPosition - from)));
  vA = mix(facing, 1.0, smoothstep(0.0, 0.25, t)) * uBreak * uShow;
  vCol = mix(aFromCol, aToCol, smoothstep(0.3, 0.95, t));
  // they leave a little finer than the raised dots and are down to letter size well before they arrive
  gl_PointSize = mix(uDotPx * 0.8 * aSeed.w, uTextPx, smoothstep(0.0, 0.7, t)) * (1.0 + sin(3.14159 * t) * 0.25) * uDpr;
  gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
}`;

const DUST_FS = /* glsl */ `
varying vec3 vCol;
varying float vA;
void main() {
  float r = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.3, r) * vA;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vCol, a);
}`;

/** A small seeded random, so the same heading always gets the same flight paths. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildDust() {
  const uniforms = {
    uFromM: { value: new THREE.Matrix4() },
    uFromC: { value: new THREE.Vector3() },
    uToC: { value: new THREE.Vector2() },
    uK: { value: 0.01 },
    uP: { value: 0 },
    uBreak: { value: 0 },
    uShow: { value: 0 },
    uDotPx: { value: 6 },
    uTextPx: { value: 2.6 },
    uDpr: { value: 1 },
  };
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader: DUST_VS, fragmentShader: DUST_FS, transparent: true, depthTest: false, depthWrite: false });
  const geometry = new THREE.BufferGeometry();
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false; // positions are computed in the shader; the geometry's bounds mean nothing
  points.renderOrder = 20;
  points.visible = false;
  return { points, uniforms, material };
}

// ── Engine ───────────────────────────────────────────────────────────────────

interface Slot {
  group: THREE.Group;
  mats: THREE.Material[];
  amt: number; // 0 folded away … 1 present
  pose: Pose;
  shadow: THREE.Mesh;
  target: Target;
}

export class Engine {
  readonly reducedMotion: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  private slots: Record<'globe', Slot>;
  private globe: ReturnType<typeof buildGlobe>;
  private dust = buildDust();
  private env: THREE.Texture | null = null;
  private target: Target = { key: 'none' };
  private pointer = new THREE.Vector2();
  private lean = new THREE.Vector2();
  private velocity = 0;
  private spin = 0;
  private time = 0;
  private last = performance.now();
  private listeners = new Set<() => void>();
  private idleFrames = 0;
  /** the canvas is hidden while it has nothing to draw, so the compositor stops blending an empty layer */
  private hidden = false;
  private warmed = false;
  private destroyed = false;
  private onPointer = (e: PointerEvent) => this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
  private onResize = () => this.resize();

  constructor(canvas: HTMLCanvasElement) {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lite = document.documentElement.classList.contains('lite');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, lite ? 1.25 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.setClearColor(0x000000, 0);

    const key = new THREE.DirectionalLight('#fff4e6', 1.4);
    key.position.set(-4, 5, 6);
    this.scene.add(key, new THREE.HemisphereLight('#ffffff', '#cbbfae', 0.35));

    this.globe = buildGlobe();
    const slot = (group: THREE.Group, mats: THREE.Material[], shadowW: number): Slot => {
      const holder = new THREE.Group();
      holder.add(group);
      const shadow = contactShadow();
      shadow.scale.set(shadowW, shadowW * 0.42, 1);
      holder.add(shadow);
      holder.visible = false;
      this.scene.add(holder);
      const all = [...mats, shadow.material as THREE.Material];
      // each material fades from its own resting opacity; see-through ones never write depth
      all.forEach((m) => {
        m.userData.base = m.opacity;
        m.userData.noDepth = !m.depthWrite || m.opacity < 1;
      });
      return { group: holder, mats: all, amt: 0, pose: { x: 1.7, y: 0, s: 1 }, shadow, target: { key: 'none' } as Target };
    };
    this.slots = { globe: slot(this.globe.group, this.globe.mats, GLOBE_R * 2.3) };
    this.slots.globe.shadow.position.set(0, -GLOBE_R * 1.28, -0.4);
    this.scene.add(this.dust.points);
    this.dust.uniforms.uFromM.value = this.globe.spinner.matrixWorld; // by reference: current at every draw

    this.resize();
    window.addEventListener('resize', this.onResize);
    window.addEventListener('pointermove', this.onPointer, { passive: true });
  }

  /** The studio light the objects reflect, built on first need: its blur shader alone takes 0.5–2 s to link on an integrated GPU. */
  private light() {
    if (this.env) return;
    this.env = studio(this.renderer);
    this.scene.environment = this.env;
  }

  /**
   * Builds the studio light and draws every object once, so their first real appearance is free: the first time an
   * object is drawn its shaders compile and its geometry and textures upload, which stalled the page when the globe
   * first scrolled into view. The section that shows the globe calls this at a quiet moment (only the home page has
   * one), so the other pages, the portal too, never pay for it. The pixel drawn into is cleared on the next frame.
   */
  async warm() {
    if (this.destroyed || this.warmed) return;
    this.warmed = true;
    this.light();
    // Link every program (the hidden dust's too) off the main thread first. Some browsers never report a program
    // ready until it is drawn, so the wait is capped; if the cap wins, the draw below links them as before.
    await Promise.race([
      this.renderer.compileAsync(this.scene, this.camera).catch(() => undefined),
      new Promise((done) => window.setTimeout(done, 1500)),
    ]);
    if (this.destroyed) return;
    const slots = Object.values(this.slots);
    const was = slots.map((s) => s.group.visible);
    slots.forEach((s) => (s.group.visible = true));
    this.renderer.setScissorTest(true);
    this.renderer.setScissor(0, 0, 1, 1);
    this.renderer.render(this.scene, this.camera);
    this.renderer.clear();
    this.renderer.setScissorTest(false);
    slots.forEach((s, i) => (s.group.visible = was[i]));
  }

  /**
   * Draws one frame. The page's frame loop calls this after the smooth scroll has moved the page, so an object
   * placed from this frame's scroll lands where its stage is drawn in the same frame.
   */
  tick(now: number) {
    this.frame(now);
  }

  /**
   * The shape the globe's dots pour into: points as CSS px from its centre (x, y pairs) and their sRGB colours,
   * `size` the px size of a dot once there. Every point gets a dot that leaves from somewhere on the globe.
   */
  setDust(to: Float32Array, toColor: Float32Array, size: number) {
    const n = to.length / 2;
    const src = this.globe.dotsAt;
    const m = src.pos.length / 3;
    const from = new Float32Array(n * 3);
    const fromCol = new Float32Array(n * 3);
    const seed = new Float32Array(n * 4);
    const rnd = seeded(7);
    for (let i = 0; i < n; i++) {
      const j = Math.floor(rnd() * m);
      // several dots can leave one globe dot; a hair apart, so they visibly split
      for (let k = 0; k < 3; k++) from[i * 3 + k] = src.pos[j * 3 + k] + (rnd() - 0.5) * DOT_R;
      fromCol.set(src.col.subarray(j * 3, j * 3 + 3), i * 3);
      // the lowest dots leave first, so the globe pours downward rather than evaporating evenly
      const low = 1 - (src.pos[j * 3 + 1] / GLOBE_R + 1) / 2;
      const order = 1 - (0.6 * low + 0.4 * rnd());
      seed.set([order * (1 - DUST_SPAN), rnd() * Math.PI * 2, (rnd() - 0.3) * 1.4, 0.75 + rnd() * 0.5], i * 4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); // unused, sets the count
    g.setAttribute('aFrom', new THREE.BufferAttribute(from, 3));
    g.setAttribute('aFromCol', new THREE.BufferAttribute(fromCol, 3));
    g.setAttribute('aTo', new THREE.BufferAttribute(to, 2));
    g.setAttribute('aToCol', new THREE.BufferAttribute(toColor, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    this.dust.points.geometry.dispose();
    this.dust.points.geometry = g;
    this.dust.uniforms.uTextPx.value = size;
  }

  setTarget(t: Target) {
    this.target = t;
    // Keep the outgoing object's appearance: resetting a scroll fade here makes it flash back into view.
    if (t.key !== 'none') {
      this.light(); // reached before the quiet moment came: built now, as it always used to be
      this.slots[t.key].target = t;
    }
  }

  /** Scroll velocity in px per frame: a quick scroll gives the objects a little extra turn. */
  setVelocity(v: number) {
    this.velocity = v;
  }

  onFrame(fn: () => void) {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  }

  private resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // same framing as worldYOf() in Scene.tsx
    this.camera.position.set(0, 0, w / h < 1 ? 7 / Math.max(0.62, w / h) ** 0.55 : 7);
    this.camera.updateProjectionMatrix();
  }

  private frame(now: number) {
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000)); // rAF's first timestamp can predate the constructor
    this.last = now;
    if (!this.reducedMotion) this.time += dt;
    this.listeners.forEach((fn) => fn());

    const t = this.target;
    // reduced motion: no spin from fast scrolling and no leaning toward the pointer
    const moving = this.reducedMotion ? 0 : 1;
    this.spin = damp(this.spin, this.velocity * 0.004 * moving, 4, dt);
    this.lean.x = damp(this.lean.x, this.pointer.x * moving, 3, dt);
    this.lean.y = damp(this.lean.y, this.pointer.y * moving, 3, dt);

    let busy = false;
    (['globe'] as const).forEach((k) => {
      const s = this.slots[k];
      const gate = t.key === k ? 1 : 0;
      s.amt = damp(s.amt, gate, gate ? 5 : 8, dt);
      if (Math.abs(s.amt - gate) < 0.001) s.amt = gate;
      else busy = true;

      const goal = t.key === k ? t.pose : undefined;
      const follow = t.follow ?? 12;
      if (goal) {
        if (s.amt < 0.02 || follow === Infinity) Object.assign(s.pose, goal); // exact scroll poses also work when dt is zero
        else {
          s.pose.x = damp(s.pose.x, goal.x ?? s.pose.x, follow, dt);
          s.pose.y = damp(s.pose.y, goal.y ?? s.pose.y, follow, dt);
          s.pose.s = damp(s.pose.s, goal.s ?? s.pose.s, follow * 0.6, dt);
        }
      }
      const vis = s.amt > 0.002;
      s.group.visible = vis;
      if (!vis) return;
      const e = easeOut(s.amt);
      s.group.position.set(s.pose.x, s.pose.y - (1 - e) * 0.35, 0);
      s.group.scale.setScalar(s.pose.s * (0.72 + 0.28 * e));
      const shown = e * (s.target.fade ?? 1);
      // faded right out (its dots gone to dust) it is not drawn at all; its matrices still update for the dust
      if (shown < 0.002) {
        s.group.visible = false;
        return;
      }
      s.mats.forEach((m) => {
        m.opacity = shown * (m.userData.base as number);
        m.depthWrite = shown > 0.98 && !m.userData.noDepth;
      });
      (s.shadow.material as THREE.Material).opacity *= s.target.shadow ?? 1;
    });

    const gt = this.slots.globe.target;
    const globeAmt = easeOut(this.slots.globe.amt);
    const globeShown = globeAmt * (gt.fade ?? 1);

    // the dust, placed from this frame's globe and target shape
    const d = gt.dust;
    const du = this.dust.uniforms;
    // Only while the globe is the scene's subject: its target's `at` is a screen position from the scroll that set
    // it, so after another section takes over (a fast jump past the ride) the letters would hang there, over the
    // next page, for the ~1s the globe takes to fold away. The ride's track keeps the globe the subject until the
    // letters have landed (Network.tsx), so this never cuts the ride short.
    const dustOn =
      t.key === 'globe' && !!d && d.show * d.break * globeAmt > 0.002 && this.dust.points.geometry.getAttribute('aTo') !== undefined;
    this.dust.points.visible = dustOn;
    if (dustOn && d) {
      const k = (2 * this.camera.position.z * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))) / window.innerHeight;
      const gp = this.slots.globe.group.position;
      du.uK.value = k;
      du.uToC.value.set((d.at[0] - window.innerWidth / 2) * k, (window.innerHeight / 2 - d.at[1]) * k);
      du.uFromC.value.copy(gp);
      du.uP.value = d.progress;
      du.uBreak.value = d.break;
      du.uShow.value = d.show * globeAmt;
      du.uDotPx.value = (2 * DOT_R * this.slots.globe.group.scale.x) / k;
      du.uDpr.value = this.renderer.getPixelRatio();
    }

    // Nothing the globe draws needs updating while it is hidden, except its spin, which the dust leaves from.
    if (this.slots.globe.group.visible || dustOn) {
      this.globe.group.rotation.x = this.lean.y * 0.1;
      this.globe.update(this.time, (gt.spin ?? 0) + (this.lean.x * 0.25 + this.spin * 2), globeShown * (gt.labels ?? 1));
      this.globe.atmo.uniforms.uOpacity.value = globeShown;
    }

    const anyVisible = this.slots.globe.group.visible || dustOn;
    const show = anyVisible || busy;
    if (show) this.idleFrames = 0;
    // after the last object leaves, render twice more to clear the canvas, then hide it until it has work again
    if (show || this.idleFrames++ < 2) {
      if (this.hidden) {
        this.renderer.domElement.style.visibility = '';
        this.hidden = false;
      }
      this.renderer.render(this.scene, this.camera);
    } else if (!this.hidden) {
      this.renderer.domElement.style.visibility = 'hidden';
      this.hidden = true;
    }
  }

  destroy() {
    this.destroyed = true;
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pointermove', this.onPointer);
    this.globe.dispose();
    this.dust.points.geometry.dispose();
    this.dust.material.dispose();
    Object.values(this.slots).forEach(({ shadow }) => {
      const m = shadow.material as THREE.MeshBasicMaterial;
      m.map?.dispose();
      m.dispose();
      shadow.geometry.dispose();
    });
    this.env?.dispose();
    this.renderer.dispose();
  }
}
