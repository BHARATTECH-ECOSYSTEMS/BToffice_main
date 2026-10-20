import { openingPlaying } from './StoryOpening';

/**
 * Heavy 3D builds on the home page wait here for a quiet moment: after the opening film has had its turn, one at a
 * time, and only while the visitor isn't scrolling. Built on a plain timer, they landed in the middle of the hero
 * story and froze it for up to 0.9 s.
 */
const WARM_AFTER_MS = 6000;
/** Without the opening film (any later visit in the session, or another page) the builds start almost at once:
 *  waiting the film's length anyway left a fast scroller arriving before the worlds were built, building them mid-scroll. */
const WARM_SOON_MS = 1200;
const WARM_GAP_MS = 400;
/** How long the page must have been still before a build may start. */
const WARM_QUIET_MS = 600;

type WarmTask = { run: () => void; cancelled: boolean };
const warmQueue: WarmTask[] = [];
let warmPumping = false;
let listening = false;
let lastScrollAt = 0;
const idle = (fn: () => void) =>
  window.requestIdleCallback ? window.requestIdleCallback(fn) : window.setTimeout(fn, 0);

function pumpWarm() {
  while (warmQueue[0]?.cancelled) warmQueue.shift();
  if (!warmQueue.length) {
    warmPumping = false;
    return;
  }
  const quietFor = performance.now() - lastScrollAt;
  if (quietFor < WARM_QUIET_MS) {
    window.setTimeout(pumpWarm, WARM_QUIET_MS - quietFor + 50);
    return;
  }
  idle(() => {
    // the visitor may have started scrolling again while this waited for an idle moment
    if (performance.now() - lastScrollAt < WARM_QUIET_MS) return pumpWarm();
    warmQueue.shift()?.run();
    window.setTimeout(pumpWarm, WARM_GAP_MS);
  });
}

/** Queues a build for a quiet moment (`first`: ahead of those already waiting); returns a cancel function. */
export function warmWhenQuiet(run: () => void, first = false): () => void {
  const task: WarmTask = { run, cancelled: false };
  if (first) warmQueue.unshift(task);
  else warmQueue.push(task);
  if (!warmPumping) {
    warmPumping = true;
    if (!listening) {
      listening = true;
      window.addEventListener('scroll', () => (lastScrollAt = performance.now()), { passive: true });
    }
    window.setTimeout(pumpWarm, openingPlaying() ? WARM_AFTER_MS : WARM_SOON_MS);
  }
  return () => {
    task.cancelled = true;
  };
}
