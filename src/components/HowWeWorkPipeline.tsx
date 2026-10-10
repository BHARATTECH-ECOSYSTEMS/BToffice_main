import { useEffect, useRef, useState, useCallback } from 'react';
import { useScene } from '../gl/Scene';

interface StepData {
  num: string;
  phase: string;
  title: string;
  desc: string;
  metric: string;
}

const STEPS: StepData[] = [
  {
    num: '01 / 04',
    phase: 'Ingest & Boundary',
    title: 'Sovereign Ingestion & Intent Parsing',
    desc: 'Unstructured enterprise records, research papers, and national datasets enter an isolated sovereign perimeter. Intent is extracted with zero offshore data leakage.',
    metric: 'Zero-Relay Data Perimeter',
  },
  {
    num: '02 / 04',
    phase: 'Memory Mesh',
    title: 'Tri-Thread Memory & Knowledge Graph',
    desc: 'The three Origin threads—Remembers, Connects, and Learns—weave raw tokens into a living neural graph. Context endures permanently across sessions.',
    metric: 'Persistent Multi-Hop Recall',
  },
  {
    num: '03 / 04',
    phase: 'Sovereign Compute',
    title: 'Cognitive Reasoning Engine & Isolation',
    desc: 'Deep inference executes on in-country accelerated clusters. Concentric zero-trust cryptographic rings enforce mathematical auditability and data sovereignty.',
    metric: '100% In-Country Compute',
  },
  {
    num: '04 / 04',
    phase: 'Nationwide Scale',
    title: 'Sovereign Scale & Continual Evolution',
    desc: 'Models deploy across regional data centers and mobile runtimes. Continuous learning loops feed real-world insights back into the core without catastrophic forgetting.',
    metric: 'BharatAI · BSearch · CollegeCue · Recag',
  },
];

