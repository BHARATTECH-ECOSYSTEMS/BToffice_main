import * as THREE from 'three';

export type ThemeName = 'dark' | 'light';

/** Brand palette per theme: violet leads, tango and pitch support. */
export const PALETTE = {
  dark: { bg: '#111117', violet: '#8f78ff', tango: '#ff8643', pitch: '#f59e00', ink: '#f8f7f3', dim: '#5d5a70' },
  light: { bg: '#ffffff', violet: '#5b3df5', tango: '#e8641f', pitch: '#d98a00', ink: '#0c0c10', dim: '#b9b6c9' },
} as const;

export const c3 = (hex: string) => {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b] as const;
};

/** Small seeded RNG so every render draws the same points. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
export const easeIO = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

const vert = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aAlpha;
  uniform float uPx;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPx * 34.0 / -mv.z;
  }
`;
const frag = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float a = clamp(smoothstep(0.75, 0.3, d) + exp(-d * d * 3.0) * 0.5, 0.0, 1.0) * vAlpha;
    gl_FragColor = vec4(vColor, a);
  }
`;

export interface Cloud {
  /** write point i: position, colour, size (px at 1x), alpha */
  set(i: number, x: number, y: number, z: number, col: readonly [number, number, number], size: number, alpha: number): void;
  hide(i: number): void;
  count: number;
  flush(): void;
  points: THREE.Points;
}

/** Design aspect for every scene; hosts are sized to it so world coordinates line up with the page. */
export const ASPECT = 1.6;
export const HALF_H = 14 * Math.tan((35 / 2) * (Math.PI / 180));
export const HALF_W = HALF_H * ASPECT;

export interface Stage {
  resize(width: number, height: number): void;
  destroy(): void;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  render(): void;
  cloud(count: number): Cloud;
  theme: ThemeName;
  palette: (typeof PALETTE)[ThemeName];
}

export function createStage(canvas: HTMLCanvasElement, theme: ThemeName, width: number, height: number): Stage {
  const palette = PALETTE[theme];
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  const px = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(px);
  renderer.setSize(width, height, false);
  renderer.setClearColor(palette.bg, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
  camera.position.set(0, 0, 14);
  const dark = theme === 'dark';

  return {
    scene,
    camera,
    theme,
    palette,
    render: () => renderer.render(scene, camera),
    resize(w, h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    destroy() {
      scene.traverse((o) => {
        const m = o as THREE.Points;
        m.geometry?.dispose();
        (m.material as THREE.Material | undefined)?.dispose();
      });
      renderer.dispose();
    },
    cloud(count) {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      const col = new Float32Array(count * 3);
      const size = new Float32Array(count);
      const alpha = new Float32Array(count);
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
      geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
      geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
      const mat = new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms: { uPx: { value: px } },
        transparent: true,
        depthWrite: false,
        blending: dark ? THREE.AdditiveBlending : THREE.NormalBlending,
      });
      const points = new THREE.Points(geo, mat);
      points.frustumCulled = false;
      scene.add(points);
      return {
        count,
        points,
        set(i, x, y, z, c, s, a) {
          pos[i * 3] = x;
          pos[i * 3 + 1] = y;
          pos[i * 3 + 2] = z;
          col[i * 3] = c[0];
          col[i * 3 + 1] = c[1];
          col[i * 3 + 2] = c[2];
          size[i] = s;
          alpha[i] = a;
        },
        hide(i) {
          alpha[i] = 0;
        },
        flush() {
          (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
          (geo.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
          (geo.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
          (geo.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
        },
      };
    },
  };
}
