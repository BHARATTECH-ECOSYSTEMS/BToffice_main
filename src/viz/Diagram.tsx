import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Cursor position in viewBox units; `on` eases 0→1 while the cursor is over the diagram. */
export interface Ptr {
  x: number;
  y: number;
  on: number;
}
export type Draw = (t: number, p: Ptr) => ReactNode;

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Props {
  draw: Draw;
  /** seconds per loop */
  period: number;
  w?: number;
  h?: number;
  label: string;
  className?: string;
  /** while hovered, time settles inside [hold, hold + 0.6] so there is a full picture to explore */
  hold?: number;
  /** a fixed moment: no clock, no pointer (used by the video renderer and reduced motion) */
  at?: number;
  /** the moment shown for reduced motion */
  still?: number;
}

/**
 * A flat SVG diagram that is a pure function of time and cursor. It only runs while on screen,
 * so any frame can also be painted on demand for the video export.
 */
export function Diagram({ draw, period, w = 480, h = 300, label, className = '', hold, at, still }: Props) {
  const box = useRef<SVGSVGElement>(null);
  const [state, setState] = useState<{ t: number; p: Ptr }>({ t: at ?? still ?? period * 0.72, p: { x: 0, y: 0, on: 0 } });
  const frozen = at !== undefined || reduced();
  const draws = useRef(draw);
  draws.current = draw;

  useEffect(() => {
    const el = box.current;
    if (!el || at !== undefined) return;
    const p: Ptr = { x: 0, y: 0, on: 0 };
    let target = { x: 0, y: 0, on: 0 };
    let clock = 0, last = 0, raf = 0, visible = false;
    const still_ = reduced();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const phase = clock % period;
      const held = hold !== undefined && target.on > 0.5 && phase >= hold && phase < hold + 0.6;
      if (!held && !still_) clock += dt;
      const k = 1 - Math.exp(-dt * 22);
      if (p.on < 0.02) { p.x = target.x; p.y = target.y; } else { p.x += (target.x - p.x) * k; p.y += (target.y - p.y) * k; }
      p.on += (target.on - p.on) * (1 - Math.exp(-dt * 9));
      setState({ t: still_ ? (still ?? period * 0.72) : clock % period, p: { ...p } });
      raf = visible && !still_ ? requestAnimationFrame(frame) : 0;
    };
    const kick = () => {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      target = { x: ((e.clientX - r.left) / r.width) * w, y: ((e.clientY - r.top) / r.height) * h, on: 1 };
      if (still_) kick();
    };
    const leave = () => {
      target.on = 0;
      if (still_) kick();
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) kick();
    });
    io.observe(el);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerdown', move);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('pointercancel', leave);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerdown', move);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('pointercancel', leave);
    };
  }, [period, hold, at, still, w, h]);

  return (
    <svg ref={box} className={`dg ${frozen ? 'is-still' : ''} ${className}`} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
      {draws.current(at ?? state.t, at !== undefined ? { x: 0, y: 0, on: 0 } : state.p)}
    </svg>
  );
}
