import { DOMAIN_SCENES, layerBuild } from './domainInkScenes';
import { getPalette, span } from './ink';
import { DOMAIN_REVEALS, drawRevealed } from './reelReveals';
import type { DomainWorld } from './worlds/kit';
import { compileWorld, getReelRenderer, renderWorld, safeView } from './worlds/reelRenderer';
import { WORLD_BUILDERS } from './worlds';

/**
 * What a domain reel draws on each frame. The reel owns timing, chapters and controls;
 * a painter only turns a moment of that timeline into pixels on the reel's canvas.
 */
export interface ReelFrame {
  act: number;
  progress: number;
  /** Seconds, for ambient motion. */
  t: number;
  /** 0 normally; runs 0→1 over the end of the loop so the restart isn't a hard cut. */
  exit: number;
  pointer: { x: number; y: number };
}

export interface ReelPainter {
  resize(width: number, height: number, dpr: number): void;
  /** Gets everything ready for the first paint without blocking the page (shader compile). */
  prepare(): Promise<void>;
  paint(frame: ReelFrame): void;
  dispose(): void;
}

/** Space the chapter caption (top) and the progress bar (bottom) take from the stage, in CSS pixels. */
const CAPTION_SPACE = 58;
const PROGRESS_SPACE = 24;
/** Clear space kept between a 3D world and every edge of the box. */
const STAGE_PAD = 18;

/** The 3D world for this domain, or null when WebGL is unavailable or the domain has no world. */
export function createWorldPainter(index: number, canvas: HTMLCanvasElement): ReelPainter | null {
  const build = WORLD_BUILDERS[index];
  const ctx = canvas.getContext('2d');
  if (!build || !ctx || !getReelRenderer()) return null;

  const world: DomainWorld = build();
  let dpr = 1;
  return {
    resize(width, height, ratio) {
      dpr = ratio;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    },
    prepare: () => compileWorld(world),
    paint({ act, progress, t, exit, pointer }) {
      const insets = { top: CAPTION_SPACE * dpr, bottom: PROGRESS_SPACE * dpr, pad: STAGE_PAD * dpr };
      world.frame(safeView(world.camera.fov, canvas.width, canvas.height, insets));
      world.update({ act, progress, t, pointer });
      // Fade at the loop's seam; the world itself resets underneath.
      canvas.style.opacity = String(act === 0 ? span(progress, 0, 0.06) : 1 - exit);
      renderWorld(world, ctx, canvas.width, canvas.height, ((CAPTION_SPACE - PROGRESS_SPACE) / 2) * dpr);
    },
    dispose() {
      world.dispose();
      canvas.style.opacity = '';
    },
  };
}

/** The 2D ink drawing: each chapter's layer is revealed in the domain's own style (see reelReveals.ts). */
export function createInkPainter(index: number, canvas: HTMLCanvasElement): ReelPainter | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const layers = DOMAIN_SCENES[index] ?? DOMAIN_SCENES[0];
  const revealStyle = DOMAIN_REVEALS[index] ?? DOMAIN_REVEALS[0];
  // The reel stage stays light in both site themes, so it always uses the light ink palette.
  const c = getPalette(false);
  const surface = { ctx, c, buffer: document.createElement('canvas'), small: document.createElement('canvas') };
  let W = 0;
  let H = 0;
  let dpr = 1;

  return {
    resize(width, height, ratio) {
      W = width;
      H = height;
      dpr = ratio;
      canvas.width = surface.buffer.width = Math.round(W * dpr);
      canvas.height = surface.buffer.height = Math.round(H * dpr);
    },
    prepare: () => Promise.resolve(),
    paint({ act, progress, t, exit }) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const u = Math.min(W / 460, (H - CAPTION_SPACE - PROGRESS_SPACE) / 390);
      ctx.translate(W / 2, CAPTION_SPACE + (H - CAPTION_SPACE - PROGRESS_SPACE) / 2);
      ctx.scale(u, u);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const world = { ctx, c, t };
      // The reveal style does the "drawing in", so layers are always painted complete.
      const paintLayers = (from: number, to: number) => (target: CanvasRenderingContext2D) =>
        layers.slice(from, to).forEach((draw) => draw({ ...world, ctx: target }, 1));

      // The loop leaves the way it came in, reversed.
      if (exit > 0) {
        drawRevealed(revealStyle, surface, 1 - exit, paintLayers(0, layers.length));
      } else {
        layers.forEach((_, i) => {
          const build = layerBuild(i, act, progress);
          if (build >= 1) paintLayers(i, i + 1)(ctx);
          else drawRevealed(revealStyle, surface, build, paintLayers(i, i + 1));
        });
      }
      ctx.globalAlpha = 1;
    },
    dispose() {},
  };
}
