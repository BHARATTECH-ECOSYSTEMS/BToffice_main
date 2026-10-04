import * as THREE from 'three';
import { buildSolids, buildPlinth, studioEnvironment, setSolidOpacity, type Solid, type Plinth } from './objects';
import { particleVertex, particleFragment, trailVertex, trailFragment } from './shaders';
import { logo, fragments, silos, frozen, orbit, layers, globe, helix, field, arcPoint, ARCS, rng, GLOBE_R, type Formation } from './formations';

export type FormationKey = 'logo' | 'fragments' | 'silos' | 'frozen' | 'alone' | 'orbit15' | 'orbit6' | 'layers' | 'globe' | 'helix' | 'field';

export interface Pose {
  x: number;
  y: number;
  z: number;
  s: number;
  rx: number;
  ry: number;
  rz: number;
}

export interface Params {
  decay: number; // share of particles that have been "forgotten"
  drift: number; // idle motion; 0 freezes the system
  dark: number; // 0 light theme … 1 dark theme
  alpha: number;
  wave: number;
  highlight: number; // group id or -1
  spinX: number; // scroll-linked extra rotation
  spinY: number;
  explode: number; // separates the highlighted layer from its neighbours
  drag: number; // 1 lets the visitor spin the formation by dragging
  floor: number; // 1 sets the formation on its plinth (only for formations that stand on one)
  cull: number; // 1 hides particles on the far side of the formation (for solid bodies like the globe)
  body: number; // 1 draws a lit solid body behind the particles (the globe's planet)
  dot: number; // point size multiplier
  solid: number; // 1 lets a settled formation resolve into its solid object
}

export interface Target {
  key: FormationKey;
  pose?: Partial<Pose>;
  mobilePose?: Partial<Pose>;
  params?: Partial<Params>;
  /** How tightly the pose tracks its goal; high values pin a formation to the page while scrolling. */
  follow?: number;
  exact?: boolean;
}

export interface ScreenAnchor {
  x: number;
  y: number;
  depth: number; // -1 far … 1 near
}

const BASE_POSE: Record<FormationKey, Pose> = {
  logo: { x: 1.7, y: 0, z: 0, s: 1, rx: 0, ry: 0, rz: 0 },
  fragments: { x: 0, y: 0, z: 0, s: 1, rx: 0, ry: 0, rz: 0 },
  silos: { x: 1.75, y: 0, z: 0, s: 1, rx: 0, ry: 0, rz: 0 },
  frozen: { x: 1.75, y: 0, z: 0, s: 1, rx: 0, ry: 0, rz: 0 },
  alone: { x: 1.75, y: 0, z: 0, s: 1, rx: 0, ry: 0, rz: 0 },
  orbit15: { x: 0, y: -0.1, z: 0, s: 1, rx: 0.1, ry: 0, rz: 0 },
  orbit6: { x: 1.5, y: 0, z: 0, s: 1, rx: 0.1, ry: 0, rz: 0 },
  layers: { x: 1.55, y: -0.06, z: 0, s: 0.86, rx: 0.65, ry: -0.68, rz: 0 },
  globe: { x: 1.35, y: -0.1, z: 0, s: 1, rx: 0, ry: 0, rz: 0 },
  helix: { x: 0, y: -0.3, z: -0.5, s: 1, rx: 0.25, ry: 0, rz: 0 },
  field: { x: 0, y: 0, z: 0, s: 1, rx: 0, ry: 0, rz: 0 },
};

const MOBILE_POSE: Partial<Pose> = { x: 0, y: 0.7, s: 0.62 };

/** Which solid each formation resolves into. The three problem steps share the tools, so they stay put between steps. */
const SOLID_FOR: Partial<Record<FormationKey, string>> = {
  logo: 'logo',
  orbit15: 'orbit15',
  orbit6: 'orbit6',
  layers: 'layers',
  globe: 'globe',
  helix: 'helix',
  silos: 'tools',
  frozen: 'tools',
  alone: 'tools',
};

const DEFAULT_PARAMS: Params = { decay: 0, drift: 1, dark: 0, alpha: 1, wave: 1, highlight: -1, spinX: 0, spinY: 0, explode: 0, drag: 0, floor: 1, cull: 0, body: 0, dot: 1, solid: 1 };

/** Formations that stand on a plinth: a lit disc with a hairline rim and a soft contact shadow under them. */
const ON_PLINTH: FormationKey[] = ['logo', 'orbit15', 'orbit6'];
/** How much of a formation's footprint its plinth covers: a sphere sits on a disc its own width; an orbit's rings
 *  float well beyond its base. */
