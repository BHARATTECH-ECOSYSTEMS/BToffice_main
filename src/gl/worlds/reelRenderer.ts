import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { type DomainWorld, type SafeView, pointScale } from './kit';

/**
 * One WebGL renderer shared by all six domain reels. Each reel keeps a plain 2D canvas;
 * a frame is rendered here and copied across. Six separate WebGL contexts on one page
 * was the GPU bottleneck an earlier 3D reel hit, so this module never creates a second one.
 */

let renderer: THREE.WebGLRenderer | null | undefined;
let environment: THREE.Texture | null = null;
const size = new THREE.Vector2();

/** The shared renderer, or null when WebGL isn't available (the reel then falls back to its 2D drawing). */
export function getReelRenderer(): THREE.WebGLRenderer | null {
  if (renderer !== undefined) return renderer;
  try {
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    // reading back every shader's log makes the page wait on the GPU; development builds still report errors
    r.debug.checkShaderErrors = import.meta.env.DEV;
    // Sizes below are already in device pixels.
    r.setPixelRatio(1);
    r.setClearColor(0x000000, 0);
    r.autoClear = false;
    const pmrem = new THREE.PMREMGenerator(r);
    environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    renderer = r;
  } catch (error) {
    console.warn('Domain reels: WebGL unavailable, using the 2D fallback.', error);
    renderer = null;
  }
  return renderer;
}

/**
 * Compiles every shader `world` will need, without blocking the page: the browser links them in the background
 * (parallel shader compile) and the promise settles when they are ready. Drawing a world for the first time
 * without this compiled them on the spot, which froze the page for 200–400 ms per reel.
 */
export async function compileWorld(world: DomainWorld): Promise<void> {
  const r = getReelRenderer();
  if (!r) return;
  const { scene, camera } = world;
  if (!scene.environment) scene.environment = environment;
  // covers objects a later chapter reveals too: the compile walks hidden objects' materials as well
  await r.compileAsync(scene, camera);
}

/** Insets (device pixels) that the reel's own UI covers, plus breathing room on every side. */
interface ReelInsets {
  top: number;
  bottom: number;
  pad: number;
}

/** The area a world may draw in, as view-axis tangents. */
export function safeView(fov: number, width: number, height: number, { top, bottom, pad }: ReelInsets): SafeView {
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(fov) / 2);
  const halfH = height / 2;
  const halfW = width / 2;
  return {
    tanV: (tanHalf * Math.max(1, (height - top - bottom) / 2 - pad)) / halfH,
    tanH: (tanHalf * (width / height) * Math.max(1, halfW - pad)) / halfW,
  };
}

/** Renders `world` at `width`×`height` device pixels and copies the result onto `target`. */
export function renderWorld(
  world: DomainWorld,
  target: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  const r = getReelRenderer();
  if (!r || width < 1 || height < 1) return;

  // Grow-only, so reels of slightly different sizes don't reallocate the drawing buffer every frame.
  r.getSize(size);
  if (size.x < width || size.y < height) r.setSize(Math.max(size.x, width), Math.max(size.y, height), false);

  const { camera, scene } = world;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  pointScale.value = height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  if (!scene.environment) scene.environment = environment;

  r.setViewport(0, 0, width, height);
  r.setScissor(0, 0, width, height);
  r.setScissorTest(true);
  r.clear();
  r.render(scene, camera);

  // WebGL's origin is bottom-left, so the viewport sits at the bottom of the (possibly taller) buffer.
  const buffer = r.domElement;
  target.setTransform(1, 0, 0, 1, 0, 0);
  target.clearRect(0, 0, width, height);
  target.drawImage(buffer, 0, buffer.height - height, width, height, 0, 0, width, height);
}
