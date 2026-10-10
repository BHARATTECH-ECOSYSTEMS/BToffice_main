import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import {
  createMultiSceneArtifact,
  createContactShadow,
  getOrCreateStudioEnvironment,
} from '../gl/domainCardReelEngine';
import { DOMAIN_REELS } from '../data/reelScreenplays';
import '../styles/domain-cinema.css';

// Demaze cinematic pacing: 2.8s per chapter (11.2s total loop)
const SCENE_DURATION_SEC = 2.8;
const TOTAL_SCENES = 4;

// Base camera anchor per chapter
const CAMERA_BASE = [
  { x: 0, y: 0.35, z: 3.32 }, // Act 0: Sealed / Standby
  { x: 0, y: 0.28, z: 3.06 }, // Act 1: Kinematic Unlatch (dolly in)
  { x: 0, y: 0.42, z: 3.14 }, // Act 2: Active High-Speed Operation (elevated)
  { x: 0, y: 0.36, z: 3.54 }, // Act 3: Exploded Architecture (pull back)
];

export function DomainCardReel({ index }: { index: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeSceneIdx, setActiveSceneIdx] = useState(0);
  const [sceneProgress, setSceneProgress] = useState(0);

  const isVisibleRef = useRef(false);
  const isPlayingRef = useRef(true);
  const animTimeRef = useRef(0);
  const pointerRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const lastSceneRef = useRef(0);

  const domain = useMemo(() => DOMAIN_REELS[index] ?? DOMAIN_REELS[0], [index]);
  const currentChapter = useMemo(
    () => domain.chapters[activeSceneIdx] ?? domain.chapters[0],
    [domain, activeSceneIdx]
  );

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const triggerFlashCut = useCallback(() => {
    if (!flashRef.current) return;
    flashRef.current.style.opacity = '0.22';
    setTimeout(() => {
      if (flashRef.current) flashRef.current.style.opacity = '0';
    }, 60);
  }, []);

  const handleSeek = useCallback((sceneIdx: number) => {
    setActiveSceneIdx(sceneIdx);
    setSceneProgress(0);
    animTimeRef.current = sceneIdx * SCENE_DURATION_SEC;
    triggerFlashCut();
  }, [triggerFlashCut]);

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

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 280;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    const initialCam = CAMERA_BASE[0];
    camera.position.set(initialCam.x, initialCam.y, initialCam.z);
    camera.lookAt(0, -0.04, 0);

    // 2. High-End WebGL Renderer with ACES Tone Mapping
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.34;

    // Assign Studio Environment Map
    const envMap = getOrCreateStudioEnvironment(renderer);
    scene.environment = envMap;

    // 3. Studio Illumination Rig
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

    // Soft Contact Floor Shadow
    const shadowMesh = createContactShadow(2.8, 2.8, 0.38);
    scene.add(shadowMesh);

    // 4. Procedural 3D Generative Artifact
    const artifact = createMultiSceneArtifact(index);
    scene.add(artifact.group);

    // 5. Responsive Resize & Intersection Observers
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

    // 6. Demaze Motion & Animation Loop
    let animationId: number;
    let lastTime = performance.now();
    const currentCamPos = new THREE.Vector3(initialCam.x, initialCam.y, initialCam.z);

    const loop = (now: number) => {
      animationId = requestAnimationFrame(loop);
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Pointer smoothing
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

      // Trigger Demaze flash cut on act boundary
      if (curIdx !== lastSceneRef.current) {
        lastSceneRef.current = curIdx;
        triggerFlashCut();
      }

      setActiveSceneIdx(curIdx);
      setSceneProgress(curProg);

      // ── Demaze Signature Transition Dynamics: Land → Drift → Punch Cut ──────
      // 1. Landing (0 to 0.22): Arrives from slightly closer with spring ease
      // 2. Cinematic Drift (0.22 to 0.86): Slow steady push-in dolly
      // 3. Punch Cut (0.86 to 1.0): Accelerates into cut
      const targetAnchor = CAMERA_BASE[curIdx] ?? CAMERA_BASE[0];

      let dynamicZOffset = 0;
      if (curProg < 0.22) {
        const landT = curProg / 0.22;
        const landEase = 1 - Math.pow(1 - landT, 3);
        dynamicZOffset = (1 - landEase) * 0.18;
      } else if (curProg < 0.86) {
        const driftT = (curProg - 0.22) / 0.64;
        dynamicZOffset = -driftT * 0.09;
      } else {
        const punchT = (curProg - 0.86) / 0.14;
        dynamicZOffset = -0.09 - punchT * punchT * 0.08;
      }

      const targetX = targetAnchor.x + pointerRef.current.x * 0.25;
      const targetY = targetAnchor.y + pointerRef.current.y * 0.2;
      const targetZ = targetAnchor.z + dynamicZOffset;

      currentCamPos.x += (targetX - currentCamPos.x) * 0.07;
      currentCamPos.y += (targetY - currentCamPos.y) * 0.07;
      currentCamPos.z += (targetZ - currentCamPos.z) * 0.07;

      camera.position.copy(currentCamPos);
      camera.lookAt(0, -0.04, 0);

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
  }, [index, triggerFlashCut]);

  const getFillPct = (sIdx: number) => {
    if (sIdx < activeSceneIdx) return 100;
    if (sIdx === activeSceneIdx) return sceneProgress * 100;
    return 0;
  };

  return (
    <div
      ref={containerRef}
      className={`reel reel--noir act-${activeSceneIdx}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── Layer 1: Pure Three.js WebGL Real-Time 3D Canvas ── */}
      <canvas ref={canvasRef} className="reel__canvas" />

      {/* ── Layer 2: Demaze White Flash on Cut ── */}
      <div ref={flashRef} className="reel__flash" aria-hidden="true" />

      {/* ── Layer 3: Demaze Concentric Orbit Rings Background ── */}
      <svg className="reel__rings" viewBox="0 0 640 440" aria-hidden="true">
        <circle cx="320" cy="220" r="90" />
        <circle cx="320" cy="220" r="160" />
        <circle cx="320" cy="220" r="240" />
        <circle cx="320" cy="220" r="330" />
      </svg>

      {/* ── Layer 4: Precision Viewfinder Corner Crosshairs ── */}
      <div className="reel__viewfinder" aria-hidden="true">
        <span className="vf-cross vf-tl">+</span>
        <span className="vf-cross vf-tr">+</span>
        <span className="vf-cross vf-bl">+</span>
        <span className="vf-cross vf-br">+</span>
      </div>

      {/* ── Layer 5: Demaze Precision Header (.reel__head) ── */}
      <div className="reel__head">
        <div className="reel__chap">
          <b>0{activeSceneIdx + 1} / 04</b>
          <em>·</em>
          <span>{currentChapter.tag}</span>
        </div>

        <div className="reel__head-actions">
          <span className={`reel__status is-${currentChapter.statusType}`}>
            {currentChapter.statusPill}
          </span>
          <button
            type="button"
            className="reel__toggle"
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

      {/* ── Layer 6: Demaze Hairline Segment Progress Bar (.reel__progress) ── */}
      <div className="reel__progress">
        {domain.chapters.map((ch, idx) => (
          <button
            key={idx}
            type="button"
            className={`reel__progress-seg ${idx === activeSceneIdx ? 'is-active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleSeek(idx);
            }}
            title={`${ch.act}: ${ch.title}`}
          >
            <em style={{ transform: `scaleX(${getFillPct(idx) / 100})` }} />
          </button>
        ))}
      </div>

      {/* ── Layer 7: Minimalist Lower Monospace Telemetry (.reel__foot) ── */}
      <div className="reel__foot">
        <span className="reel__foot-title">
          {currentChapter.title}
        </span>
        <span className="reel__foot-metric">
          <span className="metric-tag">{currentChapter.metric.label}:</span>{' '}
          <b>{currentChapter.metric.value}</b>
        </span>
      </div>
    </div>
  );
}
