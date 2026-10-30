import { useEffect, useRef, useState } from 'react';
import { useScene } from '../gl/Scene';
import { useGlassTilt } from './useGlassTilt';
import { ThreadMark } from './ui';

/** How far through the page's scroll the button appears. */
const SHOW_AT = 0.4;
/** The logo's loop on click (the CSS animation in base.css is this long)… */
const LOOP_MS = 620;
/** …and when the page starts gliding up: as the logo comes back in from the top and settles. */
const LAUNCH_MS = 480;

/**
 * The live mark, floating in the bottom-right corner once the visitor is 40% of the way down the page. A click sends
 * the logo down through the orb and out of its floor, as if underground; it loops back in from the top and settles
 * while the orb lifts, then the page glides back to the top. A sentinel that reaches that point marks "not far enough yet", so nothing reads the
 * scroll position while scrolling.
 */
export function BackToTop() {
  // the shared scroll respects reduced motion and the smooth scroller
  const { scrollTo } = useScene();
  const button = useRef<HTMLButtonElement>(null);
  // a glass orb, like the nav's keys: it leans towards the cursor and the shine follows it
  useGlassTilt(button, '.to-top');
  const sentinel = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(false);
  const [looping, setLooping] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const goTop = () => {
    if (looping) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return scrollTo(0);
    setLooping(true);
    timer.current = window.setTimeout(() => {
      scrollTo(0);
      timer.current = window.setTimeout(() => setLooping(false), LOOP_MS - LAUNCH_MS);
    }, LAUNCH_MS);
  };

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
      <button ref={button} type="button" className="to-top" data-shown={shown || undefined} data-looping={looping || undefined} onClick={goTop} aria-label="Back to top">
        {/* the orb's round well: the logo leaves through its floor and comes back in from its top, clipped to the circle */}
        <span className="to-top-well">
          <ThreadMark />
        </span>
        {/* the button's aria-label already says this; the tip is for sighted pointer and keyboard users */}
        <span className="to-top-tip" aria-hidden="true">
          Back to top
        </span>
      </button>
    </>
  );
}
