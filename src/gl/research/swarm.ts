import * as THREE from 'three';
import { FontLoader, type FontData } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import fontJson from './fonts/instrument-serif-italic.json';
import { FORMS, FOV, GAP, pairAt, stopEye, storyPath, type FormName } from './path';
import { armForm, cubeForm, domeForm, fieldForm, globeForm, phoneForm, skyForm, slabForm, surfaceForm } from './forms';
import { HUE, seeded } from '../worlds/kit';

/**
 * The Research page's one object: a swarm of points that is the intelligence itself. In the hero it is the word
 * "intelligence" in solid 3D serif with a thread of points weaving through its letters; the first scroll flies the
 * camera into a letter, the letters come apart into points, and the swarm re-forms as each stop's object further
 * along the way. Every frame is a function of the scroll story value `s`, so scrolling back retraces it exactly.
 */

const WORD = 'intelligence';
const SIZE = 0.5; // the word's em size, in the units the forms are drawn in (the globe's radius is 1)
const FLY_INTO = 5; // the camera flies through the second "l"
const BG = '#0A0910'; // the site's dark --bg
const DOMAIN_FORMS = { cube: cubeForm, slab: slabForm, arm: armForm, globe: globeForm, dome: domeForm, phone: phoneForm };
const PEARL = '#EEEAFB';
const tone = (c: THREE.Color) => c.clone().lerp(new THREE.Color(PEARL), 0.18);
const TONES: Record<FormName, THREE.Color> = {
  word: tone(HUE.violet),
  field: tone(HUE.violet),
  cube: tone(HUE.violet),
  slab: tone(HUE.orange),
  arm: tone(HUE.saffron),
  globe: tone(HUE.violet),
  dome: tone(HUE.orange),
  phone: tone(HUE.saffron),
  wide: tone(HUE.violet),
};
// the arm and the dome stand on the ground (y = 0): lowered so their middle sits at their stop's centre
const LIFT: Partial<Record<FormName, number>> = { arm: -0.45, dome: -0.45 };
// the slow drift round a held form, at most about 5°
const ORBIT = 0.09;

// The pointer parts the swarm: dots within its reach slide away from it on the screen and brighten a little, so the
// cursor opens a soft clearing that follows it. Returns how near the dot is (0 far … 1 under the pointer).
const PART = /* glsl */ `
  uniform vec2 uPointer;
  uniform float uHover;
  uniform float uAspect;
  float part(inout vec4 clip) {
    if (clip.w <= 0.0 || uHover <= 0.0) return 0.0;
    vec2 ndc = clip.xy / clip.w;
    vec2 d = (ndc - uPointer) * vec2(uAspect, 1.0);
    float r = length(d);
    float near = uHover * (1.0 - smoothstep(0.0, 0.26, r));
    ndc += d / max(r, 1e-4) / vec2(uAspect, 1.0) * near * near * 0.045;
    clip.xy = ndc * clip.w;
    return near;
  }
`;

