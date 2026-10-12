import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SCULPTURE_FS, SCULPTURE_VS } from './sculpture.glsl';
import { SAMPLED_THREADS } from './threads';

/**
 * The home page's film: the logo as one piece of glass in a paper studio, changing as the story is told.
 * Scroll is the film's clock. `setBeat(b)` places everything at beat b (0…8): the form and its glass, how
 * much of its three threads is drawn, the camera's orbit, the light on the floor. Scrolling back plays it
 * in reverse. The form always sits at the same point on screen (`anchor`), so the copy beside it never has
 * to move.
 */

export const BEATS = 8;

const CENTER = new THREE.Vector3(0, 1.5, 0);
const PAPER = new THREE.Color('#F8F7F3');

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const damp = (a: number, b: number, l: number, dt: number) => a + (b - a) * (1 - Math.exp(-l * dt));
const mixN = (a: number, b: number, t: number) => a + (b - a) * t;

/** How each form is made: the colour of its glass, its light, its threads. */
interface Look {
  tint: string; // the colour the glass lets through
  density: number;
  body: number; // how much of the logo's own orange/yellow it carries
  core: string;
  coreI: number;
  frost: number;
  threads: number;
  draw: number; // 1 the threads are whole, 0 erased back to the origin point
  ghost: number;
  irid: number;
  scale: number;
  spin: number; // the orbs turn slowly about the centre
  freeze: number; // 1 time stops: dust hangs, colour drains
  glow: number; // the threads lit from within
  orbs: [number, number, number, number]; // ring radius, orb radius, centre radius, arm (0 none, 1 short, 2 bridge)
}

/** Radius of a sphere that holds each form, so the ray march can skip everything outside it. */
const BOUNDS = [1.06, 1.06, 1.76, 1.06, 2.12, 1.06, 2.22, 1.06];

const WHOLE: Look['orbs'] = [0, 1, 0, 0];
const MARK = { tint: '#7d62ff', density: 1.6, body: 0.85, core: '#cdbfff', ghost: 0, irid: 0.22, scale: 1, spin: 0, freeze: 0, frost: 0, threads: 1, draw: 1, glow: 0, orbs: WHOLE };
const LOOKS: Look[] = [
  { ...MARK, coreI: 0.3 }, // origin
  { ...MARK, tint: '#d9d0ff', density: 0.5, body: 0.2, coreI: 0, frost: 0.24, draw: 0.1, ghost: 0.2, irid: 0.32 }, // forgets
  { ...MARK, tint: '#9784ff', density: 1.3, body: 0.6, coreI: 0, frost: 0.04, irid: 0.3, spin: 0.35, orbs: [1.12, 0.6, 0, 0] }, // scattered
  { ...MARK, tint: '#bcd0ff', density: 0.9, body: 0.28, core: '#a9caff', coreI: 0.1, frost: 0.5, threads: 0.7, irid: 0.2, scale: 0.98, freeze: 1 }, // frozen
  { ...MARK, tint: '#9784ff', density: 1.3, body: 0.5, coreI: 0, frost: 0.08, threads: 0.85, irid: 0.3, freeze: 0.3, orbs: [1.62, 0.46, 0, 1] }, // alone
  { ...MARK, coreI: 0.45 }, // remembers
  { ...MARK, body: 0.8, coreI: 0.8, spin: 0.3, glow: 0.08, orbs: [1.78, 0.4, 0.74, 2] }, // connects
  { ...MARK, body: 0.78, core: '#ddd2ff', coreI: 1.7, irid: 0.4, scale: 1.08, glow: 0.35 }, // learns
];
/** Forms whose threads draw themselves back in as the form arrives. */
const REDRAW = new Set([5]);

/** The camera's orbit: one shot per beat, in degrees round the form. */
export interface Shot {
  yaw: number;
  pitch: number;
}

const SHOTS: Shot[] = [
  { yaw: 0, pitch: 6 },
  { yaw: -14, pitch: 16 },
  { yaw: 10, pitch: 8 },
  { yaw: 6, pitch: -2 },
  { yaw: 0, pitch: 10 },
  { yaw: -6, pitch: 6 },
  { yaw: 0, pitch: 9 },
  { yaw: 4, pitch: 20 },
];

