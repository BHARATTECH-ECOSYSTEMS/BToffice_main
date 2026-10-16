import { useEffect, type RefObject } from 'react';

// the drop's size between keys, and how much bigger than a key it grows when it wraps one
const DROP = 30;
const WRAP = 8;
// Springs per frame at 60fps: a soft pull and light damping, so the drop overshoots a little and wobbles into place
// like liquid. STRETCH is how much speed stretches it sideways (and thins it).
const PULL = 0.2;
const DAMP = 0.7;
const STRETCH = 1.2;

type Key = { left: number; right: number; centre: number; width: number; height: number; tone: string };
type Spring = { v: number; vel: number };

/**
 * A liquid glass drop wraps the nav link marked `data-fx="drop"` (each link has its own hover effect; this is that
 * one's). It appears small at the cursor when the pointer reaches the key, swells to wrap it, pulled to the key's
 * centre but still leaning a little towards the cursor, and shrinks away when the pointer leaves the key. Moving
 * fast stretches it sideways. Springs carry its position and size, so it wobbles as it settles.
 * Positions are read once when the pointer arrives on the links, never per frame; each frame writes only the drop's
 * own style. Mouse and trackpad only; reduced motion gets no drop at all.
 */
export function useNavBubble(track: RefObject<HTMLElement>, drop: RefObject<HTMLElement>) {
  useEffect(() => {
    const el = track.current;
    const b = drop.current;
    if (!el || !b) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    let last = 0;
    let inside = false;
    let origin = 0;
    let pointer = 0;
    let keys: Key[] = [];
    let tone = '';
    const x: Spring = { v: 0, vel: 0 };
    const w: Spring = { v: DROP, vel: 0 };
    const h: Spring = { v: DROP, vel: 0 };

    const step = (s: Spring, target: number, dt: number) => {
      s.vel += (target - s.v) * PULL * dt;
      s.vel *= Math.pow(DAMP, dt);
      s.v += s.vel * dt;
      return Math.abs(target - s.v) + Math.abs(s.vel);
    };

    const frame = (now: number) => {
      const dt = Math.min(2, (now - last) / 16.67 || 1);
      last = now;
      const key = inside ? keys.find((k) => pointer >= k.left - 3 && pointer <= k.right + 3) : undefined;
      // leaving: the drop shrinks where it is while it fades
      const tx = key ? key.centre + (pointer - key.centre) * 0.18 : inside ? pointer : x.v;
      const tw = key ? key.width + WRAP : inside ? DROP : DROP * 0.6;
      const th = key ? key.height + WRAP : inside ? DROP : DROP * 0.6;
      const moving = step(x, tx, dt) + step(w, tw, dt) + step(h, th, dt);

      const speed = Math.abs(x.vel);
      const width = w.v + speed * STRETCH;
      const height = Math.max(h.v - speed * STRETCH * 0.35, h.v * 0.75);
      b.style.width = `${width.toFixed(1)}px`;
      b.style.height = `${height.toFixed(1)}px`;
      b.style.transform = `translate(${(x.v - width / 2).toFixed(1)}px, ${(-height / 2).toFixed(1)}px)`;
      const nextTone = key?.tone ?? '';
      if (nextTone !== tone) {
        tone = nextTone;
        if (tone) b.style.setProperty('--tone', tone);
        b.toggleAttribute('data-wrap', !!tone);
      }
      raf = inside || moving > 0.2 ? requestAnimationFrame(frame) : 0;
    };
    const run = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const onEnter = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      origin = el.getBoundingClientRect().left;
      keys = [...el.querySelectorAll<HTMLElement>(':scope > [data-fx="drop"]')].map((k) => ({
        left: k.offsetLeft,
        right: k.offsetLeft + k.offsetWidth,
        centre: k.offsetLeft + k.offsetWidth / 2,
        width: k.offsetWidth,
        height: k.offsetHeight,
        tone: k.style.getPropertyValue('--tone'),
      }));
      follow(e);
    };
    // the drop is on only while the pointer is over the drop key
    const follow = (e: PointerEvent) => {
      pointer = e.clientX - origin;
      const over = keys.some((k) => pointer >= k.left - 3 && pointer <= k.right + 3);
      // arriving after it has faded: start small at the cursor rather than sliding over from where it was
      if (over && !b.hasAttribute('data-on')) {
        x.v = pointer;
        x.vel = 0;
        w.v = h.v = DROP * 0.6;
        w.vel = h.vel = 0;
      }
      if (over === inside) {
        if (over) run();
        return;
      }
      inside = over;
      b.toggleAttribute('data-on', over);
      run();
    };
    const onMove = (e: PointerEvent) => {
      if (keys.length && e.pointerType === 'mouse') follow(e);
    };
    const onLeave = () => {
      inside = false;
      b.removeAttribute('data-on');
      run();
    };
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [track, drop]);
}
