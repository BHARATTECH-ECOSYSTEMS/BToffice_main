import * as THREE from 'three';
import { threadPaths } from './threads';

/**
 * The sign-in burst: the logo on the sign-in button breaks into dots that fly apart in 3D and fade.
 * The dots are sampled from the logo itself (violet disc, white threads), so at the first frame they look like the
 * logo they replace. The whole flight runs in the vertex shader from one time uniform: a frame costs one uniform
 * write and one draw call. Returns a stop function that frees the WebGL context (also called when the flight ends).
 */

// sampling grid for the logo: SAMPLE px square, one dot every STEP px (about 450 dots inside the disc)
const SAMPLE = 96;
const STEP = 4;
// how far the "camera" sits, in px: dots flying towards it grow, dots flying away shrink
const FOCAL = 420;

const VERTEX = /* glsl */ `
  const float FOCAL = ${FOCAL.toFixed(1)};
  attribute vec3 aVel;
  attribute vec3 aColor;
  attribute float aSeed;
  uniform float uTime;
  uniform float uSize;
  uniform float uDpr;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float t = uTime;
    // fast break-up that settles: ease-out cubic
    float e = 1.0 - pow(1.0 - t, 3.0);
    vec3 p = position + aVel * e;
    // a little weight, so the cloud drifts down as it fades
    p.y -= 26.0 * t * t;
    float depth = FOCAL / (FOCAL - p.z);
    gl_Position = projectionMatrix * vec4(p.xy * depth, 0.0, 1.0);
    gl_PointSize = uSize * (1.0 + 0.9 * e) * depth * uDpr;
    vColor = aColor;
    // each dot fades on its own schedule, so the cloud thins out instead of vanishing at once
    vAlpha = 1.0 - smoothstep(0.3 + aSeed * 0.35, 1.0, t);
  }
`;

const FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.32, d) * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

/** Draws the logo (as LogoMark in ui.tsx does) and returns one dot per filled grid cell, in unit-disc space. */
function sampleLogo() {
  const c = document.createElement('canvas');
  c.width = c.height = SAMPLE;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const half = SAMPLE / 2;
  ctx.translate(half, half);
  ctx.scale(half, half);
  const g = ctx.createRadialGradient(0.24, -0.4, 0, 0.24, -0.4, 1.6);
  g.addColorStop(0, '#6E58F5');
  g.addColorStop(0.55, '#4B2DC0');
  g.addColorStop(1, '#35189A');
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 0.17;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const d of threadPaths()) ctx.stroke(new Path2D(d));

  const px = ctx.getImageData(0, 0, SAMPLE, SAMPLE).data;
  const dots: { x: number; y: number; r: number; g: number; b: number }[] = [];
  for (let y = STEP / 2; y < SAMPLE; y += STEP) {
    for (let x = STEP / 2; x < SAMPLE; x += STEP) {
      const i = (Math.floor(y) * SAMPLE + Math.floor(x)) * 4;
      if (px[i + 3] < 128) continue;
      // canvas y runs down, the scene's y runs up
      dots.push({ x: x / half - 1, y: 1 - y / half, r: px[i] / 255, g: px[i + 1] / 255, b: px[i + 2] / 255 });
    }
  }
  return dots;
}

export function playLogoBurst(canvas: HTMLCanvasElement, { radius, duration }: { radius: number; duration: number }): () => void {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  } catch {
    // no WebGL: the orb's own fade-out (login.css) still ends the moment cleanly
    return () => {};
  }
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  const camera = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, -1, 1);
  const scene = new THREE.Scene();

  const dots = sampleLogo();
  const start = new Float32Array(dots.length * 3);
  const vel = new Float32Array(dots.length * 3);
  const color = new Float32Array(dots.length * 3);
  const seed = new Float32Array(dots.length);
  dots.forEach((d, i) => {
    const x = d.x * radius;
    const y = d.y * radius;
    const len = Math.hypot(d.x, d.y) || 1;
    // outwards from the centre, plus a clockwise swirl that carries on the roll the orb just made
    const out = 45 + Math.random() * 85;
    const swirl = out * 0.55;
    const nx = d.x / len;
    const ny = d.y / len;
    start.set([x, y, 0], i * 3);
    vel.set([nx * out + ny * swirl, ny * out - nx * swirl + 18, (Math.random() - 0.5) * 260], i * 3);
    color.set([d.r, d.g, d.b], i * 3);
    seed[i] = Math.random();
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(start, 3));
  geometry.setAttribute('aVel', new THREE.BufferAttribute(vel, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    // dot size ~1.7x the grid spacing, so at the first frame the dots overlap into the solid logo
    uniforms: { uTime: { value: 0 }, uSize: { value: ((STEP * 2) / SAMPLE) * radius * 1.7 }, uDpr: { value: dpr } },
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  scene.add(new THREE.Points(geometry, material));

  let frame = 0;
  let stopped = false;
  const begin = performance.now();
  const stop = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  };
  const tick = (now: number) => {
    const t = Math.min((now - begin) / duration, 1);
    material.uniforms.uTime.value = t;
    renderer.render(scene, camera);
    if (t < 1) frame = requestAnimationFrame(tick);
    else stop();
  };
  frame = requestAnimationFrame(tick);
  return stop;
}
