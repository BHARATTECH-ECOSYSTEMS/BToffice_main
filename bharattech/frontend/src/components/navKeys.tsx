import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { motion, type Variants } from 'motion/react';
import { Link } from 'react-router';
import { BtnText } from './ui';
import type { HueName } from '../gl/palette';

/* The glass keys shared by the site's nav and the portal's top bar (styled by `.nav-links` and `[data-fx]` in
   base.css). Each key has its own hover effect (`fx`):
   drop = only the liquid glass drop that wraps every button of the bar (useNavBubble), sweep = a band of light
   crosses the glass,
   tilt = it leans to the cursor and a shine follows (useGlassTilt), ripple = a ring spreads from where the cursor
   came in, roll = the label rolls up and a copy rolls in, magnet = the key is drawn towards the cursor. */
export type LinkFx = 'drop' | 'sweep' | 'tilt' | 'ripple' | 'roll' | 'magnet';

export const fine = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/** Per-key pointer effects: where the cursor came in (ripple) and the magnet pull. The key's box is read once on
 *  entry, never per move, and the values go on that key's own style only. */
export function keyPointer(fx: LinkFx) {
  if (fx !== 'ripple' && fx !== 'magnet') return {};
  let box: DOMRect | null = null;
  const at = (e: React.PointerEvent<HTMLElement>) => {
    box ??= e.currentTarget.getBoundingClientRect();
    return [(e.clientX - box.left) / box.width, (e.clientY - box.top) / box.height] as const;
  };
  if (fx === 'ripple')
    return {
      onPointerOver: (e: React.PointerEvent<HTMLElement>) => {
        if (e.pointerType !== 'mouse' || e.currentTarget.contains(e.relatedTarget as Node)) return;
        box = null;
        const [x, y] = at(e);
        e.currentTarget.style.setProperty('--px', `${(x * 100).toFixed(1)}%`);
        e.currentTarget.style.setProperty('--py', `${(y * 100).toFixed(1)}%`);
      },
    };
  return {
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType !== 'mouse' || !fine()) return;
      const [x, y] = at(e);
      // -1..1 from the key's centre
      e.currentTarget.style.setProperty('--mg-x', ((x - 0.5) * 2).toFixed(3));
      e.currentTarget.style.setProperty('--mg-y', ((y - 0.5) * 2).toFixed(3));
    },
    onPointerOut: (e: React.PointerEvent<HTMLElement>) => {
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      box = null;
      e.currentTarget.style.removeProperty('--mg-x');
      e.currentTarget.style.removeProperty('--mg-y');
    },
  };
}

/** The link's label; the roll key carries the site's button roll markup. */
export function KeyLabel({ label, fx }: { label: string; fx: LinkFx }) {
  if (fx === 'roll') return <BtnText>{label}</BtnText>;
  if (fx === 'magnet') return <span className="nav-key-label">{label}</span>;
  return <>{label}</>;
}

/* The opening: the bar's glass unfolds out of a narrow capsule at the centre, then the brand and the login button
   fades in (the links and the login button follow with their own CSS stagger, `navItem` in base.css). Only the glass
   scales; the brand gets opacity alone, because its `transform` belongs to the glass tilt (useGlassTilt), which
   Motion would overwrite. */
// an even ease in and out (the site's --ease-io), so the stretch reads across the whole bar instead of jumping
// to full width in the first frames
const EASE_IO = [0.65, 0, 0.35, 1] as const;
export const OPENING: Record<'glass' | 'brand', Variants> = {
  // one `transform` string rather than scaleX/scaleY: Motion can then hand it to the browser's own animation
  // engine, which keeps running while the main thread is busy loading the page. As separate values it was
  // driven frame by frame from JavaScript and skipped straight to the end during the load.
  glass: {
    closed: { opacity: 0, transform: 'scale(0.12, 0.75)' },
    open: {
      opacity: 1,
      transform: 'scale(1, 1)',
      // the short delay lets the page's first paint land before the stretch starts, so its beginning is seen
      transition: { duration: 0.9, delay: 0.15, ease: EASE_IO, opacity: { duration: 0.2, delay: 0.15 } },
    },
  },
  brand: {
    closed: { opacity: 0 },
    open: { opacity: 1, transition: { duration: 0.4, delay: 0.75 } },
  },
};
export const MotionLink = motion.create(Link);

/** The key at `index` among the bar's own keys (its direct children only, so links inside a menu don't count). */
export const keyAt = (links: HTMLElement | null, index: number) =>
  index < 0 ? null : (links?.querySelectorAll<HTMLElement>(':scope > a, :scope > button')[index] ?? null);

type KeyHighlight = { x: number; w: number; glide: boolean; tone?: HueName };

/**
 * Where the colour pool under the lit key sits (`.nav-hl`). It glides between keys. When it comes back after
 * fading out it appears in place instead of sliding over from wherever it was last; a quick return, before the
 * fade has finished, still glides.
 */
export function useKeyHighlight(links: RefObject<HTMLElement>, lit: number, tone?: HueName) {
  const [hl, setHl] = useState<KeyHighlight>({ x: 0, w: 0, glide: false });
  const litBefore = useRef(-1);
  const hidAt = useRef(-Infinity);
  useLayoutEffect(() => {
    const b = keyAt(links.current, lit);
    if (b) {
      const glide = litBefore.current >= 0 || performance.now() - hidAt.current < 200;
      setHl({ x: b.offsetLeft, w: b.offsetWidth, glide, tone });
    } else if (litBefore.current >= 0) hidAt.current = performance.now();
    litBefore.current = lit;
  }, [links, lit, tone]);
  // The keys change width when the web font arrives, after the highlight was first placed; follow them.
  useEffect(() => {
    const el = links.current;
    const b = keyAt(el, lit);
    if (!el || !b) return;
    const ro = new ResizeObserver(() =>
      setHl((p) => (p.x === b.offsetLeft && p.w === b.offsetWidth ? p : { ...p, x: b.offsetLeft, w: b.offsetWidth, glide: false })),
    );
    ro.observe(el);
    ro.observe(b);
    return () => ro.disconnect();
  }, [links, lit]);
  return hl;
}
