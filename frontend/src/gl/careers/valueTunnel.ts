import * as THREE from 'three';
import { HUE } from '../palette';
import { cardWriter, cssStage, DUST_FRAGMENT, glOn, isDarkTheme, onThemeChange, smooth, pointerIn } from './shared';

/** A value panel, in CSS pixels (= world units). */
const VALUE_W = 540;
const VALUE_H = 280;

const TUN_R = 600; // the tunnel's radius
const GAP = 1500; // depth between panels
const READ = 1150; // the camera's distance from a panel while it is read
const FOV = 50;
const CONTENT = 1240; // the site's text column (--content), whose edges the panels line up with
const YAW = 0.2; // and how far it turns toward the axis
const RING_GAP = 300; // depth between the tunnel's rings
const DRIFT = 40; // depth per second the rings and dust keep gliding at rest

export interface ValueTunnel {
  /** Draws the tunnel for `progress` (0…1 through the section). */
  frame: (now: number, progress: number) => void;
  /** The progress at which panel `k` is read, for jumps. */
  stopOf: (k: number) => number;
  destroy: () => void;
}

/**
 * "What we hold to": a round tunnel (after Scrolltide's Image Tunnel) that the page scrolls the camera through. The
 * values hang in it one behind another, alternately left and right of the way through; scrolling carries the camera
 * from one to the next and holds it at each long enough to read, then on past it. The tunnel's rings and a slow drift
 * of dust keep moving at rest.
 */
