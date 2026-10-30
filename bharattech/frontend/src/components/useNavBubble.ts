import { useEffect, type RefObject } from 'react';

// the drop's size between keys, and how much bigger than a key it grows when it wraps one
const DROP = 30;
// small, so the drop hugs its key and its tint doesn't reach the next one (keys are 6px apart)
const WRAP = 4;
// Springs per frame at 60fps: a soft pull and light damping, so the drop overshoots a little and wobbles into place
// like liquid. STRETCH is how much speed stretches it sideways (and thins it).
const PULL = 0.2;
const DAMP = 0.7;
const STRETCH = 1.2;
// how far outside a key the pointer still counts as on it
const SLACK = 3;

type Key = { left: number; right: number; top: number; bottom: number; centre: number; middle: number; width: number; height: number; tone: string };
type Spring = { v: number; vel: number };

/** Where `key` sits inside `track`. The key's own place comes from its layout offset, so its passing transforms
 *  (entrance, lift, lean) don't move where the drop settles; its container's place comes from the screen, so a
 *  container's lasting transform counts (the site's links are centred with translateX(-50%)). */
function placeIn(key: HTMLElement, track: HTMLElement) {
  const parent = key.offsetParent as HTMLElement | null;
  if (!parent || parent === track) return { left: key.offsetLeft, top: key.offsetTop };
  const p = parent.getBoundingClientRect();
  const t = track.getBoundingClientRect();
  return { left: p.left - t.left + parent.clientLeft + key.offsetLeft, top: p.top - t.top + parent.clientTop + key.offsetTop };
}

/**
 * A liquid glass drop wraps the key under the pointer: every button matching `keys` (on the site's nav and the
 * portal's top bar, all of the bar's buttons). It appears small at the cursor when the pointer reaches a key, swells to wrap it, pulled to the key's centre but
 * still leaning a little towards the cursor, glides to the next key, and shrinks away when the pointer leaves the
 * keys. Moving fast stretches it sideways. Springs carry its position and size, so it wobbles as it settles.
 * Positions are read once when the pointer arrives on `track`, never per frame; each frame writes only the drop's
 * own style. The drop must be positioned from `track`'s top left corner. Mouse and trackpad only; reduced motion
 * gets no drop at all.
 */
export function useNavBubble(track: RefObject<HTMLElement>, drop: RefObject<HTMLElement>, keys: string) {
  useEffect(() => {
    const el = track.current;
    const b = drop.current;
    if (!el || !b) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    let last = 0;
    let inside = false;
    let origin = { x: 0, y: 0 };
    let pointer = { x: 0, y: 0 };
    let boxes: Key[] = [];
    let tone = '';
    const x: Spring = { v: 0, vel: 0 };
    const y: Spring = { v: 0, vel: 0 };
    const w: Spring = { v: DROP, vel: 0 };
    const h: Spring = { v: DROP, vel: 0 };

    const step = (s: Spring, target: number, dt: number) => {
      s.vel += (target - s.v) * PULL * dt;
      s.vel *= Math.pow(DAMP, dt);
      s.v += s.vel * dt;
      return Math.abs(target - s.v) + Math.abs(s.vel);
    };
    const keyAt = (p: { x: number; y: number }) =>
      boxes.find((k) => p.x >= k.left - SLACK && p.x <= k.right + SLACK && p.y >= k.top - SLACK && p.y <= k.bottom + SLACK);

    const frame = (now: number) => {
      const dt = Math.min(2, (now - last) / 16.67 || 1);
      last = now;
      const key = inside ? keyAt(pointer) : undefined;
      // leaving: the drop shrinks where it is while it fades
      const tx = key ? key.centre + (pointer.x - key.centre) * 0.18 : inside ? pointer.x : x.v;
      const ty = key ? key.middle : y.v;
      const tw = key ? key.width + WRAP : inside ? DROP : DROP * 0.6;
      const th = key ? key.height + WRAP : inside ? DROP : DROP * 0.6;
      const moving = step(x, tx, dt) + step(y, ty, dt) + step(w, tw, dt) + step(h, th, dt);

      const speed = Math.abs(x.vel);
      const width = w.v + speed * STRETCH;
      const height = Math.max(h.v - speed * STRETCH * 0.35, h.v * 0.75);
      b.style.width = `${width.toFixed(1)}px`;
      b.style.height = `${height.toFixed(1)}px`;
      b.style.transform = `translate(${(x.v - width / 2).toFixed(1)}px, ${(y.v - height / 2).toFixed(1)}px)`;
      const nextTone = key?.tone ?? '';
      if (nextTone !== tone) {
        tone = nextTone;
        if (tone) b.style.setProperty('--tone', tone);
        b.toggleAttribute('data-wrap', !!tone);
      }
      // resting on a key still settles fully, below the 0.1px the values are written at; a pointer move restarts it
      raf = moving > (inside ? 0.02 : 0.2) ? requestAnimationFrame(frame) : 0;
    };
    const run = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const onEnter = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const o = el.getBoundingClientRect();
      origin = { x: o.left, y: o.top };
      boxes = [...el.querySelectorAll<HTMLElement>(keys)].map((k) => {
        const { left, top } = placeIn(k, el);
        const width = k.offsetWidth;
        const height = k.offsetHeight;
        return {
          left,
          right: left + width,
          top,
          bottom: top + height,
          centre: left + width / 2,
          middle: top + height / 2,
          width,
          height,
          // keys without a colour of their own (the brand, the profile button) take the site's violet
          tone: k.style.getPropertyValue('--tone') || 'var(--violet)',
        };
      });
      follow(e);
    };
    // the drop is on only while the pointer is over a key
    const follow = (e: PointerEvent) => {
      pointer = { x: e.clientX - origin.x, y: e.clientY - origin.y };
      const over = !!keyAt(pointer);
      // arriving after it has faded: start small at the cursor rather than sliding over from where it was
      if (over && !b.hasAttribute('data-on')) {
        x.v = pointer.x;
        y.v = pointer.y;
        x.vel = y.vel = 0;
        w.v = h.v = DROP * 0.6;
        w.vel = h.vel = 0;
      }
      if (over === inside) {
        if (over) run();
        return;
      }
      inside = over;
      b.toggleAttribute('data-on', over);
      // the bar knows the drop is out, so its other hover lights can step back (base.css)
      el.toggleAttribute('data-drop', over);
      run();
    };
    const onMove = (e: PointerEvent) => {
      if (boxes.length && e.pointerType === 'mouse') follow(e);
    };
    const onLeave = () => {
      inside = false;
      b.removeAttribute('data-on');
      el.removeAttribute('data-drop');
      run();
    };
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeAttribute('data-drop');
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [track, drop, keys]);
}
