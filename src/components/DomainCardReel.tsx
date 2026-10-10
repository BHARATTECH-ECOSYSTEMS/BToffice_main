import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { DOMAIN_REELS } from '../data/reelScreenplays';
import '../styles/domain-cinema.css';

const SCENE_DURATION_SEC = 4.2;
const TOTAL_SCENES = 4;

export function DomainCardReel({ index }: { index: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeSceneIdx, setActiveSceneIdx] = useState(0);
  const [sceneProgress, setSceneProgress] = useState(0);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  const isVisibleRef = useRef(false);
  const isPlayingRef = useRef(true);
  const animTimeRef = useRef(0);
  const pointerRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  const domain = useMemo(() => DOMAIN_REELS[index] ?? DOMAIN_REELS[0], [index]);
  const currentChapter = useMemo(
    () => domain.chapters[activeSceneIdx] ?? domain.chapters[0],
    [domain, activeSceneIdx]
  );

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const handleSeek = useCallback((sceneIdx: number) => {
    setActiveSceneIdx(sceneIdx);
    setSceneProgress(0);
    animTimeRef.current = sceneIdx * SCENE_DURATION_SEC;
  }, []);

  const togglePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying((prev) => !prev);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    pointerRef.current.targetX = x;
    pointerRef.current.targetY = y;
  }, []);

  const handleMouseLeave = useCallback(() => {
    pointerRef.current.targetX = 0;
    pointerRef.current.targetY = 0;
  }, []);

  // ── Canvas FX & Particle Loop ──────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // IntersectionObserver to avoid background CPU/GPU load
    const observer = new IntersectionObserver(
      (entries) => {
        isVisibleRef.current = entries[0].isIntersecting;
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    let animationId: number;
    let lastTime = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = container.clientWidth;
      const h = container.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.resetTransform();
      ctx.scale(dpr, dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const render = (now: number) => {
      animationId = requestAnimationFrame(render);
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Pointer smoothing
      pointerRef.current.x += (pointerRef.current.targetX - pointerRef.current.x) * 0.08;
      pointerRef.current.y += (pointerRef.current.targetY - pointerRef.current.y) * 0.08;
      setPointer({ x: pointerRef.current.x, y: pointerRef.current.y });

      if (!isVisibleRef.current) return;

      if (isPlayingRef.current) {
        animTimeRef.current += delta;
      }

      const totalLoop = TOTAL_SCENES * SCENE_DURATION_SEC;
      const t = animTimeRef.current % totalLoop;
      const curIdx = Math.floor(t / SCENE_DURATION_SEC);
      const curProg = (t % SCENE_DURATION_SEC) / SCENE_DURATION_SEC;

      setActiveSceneIdx(curIdx);
      setSceneProgress(curProg);

      const w = container.clientWidth;
      const h = container.clientHeight;
      ctx.clearRect(0, 0, w, h);

      const px = pointerRef.current.x;
      const py = pointerRef.current.y;
      const cx = w / 2 + px * 15;
      const cy = h / 2 + py * 15;

      // ── Domain-Specific Custom FX ──────────────────────────────────────────
      if (index === 0) {
        // GI Rivinity (Quartz Optical Disc): laser track engraving and chromatic dispersion
        if (curIdx === 0) {
          // Act 1: Attention drift markers
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(cx, cy, 54 + Math.sin(t * 3) * 6, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (curIdx === 1) {
          // Act 2: Femtosecond laser carving outward
          const r = 35 + curProg * 75;
          ctx.strokeStyle = '#a855f7';
          ctx.lineWidth = 2.4;
          ctx.shadowColor = '#c084fc';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Laser spark tip
          const angle = t * 6;
          const sx = cx + Math.cos(angle) * r;
          const sy = cy + Math.sin(angle) * r;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (curIdx === 2) {
          // Act 3: 8,000 RPM spectral dispersion
          const angle = t * 4;
          const grad = ctx.createConicGradient(angle, cx, cy);
          grad.addColorStop(0, 'rgba(239, 68, 68, 0.25)');
          grad.addColorStop(0.33, 'rgba(59, 130, 246, 0.25)');
          grad.addColorStop(0.66, 'rgba(16, 185, 129, 0.25)');
          grad.addColorStop(1, 'rgba(239, 68, 68, 0.25)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, cy, 105, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Act 4: Solid 10,000-year verified lock ring
          ctx.strokeStyle = 'rgba(139, 92, 246, 0.7)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, 88, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (index === 1) {
        // Rivinity Core: Optical bus routing packets
        if (curIdx === 1 || curIdx === 2) {
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
          ctx.lineWidth = 1.6;
          // Cross-bus routing paths
          for (let i = 0; i < 4; i++) {
            const bx = cx + (i - 1.5) * 44;
            const by = cy + (i % 2 === 0 ? -35 : 35);
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(bx, by);
            ctx.stroke();

            // Flowing packets
            const progress = (t * 2 + i * 0.25) % 1;
            const px = cx + (bx - cx) * progress;
            const py = cy + (by - cy) * progress;
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (index === 2) {
        // IoT Intelligence: 360° LiDAR radar sweep
        if (curIdx >= 1) {
          const sweepAngle = (t * (curIdx === 1 ? 2 : 5)) % (Math.PI * 2);
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(sweepAngle);
          const sweepGrad = ctx.createLinearGradient(0, 0, 110, 0);
          sweepGrad.addColorStop(0, 'rgba(16, 185, 129, 0)');
          sweepGrad.addColorStop(1, 'rgba(16, 185, 129, 0.45)');
          ctx.fillStyle = sweepGrad;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, 110, -0.28, 0);
          ctx.closePath();
          ctx.fill();
          ctx.restore();

          // Pinged point cloud dots
          if (curIdx >= 2) {
            for (let i = 0; i < 12; i++) {
              const pa = i * 0.52 + Math.sin(t * 0.5 + i);
              const pr = 40 + (i % 4) * 22;
              const ppx = cx + Math.cos(pa) * pr;
              const ppy = cy + Math.sin(pa) * pr;
              ctx.fillStyle = i % 3 === 0 ? '#10b981' : 'rgba(52, 211, 153, 0.6)';
              ctx.beginPath();
              ctx.arc(ppx, ppy, 2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      } else if (index === 3) {
        // Geo Intelligence: Contour elevation scanning lines
        if (curIdx >= 1) {
          ctx.strokeStyle = 'rgba(14, 165, 233, 0.45)';
          ctx.lineWidth = 1.2;
          for (let step = 1; step <= (curIdx === 1 ? Math.floor(curProg * 8) + 1 : 8); step++) {
            const r = step * 13;
            ctx.beginPath();
            ctx.ellipse(cx, cy, r * 1.4, r * 0.9, -0.2, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      } else if (index === 4) {
        // Defense Intelligence: ZK cryptographic proof hash mesh
        if (curIdx >= 1) {
          ctx.strokeStyle = curIdx === 3 ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.45)';
          ctx.lineWidth = 1.2;
          // Enclave perimeter rectangle
          const rw = 120;
          const rh = 75;
          ctx.strokeRect(cx - rw / 2, cy - rh / 2, rw, rh);

          // Corner security crosshairs
          const corners = [
            [cx - rw / 2, cy - rh / 2],
            [cx + rw / 2, cy - rh / 2],
            [cx - rw / 2, cy + rh / 2],
            [cx + rw / 2, cy + rh / 2],
          ];
          corners.forEach(([x, y]) => {
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.stroke();
          });
        }
      } else if (index === 5) {
        // Miniature Intelligence: Synaptic neural firing pulses on 3nm die
        if (curIdx >= 1) {
          ctx.strokeStyle = '#eab308';
          ctx.lineWidth = 1.4;
          // Synaptic sparks
          for (let s = 0; s < 6; s++) {
            const a = s * (Math.PI / 3) + t * 0.5;
            const len = 35 + Math.sin(t * 8 + s) * 15;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
            ctx.stroke();

            // Terminal spark
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(cx + Math.cos(a) * len, cy + Math.sin(a) * len, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
      observer.disconnect();
      ro.disconnect();
    };
  }, [index]);

  const getFillPct = (sIdx: number) => {
    if (sIdx < activeSceneIdx) return 100;
    if (sIdx === activeSceneIdx) return sceneProgress * 100;
    return 0;
  };

  return (
    <div
      ref={containerRef}
      className={`domain-reel-stage act-${activeSceneIdx}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── Layer 1: Photorealistic Macro Hero Image with Parallax ── */}
      <div
        className="reel-image-layer"
        style={{
          transform: `scale(${1 + activeSceneIdx * 0.025}) translate3d(${pointer.x * -6}px, ${pointer.y * -6}px, 0)`,
        }}
      >
        <img
          src={domain.image}
          alt={domain.name}
          className="reel-hero-img"
          loading="eager"
        />
        <div
          className="reel-specular-glare"
          style={{
            transform: `translate3d(${pointer.x * 35}px, ${pointer.y * 35}px, 0)`,
          }}
        />
      </div>

      {/* ── Layer 2: Concentric Thin Calibration Orbit Rings ── */}
      <svg className="reel-rings" viewBox="0 0 400 300" aria-hidden="true">
        <circle cx="200" cy="150" r="55" />
        <circle cx="200" cy="150" r="105" />
        <circle cx="200" cy="150" r="155" />
        <line x1="190" y1="150" x2="210" y2="150" />
        <line x1="200" y1="140" x2="200" y2="160" />
      </svg>

      {/* ── Layer 3: Interactive Dynamic Canvas FX ── */}
      <canvas ref={canvasRef} className="reel-fx-canvas" />

      {/* ── Layer 4: Top Cinematic Reel Header ── */}
      <div className="reel-top-bar">
        <div className="reel-badge">
          <span className="reel-rec-dot" />
          <span className="reel-act-code">{currentChapter.act}</span>
          <span className="reel-divider">·</span>
          <span className="reel-tag-text">{currentChapter.tag}</span>
        </div>

        <div className="reel-top-actions">
          <span className={`reel-status-pill is-${currentChapter.statusType}`}>
            {currentChapter.statusPill}
          </span>
          <button
            type="button"
            className="reel-play-toggle"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause Reel' : 'Play Reel'}
          >
            {isPlaying ? (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="3" width="4" height="18" rx="1" />
                <rect x="15" y="3" width="4" height="18" rx="1" />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 21,12 5,21" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ── Layer 5: Live Engineering Telemetry Box ── */}
      <div className="reel-floating-metric">
        <span className="metric-label">{currentChapter.metric.label}</span>
        <b className="metric-val">{currentChapter.metric.value}</b>
      </div>

      {/* ── Layer 6: Bottom Narrative Reel HUD ── */}
      <div className="reel-bottom-hud">
        {/* 4 Segmented Progress Pills */}
        <div className="reel-segment-track">
          {domain.chapters.map((ch, idx) => (
            <button
              key={idx}
              type="button"
              className={`reel-seg-pill ${idx === activeSceneIdx ? 'is-active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                handleSeek(idx);
              }}
              title={ch.title}
            >
              <div
                className="reel-seg-fill"
                style={{ width: `${getFillPct(idx)}%` }}
              />
            </button>
          ))}
        </div>

        {/* Narrative Chapter Caption */}
        <div className="reel-headline-box">
          <h4 className="reel-chapter-title">{currentChapter.title}</h4>
          <p className="reel-chapter-sub">{currentChapter.sub}</p>
        </div>
      </div>
    </div>
  );
}
