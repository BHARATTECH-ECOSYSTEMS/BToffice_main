/**
 * Points that fill the letters of a heading as the page sets it, for the network globe's dots to settle into.
 * Each `.line > span` of a `Headline` is drawn with its own computed font onto a hidden canvas, which is then
 * sampled on a staggered grid. Positions are CSS px from the centre of `block`, y down; colours are sRGB 0…1.
 */
interface HeadingPoints {
  to: Float32Array;
  color: Float32Array;
  /** px size a dot should be drawn at, so neighbours just touch and the letters read solid */
  size: number;
}

/** Canvas pixels per CSS pixel while sampling: enough to keep thin strokes from being missed. */
const OVERSAMPLE = 2;

const rgb = (css: string): [number, number, number] => {
  const m = css.match(/[\d.]+/g) ?? ['0', '0', '0'];
  return [Number(m[0]) / 255, Number(m[1]) / 255, Number(m[2]) / 255];
};

export function headingPoints(block: HTMLElement, spacing = 2.4): HeadingPoints | null {
  const lines = [...block.querySelectorAll<HTMLElement>('.line')];
  const box = block.getBoundingClientRect();
  if (!lines.length || box.width < 1 || box.height < 1) return null;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(box.width * OVERSAMPLE);
  canvas.height = Math.ceil(box.height * OVERSAMPLE);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const to: number[] = [];
  const color: number[] = [];
  const cx = box.width / 2;
  const cy = box.height / 2;
  lines.forEach((line) => {
    const span = line.firstElementChild as HTMLElement | null;
    const text = span?.textContent ?? '';
    if (!span || !text) return;
    const font = getComputedStyle(span);
    const lineStyle = getComputedStyle(line);
    // the line box, not the span: the span slides in with a transform when the heading is revealed
    const r = line.getBoundingClientRect();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(OVERSAMPLE, 0, 0, OVERSAMPLE, 0, 0);
    ctx.font = `${font.fontStyle} ${font.fontWeight} ${font.fontSize} ${font.fontFamily}`;
    ctx.letterSpacing = font.letterSpacing === 'normal' ? '0px' : font.letterSpacing;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#000';
    // CSS centres the font's ascent + descent in the line's content box; the baseline follows from that
    const m = ctx.measureText(text);
    const padTop = parseFloat(lineStyle.paddingTop) || 0;
    const content = r.height - padTop - (parseFloat(lineStyle.paddingBottom) || 0);
    const ascent = m.fontBoundingBoxAscent;
    const baseline = r.top - box.top + padTop + (content - (ascent + m.fontBoundingBoxDescent)) / 2 + ascent;
    const left = r.left - box.left;
    ctx.fillText(text, left, baseline);

    const top = Math.max(0, r.top - box.top);
    const bottom = Math.min(box.height, r.bottom - box.top);
    const right = Math.min(box.width, left + m.width + 2);
    const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const [cr, cg, cb] = rgb(font.color);
    let row = 0;
    for (let y = top + spacing / 2; y < bottom; y += spacing * 0.866, row++) {
      // alternate rows sit half a step over, so the letters fill as an even weave rather than a grid
      for (let x = left + (row % 2 ? spacing : spacing / 2); x < right; x += spacing) {
        const i = (Math.floor(y * OVERSAMPLE) * canvas.width + Math.floor(x * OVERSAMPLE)) * 4 + 3;
        if (px[i] > 110) {
          to.push(x - cx, y - cy);
          color.push(cr, cg, cb);
        }
      }
    }
  });
  if (!to.length) return null;
  return { to: Float32Array.from(to), color: Float32Array.from(color), size: spacing * 1.3 };
}
