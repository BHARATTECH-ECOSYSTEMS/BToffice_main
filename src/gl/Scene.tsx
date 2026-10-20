import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import Lenis from 'lenis';
import { Engine, type Target } from './Engine';
import { pageScroll, setPageScroll, trackBox, type Box } from '../components/trackBox';

interface Entry {
  el: HTMLElement;
  target: () => Target;
  onProgress?: (p: number) => void;
}

/** A registered entry with its cached page position, so picking never forces a layout. */
interface Placed extends Entry {
  box: Box;
}

interface SceneApi {
  engine: Engine | null;
  lenis: Lenis | null;
  register: (entry: Entry) => () => void;
  scrollTo: (target: HTMLElement | number, immediate?: boolean) => void;
  /** A smooth arrival at a far section without gliding the whole way (see the implementation). */
  glideTo: (target: HTMLElement | number) => void;
}

const SceneContext = createContext<SceneApi | null>(null);

export function useScene() {
  const ctx = useContext(SceneContext);
  if (!ctx) throw new Error('useScene must be used inside <SceneProvider>');
  return ctx;
}

/** World units per CSS pixel at z = 0. Mirrors the camera set-up in Engine. */
function perPx() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const aspect = w / h;
  const z = aspect < 1 ? 7 / Math.max(0.62, aspect) ** 0.55 : 7;
  return (2 * z * Math.tan((35 / 2) * (Math.PI / 180))) / h;
}

/** The phone/tablet breakpoint, matching the CSS: at this width and below, pinned sections scroll normally. */
const PHONE_MAX = 900;
export const WIDE_QUERY = `(min-width: ${PHONE_MAX + 1}px)`;
export const isCompact = () => window.innerWidth <= PHONE_MAX;
/** How long the page must be still before it counts as no longer scrolling. */
const SCROLL_SETTLE_MS = 150;

/**
 * World pose that centres an object of `size` world units in an element's box, as large as it fits
 * (never above `max`). Measured live, so a stage that scrolls away takes its object with it.
 */
export function fitTo(el: HTMLElement | null, size: number, max = 1) {
  if (!el) return { x: 0, y: 0, s: 0.0001 };
  const r = el.getBoundingClientRect();
  return poseAt(r.left + r.width / 2, r.top + r.height / 2, Math.min(r.width, r.height), size, max);
}

/** World pose that centres an object of `size` world units on viewport point (x, y), `px` CSS pixels across. */
export function poseAt(x: number, y: number, px: number, size: number, max = 1) {
  const k = perPx();
  const s = Math.max(0.15, Math.min(max, (px * k) / size));
  return { x: (x - window.innerWidth / 2) * k, y: (window.innerHeight / 2 - y) * k, s };
}

/**
 * While `ref` holds the centre of the viewport, the scene shows `target`.
 * `onProgress` receives 0…1 as the element scrolls through, every frame.
 */
export function useFormation(ref: RefObject<HTMLElement>, target: Target | (() => Target), onProgress?: (p: number) => void) {
  const { register } = useScene();
  const targetRef = useRef(target);
  const progressRef = useRef(onProgress);
  targetRef.current = target;
  progressRef.current = onProgress;
  useEffect(() => {
    if (!ref.current) return;
    return register({
      el: ref.current,
      target: () => (typeof targetRef.current === 'function' ? targetRef.current() : targetRef.current),
      onProgress: (p) => progressRef.current?.(p),
    });
  }, [ref, register]);
}

/** A section with no object of its own: whatever was on screen folds away while it is read. */
export function useQuiet(ref: RefObject<HTMLElement>) {
  useFormation(ref, { key: 'none' });
}

