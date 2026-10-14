import { useEffect, useRef, useState } from 'react';
import { HQ, HQ_MAP } from '../content';

/**
 * The office card on the Contact page. The 3D diorama (gl/officeMap) loads only when the card nears the
 * screen; until it has drawn a frame, or for good if WebGL or the module is unavailable, a flat drawn
 * map stands in its place.
 */
export function OfficeMap() {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cleanup: (() => void) | undefined;
    let gone = false;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        import('../gl/officeMap')
          .then(({ mountOfficeMap }) => {
            if (gone) return;
            cleanup = mountOfficeMap(el, {
              label: ['Bharattech Origin', 'Headquarters · Kanpur'],
              reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
              onReady: () => setReady(true),
            });
          })
          // the drawn fallback stays in place; the page itself is unaffected
          .catch((err) => console.warn('office map:', err));
      },
      { rootMargin: '300px' },
    );
    io.observe(el);
    return () => {
      gone = true;
      io.disconnect();
      cleanup?.();
    };
  }, []);

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
