import * as THREE from 'three';
import { CSS3DObject, CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

/** Helpers shared by the three Careers scenes (team ring, values tunnel, roles spiral). */

export const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
export const mod = (a: number, n: number) => ((a % n) + n) % n;

/** The pointer as -1…1 across the viewport. Read from the event alone: a layout read per move forced a reflow. */
export const pointerIn = (e: PointerEvent) => [(e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1];

export const isDarkTheme = () => document.documentElement.getAttribute('data-theme') === 'dark';

/**
 * Calls `cb` whenever the site theme flips. The page's theme is set by App after its children have mounted, so a
 * scene that only read the theme once at mount could start in the wrong one.
 */
export function onThemeChange(cb: (dark: boolean) => void) {
  const mo = new MutationObserver(() => cb(isDarkTheme()));
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => mo.disconnect();
}

/**
 * A layer of real HTML cards placed in 3D by CSS3DRenderer, filling `stage`, plus the camera that views them. Each
 * host element is sized to `w` x `h` CSS pixels, which are also the scene's world units.
 */
export function cssStage(stage: HTMLElement, hosts: HTMLElement[], w: number, h: number, onResize: (width: number, height: number) => void) {
  const camera = new THREE.PerspectiveCamera(40, 1, 10, 20000);
  const scene = new THREE.Scene();
  const css = new CSS3DRenderer();
  css.domElement.className = 'cr-css';
  stage.appendChild(css.domElement);
  const objects = hosts.map((el) => {
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    const obj = new CSS3DObject(el);
    scene.add(obj);
    return obj;
  });
  const size = { width: 1, height: 1 };
  const resize = () => {
    size.width = stage.clientWidth || 1;
    size.height = stage.clientHeight || 1;
    camera.aspect = size.width / size.height;
    camera.updateProjectionMatrix();
    css.setSize(size.width, size.height);
    onResize(size.width, size.height);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  resize();
  return {
    camera,
    scene,
    objects,
    size,
    render: () => css.render(scene, camera),
    destroy: () => {
      ro.disconnect();
      css.domElement.remove();
    },
  };
}

const normal = new THREE.Vector3();
const toCam = new THREE.Vector3();
/** How squarely a card faces the camera: 1 head on, 0 edge on, below 0 turned away. */
export function facingOf(obj: THREE.Object3D, camera: THREE.Camera) {
  normal.set(0, 0, 1).applyQuaternion(obj.quaternion);
  toCam.subVectors(camera.position, obj.position).normalize();
  return normal.dot(toCam);
}

/**
 * Writes each card's fade and facing, only when they change. The fade is the opacity of the card itself, the host's
 * one child: opacity on the host would flatten its 3D, and a CSS variable on the host would make every element
 * inside the card recalculate its style on each fade step. A card seen from behind gets [data-away] on its host,
 * and CSS shows a plain back instead of its text in mirror writing. Fades are rounded to 1/32, too fine to see but
 * far fewer style writes than every frame's exact value. Returns whether the card is visible at all; an invisible
 * card is switched off so CSS3DRenderer stops placing it.
 */
export function cardWriter(hosts: HTMLElement[], objects: THREE.Object3D[]) {
  const shown = hosts.map(() => -1);
  const away = hosts.map(() => false);
  return (i: number, alpha: number, facing: number) => {
    const isAway = facing < 0;
    if (isAway !== away[i]) {
      away[i] = isAway;
      hosts[i].toggleAttribute('data-away', isAway);
    }
    const rounded = Math.round(clamp01(alpha) * 32) / 32;
    if (rounded !== shown[i]) {
      shown[i] = rounded;
      const card = hosts[i].firstElementChild as HTMLElement | null;
      if (card) card.style.opacity = String(rounded);
    }
    objects[i].visible = rounded >= 0.02;
    return objects[i].visible;
  };
}

/** A WebGL renderer on `canvas`, transparent, or null when WebGL isn't available (the cards still work). */
export function glOn(canvas: HTMLCanvasElement) {
  try {
    const gl = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    gl.setClearColor(0x000000, 0);
    return gl;
  } catch {
    return null;
  }
}

/** Soft round dots for dust; `uDark` switches between ink specks on the light page and lit specks on the dark one. */
export const DUST_FRAGMENT = `uniform float uDark; varying vec3 vC; varying float vA;
  void main(){
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    gl_FragColor = vec4(vC, (1.0 - d * 2.0) * vA * mix(0.5, 0.75, uDark));
  }`;