export function HowWeWorkPipeline() {
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { scrollTo } = useScene();
  const [activeStep, setActiveStep] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Jump to step on click
  const handleStepClick = useCallback(
    (index: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const trackTop = window.scrollY + rect.top;
      const totalScrollable = rect.height - window.innerHeight;
      const targetScrollY = trackTop + (index / 3.2) * totalScrollable;
      scrollTo(targetScrollY);
    },
    [scrollTo]
  );

  // Canvas drawing & scroll tracking effect
  useEffect(() => {
    const track = trackRef.current;
    const canvas = canvasRef.current;
    if (!track || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let WW = 0;
    let u = 1;
    let G = 0;
    let X: number[] = [];
    let rafId = 0;
    let currentP = 0;
    let targetP = 0;

    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      u = Math.max(0.68, Math.min(1.4, H / 290));
      WW = Math.max(W, 1180 * u);
      G = H * 0.78;
      X = [0.14, 0.38, 0.62, 0.86].map((f) => f * WW);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const getThemeColors = () => {
      const isDark =
        document.documentElement.getAttribute('data-theme') === 'dark' ||
        document.documentElement.classList.contains('dark');
      return {
        ink: isDark ? '#FAF9F6' : '#14130F',
        inkSoft: isDark ? 'rgba(250, 249, 246, 0.45)' : 'rgba(20, 19, 15, 0.45)',
        line: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(20, 19, 15, 0.1)',
        grid: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(20, 19, 15, 0.04)',
        paper: isDark ? '#161523' : '#FFFFFF',
        violet: isDark ? '#8E7BFF' : '#6E58F5',
        orange: isDark ? '#FFA066' : '#FF8643',
        saffron: isDark ? '#FFB733' : '#F59E00',
      };
    };

    // Technical line drawer
    const drawLine = (x1: number, y1: number, x2: number, y2: number, width: number, color: string, alpha = 1) => {
      ctx.globalAlpha = alpha;
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    // ── Station 01: Ingestion & Sovereign Security Perimeter ──
    const drawStation01 = (x: number, progress: number, t: number, colors: ReturnType<typeof getThemeColors>) => {
      const p = clamp01(progress / 0.28);
      if (p <= 0) return;

      const alpha = easeOut(p);
      const y = G;

      // Ingest Terminal Monolith (Hand-drawn isometric server tower)
      const tw = 54 * u;
      const th = 88 * u * alpha;
      const top = y - th;

      // Tower Base & Body
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = 1.8 * u;
      ctx.globalAlpha = 0.85 * alpha;
      ctx.strokeRect(x - tw / 2, top, tw, th);

      // Internal modular server bays
      for (let bay = 1; bay <= 4; bay++) {
        if (alpha > bay * 0.2) {
          const by = top + (th / 5) * bay;
          drawLine(x - tw / 2 + 6 * u, by, x + tw / 2 - 6 * u, by, 1 * u, colors.ink, 0.4 * alpha);
          // Status activity blips
          const blipLit = Math.sin(t * 4 + bay) > 0;
          ctx.fillStyle = blipLit ? colors.violet : colors.inkSoft;
          ctx.beginPath();
          ctx.arc(x - tw / 2 + 10 * u, by - 4 * u, 1.8 * u, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Vertical Sovereign Security Laser Scanner
      const scanPhase = (Math.sin(t * 3) + 1) / 2;
      const scanY = top + th * scanPhase;
      ctx.setLineDash([3 * u, 3 * u]);
      drawLine(x - tw * 0.9, scanY, x + tw * 0.9, scanY, 1.4 * u, colors.violet, 0.75 * alpha);
      ctx.setLineDash([]);

      // Incoming Data Streams from the left entering the vault
      const streams = [
        { label: 'DOCS', dy: -32 * u },
        { label: 'CODE', dy: -14 * u },
        { label: 'SATELLITE', dy: 6 * u },
        { label: 'SENSORS', dy: 24 * u },
      ];

      streams.forEach((s, idx) => {
        const streamFlow = ((t * 0.8 + idx * 0.25) % 1);
        const sx = x - 90 * u + streamFlow * 60 * u;
        const sy = y - 44 * u + s.dy;

        // Connecting packet line
        drawLine(x - 90 * u, sy, x - tw / 2, sy, 1 * u, colors.line, 0.6 * alpha);

        // Moving data packet node
        ctx.fillStyle = colors.violet;
        ctx.beginPath();
        ctx.arc(sx, sy, 2.5 * u, 0, Math.PI * 2);
        ctx.fill();

        // Technical data label
        ctx.font = `${9 * u}px var(--mono)`;
        ctx.fillStyle = colors.inkSoft;
        ctx.fillText(s.label, x - 105 * u, sy + 3 * u);
      });

      // Terminal Badge
      ctx.font = `bold ${10 * u}px var(--mono)`;
      ctx.fillStyle = colors.violet;
      ctx.fillText('[ 01 · SOVEREIGN INGEST ]', x - tw, y + 20 * u);
    };

    // ── Station 02: Knowledge Graph & Tri-Thread Memory Loom ──
    const drawStation02 = (x: number, progress: number, t: number, colors: ReturnType<typeof getThemeColors>) => {
      const p = clamp01((progress - 0.2) / 0.3);
      if (p <= 0) return;

      const alpha = easeOut(p);
      const y = G;

      // The Three Threads emerging from Station 1 into the Graph
      const threads = [
        { color: colors.violet, name: 'REMEMBERS', offY: -48 * u, freq: 1.2 },
        { color: colors.orange, name: 'CONNECTS', offY: -28 * u, freq: 1.6 },
        { color: colors.saffron, name: 'KEEPS LEARNING', offY: -8 * u, freq: 1.4 },
      ];

      threads.forEach((th, tIdx) => {
        ctx.beginPath();
        ctx.strokeStyle = th.color;
        ctx.lineWidth = 1.8 * u;
        ctx.globalAlpha = 0.8 * alpha;

        const startX = X[0] + 30 * u;
        const endX = x - 30 * u;
        const len = endX - startX;

        for (let currX = startX; currX <= endX; currX += 8 * u) {
          const ratio = (currX - startX) / len;
          const wave = Math.sin(ratio * Math.PI * 2 + t * 2 + tIdx) * 10 * u;
          const currY = y + th.offY + wave;
          if (currX === startX) ctx.moveTo(currX, currY);
          else ctx.lineTo(currX, currY);
        }
        ctx.stroke();

        // Light pulse traveling along thread
        const pulseRatio = (t * 0.4 + tIdx * 0.33) % 1;
        const px = startX + pulseRatio * len;
        const py = y + th.offY + Math.sin(pulseRatio * Math.PI * 2 + t * 2 + tIdx) * 10 * u;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(px, py, 3.2 * u, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = th.color;
        ctx.beginPath();
        ctx.arc(px, py, 1.8 * u, 0, Math.PI * 2);
        ctx.fill();
      });

      // Living Knowledge Graph Lattice (Hexagonal constellation hubs)
      const nodes: [number, number, string][] = [
        [x, y - 55 * u, colors.violet],
        [x - 32 * u, y - 82 * u, colors.orange],
        [x + 32 * u, y - 82 * u, colors.saffron],
        [x - 32 * u, y - 28 * u, colors.saffron],
        [x + 32 * u, y - 28 * u, colors.violet],
        [x, y - 110 * u, colors.violet],
      ];

      // Draw Synaptic Links
      const links = [
        [0, 1],
        [0, 2],
        [0, 3],
        [0, 4],
        [1, 5],
        [2, 5],
        [1, 3],
        [2, 4],
      ];
      links.forEach(([a, b]) => {
        const [x1, y1] = nodes[a];
        const [x2, y2] = nodes[b];
        drawLine(x1, y1, x2, y2, 1.2 * u, colors.ink, 0.35 * alpha);
      });

      // Draw Graph Hub Nodes
      nodes.forEach(([nx, ny, hue], nIdx) => {
        const pulse = 1 + Math.sin(t * 3 + nIdx) * 0.15;
        // Outer halo
        ctx.fillStyle = hue;
        ctx.globalAlpha = 0.2 * alpha;
        ctx.beginPath();
        ctx.arc(nx, ny, 8 * u * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Inner solid core
        ctx.globalAlpha = 0.95 * alpha;
        ctx.beginPath();
        ctx.arc(nx, ny, 3.5 * u, 0, Math.PI * 2);
        ctx.fill();

        // Center dot
        ctx.fillStyle = colors.ink;
        ctx.beginPath();
        ctx.arc(nx, ny, 1.2 * u, 0, Math.PI * 2);
        ctx.fill();
      });

      // Station Badge
      ctx.font = `bold ${10 * u}px var(--mono)`;
      ctx.fillStyle = colors.violet;
      ctx.fillText('[ 02 · KNOWLEDGE WEAVE ]', x - 48 * u, y + 20 * u);
    };

    // ── Station 03: Sovereign Compute Core & Zero-Trust Engine ──
    const drawStation03 = (x: number, progress: number, t: number, colors: ReturnType<typeof getThemeColors>) => {
      const p = clamp01((progress - 0.45) / 0.3);
      if (p <= 0) return;

      const alpha = easeOut(p);
      const y = G;
      const coreY = y - 62 * u;

      // Concentric Zero-Trust Cryptographic Rings
      const ringR1 = 44 * u * alpha;
      const ringR2 = 32 * u * alpha;
      const ringR3 = 18 * u * alpha;

      // Outer Dashed Policy Ring (Rotating clockwise)
      ctx.save();
      ctx.translate(x, coreY);
      ctx.rotate(t * 0.4);
      ctx.setLineDash([8 * u, 5 * u]);
      ctx.strokeStyle = colors.violet;
      ctx.lineWidth = 1.6 * u;
      ctx.globalAlpha = 0.6 * alpha;
      ctx.beginPath();
      ctx.arc(0, 0, ringR1, 0, Math.PI * 2);
      ctx.stroke();

      // Middle Isolation Ring (Rotating counter-clockwise)
      ctx.rotate(-t * 0.8);
      ctx.setLineDash([5 * u, 4 * u]);
      ctx.strokeStyle = colors.orange;
      ctx.beginPath();
      ctx.arc(0, 0, ringR2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Inner Compute Chamber Core
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = 2 * u;
      ctx.globalAlpha = 0.85 * alpha;
      ctx.beginPath();
      ctx.arc(x, coreY, ringR3, 0, Math.PI * 2);
      ctx.stroke();

      // Inner Glowing Sovereign Nucleus
      const nucleusPulse = 8 * u + Math.sin(t * 4) * 2 * u;
      const glow = ctx.createRadialGradient(x, coreY, 2 * u, x, coreY, nucleusPulse * 2.5);
      glow.addColorStop(0, 'rgba(110, 88, 245, 0.6)');
      glow.addColorStop(1, 'rgba(110, 88, 245, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, coreY, nucleusPulse * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Nucleus solid spark
      ctx.fillStyle = colors.violet;
      ctx.beginPath();
      ctx.arc(x, coreY, 4 * u, 0, Math.PI * 2);
      ctx.fill();

      // Structural Support Pillars
      drawLine(x - ringR1 * 0.8, y, x - ringR1 * 0.8, coreY + ringR1 * 0.4, 1.5 * u, colors.ink, 0.4 * alpha);
      drawLine(x + ringR1 * 0.8, y, x + ringR1 * 0.8, coreY + ringR1 * 0.4, 1.5 * u, colors.ink, 0.4 * alpha);

      // Station Badge
      ctx.font = `bold ${10 * u}px var(--mono)`;
      ctx.fillStyle = colors.violet;
      ctx.fillText('[ 03 · SOVEREIGN COMPUTE ]', x - 54 * u, y + 20 * u);
    };

    // ── Station 04: Nationwide Scale & Compounding Ecosystem ──
    const drawStation04 = (x: number, progress: number, t: number, colors: ReturnType<typeof getThemeColors>) => {
      const p = clamp01((progress - 0.7) / 0.3);
      if (p <= 0) return;

      const alpha = easeOut(p);
      const y = G;
      const towerHeight = 104 * u * alpha;
      const top = y - towerHeight;

      // Broadcast Tower Mast
      drawLine(x, y, x, top, 2.4 * u, colors.ink, 0.85 * alpha);

      // Tower cross struts
      for (let s = 1; s <= 4; s++) {
        const sy = y - (towerHeight / 5) * s;
        const sw = (28 * u * (5 - s)) / 5;
        drawLine(x - sw, sy, x + sw, sy, 1 * u, colors.ink, 0.45 * alpha);
      }

      // Radiating Harmonic Signal Waves into the Sky
      for (let wave = 0; wave < 3; wave++) {
        const waveP = (t * 0.35 + wave * 0.33) % 1;
        const wr = waveP * 64 * u;
        const waveAlpha = (1 - waveP) * 0.65 * alpha;
        ctx.strokeStyle = colors.violet;
        ctx.lineWidth = 1.6 * u;
        ctx.globalAlpha = waveAlpha;
        ctx.beginPath();
        ctx.arc(x, top, wr, -Math.PI * 0.85, -Math.PI * 0.15);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Four National Deployment Constellation Hubs (Real Bharattech Platforms)
      const platforms = [
        { name: 'BharatAI', dx: -54 * u, dy: -80 * u, hue: colors.violet },
        { name: 'BSearch', dx: -24 * u, dy: -115 * u, hue: colors.orange },
        { name: 'CollegeCue', dx: 24 * u, dy: -115 * u, hue: colors.saffron },
        { name: 'Recag', dx: 54 * u, dy: -80 * u, hue: colors.violet },
      ];

      platforms.forEach((pl) => {
        const px = x + pl.dx;
        const py = y + pl.dy;

        // Uplink ray
        drawLine(x, top, px, py, 1 * u, pl.hue, 0.4 * alpha);

        // Platform Node
        ctx.fillStyle = pl.hue;
        ctx.globalAlpha = 0.9 * alpha;
        ctx.beginPath();
        ctx.arc(px, py, 4 * u, 0, Math.PI * 2);
        ctx.fill();

        // Platform Label
        ctx.font = `bold ${9.5 * u}px var(--mono)`;
        ctx.fillStyle = colors.ink;
        ctx.fillText(pl.name, px - 18 * u, py - 8 * u);
      });

      // Feedback Arrow returning back to start (Compounding Memory Loop)
      const loopY = y - 12 * u;
      drawLine(x, loopY, X[0], loopY, 1 * u, colors.line, 0.4 * alpha);
      ctx.font = `${8.5 * u}px var(--mono)`;
      ctx.fillStyle = colors.inkSoft;
      ctx.fillText('CONTINUOUS LEARNING & CONTEXT PERSISTENCE LOOP ↺', X[1] - 40 * u, loopY - 5 * u);

      // Station Badge
      ctx.font = `bold ${10 * u}px var(--mono)`;
      ctx.fillStyle = colors.violet;
      ctx.fillText('[ 04 · NATIONWIDE SCALE ]', x - 52 * u, y + 20 * u);
    };

    // ── Main Render Loop ──
    const render = (time: number) => {
      // Smooth progress interpolation
      currentP = lerp(currentP, targetP, 0.08);
      const p = currentP;

      ctx.clearRect(0, 0, W, H);
      const colors = getThemeColors();
      const tSec = time * 0.001;

      // Camera pans across the panoramic world
      const maxCam = Math.max(0, WW - W);
      const camX = p * maxCam;

      ctx.save();
      ctx.translate(-camX, 0);

      // ── Ground Baseline & Sub-Grid ──
      drawLine(0, G, WW, G, 2 * u, colors.ink, 0.8);
      for (let gx = 20; gx < WW; gx += 40 * u) {
        drawLine(gx, G, gx - 8 * u, G + 7 * u, 1 * u, colors.line, 0.35);
      }

      // Render the 4 progressive stations
      drawStation01(X[0], p, tSec, colors);
      drawStation02(X[1], p, tSec, colors);
      drawStation03(X[2], p, tSec, colors);
      drawStation04(X[3], p, tSec, colors);

      ctx.restore();

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    // ── Scroll Listener for Pinned Chapter ──
    const onScroll = () => {
      const rect = track.getBoundingClientRect();
      const totalScrollable = rect.height - window.innerHeight;
      if (totalScrollable <= 0) return;

      const progress = clamp01(-rect.top / totalScrollable);
      targetP = progress;
      setScrollProgress(progress);

      const stepIdx = Math.min(3, Math.floor(progress * 3.99));
      setActiveStep(stepIdx);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="how-scroll-track" ref={trackRef}>
      {/* Sticky Frame: Pinned Viewport */}
      <div className="how-sticky-frame">
        <div className="how-pinned-card">
          {/* Header */}
          <div className="how-pinned-head">
            <div>
              <div className="about-eyebrow">
                <span className="about-eyebrow-dot" />
                How We Work
              </div>
              <h2 className="how-pinned-title">From foundational hypothesis to sovereign scale</h2>
            </div>
            <div className="how-pinned-meta">
              <span className="how-pinned-step-indicator">
                Phase {STEPS[activeStep].num.slice(0, 2)}: {STEPS[activeStep].phase}
              </span>
            </div>
          </div>

          {/* Panoramic Scroll-Driven Canvas Stage */}
          <div className="how-pinned-stage">
            <canvas ref={canvasRef} className="how-pinned-canvas" />
          </div>

          {/* 4 Interactive Step Progression Cards */}
          <div className="how-pinned-steps" role="tablist">
            {STEPS.map((s, idx) => {
              const isActive = activeStep === idx;
              const isDone = activeStep > idx;
              // Quartile progress: 0 to 1 for this specific step
              const stepP = Math.max(0, Math.min(1, (scrollProgress - idx * 0.25) / 0.25));

              return (
                <button
                  key={s.num}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`how-pinned-step ${isActive ? 'is-active' : ''} ${isDone ? 'is-done' : ''}`}
                  onClick={() => handleStepClick(idx)}
                >
                  {/* Step Progress Fill Line */}
                  <div className="how-step-rail">
                    <div
                      className="how-step-fill"
                      style={{ width: `${isDone ? 100 : Math.round(stepP * 100)}%` }}
                    />
                  </div>

                  <div className="how-step-num-row">
                    <span className="how-step-num">{s.num}</span>
                    <span className="how-step-phase">{s.phase}</span>
                  </div>

                  <h3 className="how-step-title">{s.title}</h3>
                  <p className="how-step-desc">{s.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
