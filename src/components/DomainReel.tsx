import { useCallback, useEffect, useRef, useState } from 'react';
import { DOMAIN_REELS } from '../data/reelScreenplays';
import { span } from '../gl/ink';
import { type ReelPainter, createInkPainter, createWorldPainter } from '../gl/reelPainters';
import '../styles/domain-cinema.css';

const CHAPTER_SEC = 4;
const CHAPTERS = 4;
const LOOP_SEC = CHAPTER_SEC * CHAPTERS;
/**
 * The reels sit in a stacked deck right where the home page's network globe lands, so they all near the viewport
 * within a second of each other. Building a world takes 100–200 ms of main thread, so each is built ahead of
 * time, one at a time, after the opening film has had its turn — and only while the visitor isn't scrolling:
 * built on a plain timer, the builds landed in the middle of the hero story and froze it for up to 0.9 s.
 * Shaders are compiled in the background (compileWorld) before a reel's first frame.
 */
const WARM_AFTER_MS = 6000;
const WARM_GAP_MS = 700;
/** How long the page must have been still before a build may start. */
const WARM_QUIET_MS = 600;

type WarmTask = { run: () => void; cancelled: boolean };
const warmQueue: WarmTask[] = [];
let warmPumping = false;
let listening = false;
let lastScrollAt = 0;
const idle = (fn: () => void) =>
  window.requestIdleCallback ? window.requestIdleCallback(fn) : window.setTimeout(fn, 0);

function pumpWarm() {
  while (warmQueue[0]?.cancelled) warmQueue.shift();
  if (!warmQueue.length) {
    warmPumping = false;
    return;
  }
  const quietFor = performance.now() - lastScrollAt;
  if (quietFor < WARM_QUIET_MS) {
    window.setTimeout(pumpWarm, WARM_QUIET_MS - quietFor + 50);
    return;
  }
  idle(() => {
    // the visitor may have started scrolling again while this waited for an idle moment
    if (performance.now() - lastScrollAt < WARM_QUIET_MS) return pumpWarm();
    warmQueue.shift()?.run();
    window.setTimeout(pumpWarm, WARM_GAP_MS);
  });
}

/** Queues a build for a quiet moment; returns a cancel function. */
function warmWhenQuiet(run: () => void): () => void {
  const task: WarmTask = { run, cancelled: false };
  warmQueue.push(task);
  if (!warmPumping) {
    warmPumping = true;
    if (!listening) {
      listening = true;
      window.addEventListener('scroll', () => (lastScrollAt = performance.now()), { passive: true });
    }
    window.setTimeout(pumpWarm, WARM_AFTER_MS);
  }
  return () => {
    task.cancelled = true;
  };
}

export interface DomainReelProps {
  index: number;
  /**
   * Whether this reel may animate. The deck stacks cards on top of each other, so a card can
   * be "on screen" while fully covered; the deck only lets the front cards run.
   */
  live?: boolean;
}

/**
 * Plays one research domain as a four-chapter reel: a 3D world where WebGL is available,
 * the 2D ink drawing otherwise. Each chapter adds to the picture; earlier ones stay.
 */
