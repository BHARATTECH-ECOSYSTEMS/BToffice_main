import * as THREE from 'three';
import gsap from 'gsap';
import { HUE } from '../palette';
import { cardWriter, cssStage, DUST_FRAGMENT, facingOf, glOn, isDarkTheme, onThemeChange, smooth, pointerIn } from './shared';

/** A role card, in CSS pixels (= world units). */
const ROLE_W = 380;
const ROLE_H = 236;

const R = 520; // the helix's radius, round the horizontal axis
const STEP = 0.42; // radians the helix turns from one card to the next
const PITCH = 470; // and how far it moves along: more than a card's width, so neighbours never cover each other
const RAIL = ROLE_H / 2 + 16; // the thread runs this far under each card's centre, along its bottom edge
const SHOWN = 2.7; // cards further than this many places from the front fade out
const HOLD = 0.35; // share of each card's stretch of scroll the spiral holds still for, so the front card can be read
const FOV = 34;
const CAM_BACK = 1250; // camera distance in front of the front card

export interface RoleSpiral {
  /** Draws the spiral for `progress` (0…1 through the section). */
  frame: (now: number, progress: number) => void;
  /** Which cards stay on the spiral (a filter); the rest drop out and the spiral closes up over the gaps. */
  setKeep: (keep: boolean[]) => void;
  /** The progress at which the `slot`-th kept card is at the front, for jumps. */
  progressOf: (slot: number) => number;
  /** The slot a card holds among the kept cards, or -1. */
  slotOf: (i: number) => number;
  destroy: () => void;
}

/**
 * Open roles on a helix wound round a horizontal axis (after Scrolltide's Spiral Slider). Scrolling screws the helix
 * sideways, so the roles arrive at the front one after another, each held there for a moment to be read; the ones
 * either side wind away round the back. A filter drops cards out (they sink and fade) and the rest close up along
 * the thread, with GSAP easing every card to its new place in turn. A thread in the brand's three colours runs along
 * the cards' bottom edges, so the spiral reads as one piece.
 */
