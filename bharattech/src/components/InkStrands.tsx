import { useEffect, useRef, type ReactNode } from 'react';
import {
  STRANDS,
  bundleDone,
  leanFor,
  pullBundle,
  releaseBundle,
  springStep,
  startBundle,
  stepBundle,
  strandColour,
  strandCurve,
  strandEdge,
  strandsAllowed,
  type Bundle,
  type Pill,
} from './inkPhysics';

// A pointing hand, its fingertip at (6.5, 0); the strands are held at its palm
const HAND = 'M5 1.5C5 .6 5.7 0 6.5 0S8 .6 8 1.5V10c.3-.6.9-1 1.6-1 .9 0 1.6.7 1.6 1.6v.6c.3-.6.9-1 1.6-1 .9 0 1.6.7 1.6 1.6v.6c.3-.6.9-1 1.6-1 .9 0 1.6.7 1.6 1.6V18c0 3.8-2.6 6-6.1 6H10c-2.2 0-3.6-1-4.8-2.6L2 17c-.6-.8-.4-1.9.4-2.4.7-.5 1.7-.3 2.2.4l.4.6Z';
const CREASES = 'M11.2 11v3.5M14.4 12.4v2.4';
const HAND_SCALE = 1.3;
const TIP = { x: 6.5 * HAND_SCALE, y: 0 };
const GRIP = { x: 11 * HAND_SCALE, y: 19 * HAND_SCALE };

type Lean = { x: number; vx: number; y: number; vy: number };
type Paint = { fill: string; edge: string | null };
type Held = { button: HTMLElement; bundle: Bundle; paint: Paint };

/**
 * The Finale's buttons, with sticky ink strands (owner's 1A 2A 3A 4A 5A, 2026-10-25; physics in inkStrands.ts):
 * leaving a button pulls strands of its colour out of the edge it left by, held by a drawn hand, and the button
 * leans a little toward the cursor. Drawn on one canvas over the section that never takes a click, so the links
 * behave exactly as before, and only on mouse-like pointers without reduced motion. It runs only while the
 * cursor is near the buttons or strands are still settling.
 */
