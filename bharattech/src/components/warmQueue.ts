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
/** Work that must finish before any build starts (see holdWarmUntil). */
let held: Promise<unknown> = Promise.resolve();
/** The longest a hold may keep the builds waiting. */
const HOLD_MAX_MS = 10000;

/**
 * Keeps the queued builds waiting until `work` settles (or 10 s at most). The hero's glass shader links in the
 * background on the browser's few shader-compile threads; the globe's and the deck's builds compiling alongside it
 * slowed it past its own time limit, and the hero's first frame then froze the page for 1–2 s.
 */
export function holdWarmUntil(work: Promise<unknown>) {
  const cap = new Promise((done) => window.setTimeout(done, HOLD_MAX_MS));
  held = Promise.all([held, Promise.race([work.catch(() => undefined), cap])]);
}
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

/** A new page's own entrance (RouteSweep's 560 ms page-in) plays before a scene is built for being near the screen. */
const SETTLE_MS = 700;

/**
 * Runs `build` once: at a quiet moment, or once the page has settled and `el` is within `margin` of the screen,
 * whichever is first. Returns a cancel function. Creating a WebGL context while the new page was still being drawn
 * held it 0.55 s (the context waits for the busy GPU process); a moment later the same took 0.09 s.
 */
export function buildWhenQuietOrNear(el: Element, build: () => void, margin = '100% 0px'): () => void {
  let done = false;
  const once = () => {
    if (done) return;
    done = true;
    cancel();
    build();
  };
  const cancelWarm = warmWhenQuiet(once);
  const near = new IntersectionObserver(([entry]) => entry.isIntersecting && once(), { rootMargin: margin });
  const arm = window.setTimeout(() => near.observe(el), SETTLE_MS);
  const cancel = () => {
    done = true;
    cancelWarm();
    window.clearTimeout(arm);
    near.disconnect();
  };
  return cancel;
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
    window.setTimeout(() => void held.then(pumpWarm), openingPlaying() ? WARM_AFTER_MS : WARM_SOON_MS);
  }
  return () => {
    task.cancelled = true;
  };
}
