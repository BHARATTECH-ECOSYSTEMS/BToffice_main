import { useEffect } from 'react';

const BLOOMING = '.btn-primary, .btn-ghost, .btn-light';

/**
 * Buttons light up where the cursor is: the purple bloom on .btn-primary/.btn-ghost/.btn-light (base.css) grows
 * from where the pointer came in and shrinks back to where it left, so the button gets the pointer's position as
 * --mx/--my at those two moments only. In between the grown bloom covers the whole button, so following every
 * move (as this once did) changed nothing on screen while it measured the button and re-laid out the bloom on
 * each move. Shared by the site layout and the employee portal, so every button behaves the same.
 */
export function usePointerBloom() {
  useEffect(() => {
    const place = (button: HTMLElement, e: PointerEvent) => {
      const r = button.getBoundingClientRect();
      button.style.setProperty('--mx', `${e.clientX - r.left}px`);
      button.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    // pointerover/out bubble (enter/leave don't), so one listener serves every button; moves between a button's
    // own children aren't an arrival or a departure
    const onOver = (e: PointerEvent) => {
      const button = (e.target as Element | null)?.closest?.<HTMLElement>(BLOOMING);
      if (button && !button.contains(e.relatedTarget as Node | null)) place(button, e);
    };
    const onOut = (e: PointerEvent) => {
      const button = (e.target as Element | null)?.closest?.<HTMLElement>(BLOOMING);
      if (button && !button.contains(e.relatedTarget as Node | null)) place(button, e);
    };
    document.addEventListener('pointerover', onOver, { passive: true });
    document.addEventListener('pointerout', onOut, { passive: true });
    return () => {
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('pointerout', onOut);
    };
  }, []);
}