const POINT_VS = /* glsl */ `
  attribute vec3 aFrom;
  attribute vec3 aTo;
  attribute float aSeed;
  uniform float uMix;
  uniform float uSwirl;
  uniform float uSpin;
  uniform vec2 uAxis;
  uniform float uTime;
  ${PART}
  uniform float uSize;
  uniform float uScale;
  uniform float uFromAlpha;
  uniform float uMaxSize;
  uniform float uMinSize;
  uniform vec3 uFocus;
  uniform vec3 uPearl;
  uniform vec3 uToneFrom;
  uniform vec3 uToneTo;
  uniform vec3 uWarm;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    // each point leaves its old form a little later than the last, so the swarm streams rather than jumps
    float k = smoothstep(aSeed * 0.45, aSeed * 0.45 + 0.55, uMix);
    vec3 p = mix(aFrom, aTo, k);
    p += uSwirl * sin(3.14159 * k) * vec3(sin(aSeed * 91.0 + uTime * 0.4), cos(aSeed * 57.0 + uTime * 0.3), sin(aSeed * 23.0 - uTime * 0.5));
    // leaving the hero's word, each point also turns round the line the camera flies along, by an amount of its own
    // that peaks mid-way: the letters unfurl outwards into the sky like a spiral, instead of streaming in a column
    float turn = uSpin * sin(3.14159 * k) * (0.55 + 0.9 * aSeed);
    vec2 off = p.xy - uAxis;
    p.xy = uAxis + vec2(cos(turn) * off.x - sin(turn) * off.y, sin(turn) * off.x + cos(turn) * off.y);
    // never quite still
    p += 0.006 * vec3(sin(uTime * 0.7 + aSeed * 40.0), cos(uTime * 0.6 + aSeed * 31.0), sin(uTime * 0.5 + aSeed * 17.0));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float near = part(gl_Position);
    // one dot size everywhere but for depth: never so small it blurs out, never so large near the lens that it
    // fills the screen (and costs the GPU a screen's worth of blending); a touch larger under the pointer
    gl_PointSize = clamp(uSize * uScale / max(-mv.z, 0.05), uMinSize, uMaxSize) * (1.0 + 0.2 * near);
    float hue = fract(aSeed * 7.13);
    // mostly pearl; a third take the stop's own tone, passing to the next stop's with the point; a few warm sparks
    vColor = mix(hue < 0.56 ? uPearl : hue < 0.94 ? mix(uToneFrom, uToneTo, k) : uWarm, vec3(1.0), 0.25 * near);
    // the form's far side dimmed, so its outline reads in depth instead of both sides adding up
    float back = smoothstep(0.0, 0.8, dot(p - uFocus, normalize(uFocus - cameraPosition)));
    vAlpha = mix(uFromAlpha, 1.0, k) * (0.82 + 0.18 * fract(aSeed * 13.7)) * smoothstep(0.2, 0.9, -mv.z) * (1.0 - 0.55 * back) * (1.0 + 0.35 * near);
  }
`;

// the hero's thread: points weaving through the word, in front of one letter and behind the next
const THREAD_VS = /* glsl */ `
  attribute float aSeed;
  attribute vec3 aJitter;
  uniform float uTime;
  ${PART}
  uniform float uSize;
  uniform float uScale;
  uniform float uWidth;
  uniform float uDepth;
  uniform float uAlpha;
  uniform vec3 uPearl;
  uniform vec3 uToneTo;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float u = fract(aSeed + uTime * 0.035);
    vec3 p = vec3(mix(-0.6, 0.6, u) * uWidth, sin(u * 18.85 + 0.6) * uDepth * 0.5, cos(u * 31.4) * uDepth * 1.4) + aJitter;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float near = part(gl_Position);
    gl_PointSize = uSize * uScale / max(-mv.z, 0.05) * (1.0 + 0.2 * near);
    vColor = mix(uPearl, uToneTo, smoothstep(0.35, 1.0, fract(aSeed * 5.3)));
    // the thread thins out at both ends
    vAlpha = uAlpha * sin(3.14159 * u) * (1.0 + 0.35 * near);
  }
`;

// Every point a crisp, even dot: a disc with a one-pixel soft edge, not a glow, so each form reads as a precise
// drawing in dots and dense parts stay dots instead of adding up into blobs.
const POINT_FS = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float edge = fwidth(d);
    float disc = 1.0 - smoothstep(0.5 - 1.5 * edge, 0.5, d);
    if (disc <= 0.0) discard;
    gl_FragColor = vec4(vColor, disc * vAlpha);
  }
