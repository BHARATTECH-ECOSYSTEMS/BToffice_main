import * as THREE from 'three';
import { CSS3DObject, CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { HUE } from './palette';

/** A card's size in CSS pixels, which are also the scene's world units. */
export const CARD_W = 280;
export const CARD_H = 184;

/**
 * The journey runs down the page: the corridor at the top, a vertical helix through the middle, the ring at the
 * bottom. The camera descends through that world as the page scrolls, so each formation scrolls into view where its
 * chapter of copy is. On the 0…1 scroll through the section, the cards leave the corridor for the helix between
 * `toSpiral` and `onSpiral`, and leave the helix for the ring between `toRing` and `onRing`.
 */
export const PHASES = { toSpiral: 0.04, onSpiral: 0.32, toRing: 0.64, onRing: 0.9 };
/** Progress at each formation, for the index's jumps. */
export const STOPS = [0, 0.5, 1];
/** Which chapter (0 corridor, 1 helix, 2 ring) a progress belongs to. */
export const chapterAt = (p: number) => (p < 0.2 ? 0 : p < 0.74 ? 1 : 2);

/** World units the camera descends over the whole journey. At the helix's distance that is about one page pixel each. */
const CAM_DROP = 5500;

// ── the corridor: along -z at the top of the world, the camera standing in its mouth
const TUN_W = 520; // half width
const TUN_H = 330; // half height
const TUN_CAM_Z = 1800;
const TUN_GAP = 230; // depth between consecutive cards
const FRAME_GAP = 260; // depth between the wireframe's cross frames
const TRAVEL_SCROLL = 2600; // depth travelled by scrolling, over the whole journey
const TRAVEL_IDLE = 70; // depth per second the corridor keeps gliding at rest

// ── the helix: a vertical spiral staircase between the copy and the focus panel. A quarter turn per card puts
// neighbours at least a card's width apart sideways, and a drop per card taller than a card keeps every card in a
// band of its own, so no two cards ever cover each other on screen, whatever the turn.
const HELIX_X = 75;
const HELIX_Y = -2650; // its middle
const HELIX_R = 242;
const HELIX_STEP = Math.PI / 2;
const SPIRAL_CARD_SCALE = 1.15; // cards on the helix: 322 x 212
const HELIX_PITCH = 230; // drop per card, more than a helix card's height (212)
const HELIX_CAM_Z = 2300;
const SPIN_SCROLL = 7; // radians the helix turns over the whole journey, so it screws as the page passes it
const SPIN_IDLE = 0.12; // and per second at rest

// ── the ring: every card on one circle at the bottom of the world, facing out
const RING_Y = -CAM_DROP - 400;
const RING_PITCH = 400; // room per card around the ring
const RING_X = -260; // left of centre, clear of the index and focus panel on the right
const RING_CARD_SCALE = 1.28; // cards on the ring: 358 wide in 400 of room, still clear of each other
const AUTO_SPEED = 0.07; // radians per second at rest
const LEAN = 0.07; // how far the ring tilts into a fast drag, in radians at most
const SPREAD = 0.05; // how much it widens with speed, as a share of its radius
const FRICTION = 2.6;
const DRAG_SLOP = 6;
const HOVER_GAIN = 0.7; // how far the ring follows a mouse moving over the cards, against a press-and-drag (1)
const HOVER_GLIDE = 0.35; // share of that movement's speed the ring keeps gliding with once the mouse stops
const HOVER_GRACE = 300; // ms the cursor may spend in a gap between cards and still keep turning the ring

// ── the entrance
const INTRO_MS = 1800;
const INTRO_DEPTH = 2600; // how far back down the corridor the cards start

const Z_AXIS = new THREE.Vector3(0, 0, 1);
const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const span = (p: number, a: number, b: number) => smooth((p - a) / (b - a));
const mod = (a: number, n: number) => ((a % n) + n) % n;
/** Raw 0…1 progress through a window, before easing (each card eases its own staggered slice of it). */
const through = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)));

interface Pose {
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
}
const pose = (): Pose => ({ pos: new THREE.Vector3(), quat: new THREE.Quaternion() });