/** Where the form's centre sits on screen, as fractions of width and height from the top left. */
export interface Anchor {
  wide: [number, number];
  narrow: [number, number];
}
const ANCHOR: Anchor = { wide: [0.71, 0.5], narrow: [0.5, 0.31] };

// ── Canvas textures ──────────────────────────────────────────────────────────

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const radial = (stops: [number, string][]) =>
  canvasTex(256, 256, (g) => {
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    stops.forEach(([o, c]) => grd.addColorStop(o, c));
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
  });

/**
 * The mark's three threads as a texture over the logo's disk. Red is the thread itself; green is how far
 * along its thread each point lies, 0 where it enters and 1 at the origin point, so threads can be erased
 * back towards the origin and drawn out again.
 */
function logoTex() {
  const S = 1024;
  const cv = document.createElement('canvas');
  cv.width = S;
  cv.height = S;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, S, S);
  const X = (x: number) => ((x + 1) / 2) * S;
  const Y = (y: number) => ((1 - y) / 2) * S;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = 0.17 * (S / 2);
  for (const curve of SAMPLED_THREADS) {
    let total = 0;
    const at = [0];
    for (let i = 1; i < curve.length; i++) at.push((total += Math.hypot(curve[i][0] - curve[i - 1][0], curve[i][1] - curve[i - 1][1])));
    for (let i = 1; i < curve.length; i++) {
      g.strokeStyle = `rgb(0 ${Math.round((at[i] / total) * 255)} 0)`;
      g.beginPath();
      g.moveTo(X(curve[i - 1][0]), Y(curve[i - 1][1]));
      g.lineTo(X(curve[i][0]), Y(curve[i][1]));
      g.stroke();
    }
  }
  g.globalCompositeOperation = 'lighter';
  g.strokeStyle = '#f00';
  for (const curve of SAMPLED_THREADS) {
    g.beginPath();
    curve.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
    g.stroke();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 4;
  return t;
}

/** An endless paper sweep: floor, a soft curve, and a wall far behind. */
function cyclorama(paperColor: THREE.Color, isDark = false) {
  const shape: [number, number][] = [];
  for (let z = 16; z > -6; z -= 1) shape.push([z, 0]);
  const rad = 4;
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * (Math.PI / 2);
    shape.push([-6 - Math.sin(a) * rad, rad - Math.cos(a) * rad]);
  }
  for (let y = rad + 1; y <= 26; y += 2) shape.push([-6 - rad, y]);
  const pos: number[] = [];
  const idx: number[] = [];
  shape.forEach(([z, y]) => pos.push(-45, y, z, 45, y, z));
  for (let i = 0; i < shape.length - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: paperColor, emissive: paperColor, emissiveIntensity: isDark ? 0.05 : 0.62, roughness: 1, side: THREE.DoubleSide }));
}

// ── Particles ────────────────────────────────────────────────────────────────

const DUST_VS = `
attribute vec3 aSeed;
uniform float uLife, uInflow, uScale, uFocus;
uniform vec3 uCore;
varying float vA;
void main(){
  vec3 p = position;
  p += vec3(sin(uLife * 0.19 + aSeed.x * 6.28) * 0.35, sin(uLife * 0.13 + aSeed.y * 6.28) * 0.28, cos(uLife * 0.17 + aSeed.z * 6.28) * 0.35);
  // growing: the air itself is drawn into the heart of the form
  float t = fract(uLife * 0.07 + aSeed.x);
  vec3 q = p - uCore;
  float ang = t * 2.2;
  q = vec3(q.x * cos(ang) - q.z * sin(ang), q.y, q.x * sin(ang) + q.z * cos(ang));
  q = uCore + q * (1.0 - t * t);
  p = mix(p, q, uInflow);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float dist = -mv.z;
  float coc = abs(dist - uFocus);
  gl_PointSize = uScale * (0.03 + coc * 0.012) * (0.6 + aSeed.z) / dist;
  vA = (0.5 / (1.0 + coc * coc * 0.35)) * (1.0 - uInflow * pow(t, 6.0));
  gl_Position = projectionMatrix * mv;
}`;

