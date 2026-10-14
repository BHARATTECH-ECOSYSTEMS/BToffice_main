import { useEffect, useRef, useState } from 'react';
import { ThreadMark } from '../sections/Faq';
import { useScene } from '../gl/Scene';

/** How far through the page's scroll the button appears. */
const SHOW_AT = 0.4;

/**
 * The live mark, floating in the bottom-right corner once the visitor is 40% of the way down the page; a click
 * glides back to the top. A sentinel that reaches that point marks "not far enough yet", so nothing reads the
 * scroll position while scrolling.
 */
export function BackToTop() {
  // the shared scroll respects reduced motion and the smooth scroller
  const { scrollTo } = useScene();
  const sentinel = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    // Re-sized whenever the page's height changes (a new route, sections growing); its bottom edge passes the
    // top of the screen exactly when the visitor has scrolled SHOW_AT of the way down.
    // Measured on the app wrapper, not the document: the sentinel itself counts towards the document's height, so a
    // tall one left over from the previous page would hold that height up and never let it shrink.
    const page = el.parentElement ?? document.body;
    const size = () => {
      const run = page.offsetHeight - window.innerHeight;
      el.style.height = `${Math.max(1, Math.round(run * SHOW_AT))}px`;
    };
    const ro = new ResizeObserver(size);
    ro.observe(page);
    window.addEventListener('resize', size);
    size();
    const io = new IntersectionObserver(([entry]) => setShown(!entry.isIntersecting));
    io.observe(el);
    return () => {
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('resize', size);
    };
  }, []);

  return (
    <>
      <span ref={sentinel} className="to-top-sentinel" aria-hidden="true" />
      <button type="button" className="to-top" data-shown={shown || undefined} onClick={() => scrollTo(0)} aria-label="Back to top">
        <ThreadMark />
        {/* the button's aria-label already says this; the tip is for sighted pointer and keyboard users */}
        <span className="to-top-tip" aria-hidden="true">
          Back to top
        </span>
      </button>
    </>
  );
}