export function DomainReel({ index, live = true }: DomainReelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fillRefs = useRef<(HTMLElement | null)[]>([]);
  const reduced = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ).current;

  // Under reduced motion the reel starts paused on the finished picture.
  const [isPlaying, setIsPlaying] = useState(!reduced);
  const [activeAct, setActiveAct] = useState(reduced ? CHAPTERS - 1 : 0);

  const timeRef = useRef(reduced ? LOOP_SEC - 0.001 : 0);
  const playingRef = useRef(isPlaying);
  const liveRef = useRef(live);
  const reportedActRef = useRef(activeAct);
  const redrawRef = useRef<() => void>(() => {});

  const domain = DOMAIN_REELS[index] ?? DOMAIN_REELS[0];

  useEffect(() => {
    playingRef.current = isPlaying;
    liveRef.current = live;
    redrawRef.current();
  }, [isPlaying, live]);

  const seek = useCallback((act: number) => {
    // When paused, jump to the end of the chapter so it's shown complete.
    timeRef.current = (act + (playingRef.current ? 0 : 0.999)) * CHAPTER_SEC;
    reportedActRef.current = act;
    setActiveAct(act);
    redrawRef.current();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let painter: ReelPainter | null = null;
    let W = 0;
    let H = 0;
    let rafId = 0;
    let visible = false;
    let last = 0;
    const pointer = { x: 0, y: 0 };

    const resize = () => {
      W = container.clientWidth;
      H = container.clientHeight;
      painter?.resize(W, H, Math.min(2, window.devicePixelRatio || 1));
    };

    const render = (now: number) => {
      const animating = visible && liveRef.current && playingRef.current && !reduced;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      if (animating) timeRef.current = (timeRef.current + dt) % LOOP_SEC;

      const loopT = timeRef.current;
      const act = Math.min(CHAPTERS - 1, Math.floor(loopT / CHAPTER_SEC));
      const progress = (loopT % CHAPTER_SEC) / CHAPTER_SEC;

      if (act !== reportedActRef.current) {
        reportedActRef.current = act;
        setActiveAct(act);
      }
      fillRefs.current.forEach((el, i) => {
        if (el) el.style.transform = `scaleX(${i < act ? 1 : i === act ? progress : 0})`;
      });

      const exit = playingRef.current && act === CHAPTERS - 1 ? span(progress, 0.9, 1) : 0;
      if (compiled) painter?.paint({ act, progress, exit, pointer, t: reduced ? 0 : now / 1000 });

      rafId = animating ? requestAnimationFrame(render) : 0;
      if (!rafId) last = 0;
    };

    const start = () => {
      if (!rafId) rafId = requestAnimationFrame(render);
    };
    redrawRef.current = start;

    const ro = new ResizeObserver(() => {
      resize();
      start();
    });
    ro.observe(container);

    // Nothing is drawn until the world's shaders are compiled, so the first frame never stalls the page.
    let ready: Promise<void> | null = null;
    let compiled = false;
    let disposed = false;
    const build = () => {
      if (!ready) {
        const p = (painter = createWorldPainter(index, canvas) ?? createInkPainter(index, canvas));
        resize();
        ready = (p ? p.prepare() : Promise.resolve()).then(() => {
          compiled = true;
        });
      }
      return ready;
    };
    const buildThenDraw = () => build().then(() => !disposed && start());

    // Worlds are built the first time the reel nears the viewport, not all six on page load...
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) buildThenDraw();
      },
      { rootMargin: '200px 0px' }
    );
    io.observe(container);

    // ...and ahead of that, built and drawn once off screen at a quiet moment. A visitor who never pauses on the
    // way down still gets it built a couple of screens early rather than as it arrives.
    const cancelWarm = warmWhenQuiet(buildThenDraw);
    const near = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) buildThenDraw();
      },
      { rootMargin: '200% 0px' }
    );
    near.observe(container);

    const onPointerMove = (e: PointerEvent) => {
      const r = container.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    };
    const onPointerLeave = () => {
      pointer.x = 0;
      pointer.y = 0;
    };
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerleave', onPointerLeave);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      cancelWarm();
      redrawRef.current = () => {};
      ro.disconnect();
      io.disconnect();
      near.disconnect();
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerleave', onPointerLeave);
      painter?.dispose();
    };
  }, [index, reduced]);

  return (
    <div ref={containerRef} className="reel reel--light reel--ink">
      <canvas
        ref={canvasRef}
        className="reel__canvas"
        role="img"
        aria-label={`${domain.name}: ${domain.chapters[activeAct]?.title ?? ''}`}
      />

      <div className="reel__viewfinder" aria-hidden="true">
        <span className="vf-cross vf-tl">+</span>
        <span className="vf-cross vf-tr">+</span>
        <span className="vf-cross vf-bl">+</span>
        <span className="vf-cross vf-br">+</span>
      </div>

      <div className="reel__corner-ctrl">
        <button
          type="button"
          className="reel__toggle"
          onClick={() => setIsPlaying((p) => !p)}
          aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
          title={isPlaying ? 'Pause animation' : 'Play animation'}
        >
          {isPlaying ? (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="5" y="3" width="4" height="18" rx="1" />
              <rect x="15" y="3" width="4" height="18" rx="1" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <polygon points="5,3 21,12 5,21" />
            </svg>
          )}
        </button>
      </div>

      {/* silent while the reel advances on its own; the chapter buttons already name each chapter */}
      <p className="reel__caption" aria-live={isPlaying ? 'off' : 'polite'}>
        <span>{domain.chapters[activeAct]?.tag}</span>
        {domain.chapters[activeAct]?.title}
      </p>

      <div className="reel__progress">
        {domain.chapters.map((ch, i) => (
          <button
            key={ch.act}
            type="button"
            className={`reel__progress-seg ${i === activeAct ? 'is-active' : ''}`}
            onClick={() => seek(i)}
            aria-label={`${ch.act}: ${ch.title}`}
            title={`${ch.act}: ${ch.title}`}
          >
            <em
              ref={(el) => {
                fillRefs.current[i] = el;
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