const basis = new THREE.Matrix4();
const ax = new THREE.Vector3();
const ay = new THREE.Vector3();
const az = new THREE.Vector3();
/** Turns a card so its text runs along `x`, its top points along `y` and its face looks along `z`. */
function orient(q: THREE.Quaternion, x: number[], y: number[], z: number[]) {
  basis.makeBasis(ax.fromArray(x), ay.fromArray(y), az.fromArray(z));
  q.setFromRotationMatrix(basis);
}

// The walls, going round the corridor (the floor, last, is left bare: see the poses). Every card faces the corridor's axis with its text upright as seen
// from inside: along the corridor on the side walls, across it on the floor and ceiling.
const WALLS = [
  { at: (lat: number) => [-TUN_W, lat * (TUN_H - CARD_H / 2 - 30)], x: [0, 0, -1], y: [0, 1, 0], z: [1, 0, 0] },
  { at: (lat: number) => [lat * (TUN_W - CARD_W / 2 - 40), TUN_H], x: [1, 0, 0], y: [0, 0, 1], z: [0, -1, 0] },
  { at: (lat: number) => [TUN_W, lat * (TUN_H - CARD_H / 2 - 30)], x: [0, 0, 1], y: [0, 1, 0], z: [-1, 0, 0] },
  { at: (lat: number) => [lat * (TUN_W - CARD_W / 2 - 40), -TUN_H], x: [1, 0, 0], y: [0, 0, -1], z: [0, 1, 0] },
];

export interface Journey {
  /** Draws one frame for `progress` (0…1 through the section). */
  /** Draws one frame for `progress` (0…1 through the journey) and `outro` (0…1 through the stretch after it). */
  frame: (now: number, progress: number, outro?: number) => void;
  /** Brings card `i` to the front of the ring. */
  focus: (i: number) => void;
  /** How far card `i` is turned away from the viewer, in degrees (0 outside the ring). */
  turnOf: (i: number) => number;
  /** Whether the last press turned into a drag, so it should not count as a click. */
  dragged: () => boolean;
  /** Holds the scene still, for while a card is open or being read. */
  hold: (on: boolean) => void;
  destroy: () => void;
}

/**
 * The services journey: the same cards travel down the page through three formations. First a corridor with cards
 * hung on all four walls, gliding toward the viewer; then a vertical helix that screws as the page passes it; then
 * a ring the visitor turns with a drag. Each card has a pose in every formation, and the shown pose blends between
 * them per card with a stagger, so the cards fall from one formation to the next as a flock rather than a block.
 *
 * The cards are real HTML placed by CSS3DRenderer (sharp text, real buttons); a WebGL layer under them, drawn
 * with the same camera, carries the corridor's wireframe, the helix's thread, the ring's floor glow and the dust.
 */
