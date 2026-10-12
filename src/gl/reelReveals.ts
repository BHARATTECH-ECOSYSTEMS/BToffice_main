import { type Palette, lerp, span } from './ink';

/**
 * How a domain reel brings a chapter's layer on screen. Every reel shares the same
 * ink drawings; the reveal is what gives each domain its own motion signature.
 */
export type RevealStyle = 'bloom' | 'slot' | 'boot' | 'scan' | 'sweep' | 'resolve';

/** Indexed like DOMAIN_SCENES. Each reveal echoes what that domain does. */
export const DOMAIN_REVEALS: RevealStyle[] = [
  'bloom', // GI Rivinity: knowledge spreads out from the core
  'slot', // Rivinity Core: each layer drops in and plugs into the OS
  'boot', // IoT Intelligence: the scene comes online cell by cell, like devices booting
  'scan', // Geo Intelligence: a satellite pass scans the picture in
  'sweep', // Defense Intelligence: a radar sweep uncovers the scene
  'resolve', // Miniature Intelligence: the picture sharpens through quantisation steps
];

export interface RevealSurface {
  ctx: CanvasRenderingContext2D;
  c: Palette;
  /** Full-size offscreen canvas for styles that need to composite the whole layer at once. */
  buffer: HTMLCanvasElement;
  /** Low-resolution canvas for the 'resolve' pixelation. */
  small: HTMLCanvasElement;
}

/** Paints the content onto whichever context it is handed, in design-space coordinates. */
type Paint = (ctx: CanvasRenderingContext2D) => void;

const TAU = Math.PI * 2;
// Half extents of the 460×390 design space, with margin so masks fully clear the drawing.
const HALF_W = 240;
const HALF_H = 200;
const BOOT_COLS = 10;
const BOOT_ROWS = 9;
/** Pixel block sizes for 'resolve', coarse to sharp — stepped like model quantisation levels. */
const RESOLVE_STEPS = [32, 16, 8, 4, 2];

const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

/** Renders `paint` into the buffer with the main canvas's current design-space transform. */
function paintToBuffer({ ctx, buffer }: RevealSurface, paint: Paint) {
  const bctx = buffer.getContext('2d');
  if (!bctx) return null;
  bctx.setTransform(1, 0, 0, 1, 0, 0);
  bctx.clearRect(0, 0, buffer.width, buffer.height);
  bctx.setTransform(ctx.getTransform());
  bctx.lineCap = 'round';
  bctx.lineJoin = 'round';
  paint(bctx);
  return buffer;
}

/** Draws `paint` partly revealed; `reveal` runs 0 (hidden) → 1 (fully shown) and is already eased. */
export function drawRevealed(style: RevealStyle, surface: RevealSurface, reveal: number, paint: Paint) {
  if (reveal <= 0) return;
  const { ctx, c } = surface;
  ctx.save();

  switch (style) {
    case 'bloom': {
      const r = reveal * 320;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.save();
      ctx.clip();
      paint(ctx);
      ctx.restore();
      ctx.globalAlpha = 0.5 * (1 - reveal);
      ctx.strokeStyle = c.violet;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.stroke();
      break;
    }

    case 'scan': {
      const y = lerp(-HALF_H, HALF_H, reveal);
      ctx.beginPath();
      ctx.rect(-HALF_W, -HALF_H, HALF_W * 2, y + HALF_H);
      ctx.save();
      ctx.clip();
      paint(ctx);
      ctx.restore();
      const fade = 1 - span(reveal, 0.9, 1);
      const band = ctx.createLinearGradient(0, y - 32, 0, y);
      band.addColorStop(0, `rgba(${c.glow}, 0)`);
      band.addColorStop(1, `rgba(${c.glow}, 0.14)`);
      ctx.globalAlpha = fade;
      ctx.fillStyle = band;
      ctx.fillRect(-HALF_W, y - 32, HALF_W * 2, 32);
      ctx.globalAlpha = 0.7 * fade;
      ctx.strokeStyle = c.violet;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(-HALF_W, y);
      ctx.lineTo(HALF_W, y);
      ctx.stroke();
      break;
    }

    case 'sweep': {
      // Centred on the defense shield's core.
      const [cx, cy] = [0, -6];
      const a0 = -Math.PI / 2;
      const a1 = a0 + reveal * TAU;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 340, a0, a1);
      ctx.closePath();
      ctx.save();
      ctx.clip();
      paint(ctx);
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = c.violet;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 340, Math.max(a0, a1 - 0.6), a1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 0.8 * (1 - span(reveal, 0.9, 1));
      ctx.strokeStyle = c.violet;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a1) * 340, cy + Math.sin(a1) * 340);
      ctx.stroke();
      break;
    }

    case 'boot': {
      const cw = (HALF_W * 2) / BOOT_COLS;
      const ch = (HALF_H * 2) / BOOT_ROWS;
      // Thresholds top out at 0.8 so every cell is on, and done flashing, by reveal = 1.
      const cells = Array.from({ length: BOOT_COLS * BOOT_ROWS }, (_, k) => ({
        x: -HALF_W + (k % BOOT_COLS) * cw,
        y: -HALF_H + Math.floor(k / BOOT_COLS) * ch,
        at: rand(k + 1) * 0.8,
      })).filter((cell) => reveal > cell.at);
      ctx.beginPath();
      cells.forEach(({ x, y }) => ctx.rect(x, y, cw, ch));
      ctx.clip();
      paint(ctx);
      ctx.fillStyle = c.saffron;
      ctx.setLineDash([]);
      cells.forEach(({ x, y, at }) => {
        const flash = 1 - span(reveal, at, at + 0.2);
        if (flash <= 0) return;
        ctx.globalAlpha = 0.2 * flash;
        ctx.fillRect(x + 1, y + 1, cw - 2, ch - 2);
      });
      break;
    }

    case 'slot': {
      const buffer = paintToBuffer(surface, paint);
      if (!buffer) break;
      const scale = ctx.getTransform().d;
      ctx.setTransform(1, 0, 0, 1, 0, -(1 - reveal) * 30 * scale);
      ctx.globalAlpha = reveal;
      ctx.drawImage(buffer, 0, 0);
      break;
    }

    case 'resolve': {
      const buffer = paintToBuffer(surface, paint);
      const sctx = surface.small.getContext('2d');
      if (!buffer || !sctx) break;
      const step = Math.floor(reveal * (RESOLVE_STEPS.length + 1));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = span(reveal, 0, 0.3);
      if (step >= RESOLVE_STEPS.length) {
        ctx.drawImage(buffer, 0, 0);
        break;
      }
      const block = RESOLVE_STEPS[step];
      const w = Math.max(1, Math.ceil(buffer.width / block));
      const h = Math.max(1, Math.ceil(buffer.height / block));
      if (surface.small.width < w) surface.small.width = w;
      if (surface.small.height < h) surface.small.height = h;
      sctx.clearRect(0, 0, w, h);
      sctx.imageSmoothingEnabled = true;
      sctx.drawImage(buffer, 0, 0, w, h);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(surface.small, 0, 0, w, h, 0, 0, w * block, h * block);
      break;
    }
  }

  ctx.restore();
}
