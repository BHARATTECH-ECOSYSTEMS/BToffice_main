/**
 * Page-space boxes for scroll handlers.
 *
 * Reading getBoundingClientRect() on every frame forces the browser to recalculate layout whenever another
 * handler has just written styles, and with several scroll-driven sections that happened many times a frame.
 * Instead, each tracked element is measured once and again only when layout can have changed (it or the page
 * resized), and handlers place it with window.scrollY alone: its viewport top is `box.top - scrollY`.
 */
export interface Box {
  /** Distance from the top of the page, in CSS pixels. */
  top: number;
  height: number;
}

interface Tracked {
  box: Box;
  onMeasure?: () => void;
}

// an element can be tracked by several callers at once (say a pinned section and the 3D scene)
const tracked = new Map<Element, Set<Tracked>>();
let observer: ResizeObserver | null = null;

// One element changing size moves everything below it, so any change re-measures every tracked box.
const measureAll = () => {
  tracked.forEach((entries, el) => {
    const r = el.getBoundingClientRect();
    entries.forEach(({ box, onMeasure }) => {
      box.top = r.top + window.scrollY;
      box.height = r.height;
      onMeasure?.();
    });
  });
};

/**
 * Starts tracking `el` and returns its live box. `onMeasure` runs after every re-measure, for callers that
 * cache further layout values of their own. Call `release` when done.
 */
export function trackBox(el: Element, onMeasure?: () => void): { box: Box; release: () => void } {
  if (!observer) {
    observer = new ResizeObserver(measureAll);
    // the page's height changes when anything above a tracked element grows or shrinks
    observer.observe(document.body);
  }
  const entry: Tracked = { box: { top: 0, height: 0 }, onMeasure };
  if (!tracked.has(el)) {
    tracked.set(el, new Set());
    observer.observe(el);
  }
  tracked.get(el)!.add(entry);
  const r = el.getBoundingClientRect();
  entry.box.top = r.top + window.scrollY;
  entry.box.height = r.height;
  onMeasure?.();
  return {
    box: entry.box,
    release: () => {
      const entries = tracked.get(el);
      entries?.delete(entry);
      if (entries && entries.size === 0) {
        tracked.delete(el);
        observer?.unobserve(el);
      }
    },
  };
}

// Reading window.scrollY also forces a layout if a style was written earlier in the same frame. The scroll
// event runs before any frame callback writes, so the value is captured there once and shared.
let scrollTop = typeof window === 'undefined' ? 0 : window.scrollY;
if (typeof window !== 'undefined') {
  window.addEventListener('scroll', () => (scrollTop = window.scrollY), { passive: true });
}

/** The page's scroll position as of the latest scroll event: free to read inside frame callbacks. */
export const pageScroll = () => scrollTop;
