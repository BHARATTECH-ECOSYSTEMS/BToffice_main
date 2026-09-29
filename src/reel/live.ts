import './reel.css';
import { ASPECT, createStage, HALF_H, HALF_W, type ThemeName } from './stage';
import { DURATION, SCENES, type Overlay, type Pointer, type SceneName } from './scenes';

export interface Mounted {
  /** paint the scene at time t with no cursor (used by the video renderer) */
  seek(t: number): void;
  destroy(): void;
}

interface Options {
  /** false for the video renderer: no rAF loop, no pointer, driven by seek() */
  live?: boolean;
  /** reduced motion: one still frame, still responds to the cursor */
  still?: boolean;
  hint?: string;
}

const hexA = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};

/** Mounts a scene into `host`: a three.js canvas plus DOM annotations, both driven by one clock and one cursor. */
export function mountScene(host: HTMLElement, name: SceneName, theme: ThemeName, opts: Options = {}): Mounted {
  const live = opts.live ?? true;
  host.classList.add('rs');
  const canvas = document.createElement('canvas');
  const layer = document.createElement('div');
  layer.style.cssText = 'position:absolute;inset:0;pointer-events:none';
  host.append(canvas, layer);

  const w0 = host.clientWidth || 640;
  const h0 = host.clientHeight || w0 / ASPECT;
  const stage = createStage(canvas, theme, w0, h0);
  const scene = SCENES[name](stage);
  const pal = stage.palette;
  const tones = { violet: pal.violet, tango: pal.tango, pitch: pal.pitch };
  const st = host.style;
  st.setProperty('--rs-bg', pal.bg);
  st.setProperty('--rs-ink', pal.ink);
  st.setProperty('--rs-ink2', hexA(pal.ink, 0.66));
  st.setProperty('--rs-line', hexA(pal.ink, 0.16));
  st.setProperty('--rs-chip', hexA(pal.bg, 0.78));
  st.setProperty('--rs-chip-solid', pal.bg);

  const els = new Map<string, HTMLElement>();
  const tip = document.createElement('div');
  tip.className = 'rs-tip';
  const cap = document.createElement('div');
  cap.className = 'rs-cap';
  const capChip = document.createElement('b');
  const capText = document.createElement('span');
  cap.append(capChip, capText);
  const hint = document.createElement('div');
  hint.className = 'rs-hint';
  hint.textContent = live ? opts.hint ?? 'Hover to explore' : '';
  const cur = document.createElement('div');
  cur.className = 'rs-cur';
  layer.append(tip, cap, hint, cur);

  const pct = (x: number, y: number) => [`${(x / HALF_W / 2 + 0.5) * 100}%`, `${(0.5 - y / HALF_H / 2) * 100}%`] as const;
  let lastCap = '';

  const paint = (o: Overlay) => {
    for (const l of o.labels) {
      let el = els.get(l.id);
      if (!el) {
        el = document.createElement('div');
        el.className = 'rs-l';
        el.textContent = l.text;
        layer.append(el);
        els.set(l.id, el);
      }
      const [x, y] = pct(l.x, l.y);
      el.style.left = x;
      el.style.top = y;
      el.style.opacity = String(l.a);
      el.style.setProperty('--tone', tones[l.tone ?? 'violet']);
      el.classList.toggle('is-hot', !!l.hot);
    }
    const c = `${o.step + 1}/${o.steps}\u0000${o.caption}`;
    if (c !== lastCap) {
      lastCap = c;
      capChip.textContent = `${o.step + 1}/${o.steps}`;
      capText.textContent = o.caption;
      cap.style.display = o.caption ? '' : 'none';
    }
    if (o.tip) {
      const [x, y] = pct(o.tip.x, o.tip.y);
      tip.textContent = o.tip.text;
      tip.style.left = x;
      tip.style.top = y;
      tip.style.setProperty('--tone', tones[o.tip.tone]);
    }
    tip.classList.toggle('is-on', !!o.tip);
  };

  const ptr: Pointer = { x: 0, y: 0, on: 0 };
  let target = { x: 0, y: 0, on: 0 };
  let touched = false;
  const toWorld = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width, ny = (e.clientY - r.top) / r.height;
    target = { x: (nx - 0.5) * 2 * HALF_W, y: (0.5 - ny) * 2 * HALF_H, on: 1 };
    cur.style.left = `${nx * 100}%`;
    cur.style.top = `${ny * 100}%`;
    if (!touched) {
      touched = true;
      hint.style.opacity = '0';
    }
  };
  const leave = () => {
    target.on = 0;
  };
  let raf = 0, visible = true, clock = 0, last = 0;
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const phase = clock % DURATION;
    const held = scene.hold !== undefined && target.on > 0.5 && phase >= scene.hold && phase < scene.hold + 0.6;
    if (!held) clock += dt;
    const k = 1 - Math.exp(-dt * 9);
    if (ptr.on < 0.02) { ptr.x = target.x; ptr.y = target.y; } else { ptr.x += (target.x - ptr.x) * (1 - Math.exp(-dt * 22)); ptr.y += (target.y - ptr.y) * (1 - Math.exp(-dt * 22)); }
    ptr.on += (target.on - ptr.on) * k;
    cur.style.opacity = String(ptr.on * 0.8);
    paint(scene.update(opts.still ? 4.5 : clock % DURATION, ptr));
    stage.render();
    raf = visible && !opts.still ? requestAnimationFrame(frame) : 0;
  };
  const kick = () => {
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };

  const ro = new ResizeObserver(() => {
    const w = host.clientWidth, h = host.clientHeight;
    if (w && h) {
      stage.resize(w, h);
      if (!live) return;
      kick();
    }
  });
  let io: IntersectionObserver | undefined;

  if (live) {
    ro.observe(host);
    host.addEventListener('pointermove', toWorld);
    host.addEventListener('pointerdown', toWorld);
    host.addEventListener('pointerleave', leave);
    host.addEventListener('pointercancel', leave);
    io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) kick();
    });
    io.observe(host);
    kick();
  }
  const seek = (t: number) => {
    const T = ((t % DURATION) + DURATION) % DURATION;
    paint(scene.update(T, { x: 0, y: 0, on: 0 }));
    stage.render();
  };
  if (!live) seek(0);

  return {
    seek,
    destroy() {
      cancelAnimationFrame(raf);
      raf = 0;
      visible = false;
      ro.disconnect();
      io?.disconnect();
      host.removeEventListener('pointermove', toWorld);
      host.removeEventListener('pointerdown', toWorld);
      host.removeEventListener('pointerleave', leave);
      host.removeEventListener('pointercancel', leave);
      stage.destroy();
      canvas.remove();
      layer.remove();
    },
  };
}
