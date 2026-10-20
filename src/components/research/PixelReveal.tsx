import { useLayoutEffect, useRef, type ReactNode } from 'react';

const COARSE = 24; // the first frame's block size, in CSS pixels
const DURATION = 600;

/**
 * A headline that resolves from coarse blocks into sharp type as its screen arrives, as the reference's section
 * titles do. The text is drawn onto a small canvas, a block per pixel, and shown scaled up with hard edges; each frame
 * the canvas gains resolution, until the real text takes over again (sharp, selectable).
 *
 * Not an SVG pixelate filter on the text itself: Chrome repaints such a filter on every frame, and on an integrated
 * GPU one frame of a large headline cost 140–200 ms. A small canvas costs well under one.
 */
export function PixelReveal({ active, children }: { active: boolean; children: ReactNode }) {
  const host = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  // before paint, so the first frame the visitor sees is already the coarse blocks, never the sharp text
  useLayoutEffect(() => {
    const el = host.current;
    const words = text.current;
    const cv = canvas.current;
    if (!active || !el || !words || !cv) return;
    const style = getComputedStyle(words);
    const font = `italic 400 ${style.fontSize} ${style.fontFamily}`;
    // the reveal draws in the face the headline is set in; until it has loaded, the text simply appears
    if (!document.fonts.check(font)) return;

    el.dataset.revealing = '';
    const area = cv.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.ceil(area.width * dpr);
    cv.height = Math.ceil(area.height * dpr);
    const view = cv.getContext('2d');
    const small = document.createElement('canvas').getContext('2d');
    if (!view || !small) return void delete el.dataset.revealing;

    // each line where the browser set it: its text, its left edge and its baseline (half the leading above the face)
    small.font = font;
    const metrics = small.measureText('Hg');
    const lines = Array.from(words.querySelectorAll<HTMLElement>('.ra-line > span'), (line) => {
      const r = line.getBoundingClientRect();
      const lead = (r.height - metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) / 2;
      return { text: line.textContent ?? '', x: r.left - area.left, y: r.top - area.top + lead + metrics.fontBoundingBoxAscent };
    });
    const spacing = style.letterSpacing;

    const draw = (block: number) => {
      // the headline at one sample per block, then blown up with smoothing off: hard-edged blocks
      const w = Math.max(1, Math.ceil(area.width / block));
      const h = Math.max(1, Math.ceil(area.height / block));
      small.canvas.width = w;
      small.canvas.height = h;
      small.font = font;
      small.letterSpacing = spacing === 'normal' ? '0px' : spacing;
      small.fillStyle = style.color;
      small.textBaseline = 'alphabetic';
      small.setTransform(1 / block, 0, 0, 1 / block, 0, 0);
      for (const l of lines) small.fillText(l.text, l.x, l.y);
      view.clearRect(0, 0, cv.width, cv.height);
      view.imageSmoothingEnabled = false;
      view.drawImage(small.canvas, 0, 0, w * block * dpr, h * block * dpr);
    };

    const start = performance.now();
    let raf = 0;
    let shown = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      // coarse blocks fall away quickly, then the last few sizes settle over the rest of the time
      const block = Math.round(1 + (COARSE - 1) * (1 - t) ** 2);
      if (block <= 1) return void delete el.dataset.revealing;
      if (block !== shown) draw((shown = block));
      raf = requestAnimationFrame(step);
    };
    draw((shown = COARSE));
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      delete el.dataset.revealing;
    };
  }, [active]);

  return (
    <span ref={host} className="ra-px" data-on={active || undefined}>
      <span ref={text} className="ra-px__text">
        {children}
      </span>
      <canvas ref={canvas} className="ra-px__canvas" aria-hidden="true" />
    </span>
  );
}