const DOT_FS = `
uniform vec3 uColor;
varying float vA;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.05, d) * vA;
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor, a);
}`;

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uDesat: { value: 0 }, uTime: { value: 0 }, uVig: { value: 1 }, uRes: { value: new THREE.Vector2(1, 1) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uDesat, uTime, uVig; uniform vec2 uRes; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb = mix(c.rgb, vec3(l) * vec3(0.93, 0.97, 1.05), uDesat);
      vec2 q = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
      c.rgb *= mix(1.0 - 0.06 * uVig, 1.0, smoothstep(1.1, 0.3, length(q)));
      // grain only where something is drawn, so a transparent frame stays clean
      c.rgb += (h(vUv * uRes + fract(uTime) * 91.7) - 0.5) * 0.022 * c.a;
      gl_FragColor = c;
    }`,
};

// ── The studio ───────────────────────────────────────────────────────────────

export class Studio {
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass | null = null;
  private grade: ShaderPass;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
  private trash: { dispose(): void }[] = [];

  private sculpture: THREE.Mesh;
  private su: Record<string, THREE.IUniform>;
  private bgRT: THREE.WebGLRenderTarget;
  private dustU: Record<string, THREE.IUniform>;
  private shadow: THREE.Mesh;
  private shadowMat: THREE.MeshBasicMaterial;
  private caustic: THREE.Mesh;
  private causticMat: THREE.MeshBasicMaterial;
  private ripples: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }[] = [];

  private beat = 0;
  private shown = 0;
  private life = 0;
  private time = 0;
  private angle = 0;
  private last = performance.now();
  private raf = 0;
  private running = false;
  private pointer = new THREE.Vector2();
  private lean = new THREE.Vector2();
  private compact: boolean;
  /** how much of the frame's height the form fills */
  private fill: number;
  private bare: boolean;
  private ground: THREE.Color;
  private reduced: boolean;
  private camPos = new THREE.Vector3();
  private tmp = { a: new THREE.Color(), b: new THREE.Color() };
  /** frame-time samples: a GPU that cannot keep up gets fewer pixels rather than fewer frames */
  private perf = { n: 0, sum: 0, settled: false };

  /** which forms play, in order, one per beat; the camera's shots; where the form sits on screen */
  private seq: number[];
  private shots: Shot[];
  private anchor: Anchor;
  private bound = 1.06;
  private drawn = 1;

  /**
   * `bare` drops the studio set (floor sweep, dust) and paints the given page colour behind the form, for
   * placing the mark inside an ordinary page rather than a full-screen film.
   */
  constructor(canvas: HTMLCanvasElement, opts: { compact?: boolean; shapes?: number[]; shots?: Shot[]; anchor?: Anchor; bare?: string; fill?: number } = {}) {
    this.fill = opts.fill ?? 0.54;
    this.compact = !!opts.compact;
    this.seq = opts.shapes ?? LOOKS.map((_, i) => i);
    this.shots = opts.shots ?? SHOTS;
    this.anchor = opts.anchor ?? ANCHOR;
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lite = document.documentElement.classList.contains('lite');
    this.bare = !!opts.bare;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: this.bare, powerPreference: 'high-performance' });
    if (this.bare) this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, lite ? 0.85 : 1.25));
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    const isDark = typeof document !== 'undefined' && (document.documentElement.getAttribute('data-theme') === 'dark' || document.body.classList.contains('dark'));
    const ground = new THREE.Color(opts.bare ?? (isDark ? '#0A0910' : PAPER));
    this.ground = ground;
    // bare: the page shows through; the colour is only what the glass refracts
    this.scene.background = this.bare ? null : ground;
    this.scene.fog = new THREE.Fog(ground, 18, 40);
    const key = new THREE.DirectionalLight(isDark ? '#d4ccff' : '#fff1df', isDark ? 2.0 : 1.6);
    key.position.set(-5, 7, 5);
    this.scene.add(key, new THREE.HemisphereLight(isDark ? '#2a2040' : '#ffffff', isDark ? '#0A0910' : '#e6dccd', isDark ? 1.4 : 1.1));

    if (!opts.bare) {
      const cyc = cyclorama(ground, isDark);
      this.scene.add(cyc);
      this.trash.push(cyc.geometry, cyc.material as THREE.Material);
    }

    // ── light on the floor: the form's shadow, the coloured light it focuses, and rings when it grows
    const shadowTex = radial([
      [0, 'rgba(34,24,70,0.45)'],
      [0.45, 'rgba(34,24,70,0.18)'],
      [1, 'rgba(34,24,70,0)'],
    ]);
    const causticTex = radial([
      [0, 'rgba(255,255,255,1)'],
      [0.2, 'rgba(255,255,255,0.8)'],
      [0.6, 'rgba(255,255,255,0.22)'],
      [1, 'rgba(255,255,255,0)'],
    ]);
    const ringTex = canvasTex(256, 256, (g) => {
      g.strokeStyle = '#fff';
      g.lineWidth = 4;
      g.beginPath();
      g.arc(128, 128, 120, 0, Math.PI * 2);
      g.stroke();
      // The form floats too low for any ring to clear it, so the half running behind it (the texture's top,
      // once laid on the floor) fades out rather than showing through the glass.
      const front = g.createLinearGradient(0, 96, 0, 150);
      front.addColorStop(0, 'rgba(255,255,255,0)');
      front.addColorStop(1, 'rgba(255,255,255,1)');
      g.globalCompositeOperation = 'destination-in';
      g.fillStyle = front;
      g.fillRect(0, 0, 256, 256);
    });
    this.trash.push(shadowTex, causticTex, ringTex);
    const decal = (tex: THREE.Texture, opacity = 1) => {
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity, fog: false });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      mesh.rotation.x = -Math.PI / 2;
      this.scene.add(mesh);
      this.trash.push(mesh.geometry, mat);
      return { mesh, mat };
    };
    ({ mesh: this.shadow, mat: this.shadowMat } = decal(shadowTex));
    this.shadow.position.y = 0.004;
    ({ mesh: this.caustic, mat: this.causticMat } = decal(causticTex, 0.5));
    this.caustic.position.set(0.5, 0.006, 0.5);
    for (let i = 0; i < 3; i++) {
      const r = decal(ringTex, 0);
      r.mesh.position.y = 0.008;
      this.ripples.push(r);
    }

    // ── dust, focused like a lens would
    const DUST = lite ? 260 : 520;
    const dp = new Float32Array(DUST * 3);
    const ds = new Float32Array(DUST * 3);
    for (let i = 0; i < DUST; i++) {
      dp.set([(Math.random() - 0.5) * 18, Math.random() * 6.5 + 0.1, (Math.random() - 0.5) * 12 - 1], i * 3);
      ds.set([Math.random(), Math.random(), Math.random()], i * 3);
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    dg.setAttribute('aSeed', new THREE.BufferAttribute(ds, 3));
    this.dustU = { uLife: { value: 0 }, uInflow: { value: 0 }, uScale: { value: 800 }, uFocus: { value: 7 }, uCore: { value: CENTER.clone() }, uColor: { value: new THREE.Color('#6d5fb0') } };
    const dm = new THREE.ShaderMaterial({ uniforms: this.dustU, vertexShader: DUST_VS, fragmentShader: DOT_FS, transparent: true, depthWrite: false });
    const dust = new THREE.Points(dg, dm);
    dust.frustumCulled = false;
    if (!opts.bare) this.scene.add(dust);
    this.trash.push(dg, dm);

    // ── the sculpture: ray marched inside a box, refracting the studio drawn a moment before
    this.bgRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    this.su = {
      uCenter: { value: CENTER.clone() },
      uScale: { value: 1 },
      uRot: { value: new THREE.Matrix3() },
      uA: { value: 0 },
      uB: { value: 0 },
      uMix: { value: 0 },
      uTime: { value: 0 },
      uSteps: { value: lite ? 64 : 100 },
      uBg: { value: this.bgRT.texture },
      uViewProj: { value: new THREE.Matrix4() },
      uTint: { value: new THREE.Color() },
      uDensity: { value: 1 },
      uCoreCol: { value: new THREE.Color() },
      uCoreI: { value: 0 },
      uCore: { value: new THREE.Vector3() },
      uFrost: { value: 0 },
      uThreads: { value: 0 },
      uIrid: { value: 0 },
      uLogo: { value: null },
      uBody: { value: 0 },
      uDraw: { value: 1 },
      uGhost: { value: 0 },
      uGlow: { value: 0 },
      uOrbs: { value: new THREE.Vector4(0, 1, 0, 0) },
      uBound: { value: 1.2 },
    };
    const logo = logoTex();
    this.su.uLogo.value = logo;
    this.trash.push(logo);
    const sm = new THREE.ShaderMaterial({ uniforms: this.su, vertexShader: SCULPTURE_VS, fragmentShader: SCULPTURE_FS });
    const box = new THREE.BoxGeometry(2, 2, 2); // a proxy, scaled each frame to hold the shape
    this.sculpture = new THREE.Mesh(box, sm);
    this.sculpture.position.copy(CENTER);
    this.sculpture.frustumCulled = false;
    this.scene.add(this.sculpture);
    this.trash.push(box, sm, this.bgRT);

    // ── post: bloom only on real light, then grade, vignette and grain
    this.composer = new EffectComposer(this.renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: lite ? 0 : 4 }));
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    if (!lite && !this.bare) {
      this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.45, 1.6);
      this.composer.addPass(this.bloom);
    }
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(GradeShader);
    this.grade.uniforms.uVig.value = this.bare ? 0 : 1;
    this.composer.addPass(this.grade);

    this.camPos.copy(this.orbit(this.shots[0], 7));
    this.resize();
    window.addEventListener('pointermove', this.onPointer, { passive: true });
  }

  private onPointer = (e: PointerEvent) => this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);

  resize() {
    const cv = this.renderer.domElement;
    const w = cv.clientWidth || window.innerWidth;
    const h = cv.clientHeight || window.innerHeight;
    const pr = this.renderer.getPixelRatio();
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(pr);
    this.composer.setSize(w, h);
    this.bgRT.setSize(Math.floor(w * pr), Math.floor(h * pr));
    this.camera.aspect = w / h;
    // shift the frame rather than turn the camera, so the form lands on its anchor from any angle
    const [ax, ay] = this.compact || w / h < 0.9 ? this.anchor.narrow : this.anchor.wide;
    this.camera.setViewOffset(w, h, (0.5 - ax) * w, (0.5 - ay) * h, w, h);
    this.camera.updateProjectionMatrix();
    this.dustU.uScale.value = (h * pr) / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)));
    (this.grade.uniforms.uRes.value as THREE.Vector2).set(w, h);
  }

  setCompact(c: boolean) {
    this.compact = c;
  }

  /** A camera position on the orbit round the form. */
  private orbit(s: Shot, dist: number) {
    const y = THREE.MathUtils.degToRad(s.yaw);
    const x = THREE.MathUtils.degToRad(s.pitch);
    return new THREE.Vector3(Math.sin(y) * Math.cos(x), Math.sin(x), Math.cos(y) * Math.cos(x)).multiplyScalar(dist).add(CENTER);
  }

  setBeat(b: number) {
    this.beat = Math.min(this.seq.length, Math.max(0, b));
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private adapt(dt: number) {
    const p = this.perf;
    if (p.settled || dt <= 0) return;
    p.n++;
    if (p.n <= 20) return; // let shaders compile and the page settle
    p.sum += dt;
    if (p.n < 80) return;
    const fps = 60 / p.sum;
    p.n = 0;
    p.sum = 0;
    const pr = this.renderer.getPixelRatio();
    if (fps < 46 && pr > 0.6) {
      this.renderer.setPixelRatio(Math.max(0.6, pr - 0.2));
      if (fps < 30) this.su.uSteps.value = Math.max(56, this.su.uSteps.value - 20);
      this.resize();
    }
  }

  /** Which two shapes are on screen, and how far the first has turned into the second. */
  private shapes(b: number) {
    const last = this.seq.length - 1;
    const x = Math.max(0, b - 0.5);
    const i = Math.min(last, Math.floor(x));
    const j = Math.min(last, i + 1);
    // hold each shape for half its beat, then flow into the next
    const m = i === j ? 0 : smooth(0.28, 0.82, x - i);
    return { a: this.seq[i], n: this.seq[j], m };
  }

  private shot(b: number): Shot {
    const S = this.shots;
    if (S.length === 1) return S[0];
    const x = Math.min(S.length - 1, Math.max(0, b - 0.5));
    const i = Math.min(S.length - 2, Math.floor(x));
    const f = smooth(0, 1, x - i);
    return { yaw: mixN(S[i].yaw, S[i + 1].yaw, f), pitch: mixN(S[i].pitch, S[i + 1].pitch, f) };
  }

  private frame = (now: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.adapt(dt);
    this.shown = this.reduced ? this.beat : damp(this.shown, this.beat, 6, dt);
    const b = this.shown;
    const { a, n, m } = this.shapes(b);
    const A = LOOKS[a];
    const B = LOOKS[n];
    const L = <K extends keyof Look>(k: K) => mixN(A[k] as number, B[k] as number, m);
    const freeze = L('freeze');
    if (!this.reduced) {
      this.time += dt;
      this.life += dt * (1 - freeze * 0.985);
    }
    const life = this.life;

    // ── camera: close enough that every form reads at a similar size, far enough that the largest fits
    const scale = L('scale');
    const goalBound = m === 0 ? BOUNDS[a] : mixN(BOUNDS[a], BOUNDS[n], smooth(0.1, 0.9, m));
    this.bound = damp(this.bound, goalBound, 4, dt);
    const aspect = this.camera.aspect;
    const narrow = this.compact || aspect < 0.9;
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const reach = 1.06 * Math.pow((this.bound * scale) / 1.06, 0.72);
    const dist = Math.max(reach / (tanH * (narrow ? this.fill * 0.76 : this.fill)), reach / (tanH * aspect * (narrow ? 0.68 : 0.48)));
    this.lean.x = damp(this.lean.x, this.pointer.x, 2.5, dt);
    this.lean.y = damp(this.lean.y, this.pointer.y, 2.5, dt);
    const s = this.shot(b);
    const goal = this.orbit({ yaw: s.yaw + this.lean.x * 4, pitch: s.pitch - this.lean.y * 2.5 }, dist);
    this.camPos.lerp(goal, 1 - Math.exp(-8 * dt));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(CENTER);
    this.camera.updateMatrixWorld();
    this.dustU.uFocus.value = this.camera.position.distanceTo(CENTER);

    // ── the sculpture
    // the orbs turn about the centre; whenever the mark is whole it comes back to face the viewer upright
    const spin = L('spin');
    if (spin > 0.02) this.angle += dt * 0.3 * spin * (1 - freeze);
    else this.angle = damp(this.angle, Math.round(this.angle / (Math.PI * 2)) * Math.PI * 2, 2.5, dt);
    const sway = Math.sin(life * 0.35) * 0.1 * (1 - freeze) + this.lean.x * 0.12;
    const tilt = Math.sin(life * 0.27) * 0.04 * (1 - freeze) + this.lean.y * 0.06;
    const e = new THREE.Euler(tilt, sway, this.angle, 'YXZ');
    const inv = new THREE.Matrix4().makeRotationFromEuler(e).invert();
    (this.su.uRot.value as THREE.Matrix3).setFromMatrix4(inv);
    const bob = Math.sin(life * 0.9) * 0.05;
    (this.su.uCenter.value as THREE.Vector3).set(CENTER.x, CENTER.y + bob, CENTER.z);
    this.sculpture.position.copy(this.su.uCenter.value as THREE.Vector3);
    this.su.uScale.value = scale;
    const bound = m === 0 ? BOUNDS[a] : Math.max(BOUNDS[a], BOUNDS[n]) + 0.08;
    this.su.uBound.value = bound;
    this.sculpture.scale.setScalar(bound * scale * 1.02);
    this.su.uA.value = a;
    this.su.uB.value = n;
    this.su.uMix.value = m;
    this.su.uTime.value = life;
    (this.su.uTint.value as THREE.Color).copy(this.tmp.a.set(A.tint)).lerp(this.tmp.b.set(B.tint), m);
    (this.su.uCoreCol.value as THREE.Color).copy(this.tmp.a.set(A.core)).lerp(this.tmp.b.set(B.core), m);
    this.su.uDensity.value = L('density');
    const pulse = Math.pow(0.5 + 0.5 * Math.sin(life * 2.4), 3);
    const growing = (a === 7 ? 1 - m : 0) + (n === 7 ? m : 0) + (a === 7 && n === 7 ? m : 0);
    this.su.uCoreI.value = L('coreI') * (1 + growing * pulse * 0.6);
    this.su.uFrost.value = L('frost');
    this.su.uThreads.value = L('threads');
    this.su.uIrid.value = L('irid');
    this.su.uBody.value = L('body');
    this.su.uGlow.value = L('glow');
    const o = A.orbs.map((x, k) => mixN(x, B.orbs[k], m));
    (this.su.uOrbs.value as THREE.Vector4).set(o[0], o[1], o[2], o[3]);
    this.su.uGhost.value = L('ghost');
    // threads erase or draw in across the change of form; entering a REDRAW form they are drawn out afresh
    const goalDraw = REDRAW.has(n) && n !== a ? smooth(0.45, 1, m) : L('draw');
    this.drawn = this.reduced ? goalDraw : damp(this.drawn, goalDraw, 10, dt);
    this.su.uDraw.value = this.drawn;
    (this.su.uViewProj.value as THREE.Matrix4).multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);

    // ── floor
    const lift = CENTER.y + bob - scale;
    const tint = this.su.uTint.value as THREE.Color;
    this.shadow.scale.set(2.6 * scale + lift, (2.6 * scale + lift) * 0.8, 1);
    this.shadowMat.opacity = 0.9 - freeze * 0.2;
    this.causticMat.color.copy(tint).lerp(this.su.uCoreCol.value as THREE.Color, clamp01(L('coreI') * 0.4));
    this.causticMat.opacity = 0.42 + growing * 0.3;
    this.caustic.scale.setScalar(1.5 * scale + growing * 0.6);
    this.ripples.forEach(({ mesh, mat }, i) => {
      const k = (((life * 0.4 + i / 3) % 1) + 1) % 1;
      mesh.scale.setScalar(1.2 + k * 4.2);
      mat.color.copy(this.su.uCoreCol.value as THREE.Color);
      mat.opacity = growing * (1 - k) * 0.45;
    });

    // ── dust
    this.dustU.uLife.value = life;
    this.dustU.uInflow.value = growing * 0.85;
    (this.dustU.uCore.value as THREE.Vector3).copy(this.su.uCenter.value as THREE.Vector3);

    this.grade.uniforms.uDesat.value = freeze * 0.6;
    this.grade.uniforms.uTime.value = this.time;
    if (this.bloom) this.bloom.strength = 0.45 + growing * 0.4;

    // the studio without the sculpture, for the glass to see through
    this.sculpture.visible = false;
    if (this.bare) this.renderer.setClearColor(this.ground, 1);
    this.renderer.setRenderTarget(this.bgRT);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    if (this.bare) this.renderer.setClearColor(0x000000, 0);
    this.sculpture.visible = true;
    this.composer.render(dt);
  };

  destroy() {
    this.stop();
    window.removeEventListener('pointermove', this.onPointer);
    this.trash.forEach((t) => t.dispose());
    this.composer.dispose();
    this.renderer.dispose();
  }
}
