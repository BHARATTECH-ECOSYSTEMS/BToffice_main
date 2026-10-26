import { useEffect } from 'react';

/** The glass boxes that lean (glass.css lists the same boxes for the glass itself, minus those animated in a sequence:
 *  the capabilities wheel card, the services swing deck, the careers deck and the nav panels, where a lean would fight
 *  the motion they already have). */
const BOXES = '.cell:not(.cell-ink), .fan-card, .role-card, .stack-card__inner, .how-paper, .about-contact-details, .contact-sheet, .accordion';

// the steepest lean, in degrees; big boxes lean less, so a wide sheet doesn't swing like a door
const MAX_TILT = 7;
// the lean's spring (the one Motion ran before: stiffness 220, damping 18, mass 0.6)
const STIFFNESS = 220;
const DAMPING = 18;
const MASS = 0.6;
// the shine's size: a soft white spot, as wide as the old 420px gradient circle's visible part (it faded out at 45%)
const SHINE = 378;

type Tilt = { ax: number; ay: number; angle: number };
type Lean = { now: Tilt; vel: Tilt; goal: Tilt; leaving: boolean };

/**
 * 3D glass in motion: the glass box under the mouse leans towards it on a spring, and a shine follows the pointer
 * across its glass. The lean is the `rotate` property (an axis and an angle), not `transform`, so it adds to the
 * boxes' own entrances and hover moves instead of replacing them; the parent gives it perspective while it leans.
 *
 * Every frame writes only the box's `rotate` and the shine's `transform`. The shine is one small layer moved by the
 * compositor; drawn as part of the box's background it repainted the whole box (text, shadows and all) on every
 * mouse move, 6–9 ms a frame on the large sheets. The lean used to go through CSS variables, which every element in
 * the box inherits, so each spring frame restyled all of them.
 *
 * One delegated listener for the whole page; a box's size is read when the mouse arrives on it and again after a
 * scroll. Mouse and trackpad only, light theme only (the glass is light-theme only, glass.css), and nothing leans
 * with reduced motion.
 */
export function useGlassMotion() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let box: HTMLElement | null = null;
    let rect: DOMRect | null = null;
    // each box keeps its own lean, so one springing back isn't cut short by the next one leaning
    const leans = new Map<HTMLElement, Lean>();
    // boxes sharing a parent share its perspective; it goes once the last of them has settled
    const perspectiveUsers = new Map<HTMLElement, number>();
    // boxes made `position: relative` here to hold the shine, so only those are put back
    const positioned = new WeakSet<HTMLElement>();
    let raf = 0;
    let last = 0;

    const shine = document.createElement('span');
    shine.className = 'gm-shine';
    shine.setAttribute('aria-hidden', 'true');
    const spot = document.createElement('i');
    shine.append(spot);

    const borrowPerspective = (el: HTMLElement) => {
      const parent = el.parentElement;
      if (!parent) return;
      perspectiveUsers.set(parent, (perspectiveUsers.get(parent) ?? 0) + 1);
      parent.style.setProperty('perspective', '1200px');
    };
    const returnPerspective = (el: HTMLElement) => {
      const parent = el.parentElement;
      if (!parent) return;
      const n = (perspectiveUsers.get(parent) ?? 1) - 1;
      if (n > 0) return void perspectiveUsers.set(parent, n);
      perspectiveUsers.delete(parent);
      parent.style.removeProperty('perspective');
    };

    const settle = (el: HTMLElement) => {
      leans.delete(el);
      el.style.removeProperty('rotate');
      el.style.removeProperty('will-change');
      if (positioned.has(el)) {
        positioned.delete(el);
        el.style.removeProperty('position');
      }
      returnPerspective(el);
    };

    const frame = (now: number) => {
      // seconds, split in two so the spring stays stable after a slow frame
      const dt = Math.min(1 / 30, (now - last) / 1000 || 1 / 60) / 2;
      last = now;
      leans.forEach((l, el) => {
        for (let k = 0; k < 2; k++)
          for (const c of ['ax', 'ay', 'angle'] as const) {
            l.vel[c] += ((STIFFNESS * (l.goal[c] - l.now[c]) - DAMPING * l.vel[c]) / MASS) * dt;
            l.now[c] += l.vel[c] * dt;
          }
        const rest = Math.abs(l.goal.angle - l.now.angle) + Math.abs(l.vel.angle) + Math.abs(l.vel.ax) + Math.abs(l.vel.ay);
        if (l.leaving && rest < 0.01) return settle(el);
        el.style.rotate = `${l.now.ax.toFixed(3)} ${l.now.ay.toFixed(3)} 0 ${l.now.angle.toFixed(2)}deg`;
      });
      raf = leans.size ? requestAnimationFrame(frame) : 0;
    };
    const run = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const release = () => {
      const el = box;
      if (!el) return;
      box = null;
      rect = null;
      el.removeAttribute('data-gm');
      shine.remove();
      const l = leans.get(el);
      if (!l) return settle(el);
      // spring back to flat about the same axis
      l.goal = { ax: l.now.ax, ay: l.now.ay, angle: 0 };
      l.leaving = true;
      run();
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      const target = dark ? null : ((e.target as Element | null)?.closest<HTMLElement>(BOXES) ?? null);
      if (target !== box) {
        release();
        if (!target) return;
        box = target;
        const l = leans.get(target);
        if (l) l.leaving = false;
        else {
          // the shine is positioned inside the box
          if (getComputedStyle(target).position === 'static') {
            target.style.position = 'relative';
            positioned.add(target);
          }
          borrowPerspective(target);
        }
        target.setAttribute('data-gm', '');
        target.append(shine);
      }
      if (!box) return;
      rect ??= box.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      spot.style.transform = `translate3d(${(px - SHINE / 2).toFixed(1)}px, ${(py - SHINE / 2).toFixed(1)}px, 0)`;
      if (still) return;
      // lean about the axis at right angles to the cursor's offset from the centre, so the near side dips
      const dx = Math.min(1, Math.max(0, px / rect.width)) - 0.5;
      const dy = Math.min(1, Math.max(0, py / rect.height)) - 0.5;
      const reach = Math.min(1, Math.hypot(dx, dy) * 2);
      const max = Math.min(MAX_TILT, 2400 / Math.max(rect.width, rect.height));
      const goal = { ax: -dy, ay: dx, angle: reach * max };
      const l = leans.get(box);
      if (l) l.goal = goal;
      else {
        leans.set(box, { now: { ax: goal.ax, ay: goal.ay, angle: 0 }, vel: { ax: 0, ay: 0, angle: 0 }, goal, leaving: false });
        // its own layer for as long as it leans, so each frame of the lean is moved on the GPU, not repainted
        box.style.willChange = 'rotate';
      }
      run();
    };
    // the box moved under a resting mouse: measure it again on the next move
    const onScroll = () => (rect = null);

    document.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', release);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', release);
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
      release();
      [...leans.keys()].forEach(settle);
    };
  }, []);
}
