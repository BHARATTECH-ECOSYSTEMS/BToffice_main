import { useEffect, useRef, useState, useCallback } from 'react';
import { BtnText, Arrow } from './ui';
import { Link } from 'react-router';
import { useScene } from '../gl/Scene';
import { pageScroll, trackBox } from './trackBox';
import {
  type Palette,
  type Pt,
  arc,
  clamp01,
  drawStrokes,
  easeInOut,
  easeOut,
  easeOutBack,
  getPalette,
  glowDot,
  lerp,
  line,
  span,
  wobble,
} from '../gl/ink';

interface StepData {
  phase: string;
  title: string;
  desc: string;
}

const STEPS: StepData[] = [
  {
    phase: 'Ingest & Boundary',
    title: 'Sovereign Ingestion & Intent Parsing',
    desc: 'Unstructured enterprise records, research papers, and national datasets enter an isolated sovereign perimeter. Intent is extracted with zero offshore data leakage.',
  },
  {
    phase: 'Memory Mesh',
    title: 'Tri-Thread Memory & Knowledge Graph',
    desc: 'The three Origin threads—Remembers, Connects, and Learns—weave raw tokens into a living neural graph. Context endures permanently across sessions.',
  },
  {
    phase: 'Sovereign Compute',
    title: 'Cognitive Reasoning Engine & Isolation',
    desc: 'Deep inference executes on in-country accelerated clusters. Concentric zero-trust cryptographic rings enforce mathematical auditability and data sovereignty.',
  },
  {
    phase: 'Nationwide Scale',
    title: 'Sovereign Scale & Continual Evolution',
    desc: 'Models deploy across regional data centers and mobile runtimes. Continuous learning loops feed real-world insights back into the core without catastrophic forgetting.',
  },
];

const STEP_COUNT = STEPS.length;

/** At 900px and below the CSS drops `position: sticky`, so the section scrolls like normal content. */
const isPinned = (track: HTMLElement) => {
  const frame = track.firstElementChild;
  return !!frame && getComputedStyle(frame).position === 'sticky';
};

interface World {
  ctx: CanvasRenderingContext2D;
  c: Palette;
  u: number;
  G: number;
  t: number;
}

// ── 01 · A dashed sovereign dome; records drop in and resolve into intent ──
function drawIngest(w: World, x: number, build: number) {
  const { ctx, c, u, G, t } = w;
  const r = 62 * u;

  ctx.strokeStyle = c.ink;
  ctx.lineWidth = 2 * u;
  ctx.setLineDash([7 * u, 6 * u]);
  // The gap at the lower left is the gate records enter through.
  drawStrokes(ctx, [wobble(arc(x, G, r, Math.PI * 1.14, Math.PI * 2), 1, 0.8 * u)], span(build, 0, 0.45));
  ctx.setLineDash([]);

  for (let k = 0; k < 3; k++) {
    const f = span(build, 0.3 + k * 0.17, 0.52 + k * 0.17);
    if (f <= 0) continue;
    const restY = G - 24 * u - k * 13 * u;
    const y = lerp(G - 190 * u, restY, easeOut(f));
    const sx = x - 22 * u + k * 12 * u;
    const tilt = (1 - f) * (k % 2 ? 0.25 : -0.25) + (k - 1) * 0.06;
    ctx.save();
    ctx.translate(sx, y);
    ctx.rotate(tilt);
    ctx.fillStyle = c.paper;
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 1.6 * u;
    ctx.beginPath();
    ctx.moveTo(-10 * u, -12 * u);
    ctx.lineTo(5 * u, -12 * u);
    ctx.lineTo(10 * u, -7 * u);
    ctx.lineTo(10 * u, 12 * u);
    ctx.lineTo(-10 * u, 12 * u);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 1 * u;
    for (let l = 0; l < 3; l++) {
      ctx.beginPath();
      ctx.moveTo(-6 * u, (-4 + l * 5) * u);
      ctx.lineTo((l === 2 ? 1 : 6) * u, (-4 + l * 5) * u);
      ctx.stroke();
    }
    ctx.restore();
  }

  const intent = span(build, 0.86, 1);
  if (intent > 0) glowDot(ctx, c, x + 26 * u, G - 44 * u + Math.sin(t * 2.2) * 2 * u, 4.5 * u, intent);
}

