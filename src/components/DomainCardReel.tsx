import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import {
  createMultiSceneArtifact,
  createContactShadow,
  getOrCreateStudioEnvironment,
} from '../gl/domainCardReelEngine';
import { DOMAIN_REELS } from '../data/reelScreenplays';
import '../styles/domain-cinema.css';

// Cinematic pacing: 2.8s per chapter (11.2s total continuous loop)
const SCENE_DURATION_SEC = 2.8;
const TOTAL_SCENES = 4;

// Base camera anchor per chapter
const CAMERA_BASE = [
  { x: 0, y: 0.35, z: 3.32 }, // Act 0: Sealed / Standby
  { x: 0, y: 0.28, z: 3.06 }, // Act 1: Kinematic Unlatch (dolly in)
  { x: 0, y: 0.42, z: 3.14 }, // Act 2: Active High-Speed Operation (elevated)
  { x: 0, y: 0.36, z: 3.54 }, // Act 3: Exploded Architecture (pull back)
];

export interface DomainCardReelProps {
  index: number;
  isActive?: boolean;
  selectedAct?: number;
  onActChange?: (actIndex: number) => void;
}

/**
 * High-Performance 60fps 3D WebGL Reel Stage.
 * - Runs continuous WebGL kinematics across full scene duration.
 * - Viewport-aware rendering ensures all cards animate smoothly with 0 GPU waste.
 * - Real-time synchronization with chapter controllers.
 * - Pristine daylight studio lighting.
 */
