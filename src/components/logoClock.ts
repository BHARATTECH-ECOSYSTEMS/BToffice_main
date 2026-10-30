// The live logo's endless loops (story.css): the threads drawing in and the origin dot
const LOOPS = new Set(['faq-thread', 'faq-origin']);

/**
 * Pins every copy of the live logo to the page's one clock: each loop counts from the page's start, not from the
 * moment its copy was drawn, so the top bar, the back-to-top orb, the sign-in window and the logos in sections all
 * show the same moment of the loop (owner, 2026-10-30). Their small per-thread delays still apply, so they stay as one.
 */
export function onPageClock(root: Element) {
  if (typeof root.getAnimations !== 'function') return;
  for (const animation of root.getAnimations({ subtree: true })) {
    if (LOOPS.has((animation as CSSAnimation).animationName)) animation.startTime = 0;
  }
}
