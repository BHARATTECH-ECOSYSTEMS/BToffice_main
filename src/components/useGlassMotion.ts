import { useEffect } from 'react';
import { animate } from 'motion';

/** The glass boxes that lean (glass.css lists the same boxes for the glass itself, minus those animated in a sequence:
 *  the capabilities wheel card, the services swing deck, the careers deck and the nav panels, where a lean would fight
 *  the motion they already have). */
const BOXES = '.cell:not(.cell-ink), .fan-card, .role-card, .stack-card__inner, .about-callout-card, .how-paper, .about-contact-details, .contact-sheet, .accordion';

// the steepest lean, in degrees; big boxes lean less, so a wide sheet doesn't swing like a door
const MAX_TILT = 7;
const SPRING = { type: 'spring', stiffness: 220, damping: 18, mass: 0.6 } as const;

type Tilt = { ax: number; ay: number; angle: number };

/**
 * 3D glass in motion: the glass box under the mouse leans towards it on a Motion spring, and a shine follows the
 * pointer across its glass (glass.css reads --gm-*). The lean uses the `rotate` property (an axis and an angle), not
 * `transform`, so it adds to the boxes' own entrances and hover moves instead of replacing them; the parent gives it
 * perspective while it leans. One delegated listener for the whole page; a box's size is read once when the mouse
 * arrives on it. Mouse and trackpad only, and nothing leans with reduced motion.
 */
export function useGlassMotion() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let box: HTMLElement | null = null;
    let rect: DOMRect | null = null;
    // each box keeps its own lean and spring, so one springing back isn't cut short by the next one leaning
    const state = new Map<HTMLElement, { tilt: Tilt; spring: { stop(): void } | null }>();
    const of = (el: HTMLElement) => {
      let st = state.get(el);
      if (!st) state.set(el, (st = { tilt: { ax: 0, ay: 0, angle: 0 }, spring: null }));
      return st;
    };

    const write = (el: HTMLElement, t: Tilt) => {
      el.style.setProperty('--gm-ax', t.ax.toFixed(3));
      el.style.setProperty('--gm-ay', t.ay.toFixed(3));
      el.style.setProperty('--gm-a', `${t.angle.toFixed(2)}deg`);
    };
    const springTo = (el: HTMLElement, goal: Tilt, done?: () => void) => {
      const st = of(el);
      st.spring?.stop();
      const from = { ...st.tilt };
      st.spring = animate(from, goal, { ...SPRING, onUpdate: () => ((st.tilt = from), write(el, from)), onComplete: done });
    };
    const release = () => {
      const el = box;
      if (!el) return;
      box = null;
      rect = null;
      el.removeAttribute('data-gm');
      const { tilt } = of(el);
      springTo(el, { ax: tilt.ax, ay: tilt.ay, angle: 0 }, () => {
        if (box === el) return;
        for (const p of ['--gm-ax', '--gm-ay', '--gm-a', '--gm-x', '--gm-y']) el.style.removeProperty(p);
        el.parentElement?.style.removeProperty('perspective');
        state.delete(el);
      });
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const target = (e.target as Element | null)?.closest<HTMLElement>(BOXES) ?? null;
      if (target !== box) {
        release();
        if (!target) return;
        box = target;
        rect = target.getBoundingClientRect();
        target.setAttribute('data-gm', '');
        target.parentElement?.style.setProperty('perspective', '1200px');
      }
      if (!box || !rect) return;
      const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
      box.style.setProperty('--gm-x', `${(x * 100).toFixed(1)}%`);
      box.style.setProperty('--gm-y', `${(y * 100).toFixed(1)}%`);
      if (still) return;
      // lean about the axis at right angles to the cursor's offset from the centre, so the near side dips
      const dx = x - 0.5;
      const dy = y - 0.5;
      const reach = Math.min(1, Math.hypot(dx, dy) * 2);
      const max = Math.min(MAX_TILT, 2400 / Math.max(rect.width, rect.height));
      springTo(box, { ax: -dy, ay: dx, angle: reach * max });
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', release);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', release);
      release();
      state.forEach((st) => st.spring?.stop());
    };
  }, []);
}
