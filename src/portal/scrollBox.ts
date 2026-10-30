import { useLayoutEffect, useState, type RefObject } from 'react';

/** Whether a scroll box has more content than it shows; a 1px difference is rounding, not something to scroll. */
export function hasOverflow(box: { scrollHeight: number; clientHeight: number }) {
  return box.scrollHeight - box.clientHeight > 1;
}

/**
 * Whether the box in `ref` can scroll, kept current as it or its content changes size. A box marked
 * data-lenis-prevent takes every wheel over it away from the site's smooth scroll, so a box should be marked only
 * while it has something to scroll: otherwise the page stops gliding and jumps under the cursor.
 */
export function useScrollBox(ref: RefObject<HTMLElement>) {
  const [scrolls, setScrolls] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setScrolls(hasOverflow(el));
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    // the content growing (more tasks) doesn't resize a box that already has its full height
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => ro.disconnect();
  }, [ref]);
  return scrolls;
}
