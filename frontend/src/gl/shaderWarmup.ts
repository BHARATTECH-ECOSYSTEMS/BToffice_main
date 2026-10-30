import * as THREE from 'three';

/** The part of a material's WebGL state three keeps in `renderer.properties`, used to watch and prime its program. */
type Linkable = { currentProgram?: { isReady(): boolean; getUniforms(): unknown } };

const nextTask = () => new Promise<void>((resolve) => window.setTimeout(resolve, 0));

/**
 * Resolves once every material in `pending` has a linked program (asked without blocking, through the browser's
 * parallel shader compile), after `maxMs` at most, or as soon as `stop()` says the caller has gone. Some browsers
 * never report a program ready until something draws with it; the cap covers them, and the first draw then links
 * the program as it always did.
 */
export function whenLinked(renderer: THREE.WebGLRenderer, pending: Set<THREE.Material>, maxMs: number, stop: () => boolean = () => false) {
  const until = performance.now() + maxMs;
  return new Promise<void>((resolve) => {
    const check = () => {
      if (stop()) return resolve();
      pending.forEach((m) => {
        const program = (renderer.properties.get(m) as Linkable).currentProgram;
        if (program?.isReady() !== false) pending.delete(m);
      });
      if (pending.size === 0 || performance.now() > until) resolve();
      else window.setTimeout(check, 16);
    };
    // Not asked at once: the GPU process is still taking in the shaders just handed over, and a question asked now
    // waited for all of it (up to 0.7 s on an integrated GPU) with the page frozen.
    window.setTimeout(check, 16);
  });
}

/**
 * Does each linked program's first-use work ahead of its first draw, one program per task. On first use three reads
 * back the program's logs and every uniform and attribute location, synchronous round trips to the GPU that took
 * 0.1–0.25 s per world on Direct3D; done all at once in the first frame, they stalled it.
 */
export async function primePrograms(renderer: THREE.WebGLRenderer, materials: Iterable<THREE.Material>, stop: () => boolean = () => false) {
  for (const m of new Set(materials)) {
    if (stop()) return;
    const program = (renderer.properties.get(m) as Linkable).currentProgram;
    if (!program || !program.isReady()) continue; // still linking: reading it now would wait for the link
    program.getUniforms();
    await nextTask();
  }
}

/** The parts of three's PMREMGenerator (r185) that create its blur programs ahead of `fromScene`. Not public API. */
interface PmremInternals {
  _setSize(cubeSize: number): void;
  _allocateTargets(): THREE.WebGLRenderTarget;
  _blurMaterial: THREE.Material | null;
  _ggxMaterial: THREE.Material | null;
  /** the planes the blur programs draw on; created with the materials */
  _lodMeshes: THREE.Mesh[];
}

/** fromScene's default cube size; the programs are built for one size, so the early ones must match it. */
const CUBE_SIZE = 256;

/**
 * Bakes `scene` into an environment map, as PMREMGenerator.fromScene does, without freezing the page. fromScene
 * creates its blur programs and links them on the spot, and the page waits: 0.5–1.2 s on an integrated GPU under
 * Chrome for Windows, the longest freeze of a first visit to the home page. Here every program the bake uses is
 * linked in the background first, so the bake itself only draws. Resolves to null if `stop()` turns true meanwhile.
 *
 * If a three upgrade renames the generator's internals, the early link is skipped and the bake links as before.
 */
export async function bakeEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene, sigma: number, stop: () => boolean = () => false): Promise<THREE.Texture | null> {
  const pmrem = new THREE.PMREMGenerator(renderer);
  // The solid backdrop fromScene draws behind the scene (its own box is only created on first use). Disposed after
  // the bake: three deletes a program once no material uses it, and the bake would link it again.
  const box = new THREE.BoxGeometry();
  const backdrop = new THREE.MeshBasicMaterial({ side: THREE.BackSide, depthWrite: false, depthTest: false });
  try {
    const inner = pmrem as unknown as Partial<PmremInternals>;
    if (typeof inner._setSize === 'function' && typeof inner._allocateTargets === 'function') {
      inner._setSize(CUBE_SIZE);
      const target = inner._allocateTargets();
      // Each program is compiled on the geometry the bake draws it on: three keys programs by the geometry's
      // attributes too, and a stand-in without a position attribute got a variant the bake never used.
      const plane = inner._lodMeshes?.[0]?.geometry;
      const stand = new THREE.Scene();
      stand.add(new THREE.Mesh(box, backdrop));
      if (plane) for (const m of [inner._blurMaterial, inner._ggxMaterial]) if (m) stand.add(new THREE.Mesh(plane, m));
      const camera = new THREE.PerspectiveCamera();
      // The bake draws into render targets, and three keys programs by tone mapping and colour space, which differ
      // between the screen and a target: compiled for the screen, they would be a variant the bake never uses.
      const previous = renderer.getRenderTarget();
      renderer.setRenderTarget(target);
      const compiled = [...renderer.compile(stand, camera), ...renderer.compile(scene, camera)];
      renderer.setRenderTarget(previous);
      target.dispose();
      await whenLinked(renderer, new Set(compiled), 4000, stop);
      await primePrograms(renderer, compiled, stop);
    }
    if (stop()) return null;
    return pmrem.fromScene(scene, sigma).texture;
  } finally {
    pmrem.dispose();
    box.dispose();
    backdrop.dispose();
  }
}
