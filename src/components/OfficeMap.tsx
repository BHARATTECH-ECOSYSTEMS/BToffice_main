import { useEffect, useRef, useState } from 'react';
import { HQ, HQ_MAP } from '../content';
import { useDocumentTheme } from '../theme';

/**
 * The office card on the Contact page. The 3D diorama (gl/officeMap) loads only when the card nears the
 * screen; until it has drawn a frame, or for good if WebGL or the module is unavailable, a flat drawn
 * map stands in its place.
 */
export function OfficeMap() {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const theme = useDocumentTheme();

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cleanup: (() => void) | undefined;
    let gone = false;
    let started = false;
    // Built at the first idle moment after the page opens (the card is barely a screen down), or as it nears the
    // screen if that comes first: built on arrival, the city's construction landed in the middle of the scroll.
    const start = () => {
      if (started || gone) return;
      started = true;
      io.disconnect();
      import('../gl/officeMap')
          .then(({ mountOfficeMap }) => {
            if (gone) return;
            cleanup = mountOfficeMap(el, {
              label: ['Bharattech Origin', 'Headquarters · Kanpur'],
              reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
              dark: document.documentElement.getAttribute('data-theme') === 'dark',
              onReady: () => setReady(true),
            });
          })
          // the drawn fallback stays in place; the page itself is unaffected
          .catch((err) => console.warn('office map:', err));
    };
    const io = new IntersectionObserver(([e]) => e.isIntersecting && start(), { rootMargin: '300px' });
    io.observe(el);
    const soon = window.setTimeout(() => ('requestIdleCallback' in window ? window.requestIdleCallback(start, { timeout: 2000 }) : start()), 600);
    return () => {
      gone = true;
      window.clearTimeout(soon);
      io.disconnect();
      cleanup?.();
    };
    // the map reads the theme once when built, so a theme change builds it again
  }, [theme]);

  return (
    <div className="visit-map" data-ready={ready || undefined}>
      <div ref={host} className="visit-map__stage" role="img" aria-label={`Map: our headquarters in ${HQ}`}>
        <div className="visit-map__fallback" aria-hidden="true">
          <i />
        </div>
      </div>
      <a className="visit-map__chip" href={HQ_MAP} target="_blank" rel="noopener noreferrer">
        <i aria-hidden="true" />
        Kanpur, Uttar Pradesh · Open in Maps
      </a>
    </div>
  );
}
