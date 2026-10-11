import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
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
  const triggerRef = useRef<ScrollTrigger | null>(null);

  const handleStepClick = (index: number) => {
    const trigger = triggerRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (trigger) {
      scrollTo(trigger.start + ((index + 0.5) / STEPS.length) * (trigger.end - trigger.start), reduced);
    } else {
      const step = trackRef.current?.querySelectorAll<HTMLElement>('.how-pinned-step')[index];
      if (step) scrollTo(window.scrollY + step.getBoundingClientRect().top - 100, reduced);
    }
    setActiveStep(index);
  };

  // Canvas drawing & scroll tracking effect
  useEffect(() => {
    const track = trackRef.current;
    const canvas = canvasRef.current;
    if (!track || !canvas) return;

    const mainContext = canvas.getContext('2d');
    if (!mainContext) return;
    let ctx: CanvasRenderingContext2D = mainContext;

    let W = 0;
    let H = 0;
    let WW = 0;
    let u = 1;
    let G = 0;
    let X: number[] = [];
    let progress = 0;
    let frame = 0;
    let disposed = false;
    let panoramic = true;
    let fontFamily = 'monospace';

    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    // Dimensions are read on resize only. Drawing never measures layout on scroll.
    const sizes = new Map<HTMLCanvasElement, { width: number; height: number }>();
    const canvases = [canvas, ...track.querySelectorAll<HTMLCanvasElement>('.how-step-art')];
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      fontFamily = getComputedStyle(track).getPropertyValue('--mono').trim() || 'monospace';
      canvases.forEach((element) => {
        const width = element.clientWidth;
        const height = element.clientHeight;
        sizes.set(element, { width, height });
        element.width = Math.round(width * dpr);
        element.height = Math.round(height * dpr);
        element.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
      });
    };

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
        ctx.font = `${9 * u}px ${fontFamily}`;
        ctx.fillStyle = colors.inkSoft;
        ctx.fillText(s.label, x - 105 * u, sy + 3 * u);
      });

      // Terminal Badge
      ctx.font = `bold ${10 * u}px ${fontFamily}`;
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
      ctx.font = `bold ${10 * u}px ${fontFamily}`;
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
      ctx.font = `bold ${10 * u}px ${fontFamily}`;
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
        ctx.font = `bold ${9.5 * u}px ${fontFamily}`;
        ctx.fillStyle = colors.ink;
        ctx.fillText(pl.name, px - 18 * u, py - 8 * u);
      });

      // Feedback Arrow returning back to start (Compounding Memory Loop)
      const loopY = y - 12 * u;
      drawLine(x, loopY, X[0], loopY, 1 * u, colors.line, 0.4 * alpha);
      ctx.font = `${8.5 * u}px ${fontFamily}`;
      ctx.fillStyle = colors.inkSoft;
      if (panoramic) ctx.fillText('CONTINUOUS LEARNING & CONTEXT PERSISTENCE LOOP ↺', X[1] - 40 * u, loopY - 5 * u);

      // Station Badge
      ctx.font = `bold ${10 * u}px ${fontFamily}`;
      ctx.fillStyle = colors.violet;
      ctx.fillText('[ 04 · NATIONWIDE SCALE ]', x - 52 * u, y + 20 * u);
    };

    const stations = [drawStation01, drawStation02, drawStation03, drawStation04];
    const draw = (p: number, staticArt: boolean) => {
      const colors = getThemeColors();
      canvases.forEach((element, index) => {
        const size = sizes.get(element);
        if (!size?.width || !size.height) return;
        const context = element.getContext('2d');
        if (!context) return;
        ctx = context;
        panoramic = index === 0;
        W = size.width;
        H = size.height;
        u = index === 0 ? Math.min(1, W / 1180, H / 240) : 0.9;
        WW = W;
        G = H * 0.78;
        X = [0.14, 0.38, 0.62, 0.86].map((f) => f * WW);
        ctx.clearRect(0, 0, W, H);
        ctx.save();
        if (index === 0) {
          drawLine(0, G, WW, G, 1, colors.line);
          stations.forEach((station, i) => station(X[i], staticArt ? 1 : 0.28 + p * 0.72, staticArt ? 0 : p * 5, colors));
        } else {
          // The same PK artwork sits beside its own copy on stacked layouts.
          X = [W / 2 - 180, W / 2, W / 2 + 180, W / 2 + 360];
          stations[index - 1](W / 2, 1, 0, colors);
        }
        ctx.restore();
      });
    };

    const rail = track.querySelector<HTMLElement>('.how-connection-fill')!;
    const marker = track.querySelector<HTMLElement>('.how-connection-marker')!;
    const motion = gsap.matchMedia();
    motion.add({
      desktop: '(min-width: 1100px) and (min-height: 820px)',
      compact: '(max-width: 1099px), (max-height: 819px)',
      reduce: '(prefers-reduced-motion: reduce)',
    }, (context) => {
      const reduced = !!context.conditions?.reduce;
      const pinned = !!context.conditions?.desktop && !reduced;
      let currentStep = -1;
      const update = (p: number) => {
        progress = p;
        rail.style.transform = `scaleX(${p})`;
        marker.style.transform = `translateX(${p * 100}%)`;
        const next = Math.min(STEPS.length - 1, Math.floor(p * STEPS.length));
        if (next !== currentStep) {
          currentStep = next;
          setActiveStep(next);
        }
        draw(p, !pinned);
      };
      resize();
      if (!pinned) {
        // A stacked or short viewport has no pinned reading sequence to scrub.
        // Show complete artwork; phase buttons remain ordinary, usable controls.
        rail.style.transform = 'scaleX(1)';
        setActiveStep(0);
        draw(1, true);
      }
      else {
        const trigger = ScrollTrigger.create({
          trigger: track,
          start: () => `top ${parseFloat(getComputedStyle(track).getPropertyValue('--nav-h')) + 12}`,
          end: 'bottom bottom',
          onUpdate: (self) => update(self.progress),
          onRefresh: (self) => update(self.progress),
        });
        triggerRef.current = trigger;
        update(trigger.progress);
      }
      const observer = new ResizeObserver(() => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          resize();
          ScrollTrigger.refresh();
          draw(progress, !pinned);
        });
      });
      canvases.forEach(element => observer.observe(element));
      observer.observe(track);
      return () => {
        observer.disconnect();
        cancelAnimationFrame(frame);
        triggerRef.current = null;
      };
    }, track);
    document.fonts.ready.then(() => { if (!disposed) ScrollTrigger.refresh(); });
    return () => {
      disposed = true;
      motion.revert();
      cancelAnimationFrame(frame);
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
            <canvas ref={canvasRef} className="how-pinned-canvas" aria-hidden="true" />
          </div>

          <div className="how-process-body">
            <div className="how-connection" aria-hidden="true">
              <span className="how-connection-fill" />
              <span className="how-connection-marker"><i /></span>
            </div>
            <ol className="how-pinned-steps" aria-label="How we work">
              {STEPS.map((s, idx) => (
                <li key={s.num} className={`how-pinned-step ${activeStep === idx ? 'is-active' : ''} ${activeStep > idx ? 'is-done' : ''}`}>
                  <button type="button" className="how-step-select" onClick={() => handleStepClick(idx)}
                    aria-current={activeStep === idx ? 'step' : undefined} aria-label={`Read phase ${idx + 1}: ${s.phase}`}>
                    <span className="how-step-num">{s.num}</span>
                    <span className="how-step-phase">{s.phase}</span>
                  </button>
                  <canvas className="how-step-art" aria-hidden="true" />
                  <h3 className="how-step-title">{s.title}</h3>
                  <p className="how-step-desc">{s.desc}</p>
                  <p className="how-step-metric">{s.metric}</p>
                  {idx === STEPS.length - 1 && <p className="how-step-loop">Continuous learning & context persistence loop ↺</p>}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
