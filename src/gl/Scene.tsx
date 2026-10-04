import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import Lenis from 'lenis';
import { Engine, type Target } from './Engine';
import { getTheme, onTheme } from '../theme';
import { opening, introPlanned } from '../opening';

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
 * World-space y (at z = 0) of a point `offset` px below the top of `el`, so a formation can be
 * pinned to a place on the page instead of to the screen. Mirrors the camera set-up in Engine.
 */
export function worldYOf(el: HTMLElement | null, offset: number) {
  if (!el) return 0;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const aspect = w / h;
  const z = aspect < 1 ? 7 / Math.max(0.62, aspect) ** 0.55 : 7;
  const perPx = (2 * z * Math.tan((35 / 2) * (Math.PI / 180))) / h;
  return (h / 2 - (el.getBoundingClientRect().top + offset)) * perPx;
}

export const isCompact = () => window.innerWidth <= 900;

/**
 * For a pinned section: once its pin releases and it starts scrolling off the top, how far (in world units) its
 * object must rise to leave with it rather than hang on screen.
 */
export function pinLift(el: HTMLElement | null) {
  const r = el?.getBoundingClientRect();
  if (!r || r.bottom >= window.innerHeight) return 0;
  return (window.innerHeight - r.bottom) * (worldYOf(el, 0) - worldYOf(el, 1));
}

/**
 * On compact screens a visual sits in a band at the top of its section and scrolls with it,
 * instead of staying fixed behind the text. `band` is the band's centre as a share of the viewport height.
 */
export function attachTo(el: HTMLElement | null, band: number, s: number): { mobilePose: { x: number; y: number; s: number }; follow?: number } {
  if (!isCompact()) return { mobilePose: { x: 0, y: 0, s } };
  return { mobilePose: { x: 0, y: worldYOf(el, window.innerHeight * band), s }, follow: 16 };
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
    engine?.setDark(getTheme() === 'dark');
    const offTheme = onTheme((t) => engine?.setDark(t === 'dark'));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lenis = reduced ? null : new Lenis({ duration: 0.85, smoothWheel: true });
    // Behind the opening the page holds still, and the mark resolves again as it is uncovered.
    if (introPlanned) {
      lenis?.stop();
      opening.then(() => {
        lenis?.start();
        engine?.replayArrival();
      });
    }
    let raf = 0;
    let lastY = window.scrollY;
    let needPick = true;
    let lastPickY = -9999;
    let lastVh = -1;
    let lastBest: Entry | null = null;

    const pick = () => {
      const vh = window.innerHeight;
      const y = window.scrollY;
      if (!needPick && Math.abs(y - lastPickY) < 0.2 && vh === lastVh) {
        // the page is still, but the chapter's state may have moved on (a step changed, a row is hovered)
        if (lastBest) engine?.setTarget(lastBest.target());
        return;
      }
      needPick = false;
      lastPickY = y;
      lastVh = vh;

      const mid = vh * 0.5;
      let best: Entry | null = null;
      let bestH = Infinity;

      const currentEntries = Array.from(entries.current);
      const len = currentEntries.length;
      if (len === 0) return;

      const rects = new Array(len);
      for (let i = 0; i < len; i++) {
        rects[i] = currentEntries[i].el.getBoundingClientRect();
      }

      for (let i = 0; i < len; i++) {
        const r = rects[i];
        const active = r.top <= mid && r.bottom >= mid;
        if (active && r.height < bestH) {
          best = currentEntries[i];
          bestH = r.height;
        }
      }

      for (let i = 0; i < len; i++) {
        const r = rects[i];
        const raw = r.height > vh * 1.2 ? -r.top / (r.height - vh) : (mid - r.top) / r.height;
        const p = Math.min(1, Math.max(0, raw));
        currentEntries[i].onProgress?.(p, currentEntries[i] === best);
      }

      lastBest = best;
      if (best) engine?.setTarget(best.target());
    };

    const onResize = () => {
      needPick = true;
    };
    window.addEventListener('resize', onResize, { passive: true });

    const scrollLoop = (time: number) => {
      lenis?.raf(time);
      const y = window.scrollY;
      const deltaY = y - lastY;
      if (Math.abs(deltaY) > 0.05) {
        needPick = true;
      }
      engine?.setVelocity(deltaY);
      lastY = y;
      raf = requestAnimationFrame(scrollLoop);
    };
    raf = requestAnimationFrame(scrollLoop);

    // Drive section logic from the render loop when we have one, else from rAF.
    let stop: () => void;
    if (engine) {
      const off = engine.onFrame(pick);
      stop = () => {
        off();
        window.removeEventListener('resize', onResize);
      };
    } else {
      let id = 0;
      const tick = () => {
        pick();
        id = requestAnimationFrame(tick);
      };
      id = requestAnimationFrame(tick);
      stop = () => {
        cancelAnimationFrame(id);
        window.removeEventListener('resize', onResize);
      };
    }

    setApi((prev) => ({
      ...prev,
      engine,
      lenis,
      scrollTo: (t, immediate) => {
        if (lenis) lenis.scrollTo(t, { immediate, offset: 0, duration: 0.85 });
        else if (typeof t === 'number') window.scrollTo(0, t);
        else t.scrollIntoView({ behavior: immediate ? 'auto' : 'smooth' });
      },
    }));

    return () => {
      stop();
      offTheme();
      cancelAnimationFrame(raf);
      lenis?.destroy();
      engine?.destroy();
    };
  }, []);

  return (
    <SceneContext.Provider value={api}>
      <div className="atmos" aria-hidden="true" />
      <canvas ref={canvasRef} className="scene" aria-hidden="true" />
      {children}
    </SceneContext.Provider>
  );
}
