import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import {
  createMultiSceneArtifact,
  createContactShadow,
  getOrCreateStudioEnvironment,
} from '../gl/domainCardReelEngine';
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
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    pointerRef.current.targetX = THREE.MathUtils.clamp(x, -1, 1);
    pointerRef.current.targetY = THREE.MathUtils.clamp(y, -1, 1);
  }, []);

  const handleMouseLeave = useCallback(() => {
    pointerRef.current.targetX = 0;
    pointerRef.current.targetY = 0;
  }, []);

  // ── Pure Three.js WebGL 3D Scene Initialization ────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 260;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    camera.position.set(0, 0.35, 3.4);
    camera.lookAt(0, -0.05, 0);

    // 2. High-End WebGL Renderer with ACES Tone Mapping
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.32;

    // Assign Studio Environment Map (Prevents PBR metals from reflecting black!)
    const envMap = getOrCreateStudioEnvironment(renderer);
    scene.environment = envMap;

    // 3. Studio Illumination: Soft Natural Daylight + Warm/Cool Rim Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 3.2);
    keyLight.position.set(3.5, 5.0, 4.0);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 1.8);
    fillLight.position.set(-3.5, 2.0, 3.0);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffedd5, 2.4);
    rimLight.position.set(-2.5, 4.0, -3.5);
    scene.add(rimLight);

    const bounceLight = new THREE.DirectionalLight(0x94a3b8, 1.2);
    bounceLight.position.set(0, -3.0, 0);
    scene.add(bounceLight);

    // Contact floor shadow
    const shadowMesh = createContactShadow(2.8, 2.8, 0.4);
    scene.add(shadowMesh);

    // 4. Procedural 3D Generative Artifact
    const artifact = createMultiSceneArtifact(index);
    scene.add(artifact.group);

    // 5. Observers: Responsive Resizing & Zero Background CPU Load
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        isVisibleRef.current = entries[0].isIntersecting;
      },
      { threshold: 0.05 }
    );
    intersectionObserver.observe(container);

    // 6. Animation Render Loop
    let animationId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      animationId = requestAnimationFrame(loop);
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Inertial pointer smoothing
      pointerRef.current.x += (pointerRef.current.targetX - pointerRef.current.x) * 0.08;
      pointerRef.current.y += (pointerRef.current.targetY - pointerRef.current.y) * 0.08;

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

      // Camera slight tilt with mouse
      camera.position.x = pointerRef.current.x * 0.35;
      camera.position.y = 0.35 + pointerRef.current.y * 0.25;
      camera.lookAt(0, -0.05, 0);

      // Update 3D procedural artifact
      artifact.update(
        animTimeRef.current,
        curIdx,
        curProg,
        pointerRef.current,
        camera
      );

      renderer.render(scene, camera);
    };

    animationId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      artifact.dispose();
      scene.remove(artifact.group);
      scene.remove(shadowMesh);
      renderer.dispose();
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
      {/* ── Layer 1: Pure Three.js WebGL Real-Time 3D Canvas (NO PICTURES) ── */}
      <canvas ref={canvasRef} className="domain-reel-canvas" />

      {/* ── Layer 2: Precision Concentric Calibration Rings ── */}
      <svg className="reel-rings" viewBox="0 0 400 300" aria-hidden="true">
        <circle cx="200" cy="150" r="55" />
        <circle cx="200" cy="150" r="105" />
        <circle cx="200" cy="150" r="155" />
        <line x1="190" y1="150" x2="210" y2="150" />
        <line x1="200" y1="140" x2="200" y2="160" />
      </svg>

      {/* ── Layer 3: Top Cinematic Reel Header ── */}
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

      {/* ── Layer 4: Live Engineering Telemetry Box ── */}
      <div className="reel-floating-metric">
        <span className="metric-label">{currentChapter.metric.label}</span>
        <b className="metric-val">{currentChapter.metric.value}</b>
      </div>

      {/* ── Layer 5: Bottom Narrative Reel HUD ── */}
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