export function mountRoleSpiral({
  stage,
  canvas,
  hosts,
  onFront,
}: {
  stage: HTMLElement;
  canvas: HTMLCanvasElement;
  hosts: HTMLElement[];
  /** The card at the front changed (-1 when no card is kept). */
  onFront: (i: number) => void;
}): RoleSpiral {
  const n = hosts.length;
  // each card's place on the thread and whether it is kept, both eased by GSAP when the filter changes
  const state = hosts.map((_, i) => ({ slot: i, keep: 1 }));
  let kept = n;
  const slots = hosts.map((_, i) => i);
  const end = { v: n - 1 }; // the thread's last place, eased with the cards

  const gl = glOn(canvas);
  const glScene = new THREE.Scene();
  const disposables: { dispose: () => void }[] = [];
  const u = { end: { value: n - 1 }, dark: { value: 0 }, pixel: { value: 1 }, focus: { value: 0 }, time: { value: 0 } };
  const thread = new THREE.Group();
  const paint = (dark: boolean) => (u.dark.value = dark ? 1 : 0);
  paint(isDarkTheme());
  const offTheme = onThemeChange(paint);

  if (gl) {
    // the thread along the cards' bottom edges, a little past both ends: built for places -3 … n + 2 round its own
    // axis, then screwed and slid as a whole each frame
    const pts: THREE.Vector3[] = [];
    const from = -3;
    const to = n + 2;
    const steps = (to - from) * 24;
    for (let s = 0; s <= steps; s++) {
      const t = from + (s / steps) * (to - from);
      const a = t * STEP;
      // the card's centre, minus RAIL along the card's own up direction (0, cos a, -sin a)
      pts.push(new THREE.Vector3(t * PITCH, R * Math.sin(a) - RAIL * Math.cos(a), R * Math.cos(a) + RAIL * Math.sin(a)));
    }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), steps, 2.2, 6, false);
    const uv = geo.getAttribute('uv');
    const along: number[] = [];
    for (let k = 0; k < uv.count; k++) along.push(from + uv.getX(k) * (to - from));
    geo.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uEnd: u.end, uDark: u.dark, uFocus: u.focus },
      vertexShader: `attribute float aAlong; varying float vAlong; varying float vDepth;
        void main(){ vAlong = aAlong; vec4 mv = modelViewMatrix * vec4(position, 1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uEnd, uDark, uFocus; varying float vAlong; varying float vDepth;
        void main(){
          // Violet, Tango Orange, Pitch Yellow along the kept cards, always near full strength: faint orange and
          // yellow read as brown on the dark page and as dirt on the light one
          vec3 violet = vec3(0.431, 0.345, 0.961), tangerine = vec3(1.0, 0.525, 0.263), saffron = vec3(0.961, 0.62, 0.0);
          float t = clamp(vAlong / max(1.0, uEnd), 0.0, 1.0);
          vec3 c = t < 0.5 ? mix(violet, tangerine, t * 2.0) : mix(tangerine, saffron, t * 2.0 - 1.0);
          float ends = smoothstep(-1.2, -0.2, vAlong) * (1.0 - smoothstep(uEnd + 0.2, uEnd + 1.2, vAlong));
          float near = 1.0 - smoothstep(2.0, 3.2, abs(vAlong - uFocus));
          gl_FragColor = vec4(c, ends * near * mix(0.85, 0.95, uDark) * smoothstep(300.0, 700.0, vDepth));
        }`,
    });
    thread.add(new THREE.Mesh(geo, mat));
    glScene.add(thread);
    disposables.push(geo, mat);

    // a few specks drifting round the spiral, in the three colours
    const count = 260;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const hues = [new THREE.Color(HUE.violet), new THREE.Color(HUE.tangerine), new THREE.Color(HUE.saffron)];
    for (let k = 0; k < count; k++) {
      const a = Math.random() * Math.PI * 2;
      const r = R * (0.6 + Math.random() * 0.9);
      pos.set([(Math.random() - 0.5) * 3600, Math.sin(a) * r, Math.cos(a) * r - 200], k * 3);
      const c = hues[k % 3];
      col.set([c.r, c.g, c.b], k * 3);
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    dustGeo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    const dustMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uPixel: u.pixel, uDark: u.dark, uTime: u.time },
      vertexShader: `uniform float uPixel, uTime; attribute vec3 aColor; varying vec3 vC; varying float vA;
        void main(){
          vec3 p = position;
          p.x = mod(p.x + uTime * 16.0 + 1800.0, 3600.0) - 1800.0;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = 3.0 * uPixel * clamp(1000.0 / -mv.z, 0.6, 2.4);
          vA = (1.0 - smoothstep(1500.0, 4200.0, -mv.z)) * (1.0 - smoothstep(900.0, 1800.0, abs(p.x)));
          vC = aColor;
        }`,
      fragmentShader: DUST_FRAGMENT,
    });
    glScene.add(new THREE.Points(dustGeo, dustMat));
    disposables.push(dustGeo, dustMat);
  }

  const { camera, objects, render, destroy: destroyStage } = cssStage(stage, hosts, ROLE_W, ROLE_H, (w, h) => {
    const ratio = Math.min(1.5, window.devicePixelRatio || 1);
    u.pixel.value = ratio;
    gl?.setPixelRatio(ratio);
    gl?.setSize(w, h, false);
  });
  camera.fov = FOV;
  camera.updateProjectionMatrix();
  const write = cardWriter(hosts, objects);

  /** The front place for a progress: holds at each card through the middle of its stretch, eases to the next between. */
  const focusAt = (p: number) => {
    if (kept <= 1) return 0;
    const x = Math.min(1, Math.max(0, p)) * (kept - 1);
    const k = Math.min(kept - 2, Math.floor(x));
    return k + smooth((x - k - HOLD / 2) / (1 - HOLD));
  };

  let shownFocus = 0;
  let front = -2;
  let time = 0;
  let last = performance.now();
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const frame = (now: number, p: number) => {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    time += dt;
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3);
    // the scroll sets the front place; the spiral follows it closely, and glides when a filter changes the count
    const want = focusAt(p);
    shownFocus += (want - shownFocus) * Math.min(1, dt * 9);
    // a slow breath at rest, so the spiral is never quite still
    const f = shownFocus + Math.sin(time * 0.6) * 0.03;

    camera.position.set(pointer.x * 80, 110 - pointer.y * 50, R + CAM_BACK);
    camera.lookAt(pointer.x * 30, 10, R * 0.25);
    camera.updateMatrixWorld();

    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < n; i++) {
      const st = state[i];
      const d = st.slot - f;
      const a = d * STEP;
      const obj = objects[i];
      const out = 1 - st.keep;
      obj.position.set(d * PITCH, R * Math.sin(a) - out * 320, R * Math.cos(a) - out * 200);
      obj.rotation.set(-a - out * 0.35, 0, 0);
      obj.scale.setScalar((1 - 0.08 * Math.min(1, Math.abs(d))) * (1 - out * 0.3));
      const facing = facingOf(obj, camera);
      // the front card is the one to read; its neighbours step back
      const near = 1 - 0.38 * smooth(Math.abs(d));
      const alpha = st.keep * near * (1 - smooth(Math.abs(d) - SHOWN + 1)) * (0.35 + 0.65 * smooth((facing + 0.1) / 0.6));
      write(i, alpha, facing);
      if (st.keep > 0.5 && Math.abs(d) < bestD) {
        bestD = Math.abs(d);
        best = i;
      }
    }
    if (best !== front) {
      if (front >= 0) hosts[front].removeAttribute('data-front');
      if (best >= 0) hosts[best].setAttribute('data-front', '');
      front = best;
      onFront(best);
    }

    // with every card filtered out there is nothing for the thread to join
    thread.visible = kept > 0;
    thread.position.x = -f * PITCH;
    thread.rotation.x = f * STEP;
    u.end.value = end.v;
    u.focus.value = f;
    u.time.value = time;
    render();
    gl?.render(glScene, camera);
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    [pointer.tx, pointer.ty] = pointerIn(e);
  };
  const onLeave = () => {
    pointer.tx = 0;
    pointer.ty = 0;
  };
  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('pointerleave', onLeave);

  return {
    frame,
    setKeep: (keep) => {
      let s = 0;
      keep.forEach((k, i) => (slots[i] = k ? s++ : -1));
      kept = s;
      // cards close up along the thread in turn; dropped cards keep their place and sink out of it
      state.forEach((st, i) => {
        gsap.killTweensOf(st);
        gsap.to(st, { keep: keep[i] ? 1 : 0, ...(keep[i] ? { slot: slots[i] } : {}), duration: 0.9, ease: 'power3.inOut', delay: i * 0.035 });
      });
      gsap.killTweensOf(end);
      gsap.to(end, { v: Math.max(0, kept - 1), duration: 0.9, ease: 'power3.inOut' });
    },
    progressOf: (slot) => (kept <= 1 ? 0 : slot / (kept - 1)),
    slotOf: (i) => slots[i],
    destroy: () => {
      offTheme();
      state.forEach((st) => gsap.killTweensOf(st));
      gsap.killTweensOf(end);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerleave', onLeave);
      disposables.forEach((d) => d.dispose());
      gl?.dispose();
      destroyStage();
    },
  };
}