export function mountJourney({
  stage,
  canvas,
  hosts,
  reduced,
  onFocusCard,
}: {
  stage: HTMLElement;
  canvas: HTMLCanvasElement;
  hosts: HTMLElement[];
  reduced: boolean;
  /** The card in focus changed: the one nearest the middle of the view, facing it, in whatever formation. */
  onFocusCard: (i: number) => void;
}): Journey {
  const n = hosts.length;
  const ringR = (n * RING_PITCH) / (2 * Math.PI);
  const tunnelLen = n * TUN_GAP;
  const helixTop = HELIX_Y + (n / 2) * HELIX_PITCH;

  const camera = new THREE.PerspectiveCamera(60, 1, 10, 20000);
  const cssScene = new THREE.Scene();
  const css = new CSS3DRenderer();
  css.domElement.className = 'svc-journey-css';
  stage.appendChild(css.domElement);

  const objects = hosts.map((el) => {
    el.style.width = `${CARD_W}px`;
    el.style.height = `${CARD_H}px`;
    const obj = new CSS3DObject(el);
    cssScene.add(obj);
    return obj;
  });
  const tunnelPose = hosts.map(pose);
  const spiralPose = hosts.map(pose);
  const ringPose = hosts.map(pose);
  const ringAngles = hosts.map((_, i) => (i / n) * Math.PI * 2);
  // where each card sits across its wall, so they don't all hang on the centre line
  // where each card sits across its wall, so they don't all hang on the centre line. Side-wall cards hang on the
  // upper half, so close up they pass above the headline (left) and the focus panel (right), never behind them.
  const lateral = hosts.map((_, i) => (i % 3 === 1 ? Math.sin(i * 2.4) * 0.8 : 0.15 + Math.abs(Math.sin(i * 2.4)) * 0.65));

  // ── WebGL decorations
  let gl: THREE.WebGLRenderer | null = null;
  const glScene = new THREE.Scene();
  const disposables: { dispose: () => void }[] = [];
  const wire = new THREE.Group();
  const thread = new THREE.Group();
  const floor = new THREE.Group();
  const u = {
    wire: { value: 0 },
    thread: { value: 0 },
    pulse: { value: 0 },
    floor: { value: 0 },
    travel: { value: 0 },
    pixel: { value: 1 },
  };
  try {
    gl = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    gl.setClearColor(0x000000, 0);

    // the corridor's wireframe: cross frames every FRAME_GAP plus lines running along each wall, fading with depth
    const pts: number[] = [];
    const frames = Math.ceil((tunnelLen + 1400) / FRAME_GAP);
    const corners = [
      [-TUN_W, -TUN_H],
      [TUN_W, -TUN_H],
      [TUN_W, TUN_H],
      [-TUN_W, TUN_H],
    ];
    for (let k = 0; k <= frames; k++) {
      const z = -k * FRAME_GAP;
      for (let c = 0; c < 4; c++) {
        const [x0, y0] = corners[c];
        const [x1, y1] = corners[(c + 1) % 4];
        pts.push(x0, y0, z, x1, y1, z);
      }
    }
    const far = -frames * FRAME_GAP;
    for (let s = 0; s <= 6; s++) {
      const f = s / 6;
      const x = -TUN_W + f * 2 * TUN_W;
      const y = -TUN_H + f * 2 * TUN_H;
      pts.push(x, TUN_H, 0, x, TUN_H, far, x, -TUN_H, 0, x, -TUN_H, far);
      pts.push(-TUN_W, y, 0, -TUN_W, y, far, TUN_W, y, 0, TUN_W, y, far);
    }
    const wireGeo = new THREE.BufferGeometry();
    wireGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    // Every material here adds light: the colour carries the hue and alpha its strength. Writing alpha 1 instead
    // would leave the canvas opaque black wherever a faded part is drawn.
    const wireMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uOpacity: u.wire },
      vertexShader: `varying float vDepth;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uOpacity; varying float vDepth;
        void main(){
          float fog = smoothstep(4600.0, 900.0, vDepth) * smoothstep(0.0, 160.0, vDepth);
          gl_FragColor = vec4(vec3(0.647, 0.592, 1.0), fog * uOpacity * 0.42);
        }`,
    });
    wire.add(new THREE.LineSegments(wireGeo, wireMat));
    glScene.add(wire);
    disposables.push(wireGeo, wireMat);

    // the helix's thread: the track the cards sit on, built round its own axis so the group can turn it
    const helixPts: THREE.Vector3[] = [];
    const steps = n * 24;
    for (let s = 0; s <= steps; s++) {
      const t = (s / steps) * (n - 1);
      const a = t * HELIX_STEP;
      helixPts.push(new THREE.Vector3(Math.sin(a) * (HELIX_R - 4), helixTop - t * HELIX_PITCH, Math.cos(a) * (HELIX_R - 4)));
    }
    const threadGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helixPts), steps, 2.4, 6, false);
    // the tube's uv.x runs 0…1 along its length, from the first card to the last
    const uv = threadGeo.getAttribute('uv');
    const along: number[] = [];
    for (let k = 0; k < uv.count; k++) along.push(uv.getX(k) * (n - 1));
    threadGeo.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1));
    const threadMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uOpacity: u.thread, uPulse: u.pulse, uCount: { value: n - 1 } },
      vertexShader: `attribute float aAlong; varying float vAlong;
        void main(){ vAlong = aAlong; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uOpacity, uPulse, uCount; varying float vAlong;
        void main(){
          float ends = smoothstep(-0.2, 0.8, vAlong) * smoothstep(uCount + 0.2, uCount - 0.8, vAlong);
          float pulse = pow(1.0 - fract(vAlong * 0.5 - uPulse), 6.0);
          // the brand's three colours down the helix: Violet, Tango Orange, Pitch Yellow. The line is drawn near full
          // strength, because orange and yellow faded over the night read as brown; the pulse lifts toward white.
          vec3 violet = vec3(0.431, 0.345, 0.961), tangerine = vec3(1.0, 0.525, 0.263), saffron = vec3(0.961, 0.62, 0.0);
          float t = vAlong / uCount;
          vec3 c = t < 0.5 ? mix(violet, tangerine, t * 2.0) : mix(tangerine, saffron, t * 2.0 - 1.0);
          c = mix(c, vec3(1.0), pulse * 0.45);
          gl_FragColor = vec4(c, min(1.0, (0.85 + pulse) * ends * uOpacity));
        }`,
    });
    thread.add(new THREE.Mesh(threadGeo, threadMat));
    thread.position.x = HELIX_X;
    glScene.add(thread);
    disposables.push(threadGeo, threadMat);

    // The ring's floor: a soft pool of light under the cards with a wide, gentle rim. A crisp bright line here read as
    // a stroke cutting through the cards, so nothing in it is sharper than a few hundred units, and it sits well
    // below the cards' feet.
    const bandGeo = new THREE.CircleGeometry(ringR * 1.6, 128);
    const bandMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uR: { value: ringR }, uOpacity: u.floor },
      vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float uR, uOpacity; varying vec2 vP;
        void main(){
          float d = length(vP) / uR;
          float pool = smoothstep(1.5, 0.0, d);
          float rim = exp(-pow((d - 1.0) / 0.3, 2.0));
          // violet only: Tango Orange this faint over the night reads as brown
          vec3 c = mix(vec3(0.43, 0.35, 0.96), vec3(0.647, 0.592, 1.0), rim);
          gl_FragColor = vec4(c, (pool * 0.16 + rim * 0.16) * uOpacity);
        }`,
    });
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.rotation.x = -Math.PI / 2;
    floor.position.set(RING_X, RING_Y - 240, 0);
    floor.add(band);
    glScene.add(floor);
    disposables.push(bandGeo, bandMat);

    // dust down the whole height of the world; it streams past in the corridor and drifts everywhere else
    const count = 1500;
    const zMin = -4400;
    const zRange = TUN_CAM_Z + 900 - zMin;
    const yTop = 900;
    const yBottom = RING_Y - 900;
    const dustPos = new Float32Array(count * 3);
    const dustCol = new Float32Array(count * 3);
    const yellow = new THREE.Color(HUE.saffron);
    const orange = new THREE.Color(HUE.tangerine);
    const violet = new THREE.Color('#a597ff'); // the site's light violet (--violet-text, dark theme)
    for (let k = 0; k < count; k++) {
      dustPos.set([(Math.random() - 0.5) * 3600, yBottom + Math.random() * (yTop - yBottom), zMin + Math.random() * zRange], k * 3);
      const pick = Math.random();
      const c = pick < 0.5 ? violet : pick < 0.75 ? orange : yellow;
      dustCol.set([c.r, c.g, c.b], k * 3);
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    dustGeo.setAttribute('aColor', new THREE.BufferAttribute(dustCol, 3));
    const dustMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTravel: u.travel, uPixel: u.pixel, uZMin: { value: zMin }, uRange: { value: zRange } },
      vertexShader: `uniform float uTravel, uPixel, uZMin, uRange; attribute vec3 aColor; varying vec3 vC; varying float vA;
        void main(){
          vec3 p = position;
          p.z = uZMin + mod(p.z - uZMin + uTravel * 0.6, uRange);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = 3.4 * uPixel * clamp(900.0 / -mv.z, 0.6, 3.0);
          vA = smoothstep(5200.0, 1400.0, -mv.z) * smoothstep(40.0, 260.0, -mv.z);
          vC = aColor;
        }`,
      fragmentShader: `varying vec3 vC; varying float vA;
        void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vC, (1.0 - d * 2.0) * vA * 0.6); }`,
    });
    glScene.add(new THREE.Points(dustGeo, dustMat));
    disposables.push(dustGeo, dustMat);
  } catch {
    gl = null; // no WebGL: the cards still make the journey, just without the light around them
  }

  // ── sizing
  let width = 1;
  let height = 1;
  let fit = 1;
  const resize = () => {
    width = stage.clientWidth || 1;
    height = stage.clientHeight || 1;
    camera.aspect = width / height;
    // narrow or short stages pull the ring's camera back, so the whole ring keeps clear of the copy around it
    fit = Math.max(1, 1180 / width, 760 / height);
    css.setSize(width, height);
    // the glow and dust are soft, so the canvas stays at 1.5x at most: on 2x screens that is half the pixels to fill
    const ratio = Math.min(1.5, window.devicePixelRatio || 1);
    u.pixel.value = ratio;
    gl?.setPixelRatio(ratio);
    gl?.setSize(width, height, false);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  resize();

  // ── state: idle clocks, the ring's angle and momentum, the pointer
  let travelIdle = 0;
  let spinIdle = 0;
  let idleSpeed = 1; // eases to 0 while a card is under the pointer, so it holds still to be clicked
  let theta = 0;
  let velocity = 0;
  let steering: number | null = null; // the card being steered to the ring's front
  let dragging = false;
  let pressX = 0;
  let lastX = 0;
  let lastT = 0;
  let moved = 0;
  let overCard = false;
  let held = false;
  let ringWeight = reduced ? 1 : 0;
  let scrollTurn = 0;
  let focusIndex = -1;
  const scores = hosts.map(() => 0);
  // the entrance: the corridor rushes in from far away when the page opens
  const born = performance.now();
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let last = performance.now();
  const shown = hosts.map(() => -1);
  const awayShown = hosts.map(() => false);

  const camPos = new THREE.Vector3();
  const camAt = new THREE.Vector3();
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const view = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const toCam = new THREE.Vector3();
  const ndc = new THREE.Vector3();
  const lean = new THREE.Quaternion();
  let leanAngle = 0;
  let spreadNow = 0;
  let dragSpeed = 0; // radians per second under the pointer, for the lean while the ring is held

  const frame = (now: number, rawProgress: number, rawOutro = 0) => {
    const p = reduced ? 1 : rawProgress;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;

    if (!reduced) {
      idleSpeed += ((overCard || held ? 0 : 1) - idleSpeed) * Math.min(1, dt * 5);
      travelIdle += TRAVEL_IDLE * idleSpeed * dt;
      spinIdle += SPIN_IDLE * idleSpeed * dt;
      pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3);
      pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3);
    }
    const arrive = reduced ? 1 : 1 - Math.pow(1 - Math.min(1, (now - born) / INTRO_MS), 3);
    const travel = p * TRAVEL_SCROLL + travelIdle - (1 - arrive) * INTRO_DEPTH;
    const spin = p * SPIN_SCROLL + spinIdle;

    // the ring: a little turn from scrolling, momentum, the slow turn, and steering to a focused card
    // The ending: past the ring the page keeps scrolling for a stretch, and the ring leaves on it, lifting away,
    // still turning, its cards dissolving one after another, so the scene has gone by the time the next section is up.
    const outroRaw = reduced ? 0 : Math.min(1, Math.max(0, rawOutro));
    const outro = smooth(outroRaw);
    scrollTurn = reduced ? 0 : Math.max(0, p - PHASES.toRing) * 1.6 + outro * 0.9;
    if (!dragging) {
      if (steering !== null) {
        // measured against this frame's scroll turn, which keeps changing while the page scrolls to the ring
        const want = -ringAngles[steering] - scrollTurn;
        const to = want + Math.round((theta - want) / (Math.PI * 2)) * Math.PI * 2;
        theta += (to - theta) * Math.min(1, dt * 7);
        if (Math.abs(to - theta) < 0.0005) steering = null;
        velocity = 0;
      } else {
        theta += velocity * dt;
        velocity *= Math.exp(-FRICTION * dt);
        if (!reduced && !held) theta += AUTO_SPEED * idleSpeed * dt;
      }
    }

    // a fast drag tilts the ring into the direction of travel and opens it out a little; both ease back at rest
    const speed = dragging ? dragSpeed : velocity;
    leanAngle += (Math.max(-LEAN, Math.min(LEAN, -speed * 0.025)) - leanAngle) * Math.min(1, dt * 6);
    spreadNow += (Math.min(SPREAD, Math.abs(speed) * 0.012) - spreadNow) * Math.min(1, dt * 6);
    lean.setFromAxisAngle(Z_AXIS, leanAngle);
    const spread = 1 + spreadNow;

    // ── poses in each formation
    for (let i = 0; i < n; i++) {
      // cards hang on the side walls and the ceiling only: the floor runs along the bottom of the screen, under
      // the headline and the focus panel, so it keeps just its wireframe
      const wall = WALLS[i % 3];
      const [wx, wy] = wall.at(lateral[i]);
      const z = TUN_CAM_Z - 160 - tunnelLen + mod(i * TUN_GAP + travel, tunnelLen);
      tunnelPose[i].pos.set(wx, wy, z);
      orient(tunnelPose[i].quat, wall.x, wall.y, wall.z);

      const a = i * HELIX_STEP + spin;
      spiralPose[i].pos.set(HELIX_X + Math.sin(a) * HELIX_R, helixTop - i * HELIX_PITCH, Math.cos(a) * HELIX_R);
      spiralPose[i].quat.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, a);

      const b = ringAngles[i] + theta + scrollTurn;
      ringPose[i].pos.set(Math.sin(b) * ringR * spread, 0, Math.cos(b) * ringR * spread).applyQuaternion(lean);
      ringPose[i].pos.x += RING_X;
      ringPose[i].pos.y += RING_Y;
      ringPose[i].quat.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, b).premultiply(lean);
    }

    // ── the camera descends with the page; it looks down the corridor at the top, straight at the helix in the
    // middle, and settles above the ring at the bottom
    const c1 = span(p, 0, PHASES.onSpiral);
    const c2 = span(p, PHASES.toRing - 0.02, 0.86);
    ringWeight = c2;
    const px = pointer.x;
    const py = pointer.y;
    const camY = -p * CAM_DROP;
    camPos.set(px * 40, camY - py * 30, TUN_CAM_Z + (HELIX_CAM_Z - TUN_CAM_Z) * c1);
    tmpA.set(px * 240, camY - 70 - py * 150, TUN_CAM_Z - 1400);
    tmpB.set(px * 80, camY - py * 60, 0);
    camAt.lerpVectors(tmpA, tmpB, c1);
    tmpA.set(0, RING_Y + 520 * fit, ringR + 2300 * fit);
    camPos.lerp(tmpA, c2);
    tmpA.set(0, RING_Y - 430, 0);
    camAt.lerp(tmpA, c2);
    camPos.y -= outro * 260;
    camPos.z += outro * 900;
    camAt.y -= outro * 380;
    camera.position.copy(camPos);
    camera.lookAt(camAt);
    camera.fov = 60 + (40 - 60) * c1 + (30 - 40) * c2;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    // fog per formation: cards come out of the dark in the corridor; the far side stays faintly there later on
    const fogNear = 2400 + (2300 - 2400) * c1 + (1500 - 2300) * c2;
    const fogFar = 4400 + (3600 - 4400) * c1 + (3400 - 3600) * c2;
    const fogMin = 0 + (0.25 - 0) * c1 + (0.22 - 0.25) * c2;

    // ── each card blends its poses; the stagger lets them leave one formation and arrive in the next in turn
    let best = -1;
    let bestScore = 0;
    for (let i = 0; i < n; i++) {
      const lag = (i / Math.max(1, n - 1)) * 0.45;
      const w1 = smooth((through(p, PHASES.toSpiral, PHASES.onSpiral) - lag) / 0.55);
      const w2 = smooth((through(p, PHASES.toRing, PHASES.onRing) - lag) / 0.55);
      const obj = objects[i];
      obj.position.lerpVectors(tunnelPose[i].pos, spiralPose[i].pos, w1).lerp(ringPose[i].pos, w2);
      obj.quaternion.slerpQuaternions(tunnelPose[i].quat, spiralPose[i].quat, w1).slerp(ringPose[i].quat, w2);
      // each formation has its own card size; the size travels with the card between them
      obj.scale.setScalar(1 + (SPIRAL_CARD_SCALE - 1) * w1 + (RING_CARD_SCALE - SPIRAL_CARD_SCALE) * w2);

      view.copy(obj.position).applyMatrix4(camera.matrixWorldInverse);
      const depth = -view.z;
      let alpha = depth < 60 ? 0 : smooth((depth - 60) / 320);
      alpha *= 1 - (1 - fogMin) * smooth((depth - fogNear) / (fogFar - fogNear));
      // cards at the very foot of the screen dim a little, so they never compete with the copy there
      ndc.copy(obj.position).project(camera);
      alpha *= 0.55 + 0.45 * smooth((ndc.y + 1) / 0.35);
      // On the helix and the ring, a card turned away shows only its plain back: those recede, so the far side reads
      // as depth instead of a row of empty boxes. (Corridor cards face the axis at a glancing angle and are left be.)
      normal.set(0, 0, 1).applyQuaternion(obj.quaternion);
      toCam.subVectors(camera.position, obj.position).normalize();
      const facing = normal.dot(toCam);
      // a card seen from behind shows its plain back (CSS, on the one surface each card has)
      const away = facing < 0;
      if (away !== awayShown[i]) {
        awayShown[i] = away;
        hosts[i].toggleAttribute('data-away', away);
      }
      alpha *= 1 - (1 - (0.35 + 0.65 * smooth((facing + 0.15) / 0.4))) * w1;
      // the dissolve sweeps across the ring from left to right
      // (timed on the raw stretch, so the last cards go just as the stretch ends)
      if (outroRaw > 0) alpha *= 1 - smooth((outroRaw * 1.25 - 0.25 - (ndc.x + 1) * 0.15) / 0.6);
      // in steps of 1/32: too fine to see, but far fewer style writes than every hundredth
      const rounded = Math.round(alpha * 32) / 32;
      if (rounded !== shown[i]) {
        shown[i] = rounded;
        // the fade goes to the card's two sides through a variable: opacity on the host itself would flatten its 3D,
        // and the far side would show the face's text in mirror writing instead of the card's back
        hosts[i].style.setProperty('--fade', String(rounded));
      }
      // a card that can't be seen is switched off: CSS3DRenderer then stops placing it and the browser stops
      // compositing it
      obj.visible = rounded >= 0.02;
      if (!obj.visible) {
        scores[i] = 0;
        continue;
      }

      // How much this card is "the one you are looking at": near, turned toward the camera, close to the middle
      // of the view and not faded. In the ring that is the front card; in the corridor and the helix it is the
      // card passing closest to the centre.
      const onScreen = Math.abs(ndc.x) < 0.95 && Math.abs(ndc.y) < 0.95 && ndc.z < 1;
      const centre = Math.max(0, 1 - Math.hypot(ndc.x * 0.8, ndc.y));
      const score = onScreen ? alpha * Math.max(0, facing) * (1000 / Math.max(200, depth)) * (0.3 + 0.7 * centre) : 0;
      scores[i] = score;
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    // a new card takes the focus only once it is clearly ahead, so the focus doesn't flicker between two
    const current = focusIndex >= 0 ? scores[focusIndex] : 0;
    if (!held && best >= 0 && best !== focusIndex && (bestScore > current * 1.3 || current < 0.05)) {
      focusIndex = best;
      onFocusCard(best);
    }

    // ── the light around the cards
    u.wire.value = (1 - span(p, 0.08, 0.3)) * arrive;
    u.thread.value = span(p, 0.12, PHASES.onSpiral) * (1 - c2);
    u.floor.value = c2 * (1 - outro);
    // a layer faded right out is not drawn at all, so each stretch of the page only pays for the light it shows
    wire.visible = u.wire.value > 0.001;
    thread.visible = u.thread.value > 0.001;
    floor.visible = u.floor.value > 0.001;
    u.pulse.value = spinIdle * 2;
    u.travel.value = travel;
    wire.position.z = TUN_CAM_Z + 300 + mod(travel, FRAME_GAP);
    thread.rotation.y = spin;
    floor.rotation.y = (theta + scrollTurn) * 0.6;

    css.render(cssScene, camera);
    gl?.render(glScene, camera);
  };

  // ── pointer: the scene leans toward it, a card under it holds the motion, and the ring turns when the mouse
  // moves across the cards, or when a card is dragged. Empty space does neither, so the rest of the section
  // behaves like an ordinary page.
  let pressedCard = false;
  let hoverX = 0;
  let hoverT = 0;
  let lastOnCard = -Infinity;
  /** Turns the ring with a mouse moving over the cards, no button held: the cards travel with the cursor. */
  const hoverTurn = (e: PointerEvent) => {
    const t = performance.now();
    if ((e.target as Element).closest?.('.svc-card__face')) lastOnCard = t;
    const dx = e.clientX - hoverX;
    const dtS = Math.max(0.008, (t - hoverT) / 1000);
    hoverX = e.clientX;
    hoverT = t;
    // a jump (the cursor arriving from elsewhere) is a new starting point, not a movement
    if (reduced || e.pointerType !== 'mouse' || held || ringWeight < 0.6 || t - lastOnCard > HOVER_GRACE || Math.abs(dx) > 160) return;
    const turn = (dx / width) * Math.PI * 0.9 * HOVER_GAIN;
    theta += turn;
    steering = null;
    velocity = (turn / dtS) * HOVER_GLIDE;
  };
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    pressedCard = !!(e.target as Element).closest?.('.svc-card__face');
    pressX = lastX = e.clientX;
    lastT = performance.now();
    moved = 0;
    steering = null;
  };
  const onMove = (e: PointerEvent) => {
    if (!reduced && e.pointerType === 'mouse') {
      const r = stage.getBoundingClientRect();
      pointer.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
    }
    if (!(e.buttons & 1)) {
      hoverTurn(e);
      return;
    }
    if (!pressedCard || ringWeight < 0.6) return;
    const dx = e.clientX - lastX;
    moved = Math.max(moved, Math.abs(e.clientX - pressX));
    if (!dragging && moved > DRAG_SLOP) {
      dragging = true;
      stage.setPointerCapture(e.pointerId);
      stage.classList.add('is-dragging');
    }
    if (!dragging) return;
    const t = performance.now();
    const turn = (dx / width) * Math.PI * 0.9;
    theta += turn;
    velocity = reduced ? 0 : turn / Math.max(0.008, (t - lastT) / 1000);
    dragSpeed = velocity;
    lastX = e.clientX;
    lastT = t;
  };
  const onUp = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    dragSpeed = 0;
    stage.releasePointerCapture?.(e.pointerId);
    stage.classList.remove('is-dragging');
    // a pause before letting go means no flick
    if (performance.now() - lastT > 80) velocity = 0;
  };
  const onOver = (e: PointerEvent) => {
    overCard = !!(e.target as Element).closest?.('.svc-card__face');
  };
  const onLeave = () => {
    overCard = false;
    pointer.tx = 0;
    pointer.ty = 0;
  };
  stage.addEventListener('pointerdown', onDown);
  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('pointerup', onUp);
  stage.addEventListener('pointercancel', onUp);
  stage.addEventListener('pointerover', onOver);
  stage.addEventListener('pointerleave', onLeave);

  return {
    frame,
    focus: (i) => {
      steering = i;
    },
    turnOf: (i) => {
      if (ringWeight < 0.5) return 0;
      let a = mod(ringAngles[i] + theta + scrollTurn, Math.PI * 2);
      if (a > Math.PI) a -= Math.PI * 2;
      return (a * 180) / Math.PI;
    },
    dragged: () => moved > DRAG_SLOP,
    hold: (on) => {
      held = on;
    },
    destroy: () => {
      ro.disconnect();
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerup', onUp);
      stage.removeEventListener('pointercancel', onUp);
      stage.removeEventListener('pointerover', onOver);
      stage.removeEventListener('pointerleave', onLeave);
      disposables.forEach((d) => d.dispose());
      gl?.dispose();
      css.domElement.remove();
    },
  };
}
