import { useEffect, type RefObject } from 'react';

// how far a key leans at its edges; the keys are wide and short, so they lean more top-to-bottom
const MAX_X = 10;
const MAX_Y = 7;

/**
 * Glass keys lean towards the cursor and catch its light. For each element matching `selector` inside `root`,
 * the pointer's spot on it is written as --gx/--gy (where the shine sits) and --rx/--ry (the tilt), on that element
 * only, so nothing else restyles. The key's box is read once when the pointer arrives on it, never per move.
 * Touch screens get neither (a tap would leave a key stuck leaning); with reduced motion the shine moves but
 * nothing tilts.
 */
export function useGlassTilt(root: RefObject<HTMLElement>, selector: string) {
  useEffect(() => {
    const el = root.current;
    if (!el || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let last: PointerEvent | null = null;
    let key: HTMLElement | null = null;
    let box: DOMRect | null = null;

    const release = () => {
      if (!key) return;
      for (const p of ['--gx', '--gy', '--rx', '--ry']) key.style.removeProperty(p);
      key = null;
      box = null;
    };
    const update = () => {
      raf = 0;
      if (!last) return;
      const target = (last.target as Element | null)?.closest<HTMLElement>(selector) ?? null;
      if (target !== key) {
        release();
        key = target;
        // read before the key tilts, so the box is its resting one
        box = key?.getBoundingClientRect() ?? null;
      }
      if (!key || !box) return;
      const x = Math.min(1, Math.max(0, (last.clientX - box.left) / box.width));
      const y = Math.min(1, Math.max(0, (last.clientY - box.top) / box.height));
      key.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
      key.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
      if (still) return;
      // the side under the cursor dips away, as if pressed by it
      key.style.setProperty('--rx', `${((0.5 - y) * 2 * MAX_X).toFixed(2)}deg`);
      key.style.setProperty('--ry', `${((x - 0.5) * 2 * MAX_Y).toFixed(2)}deg`);
    };
    const onMove = (e: PointerEvent) => {
      last = e;
      if (!raf) raf = requestAnimationFrame(update);
    };
    const onLeave = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      last = null;
      release();
    };
    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave);
    return () => {
      onLeave();
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [root, selector]);
}