export function SceneProvider({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const entries = useRef(new Set<Placed>());
  const [api, setApi] = useState<SceneApi>(() => ({
    engine: null,
    lenis: null,
    register: (e) => {
      const { box, release } = trackBox(e.el);
      const placed: Placed = { ...e, box };
      entries.current.add(placed);
      return () => {
        entries.current.delete(placed);
        release();
      };
    },
    scrollTo: (t) => (typeof t === 'number' ? window.scrollTo(0, t) : t.scrollIntoView()),
    glideTo: (t) => (typeof t === 'number' ? window.scrollTo(0, t) : t.scrollIntoView()),
  }));

  useEffect(() => {
    const canvas = canvasRef.current!;
    let engine: Engine | null = null;
    try {
      engine = new Engine(canvas);
    } catch {
      canvas.style.display = 'none'; // no WebGL: the page carries itself without the objects
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Continuous glide: each frame the page closes a share of the distance to where the wheel has sent it, so
    // successive wheel ticks blend into one motion instead of each restarting a fixed-length ease.
    const lenis = reduced || isCompact() ? null : new Lenis({ lerp: 0.11, smoothWheel: true, wheelMultiplier: 1.0, touchMultiplier: 1.2 });
    let raf = 0;
    let lastY = window.scrollY;
    let lastMoveAt = -Infinity;
    let flagged = false;
    let lastPickedY = -999999;

    // The section holding the middle of the screen decides what the scene shows; the smallest one wins,
    // so a stage nested inside a long chapter can take over from it.
    const pick = (force = false) => {
      const y = force ? window.scrollY : pageScroll();
      if (!force && y === lastPickedY) return;
      lastPickedY = y;

      const vh = window.innerHeight;
      const mid = vh * 0.5;
      let best: Placed | null = null;
      let bestH = Infinity;
      entries.current.forEach((e) => {
        const top = e.box.top - y;
        const height = e.box.height;
        const active = top <= mid && top + height >= mid;
        if (active && height < bestH) {
          best = e;
          bestH = height;
        }
        if (e.onProgress) {
          const raw = height > vh * 1.2 ? -top / (height - vh) : (mid - top) / height;
          e.onProgress(Math.min(1, Math.max(0, raw)));
        }
      });
      const chosen = best as Placed | null;
      engine?.setTarget(chosen ? chosen.target() : { key: 'none' });
    };

    const loop = (time: number) => {
      // booked first, so an error in one page's frame (its 3D on engine.onFrame) can't end the loop and freeze the
      // smooth scroll for the rest of the visit
      raf = requestAnimationFrame(loop);
      lenis?.raf(time);
      // the position the smooth scroll has just set; reading window.scrollY here forced a page layout each frame
      const y = lenis ? lenis.animatedScroll : pageScroll();
      if (lenis) setPageScroll(y);
      engine?.setVelocity(y - lastY);
      // [data-scrolling] holds the endless decorative loops still while the page moves (base.css)
      if (Math.abs(y - lastY) > 0.5) lastMoveAt = time;
      const moving = time - lastMoveAt < SCROLL_SETTLE_MS;
      if (moving !== flagged) document.documentElement.toggleAttribute('data-scrolling', (flagged = moving));
      lastY = y;
      // after the smooth scroll has moved the page, so the scene is placed from this frame's scroll
      engine?.tick(time);
      if (!engine) pick();
    };
    raf = requestAnimationFrame(loop);
    pick(true);
    const off = engine?.onFrame(() => pick());

    setApi((prev) => ({
      ...prev,
      engine,
      lenis,
      scrollTo: (t, immediate) => {
        if (lenis) lenis.scrollTo(t, { immediate, offset: 0, duration: 1 });
        else if (typeof t === 'number') window.scrollTo(0, t);
        else t.scrollIntoView({ behavior: immediate || reduced ? 'auto' : 'smooth' });
      },
      // Nav jumps land on the section at once: any glide (even a short last stretch) scrolls through the
      // pinned films before it and reads as lag. A quick fade on the page softens the cut.
      glideTo: (t) => {
        const to = typeof t === 'number' ? t : t.getBoundingClientRect().top + window.scrollY;
        if (lenis) lenis.scrollTo(to, { immediate: true, force: true });
        else window.scrollTo(0, to);
        if (!reduced) document.getElementById('main')?.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 240, easing: 'ease-out' });
      },
    }));

    return () => {
      off?.();
      cancelAnimationFrame(raf);
      document.documentElement.removeAttribute('data-scrolling');
      lenis?.destroy();
      engine?.destroy();
    };
  }, []);

  return (
    <SceneContext.Provider value={api}>
      <canvas ref={canvasRef} className="scene" aria-hidden="true" />
      {children}
    </SceneContext.Provider>
  );
}
