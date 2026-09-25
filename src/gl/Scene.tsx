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

/**
 * While `ref` holds the centre of the viewport, the particle system becomes `target`.
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

export function SceneProvider({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const entries = useRef(new Set<Entry>());
  const [api, setApi] = useState<SceneApi>(() => ({
    engine: null,
    lenis: null,
    register: (e) => {
      entries.current.add(e);
      return () => entries.current.delete(e);
    },
    scrollTo: (t) => (typeof t === 'number' ? window.scrollTo(0, t) : t.scrollIntoView()),
  }));

  useEffect(() => {
    const canvas = canvasRef.current!;
    let engine: Engine | null = null;
    try {
      engine = new Engine(canvas);
    } catch {
      canvas.style.display = 'none'; // no WebGL: the typography carries the page on its own
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lenis = reduced ? null : new Lenis({ duration: 1.15, smoothWheel: true });
    let raf = 0;
    const scrollLoop = (time: number) => {
      lenis?.raf(time);
      raf = requestAnimationFrame(scrollLoop);
    };
    raf = requestAnimationFrame(scrollLoop);

    const pick = () => {
      const mid = window.innerHeight * 0.5;
      let best: Entry | null = null;
      let bestH = Infinity;
      for (const e of entries.current) {
        const r = e.el.getBoundingClientRect();
        const active = r.top <= mid && r.bottom >= mid;
        if (active && r.height < bestH) {
          best = e;
          bestH = r.height;
        }
      }
      for (const e of entries.current) {
        const r = e.el.getBoundingClientRect();
        // tall (sticky) sections report progress through their scroll length
        const vh = window.innerHeight;
        const raw = r.height > vh * 1.2 ? -r.top / (r.height - vh) : (mid - r.top) / r.height;
        const p = Math.min(1, Math.max(0, raw));
        e.onProgress?.(p, e === best);
      }
      if (best) {
        const t = best.target();
        engine?.setTarget(t);
        const theme = (t.params?.dark ?? 0) > 0.5 ? 'dark' : 'light';
        if (document.documentElement.dataset.theme !== theme) document.documentElement.dataset.theme = theme;
      }
    };
    // Drive section logic from the render loop when we have one, else from rAF.
    let stop: () => void;
    if (engine) {
      const off = engine.onFrame(pick);
      stop = () => off();
    } else {
      let id = 0;
      const tick = () => {
        pick();
        id = requestAnimationFrame(tick);
      };
      id = requestAnimationFrame(tick);
      stop = () => cancelAnimationFrame(id);
    }

    setApi((prev) => ({
      ...prev,
      engine,
      lenis,
      scrollTo: (t, immediate) => {
        if (lenis) lenis.scrollTo(t, { immediate, offset: 0, duration: 1.6 });
        else if (typeof t === 'number') window.scrollTo(0, t);
        else t.scrollIntoView({ behavior: immediate ? 'auto' : 'smooth' });
      },
    }));

    return () => {
      stop();
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
