import { useEffect, type RefObject } from 'react';

// how far a key leans at its edges; the keys are wide and short, so they lean more top-to-bottom
const MAX_X = 10;
const MAX_Y = 7;

/** A window the shine shows through inside a key, and the spot of light it moves (see `[data-shine]` below). */
type Shine = { spot: HTMLElement; left: number; top: number };

/**
 * Glass keys lean towards the cursor and catch its light. For each element matching `selector` inside `root`,
 * the pointer's spot on it is written as --gx/--gy (where the shine sits) and --rx/--ry (the tilt), on that element
 * only, so nothing else restyles. The key's box is read once when the pointer arrives on it, never per move.
 * Touch screens get neither (a tap would leave a key stuck leaning); with reduced motion the shine moves but
 * nothing tilts.
 *
 * Large keys (the Architecture sheet, the Careers panel, the FAQ card) carry their shine in `[data-shine]` windows
 * instead: each holds one spot of light (its first child), which follows the pointer by `transform`, so the
 * compositor moves it. Drawn as a gradient at --gx/--gy, the shine repainted the whole panel on every mouse move
 * (5–7 ms of raster a frame on an integrated GPU).
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
    let shines: Shine[] = [];

    const release = () => {
      if (!key) return;
      for (const p of ['--gx', '--gy', '--rx', '--ry']) key.style.removeProperty(p);
      key.querySelectorAll<HTMLElement>('[data-shine] > :first-child').forEach((spot) => spot.style.removeProperty('transform'));
      key = null;
      box = null;
      shines = [];
    };
    // the key moved under a resting mouse: measure it again on the next move
    const onScroll = () => {
      box = null;
      shines = [];
    };
    const measure = (k: HTMLElement) => {
      box = k.getBoundingClientRect();
      shines = [...k.querySelectorAll<HTMLElement>('[data-shine]')].flatMap((w) => {
        const spot = w.firstElementChild as HTMLElement | null;
        if (!spot) return [];
        // the spot's resting place is its own (CSS left/top); the transform moves it from there to the cursor
        const r = w.getBoundingClientRect();
        return [{ spot, left: r.left + spot.offsetLeft + spot.offsetWidth / 2, top: r.top + spot.offsetTop + spot.offsetHeight / 2 }];
      });
    };
    const update = () => {
      raf = 0;
      if (!last) return;
      const target = (last.target as Element | null)?.closest<HTMLElement>(selector) ?? null;
      if (target !== key) {
        release();
        key = target;
      }
      if (!key) return;
      // read before the key tilts, so the box is its resting one
      if (!box) measure(key);
      if (!box) return;
      const x = Math.min(1, Math.max(0, (last.clientX - box.left) / box.width));
      const y = Math.min(1, Math.max(0, (last.clientY - box.top) / box.height));
      for (const s of shines) s.spot.style.transform = `translate3d(${(last.clientX - s.left).toFixed(1)}px, ${(last.clientY - s.top).toFixed(1)}px, 0)`;
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
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      onLeave();
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('scroll', onScroll);
    };
  }, [root, selector]);
}
