import { useLayoutEffect, useRef } from 'react';
import { useFormation, worldYOf } from '../gl/Scene';
import type { Target } from '../gl/Engine';
import { Lines, Kicker } from '../components/Reveal';

/** Half-height of the logo formation in its own units (see EXTENT in Scene). */
const LOGO_R = 1.38;
/** Space between the bottom of the mark and the footer's top edge, in px. */
const GAP = 40;

/**
 * The mark sits whole on the footer's top edge and scrolls with it, so it rises into view
 * as the footer arrives. Its size follows the screen so it always fits.
 */
function markTarget(footer: HTMLElement | null): Target {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const rPx = Math.min(h * 0.25, w * 0.4);
  // world units per px at z = 0; mirrors the camera set-up in Engine
  const z = w / h < 1 ? 7 / Math.max(0.62, w / h) ** 0.55 : 7;
  const r = rPx * ((2 * z * Math.tan((35 / 2) * (Math.PI / 180))) / h);
  const y = worldYOf(footer, -GAP) + r;
  return { key: 'logo', pose: { x: 0, y, s: r / LOGO_R }, exact: true, follow: 16 };
}

/** Everything returns to the mark: rising over the horizon like a planet. */
export function Finale() {
  const ref = useRef<HTMLElement>(null);
  // The footer keeps the mark in charge once it covers the middle of the screen.
  const footer = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    footer.current = document.querySelector<HTMLElement>('footer.footer');
  }, []);
  const target = () => markTarget(footer.current);
  useFormation(ref, target);
  useFormation(footer, target);
  return (
    <section id="next" ref={ref} className="section finale" data-chapter="Next era">
      <div className="wrap">
        <Kicker index="12">What comes next</Kicker>
        <Lines className="display" lines={['The next era of', 'intelligence', 'begins here.']} />
      </div>
    </section>
  );
}