// ── 02 · A knowledge tree grows; its nodes take the three thread colours ──
function drawMemory(w: World, x: number, build: number) {
  const { ctx, c, u, G, t } = w;
  const nodes: Pt[] = [
    [x - 40 * u, G - 72 * u],
    [x + 42 * u, G - 84 * u],
    [x - 28 * u, G - 124 * u],
    [x + 32 * u, G - 132 * u],
    [x, G - 156 * u],
  ];
  const hues = [c.violet, c.orange, c.saffron, c.orange, c.violet];

  ctx.strokeStyle = c.ink;
  ctx.lineWidth = 2.4 * u;
  drawStrokes(ctx, [wobble(line([x, G], [x, G - 104 * u], 12), 4, 1.2 * u)], span(build, 0, 0.3));

  ctx.lineWidth = 1.8 * u;
  const roots: Pt[] = [[x, G - 50 * u], [x, G - 62 * u], [x, G - 98 * u], [x, G - 98 * u], [x, G - 104 * u]];
  drawStrokes(
    ctx,
    nodes.map((n, i) => wobble(line(roots[i], n, 8), 7 + i, 1.1 * u)),
    span(build, 0.22, 0.7)
  );

  // Cross-links: recall that jumps between branches, not just along them
  ctx.lineWidth = 1.2 * u;
  ctx.setLineDash([4 * u, 4 * u]);
  ctx.strokeStyle = c.violet;
  drawStrokes(
    ctx,
    [[0, 2], [1, 3], [2, 4], [3, 4]].map(([a, b]) => line(nodes[a], nodes[b], 6)),
    span(build, 0.62, 1)
  );
  ctx.setLineDash([]);

  nodes.forEach(([nx, ny], i) => {
    const pop = span(build, 0.4 + i * 0.08, 0.55 + i * 0.08);
    if (pop <= 0) return;
    const r = 7 * u * easeOutBack(pop) * (1 + Math.sin(t * 2.4 + i) * 0.05);
    ctx.fillStyle = hues[i];
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 1.6 * u;
    ctx.beginPath();
    ctx.arc(nx, ny, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
}

// ── 03 · Compute racks stack up and a zero-trust ring closes around them ──
function drawCompute(w: World, x: number, build: number) {
  const { ctx, c, u, G, t } = w;
  const blockH = 16 * u;
  const gap = 3 * u;

  for (let k = 0; k < 5; k++) {
    const f = span(build, k * 0.14, k * 0.14 + 0.2);
    if (f <= 0) continue;
    const bw = (76 - k * 6) * u;
    const restY = G - (k + 1) * (blockH + gap);
    const y = lerp(G - 240 * u, restY, easeOut(f));
    ctx.globalAlpha = Math.min(1, f * 3);
    ctx.fillStyle = c.ink;
    ctx.beginPath();
    ctx.roundRect(x - bw / 2, y, bw, blockH, 3 * u);
    ctx.fill();
    // Accelerator status lights
    for (let l = 0; l < 3; l++) {
      const lit = Math.sin(t * 3 + k * 1.9 + l * 2.1) > -0.2;
      ctx.fillStyle = lit ? (l === 1 ? c.saffron : c.violet) : c.paper;
      ctx.beginPath();
      ctx.arc(x - bw / 2 + (9 + l * 8) * u, y + blockH / 2, 2 * u, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  const ring = span(build, 0.76, 1);
  if (ring > 0) {
    ctx.save();
    ctx.strokeStyle = c.violet;
    ctx.lineWidth = 1.8 * u;
    ctx.setLineDash([6 * u, 5 * u]);
    ctx.lineDashOffset = -t * 14 * u;
    ctx.globalAlpha = ring;
    ctx.beginPath();
    ctx.ellipse(x, G - 52 * u, 66 * u, 18 * u, -0.08, 0, Math.PI * 2 * ring);
    ctx.stroke();
    ctx.restore();
  }
}

// ── 04 · A broadcast tower rises and lights up the four platforms ──
function drawScale(w: World, x: number, build: number) {
  const { ctx, c, u, G, t } = w;
  const top: Pt = [x, G - 140 * u];
  const tip: Pt = [x, G - 160 * u];

  ctx.strokeStyle = c.ink;
  ctx.lineWidth = 2.2 * u;
  const braces: Pt[][] = [];
  for (let i = 0; i < 4; i++) {
    const y0 = G - i * 34 * u;
    const y1 = G - (i + 1) * 34 * u;
    const half = (y: number) => lerp(24 * u, 5 * u, (G - y) / (140 * u));
    braces.push(line([x - half(y0), y0], [x + half(y1), y1], 4));
  }
  drawStrokes(
    ctx,
    [
      wobble(line([x - 24 * u, G], [x - 5 * u, top[1]], 10), 11, 0.9 * u),
      wobble(line([x + 24 * u, G], [x + 5 * u, top[1]], 10), 13, 0.9 * u),
      ...braces,
      line(top, tip, 4),
    ],
    span(build, 0, 0.45)
  );

  // Signal ripples once the mast is up
  const live = span(build, 0.45, 0.55);
  for (let i = 0; i < 3; i++) {
    const f = (t * 0.45 + i / 3) % 1;
    ctx.strokeStyle = c.violet;
    ctx.lineWidth = 1.6 * u;
    ctx.globalAlpha = live * (1 - f) * 0.8;
    ctx.beginPath();
    ctx.arc(tip[0], tip[1], (10 + f * 46) * u, -Math.PI * 0.85, -Math.PI * 0.15);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const platforms: [number, number, string][] = [
    [-118, -150, c.violet],
    [-58, -206, c.orange],
    [58, -206, c.saffron],
    [118, -150, c.violet],
  ];
  platforms.forEach(([dx, dy, hue], i) => {
    const f = span(build, 0.5 + i * 0.08, 0.66 + i * 0.08);
    if (f <= 0) return;
    const p: Pt = [x + dx * u, G + dy * u];
    ctx.strokeStyle = c.faint;
    ctx.lineWidth = 1.2 * u;
    ctx.setLineDash([3 * u, 4 * u]);
    drawStrokes(ctx, [line(tip, p, 6)], f);
    ctx.setLineDash([]);
    ctx.strokeStyle = hue;
    ctx.lineWidth = 2.4 * u;
    drawStrokes(ctx, [arc(p[0], p[1], 11 * u, -Math.PI / 2, Math.PI * 1.5, 24)], f);
  });

  const spark = span(build, 0.9, 1);
  if (spark > 0) {
    const pulse = 1 + Math.sin(t * 3) * 0.12;
    ctx.strokeStyle = c.violet;
    ctx.lineWidth = 1.6 * u;
    ctx.globalAlpha = spark;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + t * 0.4;
      ctx.beginPath();
      ctx.moveTo(tip[0] + Math.cos(a) * 7 * u, tip[1] + Math.sin(a) * 7 * u);
      ctx.lineTo(tip[0] + Math.cos(a) * 15 * u * pulse, tip[1] + Math.sin(a) * 15 * u * pulse);
      ctx.stroke();
    }
    glowDot(ctx, c, tip[0], tip[1], 4 * u, spark);
  }
}

const STATIONS = [drawIngest, drawMemory, drawCompute, drawScale];

/** The Origin orb: walks the ground, trailing the three brand threads behind it. */
function drawOrb(w: World, x: number, speed: number, blink: boolean) {
  const { ctx, c, u, G, t } = w;
  const walking = Math.min(1, speed);
  const stride = Math.sin(t * 11) * walking;
  const bob = Math.abs(stride) * 3 * u + Math.sin(t * 2) * 0.8 * u * (1 - walking);
  const cy = G - 22 * u - bob;
  const r = 13 * u;

  ctx.strokeStyle = c.ink;
  ctx.lineWidth = 2 * u;
  [-1, 1].forEach((side) => {
    const sw = side * stride * 5 * u;
    ctx.beginPath();
    ctx.moveTo(x + side * 4 * u, cy + r * 0.7);
    ctx.lineTo(x + side * 5 * u + sw, G);
    ctx.stroke();
  });

  [c.violet, c.orange, c.saffron].forEach((hue, k) => {
    ctx.strokeStyle = hue;
    ctx.lineWidth = 2 * u;
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const f = i / 10;
      const px = x - r * 0.8 - f * 26 * u;
      const py = cy + (k - 1) * 5 * u + Math.sin(t * 7 + f * 5 + k * 2) * 3 * u * f;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  });

  ctx.fillStyle = c.ink;
  ctx.beginPath();
  ctx.arc(x, cy, r, 0, Math.PI * 2);
  ctx.fill();

  const eyeH = blink ? 0.6 * u : 3.6 * u;
  [x + 1.5 * u, x + 9.5 * u].forEach((ex) => {
    ctx.fillStyle = c.paper;
    ctx.beginPath();
    ctx.ellipse(ex, cy - 3 * u, 3.4 * u, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!blink) {
      ctx.fillStyle = c.ink;
      ctx.beginPath();
      ctx.arc(ex + 1.2 * u, cy - 2.6 * u, 1.7 * u, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

export function HowWeWorkPipeline() {
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { scrollTo } = useScene();
  const stepsRef = useRef<HTMLOListElement>(null);
  // Progress changes every scroll frame, so it lives in a ref and a CSS variable; React re-renders only when
  // the active step changes. The draw loop reads the ref, so it never restarts on React updates.
  const progressRef = useRef(0);
  const [activeStep, setActiveStep] = useState(0);
  // Wakes the draw loop after a change (it idles off-screen and under reduced motion).
  const redrawRef = useRef<() => void>(() => {});

  const setProgress = useCallback((p: number) => {
    progressRef.current = p;
    stepsRef.current?.style.setProperty('--how-progress', p.toFixed(4));
    setActiveStep(Math.min(STEP_COUNT - 1, Math.floor(p * STEP_COUNT)));
    redrawRef.current();
  }, []);

  const handleStepClick = useCallback(
    (index: number) => {
      const track = trackRef.current;
      if (!track) return;
      if (!isPinned(track)) {
        // No pinned scroll range to seek, so show that step fully built.
        setProgress((index + 0.999) / STEP_COUNT);
        return;
      }
      const rect = track.getBoundingClientRect();
      const totalScrollable = rect.height - window.innerHeight;
      // Land after the walk, while the station is being drawn.
      scrollTo(window.scrollY + rect.top + ((index + 0.7) / STEP_COUNT) * totalScrollable);
    },
    [scrollTo, setProgress]
  );

  useEffect(() => {
    const track = trackRef.current;
    const canvas = canvasRef.current;
    if (!track || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W = 0;
    let H = 0;
    let dpr = 1;
    let rafId = 0;
    let visible = false;
    let lastTime = 0;
    let shown = progressRef.current;
    let orbX = -1;

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    };

    const render = (time: number) => {
      // Time-based easing keeps motion the same speed at 60Hz, 120Hz or when throttled.
      const dt = lastTime ? Math.min(0.25, (time - lastTime) / 1000) : 1 / 60;
      lastTime = time;
      shown = reduced ? progressRef.current : lerp(shown, progressRef.current, 1 - Math.exp(-dt * 6));

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const c = getPalette();
      const t = reduced ? 0 : time * 0.001;
      const u = Math.max(0.45, Math.min(1.4, W / 1200, H / 330));
      const G = H * 0.82;
      const X = [0.14, 0.38, 0.62, 0.86].map((f) => f * W);
      const world: World = { ctx, c, u, G, t };

      // Each step: the orb walks to its station (first 30%), then the station is drawn.
      const s = shown * STEP_COUNT;
      const stand = (i: number) => X[i] - 70 * u;
      const step = Math.min(STEP_COUNT - 1, Math.floor(s));
      const walk = easeInOut(span(s - step, 0, 0.3));
      const targetX = lerp(step === 0 ? 0.03 * W : stand(step - 1), stand(step), walk);
      const speed = orbX < 0 ? 0 : Math.abs(targetX - orbX) / Math.max(dt, 1 / 120) / (90 * u);
      orbX = targetX;

      // Faint thread lines across the sky, inked only as far as the orb has travelled
      [c.violet, c.orange, c.saffron].forEach((hue, k) => {
        const pts: Pt[] = [];
        for (let px = 0; px <= orbX - 30 * u; px += 8) {
          pts.push([px, G - (182 - k * 20) * u + Math.sin((px / W) * Math.PI * 2.2 + k * 1.4) * 16 * u]);
        }
        if (pts.length < 2) return;
        ctx.strokeStyle = hue;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1.2 * u;
        drawStrokes(ctx, [pts], 1);
        ctx.globalAlpha = 1;
      });

      // Ground line with hatching
      ctx.strokeStyle = c.ink;
      ctx.lineWidth = 2.4 * u;
      drawStrokes(ctx, [wobble(line([0, G], [W, G], 60), 3, 0.9 * u)], 1);
      ctx.strokeStyle = c.faint;
      ctx.lineWidth = 1 * u;
      for (let gx = 12 * u; gx < W; gx += 34 * u) {
        ctx.beginPath();
        ctx.moveTo(gx, G + 6 * u);
        ctx.lineTo(gx - 8 * u, G + 13 * u);
        ctx.stroke();
      }

      STATIONS.forEach((draw, i) => draw(world, X[i], span(s - i, 0.3, 1)));

      const blink = !reduced && time % 4200 < 140;
      drawOrb(world, orbX, speed, blink);

      rafId = visible && !reduced ? requestAnimationFrame(render) : 0;
      if (!rafId) lastTime = 0;
    };

    const start = () => {
      if (!rafId) rafId = requestAnimationFrame(render);
    };
    redrawRef.current = start;

    resize();
    const ro = new ResizeObserver(() => {
      resize();
      start();
    });
    ro.observe(canvas);

    // Only animate while the section is on screen; the track is several viewports tall.
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    });
    io.observe(canvas);

    // The track's cached box and pinned state, re-read only when layout changes, so scrolling never
    // forces the browser to recalculate layout.
    let pinned = false;
    const { box, release } = trackBox(track, () => {
      pinned = isPinned(track);
    });
    let scrollRaf = 0;
    let last = -1;
    const measure = () => {
      scrollRaf = 0;
      if (!pinned) return;
      const totalScrollable = box.height - window.innerHeight;
      if (totalScrollable <= 0) return;
      const p = clamp01((pageScroll() - box.top) / totalScrollable);
      // off screen the value stops changing, so there is nothing to update
      if (p === last) return;
      last = p;
      setProgress(p);
    };
    const onScroll = () => {
      if (!scrollRaf) scrollRaf = requestAnimationFrame(measure);
    };

    // Unpinned layouts have no scroll story, so open on the first step already drawn.
    if (!pinned) setProgress(0.999 / STEP_COUNT);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    measure();

    return () => {
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(scrollRaf);
      release();
      redrawRef.current = () => {};
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      ro.disconnect();
      io.disconnect();
    };
  }, [setProgress]);

  return (
    <div className="how-scroll-track" ref={trackRef}>
      <div className="how-sticky-frame">
        <div className="how-paper">
          <div className="how-paper-head">
            <div>
              <h2 className="how-paper-title">From foundational hypothesis to sovereign scale</h2>
            </div>
            <Link to="/contact" className="btn btn-primary">
              <BtnText>Start a Conversation</BtnText> <Arrow dir="up-right" />
            </Link>
          </div>

          <div className="how-paper-stage">
            <canvas ref={canvasRef} className="how-paper-canvas" aria-hidden="true" />
          </div>

          <ol className="how-paper-steps" ref={stepsRef}>
            {STEPS.map((s, idx) => {
              const state = idx === activeStep ? 'is-active' : idx < activeStep ? 'is-done' : '';
              return (
                <li key={s.title} className={`how-paper-step ${state}`}>
                  <button
                    type="button"
                    aria-current={idx === activeStep ? 'step' : undefined}
                    onClick={() => handleStepClick(idx)}
                  >
                    <span className="how-paper-num">
                      {s.phase}
                    </span>
                    <h3>{s.title}</h3>
                    <p>{s.desc}</p>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
