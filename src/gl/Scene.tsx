import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import Lenis from 'lenis';
import { BASE_POSE, DEFAULT_PARAMS, Engine, type FormationKey, type Pose, type Rect, type Target } from './Engine';
import { getTheme, onTheme } from '../theme';

export interface StageLabel {
  text: string;
  hot?: boolean;
  /** Which side of its point the tag sits on; by default right, or left near the panel's right edge. */
  side?: 'left' | 'right' | 'above' | 'below';
}

/** What the stage panel says about a section's formation. */
export interface StageMeta {
  fig: string;
  name: string;
  caption: string | (() => string);
  /** One label per formation anchor (null leaves that anchor unlabelled). */
  labels?: () => (StageLabel | null)[];
}

export interface Entry {
  el: HTMLElement;
  key?: FormationKey;
  /** Where this section's formation is drawn (see useStage). */
  stage?: () => HTMLElement | null;
  /** What scrolling in measures the morph against: the section on desktop, its card on phones. */
  anchor?: () => HTMLElement | null;
  meta?: StageMeta;
  target: () => Target;
  onProgress?: (p: number, active: boolean) => void;
}

interface SceneApi {
  engine: Engine | null;
  lenis: Lenis | null;
  register: (entry: Entry) => () => void;
  scrollTo: (target: HTMLElement | number, immediate?: boolean) => void;
  /** The shared stage panel of a split layout registers itself here. */
  setPanel: (el: HTMLElement | null) => void;
  panel: () => HTMLElement | null;
  /** The section in charge of the particles this frame, and every staged section in page order. */
  current: () => Entry | null;
  staged: () => Entry[];
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
 * On compact screens a visual sits in a band at the top of its section and scrolls with it,
 * instead of staying fixed behind the text. `band` is the band's centre as a share of the viewport height.
 */
export function attachTo(el: HTMLElement | null, band: number, s: number): { mobilePose: { x: number; y: number; s: number }; follow?: number } {
  if (!isCompact()) return { mobilePose: { x: 0, y: 0, s } };
  return { mobilePose: { x: 0, y: worldYOf(el, window.innerHeight * band), s }, follow: 16 };
}

/** Half-width and half-height of each formation in its own units, as seen at its base pose. */
const EXTENT: Partial<Record<FormationKey, [number, number]>> = {
  logo: [1.38, 1.38],
  silos: [1.45, 0.95],
  alone: [1.45, 0.95],
  frozen: [1.45, 0.95],
  orbit15: [2.25, 1.8],
  orbit6: [2.05, 1.6],
  layers: [1.4, 1.9],
  globe: [1.62, 1.62], // the orbits may run a little into the margin
  helix: [3.45, 0.9],
  flow: [2.2, 1.0],
  shatter: [1.9, 1.9],
  build: [1.4, 1.5],
  pages: [1.75, 1.35],
  bubble: [1.9, 1.5],
  // the flat figures share one portrait frame
  markFig: [1.95, 2.3],
  puzzle: [1.95, 2.3],
  apps: [1.95, 2.3],
  route: [1.95, 2.3],
  floors: [1.95, 2.3],
  india: [1.95, 2.3],
  molecule: [1.95, 2.3],
  people: [1.95, 2.3],
  seats: [1.95, 2.3],
  notes: [1.95, 2.3],
  dialogue: [1.95, 2.3],
};

const perPx = () => {
  const h = window.innerHeight;
  const aspect = window.innerWidth / h;
  const z = aspect < 1 ? 7 / Math.max(0.62, aspect) ** 0.55 : 7;
  return (2 * z * Math.tan((35 / 2) * (Math.PI / 180))) / h;
};

/**
 * The world pose that fits formation `key` inside `el` (a stage card or the panel), clear of its text.
 * `data-inset="top right bottom left"` on the element reserves room for that text; `data-fit` leaves room for labels.
 */
export function boxPose(el: HTMLElement, key: FormationKey): Pose {
  const r = el.getBoundingClientRect();
  const [t, rt, b, l] = (el.dataset.inset ?? '38 20 38 20').split(' ').map(Number);
  const fit = Number(el.dataset.fit ?? 1);
  const k = perPx();
  const w = r.width - l - rt;
  const h = r.height - t - b;
  // long shapes stand upright in a tall box (the panel) and lie down in a wide one (a phone card)
  const upright = (key === 'flow' || key === 'helix') && h > w * 1.15;
  const [ex, ey] = upright ? [...(EXTENT[key] ?? [1.4, 1.4])].reverse() : (EXTENT[key] ?? [1.4, 1.4]);
  const s = Math.min((w * k) / (2 * ex), (h * k) / (2 * ey)) * fit;
  const cx = r.left + l + w / 2;
  const cy = r.top + t + h / 2;
  const base = upright ? { ...BASE_POSE[key], rx: 0.12, ry: 0.35, rz: -Math.PI / 2 } : BASE_POSE[key];
  return { ...base, x: (cx - window.innerWidth / 2) * k, y: (window.innerHeight / 2 - cy) * k, s };
}

const rectOf = (r: DOMRect): Rect => ({ x: r.left, y: r.top, w: r.width, h: r.height });

const shown = (el: HTMLElement | null | undefined): el is HTMLElement => !!el && el.getClientRects().length > 0;

/**
 * Gives a section a stage. On wide screens the formation lives in the shared panel beside the content
 * (see StagePanel); on phones, in the section's own <Stage> card, which the returned ref goes on.
 * Scrolling the section in morphs the previous section's shape into this one; scrolling back reverses it.
 */
export function useStage(
  ref: RefObject<HTMLElement>,
  key: FormationKey,
  meta: StageMeta & { params?: Target['params'] | (() => Target['params']) },
) {
  const card = useRef<HTMLElement>(null);
  const { register, panel } = useScene();
  const metaRef = useRef(meta);
  metaRef.current = meta;
  useEffect(() => {
    if (!ref.current) return;
    const where = () => (shown(card.current) ? card.current : shown(panel()) ? panel() : null);
    return register({
      el: ref.current,
      key,
      stage: where,
      anchor: () => (shown(card.current) ? card.current : ref.current),
      meta: {
        fig: meta.fig,
        name: meta.name,
        caption: () => {
          const c = metaRef.current.caption;
          return typeof c === 'function' ? c() : c;
        },
        labels: () => metaRef.current.labels?.() ?? [],
      },
      target: () => {
        const el = where();
        if (!el) return { key, params: { alpha: 0 } };
        const p = metaRef.current.params;
        const a = (shown(card.current) ? card.current : ref.current)!.getBoundingClientRect();
        // shapes turn a little as their section passes (0 entering below … 1 leaving above);
        // the mark is one hemisphere, so it keeps facing us
        const vh = window.innerHeight;
        const passed = Math.min(1, Math.max(0, (vh - a.top) / (vh + a.height)));
        const turn = key === 'logo' ? 0 : (0.5 - passed) * 0.6;
        return {
          key,
          pose: boxPose(el, key),
          params: { spinY: turn, ...(typeof p === 'function' ? p() : p) },
          exact: true,
          snap: true,
          clip: rectOf(el.getBoundingClientRect()),
        };
      },
    });
  }, [ref, register, key, panel]); // eslint-disable-line react-hooks/exhaustive-deps
  return card;
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
  const panelRef = useRef<HTMLElement | null>(null);
  const currentRef = useRef<Entry | null>(null);
  const following = (a: Entry, b: Entry) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
  const [api, setApi] = useState<SceneApi>(() => ({
    engine: null,
    lenis: null,
    register: (e) => {
      entries.current.add(e);
      return () => entries.current.delete(e);
    },
    setPanel: (el) => {
      panelRef.current = el;
    },
    panel: () => panelRef.current,
    current: () => currentRef.current,
    staged: () => [...entries.current].filter((e) => e.meta).sort(following),
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
    engine?.setDark(getTheme() === 'dark');    const offTheme = onTheme((t) => engine?.setDark(t === 'dark'));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lenis = reduced ? null : new Lenis({ duration: 1.15, smoothWheel: true });
    let raf = 0;
    let lastY = window.scrollY;
    const scrollLoop = (time: number) => {
      lenis?.raf(time);
      const y = window.scrollY;
      engine?.setVelocity(y - lastY);
      lastY = y;
      raf = requestAnimationFrame(scrollLoop);
    };
    raf = requestAnimationFrame(scrollLoop);

    // A stage takes over once its card's top passes START of the screen height; the morph completes at END.
    // Late enough that the previous chapter's content has left the screen before its figure changes.
    const START = 0.74;
    const END = 0.34;
    const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    /** Morphs the previous section's shape into `entry`'s card as the card scrolls in. */
    const stageTarget = (entry: Entry, el: HTMLElement, prev: Entry | undefined, eng: Engine): Target => {
      const vh = window.innerHeight;
      const r = el.getBoundingClientRect();
      const a = (entry.anchor?.() ?? el).getBoundingClientRect();
      const mix = Math.min(1, Math.max(0, (vh * START - a.top) / (vh * (START - END))));
      const to = entry.target();
      if (!prev) return to;
      const pt = prev.target();
      const t = ease(mix);
      const toPose = eng.resolvePose(to);
      // Arrive from where the previous shape is on screen; if its card has already scrolled away,
      // the previous shape re-forms inside this card and turns into the new one in place.
      const pe = prev.stage?.();
      const pr = pe?.getBoundingClientRect();
      const inView = !pe || (pr!.bottom > 0 && pr!.top < vh);
      const fromPose = inView ? eng.resolvePose(pt) : eng.resolvePose({ key: pt.key, pose: boxPose(el, pt.key), exact: true });
      const fromClip: Rect = pe && inView ? rectOf(pr!) : pe ? rectOf(r) : { x: 0, y: 0, w: window.innerWidth, h: vh };
      const toClip = rectOf(r);
      const pose = {} as Pose;
      for (const k of Object.keys(toPose) as (keyof Pose)[]) pose[k] = lerp(fromPose[k], toPose[k], t);
      const clip: Rect = { x: lerp(fromClip.x, toClip.x, t), y: lerp(fromClip.y, toClip.y, t), w: lerp(fromClip.w, toClip.w, t), h: lerp(fromClip.h, toClip.h, t) };
      // shape-specific settings (the globe's hidden far side, finer dots, sway) ease across the morph too
      const fp = { ...DEFAULT_PARAMS, ...pt.params };
      const tp = { ...DEFAULT_PARAMS, ...to.params };
      const params = { ...to.params };
      for (const k of ['cull', 'dot', 'dim', 'grow', 'orbit'] as const) params[k] = lerp(fp[k], tp[k], t);
      return { ...to, params, from: pt.key, mix, pose, snap: true, exact: true, clip };
    };

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
      currentRef.current = best;
      if (!best || !engine) return;
      const order = [...entries.current].sort(following);
      let i = order.indexOf(best);
      // the next section may already be rising into view: it takes over early
      const next = order[i + 1];
      const nextAnchor = next?.stage?.() ? next.anchor?.() : null;
      if (nextAnchor && nextAnchor.getBoundingClientRect().top < window.innerHeight * START) best = order[++i];
      currentRef.current = best;
      const el = best.stage?.();
      engine.setTarget(el ? stageTarget(best, el, order[i - 1], engine) : best.target());
    };
    // Drive section logic from the render loop when we have one, else from rAF.
    let stop: () => void;
    if (engine) {
      const off = engine.beforeFrame(pick); // before drawing, so cards and particles move in the same frame
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
