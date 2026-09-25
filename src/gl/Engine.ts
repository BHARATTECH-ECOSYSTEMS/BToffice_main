import * as THREE from 'three';
import { particleVertex, particleFragment, trailVertex, trailFragment } from './shaders';
import { logo, fragments, silos, frozen, orbit, layers, globe, helix, field, arcPoint, ARCS, rng, type Formation } from './formations';

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
}

export interface Target {
  key: FormationKey;
  pose?: Partial<Pose>;
  mobilePose?: Partial<Pose>;
  params?: Partial<Params>;
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
  layers: { x: 1.55, y: -0.12, z: 0, s: 0.86, rx: 0.52, ry: -0.78, rz: 0 },
  globe: { x: 1.35, y: -0.1, z: 0, s: 1, rx: 0, ry: 0, rz: 0 },
  helix: { x: 0, y: -0.3, z: -0.5, s: 1, rx: 0.25, ry: 0, rz: -0.1 },
  field: { x: 0, y: 0, z: 0, s: 1, rx: 0, ry: 0, rz: 0 },
};

const MOBILE_POSE: Partial<Pose> = { x: 0, y: 0.7, s: 0.62 };

const DEFAULT_PARAMS: Params = { decay: 0, drift: 1, dark: 0, alpha: 1, wave: 1, highlight: -1, spinX: 0, spinY: 0, explode: 0, drag: 0 };

const THEME = {
  light: { ink: new THREE.Color('#1B1A2B'), inkAlpha: 0.5, deep: new THREE.Color('#3A1FA8'), bright: new THREE.Color('#7B5CFF'), hot: new THREE.Color('#4A1FFF'), trail: new THREE.Color('#6A35FF') },
  dark: { ink: new THREE.Color('#CFCBEA'), inkAlpha: 0.42, deep: new THREE.Color('#6A35FF'), bright: new THREE.Color('#D2C2FF'), hot: new THREE.Color('#E9E1FF'), trail: new THREE.Color('#D8CCFF') },
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
  private attr: Record<'from' | 'to' | 'accFrom' | 'accTo' | 'grpFrom' | 'grpTo', THREE.BufferAttribute>;
  private rand: Float32Array;

  private fromKey: FormationKey = 'logo';
  private toKey: FormationKey = 'logo';
  private progress = 0;
  private duration = 1.9;
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

  constructor(canvas: HTMLCanvasElement) {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = window.innerWidth < 760;
    this.count = small ? 9000 : 22000;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.camera.position.set(0, 0, 7);

    const n = this.count;
    const f = this.formations;
    f.logo = logo(n);
    f.fragments = fragments(n, f.logo);
    f.silos = silos(n, f.logo);
    f.frozen = frozen(n, f.logo);
    f.alone = frozen(n, f.logo, true);
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
      },
    });
    this.group.add(new THREE.Points(this.geometry, this.material));

    this.arcMat = this.makeTrailMaterial(1.8, 0.12);
    this.group.add(this.buildArcTrails());
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

  /** Morph towards a formation. Safe to call every frame with the same target. */
  setTarget(t: Target) {
    this.target = t;
    if (t.key !== this.toKey) this.morphTo(t.key);
  }

  get currentKey() {
    return this.toKey;
  }

  /** 0…1: how settled the current formation is. */
  get settled() {
    return Math.min(1, this.progress);
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
    for (const a of this.formations[key].anchors) {
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

    const mobile = this.width < 760;
    const t = this.target;
    const goal: Pose = { ...BASE_POSE[t.key], ...t.pose, ...(mobile ? { ...MOBILE_POSE, ...t.mobilePose } : {}) };
    const want: Params = { ...DEFAULT_PARAMS, ...t.params };
    if (this.reducedMotion) want.drift = 0;

    const k = 2.4;
    for (const key of Object.keys(goal) as (keyof Pose)[]) this.pose[key] = damp(this.pose[key], goal[key], k, dt);
    for (const key of ['decay', 'drift', 'dark', 'alpha', 'wave', 'spinX', 'spinY', 'explode', 'drag'] as const)
      this.params[key] = damp(this.params[key], want[key], key === 'dark' ? 3.5 : 3, dt);

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
    this.group.position.set(p.x, p.y, p.z);
    this.group.scale.setScalar(p.s);
    this.group.rotation.set(p.rx + this.params.spinX + (Math.abs(this.mouse.y) < 2 ? this.tilt.x : 0), p.ry + this.params.spinY + this.dragSpin + sway + (Math.abs(this.mouse.x) < 2 ? this.tilt.y : 0), p.rz);

    if (this.params.drag < 0.5) this.dragSpin = damp(this.dragSpin, 0, 1.5, dt);
    else if (!this.dragging) {
      this.dragSpin += this.dragVel * dt; // a little inertia after release
      this.dragVel = damp(this.dragVel, 0, 2.5, dt);
    }
    this.mouseAmt = damp(this.mouseAmt, this.mouse.x < 5 && !this.reducedMotion ? 1 : 0, 3, dt);

    const d = this.params.dark;
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
    u.uAlpha.value = this.params.alpha;
    (u.uInk.value as THREE.Color).lerpColors(THEME.light.ink, THEME.dark.ink, d);
    (u.uDeep.value as THREE.Color).lerpColors(THEME.light.deep, THEME.dark.deep, d);
    (u.uBright.value as THREE.Color).lerpColors(THEME.light.bright, THEME.dark.bright, d);
    (u.uHot.value as THREE.Color).lerpColors(THEME.light.hot, THEME.dark.hot, d);
    u.uInkAlpha.value = THEME.light.inkAlpha + (THEME.dark.inkAlpha - THEME.light.inkAlpha) * d;

    const arc = this.arcMat.uniforms;
    arc.uTime.value = this.time;
    arc.uVisible.value = this.presence('globe') * this.params.alpha * 0.8;
    (arc.uColor.value as THREE.Color).lerpColors(THEME.light.trail, THEME.dark.trail, d);

    this.renderer.render(this.scene, this.camera);
    this.listeners.forEach((fn) => fn());
  };

  // ── input & lifecycle ─────────────────────────────────────────────────────

  private resize = () => {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    const pr = Math.min(window.devicePixelRatio, this.width < 760 ? 2 : 1.75);
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