export function DomainCardReel({
  index,
  isActive = true,
  selectedAct,
  onActChange,
}: DomainCardReelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeSceneIdx, setActiveSceneIdx] = useState(selectedAct ?? 0);
  const [sceneProgress, setSceneProgress] = useState(0);

  const isPlayingRef = useRef(true);
  const animTimeRef = useRef((selectedAct ?? 0) * SCENE_DURATION_SEC);
  const pointerRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const lastReportedActRef = useRef<number>(selectedAct ?? 0);
  const isIntersectingRef = useRef(true);

  const domain = useMemo(() => DOMAIN_REELS[index] ?? DOMAIN_REELS[0], [index]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Synchronize when user manually seeks chapter from external buttons
  useEffect(() => {
    if (selectedAct !== undefined) {
      const curIdx = Math.floor(
        (animTimeRef.current % (TOTAL_SCENES * SCENE_DURATION_SEC)) / SCENE_DURATION_SEC
      );
      if (selectedAct !== curIdx) {
        animTimeRef.current = selectedAct * SCENE_DURATION_SEC;
        lastReportedActRef.current = selectedAct;
        setActiveSceneIdx(selectedAct);
        setSceneProgress(0);
      }
    }
  }, [selectedAct]);

  const handleSeek = useCallback(
    (sceneIdx: number) => {
      setActiveSceneIdx(sceneIdx);
      setSceneProgress(0);
      lastReportedActRef.current = sceneIdx;
      animTimeRef.current = sceneIdx * SCENE_DURATION_SEC;
      onActChange?.(sceneIdx);
    },
    [onActChange]
  );

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

  // ── WebGL 3D Scene Initialization & Loop ──────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth || 480;
    const height = container.clientHeight || 420;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    const initialCam = CAMERA_BASE[0];
    camera.position.set(initialCam.x, initialCam.y, initialCam.z);
    camera.lookAt(0, -0.04, 0);

    // 2. High-Performance WebGL Renderer (Clamped 1.75 Pixel Ratio)
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.36;

    // Studio Environment Map
    const envMap = getOrCreateStudioEnvironment(renderer);
    scene.environment = envMap;

    // 3. Daylight Studio Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 3.4);
    keyLight.position.set(3.5, 5.0, 4.0);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 2.0);
    fillLight.position.set(-3.5, 2.0, 3.0);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffedd5, 2.6);
    rimLight.position.set(-2.5, 4.0, -3.5);
    scene.add(rimLight);

    const bounceLight = new THREE.DirectionalLight(0x94a3b8, 1.4);
    bounceLight.position.set(0, -3.0, 0);
    scene.add(bounceLight);

    // Soft Contact Floor Shadow
    const shadowMesh = createContactShadow(2.8, 2.8, 0.28);
    scene.add(shadowMesh);

    // 4. Procedural 3D Generative Artifact
    const artifact = createMultiSceneArtifact(index);
    scene.add(artifact.group);

    // Render 1 initial static frame immediately
    renderer.render(scene, camera);

    // 5. Resize & Intersection Observers
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
          renderer.render(scene, camera);
        }
      }
    });
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isIntersectingRef.current = entry.isIntersecting;
      },
      { threshold: 0.02 }
    );
    intersectionObserver.observe(container);

    // 6. Continuous 60fps RAF Kinematic Loop across full duration
    let animationId: number = 0;
    let lastTime = performance.now();
    const currentCamPos = new THREE.Vector3(initialCam.x, initialCam.y, initialCam.z);

    if (isActive) {
      const loop = (now: number) => {
        animationId = requestAnimationFrame(loop);

        const delta = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;

        // Pointer smoothing
        pointerRef.current.x += (pointerRef.current.targetX - pointerRef.current.x) * 0.08;
        pointerRef.current.y += (pointerRef.current.targetY - pointerRef.current.y) * 0.08;

        if (isPlayingRef.current) {
          animTimeRef.current += delta;
        }

        const totalLoop = TOTAL_SCENES * SCENE_DURATION_SEC;
        const t = animTimeRef.current % totalLoop;
        const curIdx = Math.floor(t / SCENE_DURATION_SEC);
        const curProg = (t % SCENE_DURATION_SEC) / SCENE_DURATION_SEC;

        setActiveSceneIdx(curIdx);
        setSceneProgress(curProg);

        if (curIdx !== lastReportedActRef.current) {
          lastReportedActRef.current = curIdx;
          onActChange?.(curIdx);
        }

        // Smooth camera drift
        const targetAnchor = CAMERA_BASE[curIdx] ?? CAMERA_BASE[0];

        let dynamicZOffset = 0;
        if (curProg < 0.22) {
          const landT = curProg / 0.22;
          const landEase = 1 - Math.pow(1 - landT, 3);
          dynamicZOffset = (1 - landEase) * 0.16;
        } else if (curProg < 0.86) {
          const driftT = (curProg - 0.22) / 0.64;
          dynamicZOffset = -driftT * 0.08;
        } else {
          const punchT = (curProg - 0.86) / 0.14;
          dynamicZOffset = -0.08 - punchT * punchT * 0.08;
        }

        const targetX = targetAnchor.x + pointerRef.current.x * 0.22;
        const targetY = targetAnchor.y + pointerRef.current.y * 0.18;
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

        if (isIntersectingRef.current) {
          renderer.render(scene, camera);
        }
      };

      animationId = requestAnimationFrame(loop);
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      artifact.dispose();
      scene.remove(artifact.group);
      scene.remove(shadowMesh);
      renderer.dispose();
    };
  }, [index, isActive]);

  const getFillPct = (sIdx: number) => {
    if (sIdx < activeSceneIdx) return 100;
    if (sIdx === activeSceneIdx) return sceneProgress * 100;
    return 0;
  };

  return (
    <div
      ref={containerRef}
      className={`reel reel--light act-${activeSceneIdx}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── Layer 1: Pure Three.js WebGL Real-Time 3D Canvas (Unobstructed) ── */}
      <canvas ref={canvasRef} className="reel__canvas" />

      {/* ── Layer 2: Technical Concentric Orbit Rings (Daylight Studio Tones) ── */}
      <svg className="reel__rings" viewBox="0 0 640 440" aria-hidden="true">
        <circle cx="320" cy="220" r="90" />
        <circle cx="320" cy="220" r="160" />
        <circle cx="320" cy="220" r="240" />
        <circle cx="320" cy="220" r="330" />
      </svg>

      {/* ── Layer 3: Viewfinder Corner Crosshairs (Crisp Daylight Ink) ── */}
      <div className="reel__viewfinder" aria-hidden="true">
        <span className="vf-cross vf-tl">+</span>
        <span className="vf-cross vf-tr">+</span>
        <span className="vf-cross vf-bl">+</span>
        <span className="vf-cross vf-br">+</span>
      </div>

      {/* ── Layer 4: Top Right Play / Pause Toggle ── */}
      <div className="reel__corner-ctrl">
        <button
          type="button"
          className="reel__toggle"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause 3D Reel' : 'Play 3D Reel'}
          title={isPlaying ? 'Pause 3D Reel' : 'Play 3D Reel'}
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

      {/* ── Layer 5: Lower Hairline Progress Track (Zero Model Obstruction) ── */}
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
    </div>
  );
}
