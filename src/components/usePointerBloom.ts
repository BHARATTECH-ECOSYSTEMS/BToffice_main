import { useEffect } from 'react';

/**
 * Cards and buttons light up where the cursor is: the element under the pointer gets its position as --mx/--my,
 * which the purple bloom on .btn-primary/.btn-ghost/.btn-light (base.css) and the .cell glow grow from.
 * Shared by the site layout and the employee portal, so every button behaves the same.
 */
export function usePointerBloom() {
  useEffect(() => {
    let raf = 0;
    let last: PointerEvent | null = null;
    const update = () => {
      raf = 0;
      const t = (last?.target as HTMLElement | null)?.closest?.('.cell, .btn-primary, .btn-ghost, .btn-light, .nav-cta') as HTMLElement | null;
      if (!t || !last) return;
      const r = t.getBoundingClientRect();
      t.style.setProperty('--mx', `${last.clientX - r.left}px`);
      t.style.setProperty('--my', `${last.clientY - r.top}px`);
    };
    const on = (e: PointerEvent) => {
      last = e;
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener('pointermove', on, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', on);
    };
  }, []);
}
