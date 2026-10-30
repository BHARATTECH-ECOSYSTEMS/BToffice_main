/**
 * Whether a window (the sign-in pop-up) is covering the page. Heavy scenes behind it hold still meanwhile: the home
 * hero's glass film kept drawing behind the sign-in window, and the two glass scenes together held its opening at
 * ~30 fps on lighter graphics chips.
 */
const listeners = new Set<(covered: boolean) => void>();
let covers = 0;

export const isPageCovered = () => covers > 0;

/** Marks the page covered; call the returned function once the window has gone. */
export function coverPage() {
  let done = false;
  if (++covers === 1) listeners.forEach((l) => l(true));
  return () => {
    if (done) return;
    done = true;
    if (--covers === 0) listeners.forEach((l) => l(false));
  };
}

/** Calls `fn` whenever the page becomes covered or uncovered; returns the unsubscribe. */
export function onPageCover(fn: (covered: boolean) => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
