import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import Lenis from 'lenis';
import { Engine, type Target } from './Engine';

interface Entry {
  el: HTMLElement;
  target: () => Target;
  onProgress?: (p: number, active: boolean) => void;
}

interface SceneApi {
  engine: Engine | null;
  lenis: Lenis | null;
  register: (entry: Entry) => () => void;
  scrollTo: (target: HTMLElement | number, immediate?: boolean) => void;
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

export const isCompact = () => window.innerWidth <= 900;

/**
 * World pose that centres an object of `size` world units in an element's box, as large as it fits
 * (never above `max`). Measured live, so a stage that scrolls away takes its object with it.
 */
export function fitTo(el: HTMLElement | null, size: number, max = 1) {
  if (!el) return { x: 0, y: 0, s: 0.0001 };
  const r = el.getBoundingClientRect();
  const k = perPx();
  const s = Math.max(0.15, Math.min(max, (Math.min(r.width, r.height) * k) / size));
  return { x: (r.left + r.width / 2 - window.innerWidth / 2) * k, y: (window.innerHeight / 2 - (r.top + r.height / 2)) * k, s };
}

/**
 * While `ref` holds the centre of the viewport, the scene shows `target`.
 * `onProgress` receives 0…1 as the element scrolls through, every frame.
 */
export function useFormation(ref: RefObject<HTMLElement>, target: Target | (() => Target), onProgress?: (p: number, active: boolean) => void) {
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
      onProgress: (p, a) => progressRef.current?.(p, a),
    });
  }, [ref, register]);
}

/** A section with no object of its own: whatever was on screen folds away while it is read. */
export function useQuiet(ref: RefObject<HTMLElement>) {
  useFormation(ref, { key: 'none' });
}

export function SceneProvider({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const entries = useRef(new Set<Entry>());
  const [api, setApi] = useState<SceneApi>(() => ({
    engine: null,
    lenis: null,
    register: (e) => {
      entries.current.add(e);
      return () => void entries.current.delete(e);
    },
    scrollTo: (t) => (typeof t === 'number' ? window.scrollTo(0, t) : t.scrollIntoView()),
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
    // Native scrolling is steadier on touch screens; Lenis smooths the wheel on desktop.
    const lenis = reduced || isCompact() ? null : new Lenis({ duration: 1.1, smoothWheel: true, wheelMultiplier: 0.95 });
    let raf = 0;
    let lastY = window.scrollY;

    // The section holding the middle of the screen decides what the scene shows; the smallest one wins,
    // so a stage nested inside a long chapter can take over from it.
    const pick = () => {
      const vh = window.innerHeight;
      const mid = vh * 0.5;
      let best: Entry | null = null;
      let bestH = Infinity;
      entries.current.forEach((e) => {
        const r = e.el.getBoundingClientRect();
        const active = r.top <= mid && r.bottom >= mid;
        if (active && r.height < bestH) {
          best = e;
          bestH = r.height;
        }
        if (e.onProgress) {
          const raw = r.height > vh * 1.2 ? -r.top / (r.height - vh) : (mid - r.top) / r.height;
          e.onProgress(Math.min(1, Math.max(0, raw)), false);
        }
      });
      const chosen = best as Entry | null;
      engine?.setTarget(chosen ? chosen.target() : { key: 'none' });
    };

    const loop = (time: number) => {
      lenis?.raf(time);
      const y = window.scrollY;
      engine?.setVelocity(y - lastY);
      lastY = y;
      if (!engine) pick();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const off = engine?.onFrame(pick);

    setApi((prev) => ({
      ...prev,
      engine,
      lenis,
      scrollTo: (t, immediate) => {
        if (lenis) lenis.scrollTo(t, { immediate, offset: 0, duration: 1 });
        else if (typeof t === 'number') window.scrollTo(0, t);
        else t.scrollIntoView({ behavior: immediate ? 'auto' : 'smooth' });
      },
    }));

    return () => {
      off?.();
      cancelAnimationFrame(raf);
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