const PLINTH_SPAN: Partial<Record<FormationKey, number>> = { logo: 1.02, orbit15: 0.5, orbit6: 0.56, layers: 0.8, globe: 0.9 };

/** A planet's body: a disc that faces the camera, shaded like a lit sphere, with an atmosphere at its rim. */
const bodyFragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uOpacity;
  uniform vec3 uLit;
  uniform vec3 uShade;
  uniform vec3 uAtmos;
  uniform float uBodyAlpha;
  uniform float uRimAlpha;
  uniform float uGlowAlpha;
  void main() {
    vec2 p = (vUv * 2.0 - 1.0) * 1.3;                 // 1.0 = the planet's edge
    float d = length(p);
    float inside = 1.0 - smoothstep(0.992, 1.004, d);
    vec3 n = vec3(p, sqrt(max(0.0, 1.0 - d * d)));
    float light = clamp(dot(n, normalize(vec3(-0.45, 0.55, 0.7))), 0.0, 1.0);
    vec3 col = mix(uShade, uLit, smoothstep(0.0, 1.0, light));
    float rim = smoothstep(0.9, 1.0, d) * inside;        // a thin atmosphere at the limb only
    col = mix(col, uAtmos, rim * 0.35);
    float glow = exp(-max(0.0, d - 1.0) * 22.0) * (1.0 - inside);
    float a = inside * uBodyAlpha + rim * uRimAlpha + glow * uGlowAlpha;
    gl_FragColor = vec4(mix(col, uAtmos, 1.0 - inside), a * uOpacity);
  }
