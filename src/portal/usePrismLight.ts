import { useEffect, type RefObject } from 'react';

// how quickly the streak catches up with the cursor each frame (at 60fps): it trails a little, like light
const FOLLOW = 0.16;

/**
 * A prism streak glides along the portal's pill bar behind the cursor, as if the glass bar were splitting the light.
 * Only the streak's own position changes each frame; the bar's box is read once when the pointer arrives.
 * Mouse and trackpad only, and none with reduced motion.
 */
export function usePrismLight(bar: RefObject<HTMLElement>, streak: RefObject<HTMLElement>) {
  useEffect(() => {
    const el = bar.current;
    const s = streak.current;
    if (!el || !s) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    let last = 0;
    let origin = 0;
    let target = 0;
    let x = 0;
    let inside = false;

    const frame = (now: number) => {
      const dt = Math.min(2, (now - last) / 16.67 || 1);
      last = now;
      x += (target - x) * (1 - Math.pow(1 - FOLLOW, dt));
      // `translate`, not `transform`: transform would apply after the streak's slant (`rotate` in portal.css) and
      // carry it off diagonally
      s.style.translate = `${x.toFixed(1)}px 0`;
      raf = inside || Math.abs(target - x) > 0.5 ? requestAnimationFrame(frame) : 0;
    };
    const run = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const onEnter = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      origin = el.getBoundingClientRect().left;
      target = e.clientX - origin;
      // coming back after it faded: start at the cursor instead of sweeping over from the last spot
      if (!s.hasAttribute('data-on')) x = target;
      inside = true;
      s.setAttribute('data-on', '');
      run();
    };
    const onMove = (e: PointerEvent) => {
      if (!inside) return;
      target = e.clientX - origin;
      run();
    };
    const onLeave = () => {
      inside = false;
      s.removeAttribute('data-on');
    };
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [bar, streak]);
}