export function mountValueTunnel({
  stage,
  canvas,
  hosts,
  onCurrent,
}: {
  stage: HTMLElement;
  canvas: HTMLCanvasElement;
  hosts: HTMLElement[];
  /** The panel being read changed. */
  onCurrent: (k: number) => void;
}): ValueTunnel {
  const n = hosts.length;
  const gl = glOn(canvas);
  const glScene = new THREE.Scene();
  const disposables: { dispose: () => void }[] = [];
  const u = { color: { value: new THREE.Color() }, alpha: { value: 0 }, dark: { value: 0 }, pixel: { value: 1 }, drift: { value: 0 } };
  const paint = (dark: boolean) => {
    // ink-violet lines on the light page, lit lavender ones on the dark page
    u.color.value.set(dark ? '#A597FF' : HUE.violet);
    u.alpha.value = dark ? 0.34 : 0.22;
    u.dark.value = dark ? 1 : 0;
  };
  paint(isDarkTheme());
  const offTheme = onThemeChange(paint);

  const camStart = READ; // the first panel sits at z = 0
  const zFar = -(n - 1) * GAP - 2600;
  const zNear = camStart + 1200;
  const tunnel = new THREE.Group();
  if (gl) {
    // rings every RING_GAP and lines running the length of the tunnel, fading into the distance
    const pts: number[] = [];
    const seg = 72;
    for (let z = zNear; z >= zFar; z -= RING_GAP) {
      for (let s = 0; s < seg; s++) {
        const a0 = (s / seg) * Math.PI * 2;
        const a1 = ((s + 1) / seg) * Math.PI * 2;
        pts.push(Math.cos(a0) * TUN_R, Math.sin(a0) * TUN_R, z, Math.cos(a1) * TUN_R, Math.sin(a1) * TUN_R, z);
      }
    }
    for (let s = 0; s < 24; s++) {
      const a = (s / 24) * Math.PI * 2;
      pts.push(Math.cos(a) * TUN_R, Math.sin(a) * TUN_R, zNear, Math.cos(a) * TUN_R, Math.sin(a) * TUN_R, zFar);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: { uColor: u.color, uAlpha: u.alpha },
      vertexShader: `varying float vDepth;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uColor; uniform float uAlpha; varying float vDepth;
        void main(){ gl_FragColor = vec4(uColor, uAlpha * (1.0 - smoothstep(900.0, 5200.0, vDepth)) * smoothstep(0.0, 200.0, vDepth)); }`,
    });
    tunnel.add(new THREE.LineSegments(geo, mat));
    glScene.add(tunnel);
    disposables.push(geo, mat);

    // dust inside the tunnel, in the brand's three colours at full strength
    const count = 900;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const hues = [new THREE.Color(HUE.violet), new THREE.Color(HUE.tangerine), new THREE.Color(HUE.saffron)];
    for (let k = 0; k < count; k++) {
      const a = Math.random() * Math.PI * 2;
      const r = TUN_R * (0.35 + Math.random() * 0.6);
      pos.set([Math.cos(a) * r, Math.sin(a) * r, zFar + Math.random() * (zNear - zFar)], k * 3);
      const c = hues[k % 5 < 3 ? 0 : k % 5 === 3 ? 1 : 2];
      col.set([c.r, c.g, c.b], k * 3);
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    dustGeo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    const dustMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uDrift: u.drift, uPixel: u.pixel, uDark: u.dark, uZFar: { value: zFar }, uRange: { value: zNear - zFar } },
      vertexShader: `uniform float uDrift, uPixel, uZFar, uRange; attribute vec3 aColor; varying vec3 vC; varying float vA;
        void main(){
          vec3 p = position;
          p.z = uZFar + mod(p.z - uZFar + uDrift, uRange);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = 3.0 * uPixel * clamp(900.0 / -mv.z, 0.6, 2.6);
          vA = (1.0 - smoothstep(1200.0, 5000.0, -mv.z)) * smoothstep(60.0, 300.0, -mv.z);
          vC = aColor;
        }`,
      fragmentShader: DUST_FRAGMENT,
    });
    glScene.add(new THREE.Points(dustGeo, dustMat));
    disposables.push(dustGeo, dustMat);
  }

  // How far each panel sits off the axis, alternating left and right so the camera passes beside it. Worked out from
  // the stage so that, while a panel is read, its outer edge lands on the edge of the page's text column, in line
  // with the heading and the index (the panel is turned toward the axis, which brings that edge a little nearer).
  let side = 300;
  const { camera, objects, render, destroy: destroyStage } = cssStage(stage, hosts, VALUE_W, VALUE_H, (w, h) => {
    const gutter = Math.min(40, Math.max(16, w * 0.04));
    const colEdge = Math.max(gutter, (w - CONTENT) / 2);
    const outer = (VALUE_W / 2) * Math.cos(YAW);
    const pxPerUnit = h / 2 / ((READ - (VALUE_W / 2) * Math.sin(YAW)) * Math.tan(((FOV / 2) * Math.PI) / 180));
    side = Math.max(160, (w / 2 - colEdge) / pxPerUnit - outer);
    const ratio = Math.min(1.5, window.devicePixelRatio || 1);
    u.pixel.value = ratio;
    gl?.setPixelRatio(ratio);
    gl?.setSize(w, h, false);
  });
  camera.fov = FOV;
  camera.far = 8000;
  camera.updateProjectionMatrix();
  const write = cardWriter(hosts, objects);


  // Scroll to depth. Each panel owns an equal stretch of the section, and the camera holds at it through the middle
  // of that stretch, travelling to the next across the boundary, so a value never slides by while it is read. On the
  // 0…n scale `x`, panel k is read at x = k; the section opens half a step before the first and ends half a step past
  // the last.
  const HOLD = 0.4;
  const stepAt = (p: number) => {
    const x = Math.min(1, Math.max(0, p)) * n - 0.5;
    const k = Math.floor(x);
    return k + smooth((x - k - HOLD / 2) / (1 - HOLD));
  };

  let drift = 0;
  let shownStep = -1; // the travel the camera shows, gliding after the scroll so holds settle instead of stopping dead
  let current = -1;
  let last = performance.now();
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const frame = (now: number, p: number) => {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    drift += DRIFT * dt;
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3);

    // where along the panels the camera is: 0 at the first, n - 1 at the last
    const want = stepAt(p);
    shownStep = shownStep < -0.9 ? want : shownStep + (want - shownStep) * (1 - Math.exp(-dt * 10));
    const s = shownStep;
    const camZ = camStart - s * GAP;
    camera.position.set(pointer.x * 50, 30 - pointer.y * 30, camZ);
    camera.lookAt(pointer.x * 120, 30 - pointer.y * 60, camZ - 1600);
    camera.updateMatrixWorld();

    for (let k = 0; k < n; k++) {
      const dir = k % 2 === 0 ? -1 : 1;
      objects[k].position.set(dir * side, 15, -k * GAP);
      objects[k].rotation.y = -dir * YAW;
      const depth = camZ - objects[k].position.z;
      // out of the far dark as a faint preview of what comes next, fully there at reading distance, and gone before
      // the camera reaches it
      const alpha = (0.15 + 0.85 * smooth((3000 - depth) / 1300)) * smooth((4400 - depth) / 900) * smooth((depth - 380) / 420);
      write(k, alpha, 1);
    }
    const reading = Math.min(n - 1, Math.max(0, Math.round(s)));
    if (reading !== current) {
      current = reading;
      onCurrent(reading);
    }

    tunnel.rotation.z = drift * 0.0004;
    u.drift.value = drift;
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
  // the stage lies under the copy, so the pointer is read from the whole section's layer
  const layer = stage.parentElement ?? stage;
  layer.addEventListener('pointermove', onMove);
  layer.addEventListener('pointerleave', onLeave);

  return {
    frame,
    stopOf: (k) => (k + 0.5) / n,
    destroy: () => {
      offTheme();
      layer.removeEventListener('pointermove', onMove);
      layer.removeEventListener('pointerleave', onLeave);
      disposables.forEach((d) => d.dispose());
      gl?.dispose();
      destroyStage();
    },
  };
}