export function InkStrands({ className, children }: { className: string; children: ReactNode }) {
  const actions = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const row = actions.current;
    const stage = row?.closest<HTMLElement>('.finale-pin');
    if (!row || !stage) return;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const buttons = [...row.querySelectorAll<HTMLElement>('.btn')];

    const canvas = document.createElement('canvas');
    canvas.className = 'finale-ink';
    canvas.setAttribute('aria-hidden', 'true');
    stage.append(canvas);
    const ctx = canvas.getContext('2d');
    const hand = new Path2D(HAND);
    const creases = new Path2D(CREASES);

    const pills = new Map<HTMLElement, Pill>();
    const paints = new Map<HTMLElement, Paint>();
    const leans = new Map<HTMLElement, Lean>(buttons.map((b) => [b, { x: 0, vx: 0, y: 0, vy: 0 }]));
    let held: Held[] = [];
    let hovered: HTMLElement | null = null;
    let inside = false;
    let client = { x: 0, y: 0 };
    // the canvas covers only where strands can be: the buttons plus their reach and the hand
    let size = { x: 0, y: 0, w: 0, h: 0, dpr: 1 };
    let frame = 0;
    let last = 0;
    let seed = 1;

    // Measured while nothing leans (the cursor has only just come into the section), in the section's own pixels,
    // so scrolling doesn't change them
    const measure = () => {
      const s = stage.getBoundingClientRect();
      const page = getComputedStyle(stage).backgroundColor;
      for (const b of buttons) {
        const r = b.getBoundingClientRect();
        pills.set(b, { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height });
        const style = getComputedStyle(b);
        paints.set(b, { fill: strandColour({ background: style.backgroundColor, page }), edge: strandEdge({ background: style.backgroundColor, boxShadow: style.boxShadow }) });
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const all = [...pills.values()];
      const pad = STRANDS.reach + 60;
      const x = Math.max(0, Math.floor(Math.min(...all.map((q) => q.x)) - pad));
      const y = Math.max(0, Math.floor(Math.min(...all.map((q) => q.y)) - pad));
      const w = Math.min(s.width, Math.ceil(Math.max(...all.map((q) => q.x + q.w)) + pad)) - x;
      const h = Math.min(s.height, Math.ceil(Math.max(...all.map((q) => q.y + q.h)) + pad)) - y;
      if (size.x !== x || size.y !== y || size.w !== w || size.h !== h || size.dpr !== dpr) {
        size = { x, y, w, h, dpr };
        Object.assign(canvas.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
    };
    const local = () => {
      const s = stage.getBoundingClientRect();
      return { x: client.x - s.left, y: client.y - s.top };
    };

    const draw = (pointer: { x: number; y: number }) => {
      if (!ctx) return;
      ctx.setTransform(size.dpr, 0, 0, size.dpr, -size.x * size.dpr, -size.y * size.dpr);
      ctx.clearRect(size.x, size.y, size.w, size.h);
      ctx.lineCap = 'round';
      for (const { bundle, paint } of held) {
        ctx.fillStyle = paint.fill;
        for (const s of bundle.strands) {
          const c = strandCurve(bundle, s);
          if (c.length < 0.5) continue;
          ctx.beginPath();
          ctx.moveTo(s.ax, s.ay);
          ctx.quadraticCurveTo(c.cx, c.cy, s.ex, s.ey);
          if (paint.edge) {
            // the outlined button's ring, one pixel each side of the fill
            ctx.strokeStyle = paint.edge;
            ctx.lineWidth = c.width + 2;
            ctx.stroke();
          }
          ctx.strokeStyle = paint.fill;
          ctx.lineWidth = c.width;
          ctx.stroke();
          // where it leaves the button the ink is thicker, as a stretched blob is
          ctx.beginPath();
          ctx.arc(s.ax, s.ay, c.width * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        for (const d of bundle.drips) {
          ctx.globalAlpha = Math.max(0, d.life / STRANDS.dripLife);
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      if (held.some((h) => h.bundle.attached)) {
        const k = size.dpr * HAND_SCALE;
        ctx.setTransform(k, 0, 0, k, (pointer.x - TIP.x - size.x) * size.dpr, (pointer.y - TIP.y - size.y) * size.dpr);
        ctx.lineWidth = 1.3 / HAND_SCALE;
        ctx.lineJoin = 'round';
        ctx.fillStyle = '#faf9f6';
        ctx.strokeStyle = '#14130f';
        ctx.fill(hand);
        ctx.stroke(hand);
        ctx.stroke(creases);
      }
    };

    const tick = (now: number) => {
      const dt = Math.min((now - (last || now)) / 1000, 1 / 30) || 1 / 60;
      last = now;
      const pointer = local();
      for (const h of held) {
        if (h.bundle.attached) pullBundle(h.bundle, pointer.x - TIP.x + GRIP.x, pointer.y - TIP.y + GRIP.y);
        stepBundle(h.bundle, dt);
      }
      held = held.filter((h) => !bundleDone(h.bundle));
      stage.toggleAttribute('data-pulling', held.some((h) => h.bundle.attached));

      let moving = false;
      for (const b of buttons) {
        const pill = pills.get(b);
        const lean = leans.get(b);
        if (!pill || !lean) continue;
        const pulling = held.find((h) => h.button === b && h.bundle.attached)?.bundle;
        const target =
          b === hovered
            ? leanFor(pill, pointer.x, pointer.y)
            : pulling
              ? leanFor(pill, pulling.hx, pulling.hy, Math.hypot(pulling.hx - pulling.px, pulling.hy - pulling.py) / STRANDS.reach)
              : { rx: 0, ry: 0 };
        const x = springStep({ x: lean.x, v: lean.vx }, target.rx, dt, STRANDS.stiffness, STRANDS.damping * 1.4);
        const y = springStep({ x: lean.y, v: lean.vy }, target.ry, dt, STRANDS.stiffness, STRANDS.damping * 1.4);
        Object.assign(lean, { x: x.x, vx: x.v, y: y.x, vy: y.v });
        const angle = Math.hypot(lean.x, lean.y);
        const settled = angle < 0.02 && Math.hypot(lean.vx, lean.vy) < 0.05 && !target.rx && !target.ry;
        // the side nearest the cursor comes toward the viewer: rotateX(-rx) rotateY(-ry), as one axis and angle
        b.style.rotate = settled ? '' : `${-lean.x} ${-lean.y} 0 ${angle}deg`;
        if (!settled) moving = true;
      }

      draw(pointer);
      frame = held.length || moving || hovered ? requestAnimationFrame(tick) : 0;
      if (!frame) last = 0;
    };
    const wake = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const allowed = (e: PointerEvent) => e.pointerType === 'mouse' && strandsAllowed({ finePointer: fine.matches, reducedMotion: reduce.matches });

    const onEnterStage = (e: PointerEvent) => {
      if (!allowed(e)) return;
      inside = true;
      client = { x: e.clientX, y: e.clientY };
      if (!held.length) measure();
    };
    const onMove = (e: PointerEvent) => {
      // a page that opens with the cursor already over the section never sees it come in
      if (!inside) onEnterStage(e);
      client = { x: e.clientX, y: e.clientY };
      if (held.length || hovered) wake();
    };
    const onLeaveStage = () => {
      inside = false;
      for (const h of held) if (h.bundle.attached) releaseBundle(h.bundle, true);
      wake();
    };
    const onEnterButton = (e: PointerEvent) => {
      if (!inside || !allowed(e)) return;
      hovered = e.currentTarget as HTMLElement;
      // back on the button it was pulled from: the strands go back in, without dripping
      for (const h of held) if (h.button === hovered && h.bundle.attached) releaseBundle(h.bundle, false);
      wake();
    };
    const onLeaveButton = (e: PointerEvent) => {
      const button = e.currentTarget as HTMLElement;
      if (hovered === button) hovered = null;
      const pill = pills.get(button);
      if (!inside || !pill || !allowed(e)) return;
      client = { x: e.clientX, y: e.clientY };
      const at = local();
      held.push({ button, bundle: startBundle(pill, at.x, at.y, seed++), paint: paints.get(button) ?? { fill: 'currentColor', edge: null } });
      wake();
    };
    const onResize = () => {
      if (!held.length) measure();
    };

    stage.addEventListener('pointerenter', onEnterStage);
    stage.addEventListener('pointermove', onMove, { passive: true });
    stage.addEventListener('pointerleave', onLeaveStage);
    for (const b of buttons) {
      b.addEventListener('pointerenter', onEnterButton);
      b.addEventListener('pointerleave', onLeaveButton);
    }
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(frame);
      stage.removeEventListener('pointerenter', onEnterStage);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerleave', onLeaveStage);
      for (const b of buttons) {
        b.removeEventListener('pointerenter', onEnterButton);
        b.removeEventListener('pointerleave', onLeaveButton);
        b.style.rotate = '';
      }
      window.removeEventListener('resize', onResize);
      stage.removeAttribute('data-pulling');
      canvas.remove();
    };
  }, []);

  return (
    <div ref={actions} className={className}>
      {children}
    </div>
  );
}
