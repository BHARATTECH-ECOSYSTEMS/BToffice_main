import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { createMultiSceneArtifact, createContactShadow } from '../gl/domainCardReelEngine';
import '../styles/domain-cinema.css';

import { REEL_SCREENPLAYS } from '../data/reelScreenplays';

const SCENE_DURATION_SEC = 4.2; // 4.2s per scene = 16.8s total loop
const TOTAL_SCENES = 4;

export function DomainCardReel({ index }: { index: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeSceneIdx, setActiveSceneIdx] = useState(0);
  const [sceneProgress, setSceneProgress] = useState(0);

  const pointerRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const isVisibleRef = useRef(false);
  const isPlayingRef = useRef(true);
  const timeRef = useRef(0);
  const manualSceneOverrideRef = useRef<number | null>(null);

  const chapters = useMemo(() => REEL_SCREENPLAYS[index] ?? REEL_SCREENPLAYS[0], [index]);

  // Keep ref synced
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Jump to specific scene when clicked on segmented bar
  const handleSeekScene = useCallback((sceneIdx: number) => {
    manualSceneOverrideRef.current = sceneIdx;
    setActiveSceneIdx(sceneIdx);
    setSceneProgress(0);
    timeRef.current = sceneIdx * SCENE_DURATION_SEC;
  }, []);

  const togglePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying((prev) => !prev);
  }, []);

  // Mouse move handler for tactile 3D light tilt
  const handlePointerMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    pointerRef.current.targetX = THREE.MathUtils.clamp(x, -1, 1);
    pointerRef.current.targetY = THREE.MathUtils.clamp(y, -1, 1);
  }, []);

  const handlePointerLeave = useCallback(() => {
    pointerRef.current.targetX = 0;
    pointerRef.current.targetY = 0;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // Set up WebGL Scene & High-End Camera
    const scene = new THREE.Scene();

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 240;

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 50);
    camera.position.set(0, 0.38, 3.25);
    camera.lookAt(0, -0.05, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    // Studio Illumination: Soft natural daylight + warm rim + contact floor
    const ambient = new THREE.AmbientLight(0xffffff, 1.25);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    keyLight.position.set(3.2, 4.5, 3.8);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xe0e7ff, 1.1);
    rimLight.position.set(-3.5, 1.8, -2.5);
    scene.add(rimLight);

    // Contact shadow beneath model
    const shadowMesh = createContactShadow(2.6, 2.6, 0.32);
    scene.add(shadowMesh);

    // Instantiate procedural multi-scene artifact
    const artifact = createMultiSceneArtifact(index);
    scene.add(artifact.group);

    // Resize observer
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

    // Visibility observer for zero CPU/GPU overhead when off-screen
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        isVisibleRef.current = entries[0].isIntersecting;
      },
      { threshold: 0.05 }
    );
    intersectionObserver.observe(container);

    let animationFrameId: number;
    let lastClockTime = performance.now();
    let currentTotalTime = 0;

    const renderLoop = (now: number) => {
      animationFrameId = requestAnimationFrame(renderLoop);

      const delta = Math.min((now - lastClockTime) / 1000, 0.1);
      lastClockTime = now;

      // Pointer smoothing for luxurious physical inertia
      pointerRef.current.x += (pointerRef.current.targetX - pointerRef.current.x) * 0.08;
      pointerRef.current.y += (pointerRef.current.targetY - pointerRef.current.y) * 0.08;

      if (!isVisibleRef.current) return;

      if (isPlayingRef.current) {
        currentTotalTime += delta;
      }

      // Calculate scene sequence
      const loopPeriod = TOTAL_SCENES * SCENE_DURATION_SEC;
      const normalizedTime = currentTotalTime % loopPeriod;

      const currentIdx = Math.floor(normalizedTime / SCENE_DURATION_SEC);
      const currentProg = (normalizedTime % SCENE_DURATION_SEC) / SCENE_DURATION_SEC;

      // Update state for UI overlay (throttled smoothly)
      setActiveSceneIdx(currentIdx);
      setSceneProgress(currentProg);

      // Drive 3D model transformation and shaders
      artifact.update(
        currentTotalTime,
        currentIdx,
        currentProg,
        pointerRef.current
      );

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      artifact.dispose();
      scene.remove(artifact.group);
      scene.remove(shadowMesh);
      renderer.dispose();
    };
  }, [index]);

  const currentChapter = chapters[activeSceneIdx] || chapters[0];

  return (
    <div
      ref={containerRef}
      className="domain-reel-container"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <canvas ref={canvasRef} className="domain-reel-canvas" />

      {/* Top Header Overlay: Act Badge & Play/Pause */}
      <div className="reel-top-bar">
        <div className="reel-badge">
          <span className="reel-rec-pulse" />
          <span className="reel-act-code">{currentChapter.act}</span>
          <span className="reel-tag-separator">·</span>
          <span className="reel-tag-label">{currentChapter.tag}</span>
        </div>

        <button
          type="button"
          className="reel-play-toggle"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause Reel' : 'Play Reel'}
          title={isPlaying ? 'Pause 3D Reel' : 'Play 3D Reel'}
        >
          {isPlaying ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6,4 20,12 6,20" />
            </svg>
          )}
        </button>
      </div>

      {/* Bottom Narrative Reel Overlay: 4 Segment Progress Track + Screenplay Title */}
      <div className="reel-narrative-overlay">
        {/* 4 Segmented Progress Bars */}
        <div className="reel-progress-track">
          {Array.from({ length: TOTAL_SCENES }).map((_, sIdx) => {
            let fillPct = 0;
            if (sIdx < activeSceneIdx) fillPct = 100;
            else if (sIdx === activeSceneIdx) fillPct = sceneProgress * 100;

            return (
              <button
                key={sIdx}
                type="button"
                className={`reel-segment-pill ${sIdx === activeSceneIdx ? 'is-active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSeekScene(sIdx);
                }}
                aria-label={`Jump to ${chapters[sIdx]?.title || `Scene ${sIdx + 1}`}`}
              >
                <div
                  className="reel-segment-fill"
                  style={{ width: `${fillPct}%` }}
                />
              </button>
            );
          })}
        </div>

        {/* Narrative Chapter Caption */}
        <div className="reel-caption-block">
          <div className="reel-caption-title">{currentChapter.title}</div>
          <div className="reel-caption-sub">{currentChapter.sub}</div>
        </div>
      </div>
    </div>
  );
}