`;

const floorVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const THEME = {
  light: {
    ink: new THREE.Color('#2a2740'),
    inkAlpha: 0.55,
    deep: new THREE.Color('#3A1FA8'),
    bright: new THREE.Color('#7B5CFF'),
    hot: new THREE.Color('#4A1FFF'),
    trail: new THREE.Color('#e2600f'),
    floorTop: new THREE.Color('#fffdf8'),
    floorRim: new THREE.Color('#5b3df5'),
    floorShadow: new THREE.Color('#2a2014'),
    bodyLit: new THREE.Color('#fffdf9'),
    bodyShade: new THREE.Color('#e6e2ea'),
    bodyAtmos: new THREE.Color('#7b5cff'),
  },
  dark: {
    ink: new THREE.Color('#7d76a8'),
    inkAlpha: 0.3,
    deep: new THREE.Color('#5b3df5'),
    bright: new THREE.Color('#b9a6ff'),
    hot: new THREE.Color('#ffffff'),
    trail: new THREE.Color('#ffa36b'),
    floorTop: new THREE.Color('#1d1b25'),
    floorRim: new THREE.Color('#9682ff'),
    floorShadow: new THREE.Color('#000000'),
    bodyLit: new THREE.Color('#232036'),
    bodyShade: new THREE.Color('#08070d'),
    bodyAtmos: new THREE.Color('#8f78ff'),
  },
};

const stagger = (m: number, th: number) => {
  const s = Math.min(1, Math.max(0, m * 1.45 - th * 0.45));
  return s * s * (3 - 2 * s);
};

const damp = (a: number, b: number, lambda: number, dt: number) => a + (b - a) * (1 - Math.exp(-lambda * dt));

export class Engine {
  readonly count: number;
  readonly reducedMotion: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  private group = new THREE.Group();
  private geometry = new THREE.BufferGeometry();
  private material: THREE.ShaderMaterial;
  private arcMat: THREE.ShaderMaterial;
  private formations = {} as Record<FormationKey, Formation>;
  private plinth: Plinth;
  private floorSize = {} as Record<FormationKey, { r: number; y: number }>;
  private floorNow = { r: 1.5, y: -1.6, a: 0 };
  private body: THREE.Mesh;
  private solids: Record<string, Solid>;
  private solidAmt: Record<string, number> = {};
  /** Each solid's entrance spring: 0 put away … 1 on its plinth (overshoots a little on the way in). */
  private spring: Record<string, { s: number; v: number }> = {};
  private solidMeshes: Record<string, THREE.Mesh[]> = {};
  private partVis = 1;
  private hover = 0;
  private disposeSolids: () => void;
  private env: THREE.Texture;
  private bodyMat: THREE.ShaderMaterial;
  private attr: Record<'from' | 'to' | 'accFrom' | 'accTo' | 'grpFrom' | 'grpTo', THREE.BufferAttribute>;
  private rand: Float32Array;

  private fromKey: FormationKey = 'logo';
  private toKey: FormationKey = 'logo';
  private progress = 0;
  private duration = 0.85;
  private target: Target = { key: 'logo' };
  private pose: Pose = { ...BASE_POSE.logo };
  private params: Params = { ...DEFAULT_PARAMS };
  private hlAmt = 0;
  private hlGroup = -1;

  private mouse = new THREE.Vector2(10, 10);
  private mouseWorld = new THREE.Vector3(99, 99, 0);
  private mouseAmt = 0;
  private tilt = new THREE.Vector2();
  private dragging = false;
  private dragX = 0;
  private dragSpin = 0;
  private dragVel = 0;
  private raycaster = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  private last = performance.now();
  private time = 0;
  private raf = 0;
  private width = 1;
  private height = 1;
  private listeners = new Set<() => void>();
  private tmp = new THREE.Vector3();
  private velocity = 0;
  private dark = false;
  private warp = 0;
  private idle = false;
  private points!: THREE.Points;
  /** Quality: 2 full (retina, soft shadows) · 1 lite (1× pixels, no shadow maps) · 0 lowest (0.8× pixels). */
  private quality = 2;
  private frameSamples: number[] = [];
  private invGroup = new THREE.Matrix4();
  private tmpW = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement) {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = window.innerWidth < 760;
    // Fewer particles on phones and on modest laptops (many Windows machines report 4 cores and an integrated GPU).
    const modest = (navigator.hardwareConcurrency || 8) <= 4;
    this.count = small ? 9000 : modest ? 14000 : 22000;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    // Integrated GPUs (flagged lite before first paint) start one step down; any machine steps down on its own if
    // frames run slow (see watchFrames).
    this.quality = document.documentElement.classList.contains('lite') ? 1 : 2;
    this.renderer.shadowMap.enabled = this.quality === 2;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    // Studio light for the solid objects: soft environment reflections, a sky/ground fill and one key light.
    this.env = studioEnvironment(this.renderer);
    this.scene.environment = this.env;
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d0e6, 0.45));
    // One key light with a soft shadow, so objects sit on their plinths instead of hovering over them.
    const key = new THREE.DirectionalLight(0xffffff, 1.35);
    key.position.set(-3.5, 7, 5);
    key.castShadow = this.quality === 2;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 4;
    const sc = key.shadow.camera;
    sc.left = sc.bottom = -6;
    sc.right = sc.top = 6;
    sc.near = 1;
    sc.far = 24;
    this.scene.add(key);
    this.camera.position.set(0, 0, 7);

    const n = this.count;
    const f = this.formations;
    f.logo = logo(n);
    f.fragments = fragments(n, f.logo);
    f.silos = silos(n, f.logo);
    f.frozen = frozen(n, f.logo);
    f.alone = frozen(n, f.logo, false);
    f.orbit15 = orbit(n, 15);
    f.orbit6 = orbit(n, 6, 9);
    f.layers = layers(n);
    f.globe = globe(n);
    f.helix = helix(n);
    f.field = field(n);

    const r = rng(3);
    this.rand = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      this.rand[i * 4] = 0.8 + r() * 0.45;
      this.rand[i * 4 + 1] = r();
      this.rand[i * 4 + 2] = r();
      this.rand[i * 4 + 3] = 0.5 + r();
    }

    // The first frame is the mark, slightly contracted and invisible: it resolves in place.
    const start = new Float32Array(n * 3);
    for (let i = 0; i < n * 3; i++) start[i] = f.logo.pos[i] * 0.82;

    const mk = (arr: Float32Array, size: number) => new THREE.BufferAttribute(arr, size).setUsage(THREE.DynamicDrawUsage);
    this.attr = {
      from: mk(start, 3),
      to: mk(new Float32Array(f.logo.pos), 3),
      accFrom: mk(new Float32Array(n).fill(-1), 1),
      accTo: mk(new Float32Array(f.logo.acc), 1),
      grpFrom: mk(new Float32Array(n).fill(-1), 1),
      grpTo: mk(new Float32Array(f.logo.grp), 1),
    };
    this.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.geometry.setAttribute('aFrom', this.attr.from);
    this.geometry.setAttribute('aTo', this.attr.to);
    this.geometry.setAttribute('aAccFrom', this.attr.accFrom);
    this.geometry.setAttribute('aAccTo', this.attr.accTo);
    this.geometry.setAttribute('aGrpFrom', this.attr.grpFrom);
    this.geometry.setAttribute('aGrpTo', this.attr.grpTo);
    this.geometry.setAttribute('aRand', new THREE.BufferAttribute(this.rand, 4));
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 20);

    this.material = new THREE.ShaderMaterial({
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uMix: { value: 0 },
        uTime: { value: 0 },
        uDrift: { value: 1 },
        uMouse: { value: this.mouseWorld },
        uMouseAmt: { value: 0 },
        uSize: { value: small ? 2 : 1.8 },
        uPixelRatio: { value: 1 },
        uDecay: { value: 0 },
        uHighlight: { value: -1 },
        uHighlightAmt: { value: 0 },
        uWave: { value: 1 },
        uExplode: { value: 0 },
        uInk: { value: THEME.light.ink.clone() },
        uDeep: { value: THEME.light.deep.clone() },
        uBright: { value: THEME.light.bright.clone() },
        uHot: { value: THEME.light.hot.clone() },
        uAlpha: { value: 1 },
        uInkAlpha: { value: THEME.light.inkAlpha },
        uCyan: { value: new THREE.Color('#FF8643') },
        uWarp: { value: 0 },
        uHalo: { value: 0.35 },
        uCull: { value: 0 },
        uCenter: { value: new THREE.Vector3() },
        uDot: { value: 1 },
      },
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.group.add(this.points);

    // Each plinth is sized from its formation: horizontal radius and lowest point of the visible particles.
    for (const key of ON_PLINTH) {
      const fm = f[key];
      let r = 0;
      let lo = 0;
      for (let i = 0; i < n; i++) {
        if (fm.acc[i] < -0.5) continue;
        const x = fm.pos[i * 3], y = fm.pos[i * 3 + 1], z = fm.pos[i * 3 + 2];
        r = Math.max(r, Math.hypot(x, z));
        lo = Math.min(lo, y);
      }
      // the object rests on the plinth's top face rather than hovering over it
      this.floorSize[key] = { r: r * (PLINTH_SPAN[key] ?? 0.9), y: key === 'logo' ? lo + 0.04 : lo - 0.06 };
    }
    this.bodyMat = new THREE.ShaderMaterial({
      vertexShader: floorVertex,
      fragmentShader: bodyFragment,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uOpacity: { value: 0 },
        uLit: { value: THEME.light.bodyLit.clone() },
        uShade: { value: THEME.light.bodyShade.clone() },
        uAtmos: { value: THEME.light.bodyAtmos.clone() },
        uBodyAlpha: { value: 0.9 },
        uRimAlpha: { value: 0.25 },
        uGlowAlpha: { value: 0.18 },
      },
    });
    this.body = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.bodyMat);
    this.body.renderOrder = -2;
    this.scene.add(this.body);

    this.plinth = buildPlinth();
    this.scene.add(this.plinth.root);

    this.arcMat = this.makeTrailMaterial(1.8, 0.12);
    this.group.add(this.buildArcTrails());

    const built = buildSolids();
    this.solids = built.solids;
    this.disposeSolids = built.dispose;
    for (const [id, sol] of Object.entries(this.solids)) {
      sol.root.visible = false;
      this.group.add(sol.root);
      const meshes: THREE.Mesh[] = [];
      sol.root.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
      });
      this.solidMeshes[id] = meshes;
    }
    this.scene.add(this.group);

    if (this.reducedMotion) {
      this.duration = 0.01;
      this.params.drift = 0;
    }

    this.resize();
    window.addEventListener('resize', this.resize);
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    window.addEventListener('pointerdown', this.onPointerDown, { passive: true });
    document.documentElement.addEventListener('pointerleave', this.onPointerLeave);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.loop();
  }

  // ── public API ────────────────────────────────────────────────────────────

  /** Plays the mark's first resolve again, if nothing has moved it on since (the opening covered the first one). */
  replayArrival() {
    if (this.fromKey === 'logo' && this.toKey === 'logo' && !this.reducedMotion) this.progress = 0;
  }

  /** Morph towards a formation. Safe to call every frame with the same target. */
  setTarget(t: Target) {
    this.target = t;
    if (t.key !== this.toKey) this.morphTo(t.key);
  }

  /** Scroll velocity (px per frame); fast scrolling stretches the field. */
  /** Follows the site theme: glowing light on dark, crisp ink on light. */
  setDark(dark: boolean) {
    this.dark = dark;
    const blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
    for (const m of [this.material, this.arcMat]) {
      m.blending = blending;
      m.needsUpdate = true;
    }
  }

  setVelocity(v: number) {
    if (Math.abs(v) > Math.abs(this.velocity)) this.velocity = v;
  }

  get currentKey() {
    return this.toKey;
  }

  /** 0…1: how settled the current formation is (for a solid, how far it has made its entrance). */
  get settled() {
    const id = SOLID_FOR[this.toKey];
    return id && this.params.solid > 0.5 ? Math.min(1, (this.spring[id]?.s ?? 0)) : Math.min(1, this.progress);
  }

  onFrame(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  /** Screen-space positions of the current formation's anchors, or null mid-transition to another key. */
  anchors(key: FormationKey): ScreenAnchor[] | null {
    if (this.toKey !== key) return null;
    const out: ScreenAnchor[] = [];
    this.group.updateMatrixWorld();
    // solids that move their parts (the layer stack's drawers) report where those parts really are
    const live = this.solids[SOLID_FOR[key] ?? '']?.anchors;
    let pts: number[][] | null = null;
    if (live) {
      this.invGroup.copy(this.group.matrixWorld).invert();
      pts = live.map((o) => o.getWorldPosition(this.tmpW).applyMatrix4(this.invGroup).toArray());
    }
    for (const a of pts ?? this.formations[key].anchors) {
      this.tmp.set(a[0], a[1], a[2]).applyMatrix4(this.group.matrixWorld);
      const depthWorld = this.tmp.z;
      this.tmp.project(this.camera);
      out.push({ x: (this.tmp.x * 0.5 + 0.5) * this.width, y: (-this.tmp.y * 0.5 + 0.5) * this.height, depth: Math.max(-1, Math.min(1, depthWorld / 2)) });
    }
    return out;
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerdown', this.onPointerDown);
    document.documentElement.removeEventListener('pointerleave', this.onPointerLeave);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.geometry.dispose();
    this.material.dispose();
    this.arcMat.dispose();
    this.plinth.dispose();
    Object.values(this.solids).forEach((sol) => sol.dispose());
    this.disposeSolids();
    this.env.dispose();
    this.bodyMat.dispose();
    this.body.geometry.dispose();
    this.renderer.dispose();
  }

  // ── morphing ──────────────────────────────────────────────────────────────

  private morphTo(key: FormationKey) {
    const n = this.count;
    const mix = Math.min(1, this.progress);
    const from = this.attr.from.array as Float32Array;
    const to = this.attr.to.array as Float32Array;
    const accF = this.attr.accFrom.array as Float32Array;
    const accT = this.attr.accTo.array as Float32Array;
    const grpF = this.attr.grpFrom.array as Float32Array;
    const grpT = this.attr.grpTo.array as Float32Array;

    // Freeze wherever each particle is right now (mirrors the vertex shader).
    for (let i = 0; i < n; i++) {
      const rp = this.rand[i * 4 + 1];
      const st = stagger(mix, this.rand[i * 4 + 2]);
      const tr = Math.sin(Math.PI * st) * 0.1;
      const fx = from[i * 3], fy = from[i * 3 + 1], fz = from[i * 3 + 2];
      const tx = to[i * 3], ty = to[i * 3 + 1], tz = to[i * 3 + 2];
      from[i * 3] = fx + (tx - fx) * st + tr * Math.sin(rp * 6.2831 + ty * 2);
      from[i * 3 + 1] = fy + (ty - fy) * st + tr * Math.cos(rp * 5.1 + fx * 2);
      from[i * 3 + 2] = fz + (tz - fz) * st + tr * Math.sin(rp * 3.7);
      accF[i] = accF[i] < -0.5 || accT[i] < -0.5 ? (st < 0.5 ? accF[i] : accT[i]) : accF[i] + (accT[i] - accF[i]) * st;
      grpF[i] = st < 0.5 ? grpF[i] : grpT[i];
    }
    const f = this.formations[key];
    to.set(f.pos);
    accT.set(f.acc);
    grpT.set(f.grp);
    for (const a of Object.values(this.attr)) a.needsUpdate = true;

    this.fromKey = mix > 0.5 ? this.toKey : this.fromKey;
    this.toKey = key;
    this.progress = 0;
  }

  /** How much of formation `key` is currently on screen (0…1). */
  private presence(key: FormationKey) {
    const m = stagger(Math.min(1, this.progress), 0.5);
    return (this.toKey === key ? m : 0) + (this.fromKey === key && this.toKey !== key ? 1 - m : 0);
  }

  // ── trails ────────────────────────────────────────────────────────────────

  private makeTrailMaterial(size: number, speed: number) {
    return new THREE.ShaderMaterial({
      vertexShader: trailVertex,
      fragmentShader: trailFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uSize: { value: size },
        uSpeed: { value: speed },
        uColor: { value: THEME.light.trail.clone() },
        uVisible: { value: 0 },
      },
    });
  }

  private buildArcTrails() {
    const pos: number[] = [];
    const t: number[] = [];
    const seed: number[] = [];
    const r = rng(19);
    ARCS.forEach(([a, c]) => {
      const s = r();
      for (let k = 0; k < 180; k++) {
        const tt = k / 179;
        pos.push(...arcPoint(a, c, tt));
        t.push(tt);
        seed.push(s);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aT', new THREE.Float32BufferAttribute(t, 1));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
    return new THREE.Points(g, this.arcMat);
  }

  // ── loop ──────────────────────────────────────────────────────────────────

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt * (this.reducedMotion ? 0 : 1);
    this.progress += dt / this.duration;

    const mobile = this.width <= 900;
    const t = this.target;
    // An exact pose is already measured from the page (it follows an element), so the generic phone pose must not override it.
    const goal: Pose = { ...BASE_POSE[t.key], ...t.pose, ...(mobile ? { ...(t.exact ? {} : MOBILE_POSE), ...t.mobilePose } : {}) };
    if (!mobile && !t.exact) {
      // Compositions are authored for a 16:10 screen; narrower ones pull side visuals in and scale them down.
      const fit = Math.min(1, this.width / this.height / 1.6);
      goal.x *= fit;
      goal.s *= Math.pow(fit, 0.7);
    }
    const want: Params = { ...DEFAULT_PARAMS, ...t.params, dark: this.dark ? 1 : 0 };
    if (this.reducedMotion) want.drift = 0;

    const k = t.follow ?? 5.5;
    this.warp = 0; // objects hold their shape while scrolling; nothing smears or scatters
    this.velocity = damp(this.velocity, 0, 6, dt);
    for (const key of Object.keys(goal) as (keyof Pose)[]) this.pose[key] = damp(this.pose[key], goal[key], k, dt);
    for (const key of ['decay', 'drift', 'dark', 'alpha', 'wave', 'spinX', 'spinY', 'explode', 'drag', 'floor', 'cull', 'body', 'dot'] as const) {
      const rate = key === 'dark' ? 3.5 : (key === 'alpha' ? (want.alpha === 0 ? 8.5 : 5.0) : 4.5);
      this.params[key] = damp(this.params[key], want[key], rate, dt);
    }

    if (want.highlight !== this.hlGroup) {
      this.hlAmt = damp(this.hlAmt, 0, 14, dt);
      if (this.hlAmt < 0.03) this.hlGroup = want.highlight;
    } else {
      this.hlAmt = damp(this.hlAmt, this.hlGroup >= 0 ? 1 : 0, 6, dt);
    }

    this.tilt.x = damp(this.tilt.x, this.mouse.y * 0.1, 2, dt);
    this.tilt.y = damp(this.tilt.y, this.mouse.x * 0.16, 2, dt);
    const sway = this.reducedMotion ? 0 : Math.sin(this.time * 0.21) * 0.035;
    const p = this.pose;
    // A solid object under the cursor leans toward it and lifts a touch, like something you could pick up.
    // It never breaks apart: the pointer moves the whole object, not its surface.
    const reach = 1.35 * p.s;
    const hx = this.mouseWorld.x - p.x;
    const hy = this.mouseWorld.y - p.y;
    const near = this.mouse.x < 5 && !this.reducedMotion && !this.dragging ? 1 - Math.min(1, Math.max(0, (Math.hypot(hx, hy) / reach - 0.55) / 0.9)) : 0;
    this.hover = damp(this.hover, near, 4, dt);
    const lean = this.hover * this.hover * (3 - 2 * this.hover);
    const leanX = Math.max(-1, Math.min(1, -hy / reach)) * 0.2 * lean;
    const leanY = Math.max(-1, Math.min(1, hx / reach)) * 0.32 * lean;
    this.group.position.set(p.x, p.y + 0.04 * lean * p.s, p.z);
    this.group.scale.setScalar(p.s * (1 + 0.025 * lean));
    this.group.rotation.set(p.rx + this.params.spinX + leanX + (Math.abs(this.mouse.y) < 2 ? this.tilt.x : 0), p.ry + this.params.spinY + this.dragSpin + sway + leanY + (Math.abs(this.mouse.x) < 2 ? this.tilt.y : 0), p.rz);

    if (this.params.drag < 0.5) this.dragSpin = damp(this.dragSpin, 0, 1.5, dt);
    else if (!this.dragging) {
      this.dragSpin += this.dragVel * dt; // a little inertia after release
      this.dragVel = damp(this.dragVel, 0, 2.5, dt);
    }
    this.mouseAmt = 0; // the pointer never pushes particles around

    const d = this.dark ? 1 : 0;
    const u = this.material.uniforms;
    u.uMix.value = Math.min(1, this.progress);
    u.uTime.value = this.time;
    u.uDrift.value = this.params.drift;
    u.uMouseAmt.value = this.mouseAmt;
    u.uDecay.value = this.params.decay;
    u.uHighlight.value = this.hlGroup;
    u.uHighlightAmt.value = this.hlAmt;
    u.uWave.value = this.params.wave;
    u.uExplode.value = this.params.explode;
    // Solids. Each chapter's object makes an entrance on a spring: it rises onto its plinth, turns into place and
    // settles with a little overshoot; the outgoing one sinks and shrinks away first. Particles are only seen where
    // there is no object to show (or while the mark is forgetting itself), so nothing scatters around a solid.
    const forgetting = Math.min(1, this.params.decay * 5);
    const activeId = SOLID_FOR[this.toKey];
    const leaving = Object.keys(this.solids).some((id) => id !== activeId && (this.spring[id]?.s ?? 0) > 0.3);
    for (const id of Object.keys(this.solids)) {
      const sol = this.solids[id];
      const sp = (this.spring[id] ??= { s: 0, v: 0 });
      const isActive = id === activeId;
      const goalS = isActive && !leaving ? this.params.solid * (1 - forgetting) : 0;
      if (this.reducedMotion) {
        sp.s = goalS;
        sp.v = 0;
      } else {
        // entering: lively with a small overshoot; leaving: quick and clean
        const K = isActive ? 70 : 150;
        const D = isActive ? 10.5 : 25;
        for (let k = 0; k < 2; k++) {
          const h = dt / 2;
          sp.v += (K * (goalS - sp.s) - D * sp.v) * h;
          sp.s += sp.v * h;
        }
      }
      const s0 = Math.max(0, sp.s);
      const lin = Math.min(1, s0 * 1.35);
      const amt = (this.solidAmt[id] = lin * lin * (3 - 2 * lin));
      sol.root.visible = amt * this.params.alpha > 0.004;
      const meshes = this.solidMeshes[id];
      const cast = amt > 0.7;
      if (meshes[0] && meshes[0].castShadow !== cast) meshes.forEach((m) => (m.castShadow = cast));
      if (!sol.root.visible) continue;
      const off = 1 - Math.min(1, s0);
      sol.root.scale.setScalar(0.6 + 0.4 * s0);
      sol.root.position.y = -0.45 * off;
      sol.root.rotation.y = off * (isActive ? -0.85 : 0.5);
      sol.update({ highlight: this.hlGroup, hlAmt: this.hlAmt, explode: this.params.explode, time: this.time, dark: this.params.dark, key: this.toKey, dt });
      setSolidOpacity(sol, amt * this.params.alpha);
    }
    const hasSolid = !!activeId && this.params.solid > 0.5;
    this.partVis = damp(this.partVis, hasSolid && forgetting < 0.02 ? 0 : 1, hasSolid ? 10 : 3, dt);
    u.uAlpha.value = this.params.alpha * this.partVis;
    // 14–22k points cost vertex work even fully transparent: take them out of the frame when they are not seen
    this.points.visible = u.uAlpha.value > 0.004;
    u.uWarp.value = this.reducedMotion ? 0 : this.warp;
    u.uHalo.value = 0.06 + 0.29 * d;
    (u.uInk.value as THREE.Color).lerpColors(THEME.light.ink, THEME.dark.ink, d);
    (u.uDeep.value as THREE.Color).lerpColors(THEME.light.deep, THEME.dark.deep, d);
    (u.uBright.value as THREE.Color).lerpColors(THEME.light.bright, THEME.dark.bright, d);
    (u.uHot.value as THREE.Color).lerpColors(THEME.light.hot, THEME.dark.hot, d);
    u.uInkAlpha.value = THEME.light.inkAlpha + (THEME.dark.inkAlpha - THEME.light.inkAlpha) * d;

    // The plinth: glides to the size of whatever stands on it, tipped a little toward the viewer, never spinning.
    const fs = this.floorSize[t.key];
    const fn = this.floorNow;
    if (fs) {
      fn.r = damp(fn.r, fs.r, 4, dt);
      fn.y = damp(fn.y, fs.y, 4, dt);
    }
    fn.a = damp(fn.a, fs ? 1 : 0, fs ? 4 : 9, dt);
    const pl = this.plinth.root;
    const rise = 1 - fn.a;
    pl.position.set(p.x, p.y + fn.y * p.s - 0.25 * rise * p.s, p.z);
    pl.rotation.set(0.2, 0, 0);
    pl.scale.set(fn.r * p.s, p.s, fn.r * p.s);
    this.plinth.update(fn.a * this.params.alpha * this.params.floor, this.params.dark);

    u.uCull.value = this.params.cull;
    u.uDot.value = this.params.dot;
    (u.uCenter.value as THREE.Vector3).set(p.x, p.y, p.z);

    // The globe's body: centred on the formation, the planet's size, facing the camera.
    const bu = this.bodyMat.uniforms;
    bu.uOpacity.value = this.params.body * this.params.alpha * this.partVis * (this.toKey === 'globe' ? Math.min(1, this.progress * 1.4) : 0);
    this.body.visible = bu.uOpacity.value > 0.003;
    this.body.position.set(p.x, p.y, p.z);
    this.body.scale.setScalar(GLOBE_R * p.s * 1.3);
    (bu.uLit.value as THREE.Color).lerpColors(THEME.light.bodyLit, THEME.dark.bodyLit, d);
    (bu.uShade.value as THREE.Color).lerpColors(THEME.light.bodyShade, THEME.dark.bodyShade, d);
    (bu.uAtmos.value as THREE.Color).lerpColors(THEME.light.bodyAtmos, THEME.dark.bodyAtmos, d);
    bu.uBodyAlpha.value = 0.92;
    bu.uRimAlpha.value = 0.1 + 0.2 * d;
    bu.uGlowAlpha.value = 0.08 + 0.14 * d;

    const arc = this.arcMat.uniforms;
    arc.uTime.value = this.time;
    arc.uVisible.value = this.presence('globe') * this.params.alpha * 0.8 * (1 - (this.solidAmt.globe ?? 0));
    (arc.uColor.value as THREE.Color).lerpColors(THEME.light.trail, THEME.dark.trail, d);

    // Fully faded out (sections that put the particles away): draw the empty frame once, then stop paying for the GPU.
    const idle = want.alpha === 0 && this.params.alpha < 0.004;
    if (!idle || !this.idle) {
      this.renderer.render(this.scene, this.camera);
      this.watchFrames(now);
    }
    this.idle = idle;
    this.listeners.forEach((fn) => fn());
  };

  // ── adaptive quality ──────────────────────────────────────────────────────

  private lastFrame = 0;
  /** Two seconds of slow frames (under ~45 fps) steps quality down once; it never steps back up mid-visit. */
  private watchFrames(now: number) {
    const gap = now - this.lastFrame;
    this.lastFrame = now;
    if (gap > 200 || this.quality === 0) return; // tab switches and pauses are not slowness
    this.frameSamples.push(gap);
    if (this.frameSamples.length < 120) return;
    const sorted = [...this.frameSamples].sort((a, b) => a - b);
    const median = sorted[sorted.length >> 1];
    this.frameSamples.length = 0;
    if (median > 22) this.degrade();
  }

  private degrade() {
    this.quality -= 1;
    document.documentElement.classList.add('lite');
    if (this.renderer.shadowMap.enabled) {
      this.renderer.shadowMap.enabled = false;
      this.scene.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => (x.needsUpdate = true));
      });
    }
    this.resize();
  }

  // ── input & lifecycle ─────────────────────────────────────────────────────

  private resize = () => {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    // full sharpness on capable machines; integrated GPUs render at 1× (or less, if they still struggle)
    const pr = this.quality === 2 ? Math.min(window.devicePixelRatio, 2) : this.quality === 1 ? Math.min(window.devicePixelRatio, 1) : 0.8;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    // keep the composition width-stable on tall screens
    this.camera.position.z = this.camera.aspect < 1 ? 7 / Math.max(0.62, this.camera.aspect) ** 0.55 : 7;
    this.camera.updateProjectionMatrix();
    this.material.uniforms.uPixelRatio.value = pr;
    this.arcMat.uniforms.uPixelRatio.value = pr;
  };

  private updateMouseWorld() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    this.raycaster.ray.intersectPlane(this.plane, this.mouseWorld);
  }

  private onPointerMove = (e: PointerEvent) => {
    if (this.dragging) {
      const dx = (e.clientX - this.dragX) / this.width;
      this.dragX = e.clientX;
      this.dragSpin += dx * 4;
      this.dragVel = dx * 240;
    }
    if (e.pointerType === 'touch') return;
    this.mouse.set((e.clientX / this.width) * 2 - 1, -(e.clientY / this.height) * 2 + 1);
    this.updateMouseWorld();
  };

  private onPointerLeave = () => this.mouse.set(10, 10);

  private onPointerDown = (e: PointerEvent) => {
    const el = e.target as HTMLElement;
    if (el.closest('a, button, input, textarea, select, label, [data-no-pulse]')) return;
    if (this.target.params?.drag) {
      this.dragging = true;
      this.dragX = e.clientX;
      this.dragVel = 0;
      const up = () => {
        this.dragging = false;
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
      };
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    }
  };

  private onVisibility = () => {
    if (document.hidden) cancelAnimationFrame(this.raf);
    else {
      this.last = performance.now();
      this.loop();
    }
  };
}