`;

/**
 * The word's finish: a pearl sphere lit from the upper left, as a matcap (the material reads its shading from this
 * picture by the surface's facing, so it needs no lights and a small shader). A soft violet glow on the lower right
 * and a faint warm bounce underneath echo the swarm's colours on the letters' edges.
 */
function pearlMatcap() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const r = size / 2;
  const body = g.createRadialGradient(r * 0.72, r * 0.62, r * 0.05, r, r, r);
  body.addColorStop(0, '#ffffff');
  body.addColorStop(0.28, '#f1eef9');
  body.addColorStop(0.62, '#b8b2cc');
  body.addColorStop(0.86, '#57506d');
  body.addColorStop(1, '#221e30');
  g.fillStyle = body;
  g.fillRect(0, 0, size, size);
  const glow = (x: number, y: number, radius: number, colour: string) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, radius);
    gr.addColorStop(0, colour);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, size, size);
  };
  glow(r * 1.55, r * 1.45, r * 0.7, 'rgba(140,120,255,0.38)');
  glow(r, r * 1.9, r * 0.6, 'rgba(255,170,110,0.16)');
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export interface Swarm {
  /** Links the shaders in the background; resolves once ready, after `maxMs` at most, or at once if destroyed. */
  warm(maxMs?: number): Promise<void>;
  frame(now: number, s: number): void;
  /** true once a frame has been drawn */
  ready(): boolean;
  destroy(): void;
}

const nextTask = () => new Promise<void>((resolve) => window.setTimeout(resolve, 0));
const idle = (fn: () => void) => (typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(fn, { timeout: 1500 }) : window.setTimeout(fn, 50));

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function mountSwarm({
  canvas,
  stage,
  lite,
  sequence = FORMS,
}: {
  canvas: HTMLCanvasElement;
  stage: HTMLElement;
  lite: boolean;
  sequence?: readonly FormName[];
}): Swarm {
  const gl = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  gl.debug.checkShaderErrors = true;
  gl.debug.onShaderError = (context, program, vertex, fragment) => {
    // A shader that fails to compile leaves the program's log saying only that; the reason is in the shader's own log.
    console.error('Research swarm shader:', context.getProgramInfoLog(program), context.getShaderInfoLog(vertex), context.getShaderInfoLog(fragment));
    throw new Error('The Research swarm shader could not compile.');
  };
  gl.setClearColor(BG);
  const count = lite ? 12000 : 30000;
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(d: T) => (disposables.push(d), d);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1.6, 0.05, 200);

  // ── the hero word
  const font = new FontLoader().parse(fontJson as unknown as FontData);
  const wordGeo = keep(
    new TextGeometry(WORD, {
      font,
      size: SIZE,
      depth: SIZE * 0.2,
      curveSegments: lite ? 4 : 8,
      bevelEnabled: true,
      bevelThickness: SIZE * 0.018,
      bevelSize: SIZE * 0.008,
      bevelSegments: lite ? 1 : 2,
    }),
  );
  wordGeo.computeBoundingBox();
  const wordBox = wordGeo.boundingBox!;
  const scale = SIZE / fontJson.resolution;
  const advance = (ch: string) => (fontJson.glyphs as Record<string, { ha: number }>)[ch].ha * scale;
  // the letter the camera flies into, before the word is centred
  const letterX = [...WORD.slice(0, FLY_INTO)].reduce((x, ch) => x + advance(ch), 0) + advance(WORD[FLY_INTO]) / 2;
  const wordCentre = wordBox.getCenter(new THREE.Vector3());
  wordGeo.center();
  const wordWidth = wordBox.max.x - wordBox.min.x;
  const letter = new THREE.Vector3(letterX - wordCentre.x, SIZE * 0.25, 0);
  const matcap = keep(pearlMatcap());
  const wordMat = keep(new THREE.MeshMatcapMaterial({ matcap, transparent: true }));
  const word = new THREE.Mesh(wordGeo, wordMat);
  scene.add(word);

  const colours = {
    uPearl: { value: new THREE.Color(PEARL) },
    uToneFrom: { value: TONES[sequence[0]].clone() },
    uToneTo: { value: TONES[sequence[Math.min(1, sequence.length - 1)]].clone() },
    uWarm: { value: HUE.saffron.clone().lerp(HUE.paper, 0.2) },
  };
  const pixelScale = { value: 1 };
  const parting = { uPointer: { value: new THREE.Vector2() }, uHover: { value: 0 }, uAspect: { value: 1 } };
  const maxSize = { value: 10 };
  const minSize = { value: 2 };
  const time = { value: 0 };

  // ── the thread through the word
  const threadCount = lite ? 500 : 1200;
  const threadGeo = keep(new THREE.BufferGeometry());
  {
    const rand = seeded(7);
    const seeds = new Float32Array(threadCount);
    const jitter = new Float32Array(threadCount * 3);
    for (let i = 0; i < threadCount; i++) {
      seeds[i] = rand();
      jitter.set([(rand() - 0.5) * 0.04, (rand() - 0.5) * SIZE * 0.12, (rand() - 0.5) * SIZE * 0.12], i * 3);
    }
    threadGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(threadCount * 3), 3));
    threadGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    threadGeo.setAttribute('aJitter', new THREE.BufferAttribute(jitter, 3));
  }
  const threadMat = keep(
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: time,
        uScale: pixelScale,
        ...parting,
        uSize: { value: lite ? 0.018 : 0.013 },
        uWidth: { value: wordWidth },
        uDepth: { value: SIZE },
        uAlpha: { value: 1 },
        uPearl: colours.uPearl,
        uToneTo: { value: TONES.word.clone() },
      },
      vertexShader: THREAD_VS,
      fragmentShader: POINT_FS,
      transparent: true,
      depthWrite: false,
    }),
  );
  const thread = new THREE.Points(threadGeo, threadMat);
  thread.frustumCulled = false;
  scene.add(thread);

  // ── the swarm
  const swarmGeo = keep(new THREE.BufferGeometry());
  const from = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
  const to = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
  {
    const rand = seeded(11);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) seeds[i] = rand();
    swarmGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    swarmGeo.setAttribute('aFrom', from);
    swarmGeo.setAttribute('aTo', to);
    swarmGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  }
  const swarmMat = keep(
    new THREE.ShaderMaterial({
      uniforms: {
        ...parting,
        uMix: { value: 0 },
        uSwirl: { value: 0 },
        uSpin: { value: 0 },
        // the line the camera flies along into the word: through the letter it enters
        uAxis: { value: new THREE.Vector2(letter.x, letter.y) },
        uTime: time,
        uScale: pixelScale,
        uSize: { value: lite ? 0.015 : 0.011 },
        uFromAlpha: { value: 1 },
        uMaxSize: maxSize,
        uMinSize: minSize,
        uFocus: { value: new THREE.Vector3() },
        ...colours,
      },
      vertexShader: POINT_VS,
      fragmentShader: POINT_FS,
      transparent: true,
      depthWrite: false,
    }),
  );
  const swarm = new THREE.Points(swarmGeo, swarmMat);
  swarm.frustumCulled = false;
  scene.add(swarm);

  // Forms are built when first needed and kept, each placed at its stop along the way.
  const forms = new Map<string, Float32Array>();
  const formAt = (name: FormName, stop: number) => {
    const id = `${name}@${stop}`;
    let f = forms.get(id);
    if (!f) {
      if (name === 'word') f = surfaceForm(wordGeo, count, seeded(1));
      else if (name === 'field') {
        // "our research": the whole view filled with dots, seen from where the camera stands at this stop (on a
        // 16:9 window; wider ones up to 2.2:1 are covered too)
        const tanY = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
        f = skyForm(count, seeded(3), { eye: stopEye(stop, 16 / 9), tanY, tanX: tanY * 2.2, near: 2.2, far: 14 });
      }
      else if (name === 'wide') f = fieldForm(count, seeded(4), 4);
      else f = DOMAIN_FORMS[name](count, seeded(2));
      const lift = LIFT[name] ?? 0;
      for (let i = 0; i < f.length; i += 3) {
        f[i + 1] += lift;
        f[i + 2] -= stop * GAP;
      }
      forms.set(id, f);
    }
    return f;
  };
  let shownPair = -1;
  const showPair = (index: number) => {
    if (index === shownPair) return;
    shownPair = index;
    (colours.uToneFrom.value as THREE.Color).copy(TONES[sequence[index]]);
    (colours.uToneTo.value as THREE.Color).copy(TONES[sequence[Math.min(sequence.length - 1, index + 1)]]);
    (from.array as Float32Array).set(formAt(sequence[index], index));
    (to.array as Float32Array).set(formAt(sequence[Math.min(sequence.length - 1, index + 1)], index + 1));
    from.needsUpdate = true;
    to.needsUpdate = true;
  };

  // ── the camera's way through the whole story (path.ts), from the hero's word to the closer
  const poseAt = storyPath({ width: wordWidth, letter: letter.toArray() as [number, number, number] });
  const place = (s: number, orbit: number) => {
    const pose = poseAt(s, camera.aspect, orbit);
    camera.position.set(...pose.pos);
    camera.lookAt(look.set(...pose.look));
    camera.rotateZ(THREE.MathUtils.degToRad(pose.roll));
  };

  const resize = () => {
    const width = stage.clientWidth || 1;
    const height = stage.clientHeight || 1;
    camera.aspect = width / height;
    parting.uAspect.value = camera.aspect;
    stageHeight = height;
    camera.updateProjectionMatrix();
    gl.setPixelRatio(Math.min(lite ? 1 : 1.5, window.devicePixelRatio || 1));
    gl.setSize(width, height, false);
    // a point `uSize` across, one unit from the camera, covers this many pixels
    pixelScale.value = (height * gl.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    maxSize.value = (lite ? 8 : 10) * gl.getPixelRatio();
    minSize.value = 2 * gl.getPixelRatio();
  };
  const look = new THREE.Vector3();
  let stageHeight = 1;
  const pointerAt = new THREE.Vector2();
  let pointerWanted = 0;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    // the stage is pinned to the top of the window while it is on screen
    pointerAt.set((e.clientX / window.innerWidth) * 2 - 1, 1 - (e.clientY / stageHeight) * 2);
    // arriving, the clearing opens where the pointer is rather than gliding in from wherever it last was
    if (parting.uHover.value < 0.02) parting.uPointer.value.copy(pointerAt);
    pointerWanted = 1;
  };
  const onPointerLeave = () => (pointerWanted = 0);
  if (fine) {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  resize();

  let destroyed = false;
  let drawn = false;

  return {
    async warm(maxMs = 6000) {
      // Split into short tasks, so the page never stops for long: the forms, then the shaders linking in the
      // background, then each object's first draw (where three reads its shader's uniforms, slow on Direct3D).
      const until = performance.now() + maxMs;
      showPair(0);
      await nextTask();
      if (destroyed) return;
      const pending = gl.compile(scene, camera);
      while (pending.size && performance.now() < until && !destroyed) {
        pending.forEach((m) => {
          const program = (gl.properties.get(m) as { currentProgram?: { isReady(): boolean } }).currentProgram;
          if (program?.isReady() !== false) pending.delete(m);
        });
        if (pending.size) await new Promise((r) => window.setTimeout(r, 16));
      }
      place(0, 0);
      for (const primed of [word, thread, swarm]) {
        if (destroyed) return;
        for (const o of [word, thread, swarm]) o.visible = o === primed;
        gl.render(scene, camera);
        await nextTask();
      }
      swarm.visible = true;
      // the later stops' forms, built one at a time while the page is idle, so no scroll has to wait for one
      let next = 1;
      const prebuild = () => {
        if (destroyed || next >= sequence.length) return;
        formAt(sequence[next], next);
        next++;
        idle(prebuild);
      };
      idle(prebuild);
    },
    frame(now, sIn) {
      const { index, t } = pairAt(sIn, sequence);
      showPair(index);
      const s = index + t;
      time.value = now / 1000;
      place(s, ORBIT * Math.sin(time.value * 0.15));
      parting.uPointer.value.lerp(pointerAt, 0.18);
      parting.uHover.value += (pointerWanted - parting.uHover.value) * 0.08;
      // only while the word is the hero: by the fly-in it is square again, so the camera meets its letter
      const lean = parting.uHover.value * (1 - Math.min(1, s / 0.15));
      word.rotation.set(-parting.uPointer.value.y * 0.07 * lean, parting.uPointer.value.x * 0.12 * lean, 0);
      // the hero's leg (0 → 1): the fly-in
      const leg = Math.min(1, s);

      // the solid word gives way to its points just before the camera reaches it
      const solid = 1 - smooth(0.16, 0.4, leg);
      wordMat.opacity = solid;
      word.visible = solid > 0.001;
      threadMat.uniforms.uAlpha.value = 1 - smooth(0.05, 0.3, leg);
      thread.visible = threadMat.uniforms.uAlpha.value > 0.001;
      const fromWord = sequence[index] === 'word';
      swarmMat.uniforms.uFromAlpha.value = fromWord ? 1 - solid : 1;
      // leaving the word, the points start to unfurl as soon as the solid letters fade, so the sky opens straight away
      const mix = fromWord ? smooth(0.2, 0.9, t) : smooth(0.15, 0.85, t);
      swarmMat.uniforms.uMix.value = mix;
      swarmMat.uniforms.uSwirl.value = 0.6 * Math.sin(Math.PI * mix);
      swarmMat.uniforms.uSpin.value = fromWord ? 1.25 : 0;
      (swarmMat.uniforms.uFocus.value as THREE.Vector3).set(0, 0, -(index + mix) * GAP);
      gl.render(scene, camera);
      drawn = true;
    },
    ready: () => drawn,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      ro.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      disposables.forEach((d) => d.dispose());
      gl.dispose();
      gl.forceContextLoss();
    },
  };
}
