import * as THREE from 'three';
import {
  createBeveledBoxGeometry,
  createCurvedPetalGeometry,
} from './beveledGeometries';

export interface MultiSceneArtifact {
  group: THREE.Group;
  cameraOffset?: { x: number; y: number; z: number };
  calloutGroup?: THREE.Group;
  update: (
    time: number,
    sceneIdx: number,
    sceneProgress: number,
    pointer?: { x: number; y: number },
    camera?: THREE.Camera
  ) => void;
  dispose: () => void;
}

// ════════════════════════════════════════════════════════════════════════════
// 1. Studio Lighting & Environment Reflection Map (PMREM)
// ════════════════════════════════════════════════════════════════════════════

let cachedEnvMap: THREE.Texture | null = null;

export function getOrCreateStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  if (cachedEnvMap) return cachedEnvMap;

  const envScene = new THREE.Scene();
  // Bright studio neutral gray horizon so metals never reflect pitch black
  envScene.background = new THREE.Color(0x64748b);

  // Large overhead softbox (main diffuse highlight on top surfaces)
  const overheadGeo = new THREE.PlaneGeometry(24, 16);
  const overheadMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const overhead = new THREE.Mesh(overheadGeo, overheadMat);
  overhead.position.set(0, 10, 0);
  overhead.rotation.x = Math.PI / 2;
  envScene.add(overhead);

  // Front key softbox (strikes chamfers and beveled front edges)
  const frontGeo = new THREE.PlaneGeometry(18, 14);
  const frontMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb, side: THREE.DoubleSide });
  const front = new THREE.Mesh(frontGeo, frontMat);
  front.position.set(0, 5, 12);
  front.rotation.y = Math.PI;
  envScene.add(front);

  // Left cool rim strip (crisp cyan-white ribbons down left flanks)
  const leftGeo = new THREE.PlaneGeometry(3.5, 22);
  const leftMat = new THREE.MeshBasicMaterial({ color: 0x93c5fd, side: THREE.DoubleSide });
  const leftStrip = new THREE.Mesh(leftGeo, leftMat);
  leftStrip.position.set(-11, 4, 0);
  leftStrip.rotation.y = Math.PI / 2;
  envScene.add(leftStrip);

  // Right warm rim strip (golden specular highlights down right flanks)
  const rightGeo = new THREE.PlaneGeometry(3.5, 22);
  const rightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, side: THREE.DoubleSide });
  const rightStrip = new THREE.Mesh(rightGeo, rightMat);
  rightStrip.position.set(11, 4, 0);
  rightStrip.rotation.y = -Math.PI / 2;
  envScene.add(rightStrip);

  // Bottom bounce panel (prevents undersides from falling into black)
  const bounceGeo = new THREE.PlaneGeometry(24, 24);
  const bounceMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8, side: THREE.DoubleSide });
  const bounce = new THREE.Mesh(bounceGeo, bounceMat);
  bounce.position.set(0, -6, 0);
  bounce.rotation.x = -Math.PI / 2;
  envScene.add(bounce);

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  cachedEnvMap = pmrem.fromScene(envScene, 0.04).texture;
  pmrem.dispose();

  return cachedEnvMap;
}

// ════════════════════════════════════════════════════════════════════════════
// 2. Soft Contact Floor Shadow
// ════════════════════════════════════════════════════════════════════════════

export function createContactShadow(w = 3.2, d = 3.2, opacity = 0.45): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, `rgba(15, 23, 42, ${opacity})`);
  grad.addColorStop(0.35, `rgba(15, 23, 42, ${opacity * 0.55})`);
  grad.addColorStop(0.75, `rgba(15, 23, 42, ${opacity * 0.12})`);
  grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  const geo = new THREE.PlaneGeometry(w, d);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.92;
  return mesh;
}

// ════════════════════════════════════════════════════════════════════════════
// 3. Procedural Silkscreen Technical Label Texture (Bright Satin Metallic Base)
// ════════════════════════════════════════════════════════════════════════════

export function createSilkscreenTexture(
  title: string,
  sub: string,
  code: string,
  accent = '#f59e0b',
  isDark = false
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Bright satin metallic chassis base (NEVER pure black!)
  ctx.fillStyle = isDark ? '#334155' : '#e2e8f0';
  ctx.fillRect(0, 0, 512, 256);

  // Subtle brushed metallic noise / hairline grid
  ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)';
  ctx.lineWidth = 1;
  for (let x = 32; x < 512; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let y = 32; y < 256; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Accent vertical stripe
  ctx.fillStyle = accent;
  ctx.fillRect(18, 22, 6, 212);

  // Primary title text
  ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
  ctx.font = 'bold 22px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(title, 36, 58);

  // Subtitle
  ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.75)' : 'rgba(15, 23, 42, 0.72)';
  ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(sub, 36, 90);

  // Technical code tag
  ctx.fillStyle = accent;
  ctx.font = 'bold 12px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(code, 36, 122);

  // Millimeter scale markings
  ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(15, 23, 42, 0.35)';
  ctx.lineWidth = 1.2;
  for (let t = 0; t < 24; t++) {
    const tx = 36 + t * 18;
    ctx.beginPath();
    ctx.moveTo(tx, 150);
    ctx.lineTo(tx, t % 5 === 0 ? 168 : 158);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ════════════════════════════════════════════════════════════════════════════
// 4. 3D Annotation Callout Pin Helper with Floating Billboard Badges
// ════════════════════════════════════════════════════════════════════════════

export interface CalloutPinItem {
  group: THREE.Group;
  startPoint: THREE.Vector3;
  endPoint: THREE.Vector3;
  line: THREE.Line;
  badge: THREE.Mesh;
}

export function createCalloutPin(
  text: string,
  start: [number, number, number],
  end: [number, number, number],
  accent = '#f59e0b'
): CalloutPinItem {
  const pinGroup = new THREE.Group();

  const startPt = new THREE.Vector3(...start);
  const endPt = new THREE.Vector3(...end);

  // Thin hairline leader line
  const lineGeo = new THREE.BufferGeometry().setFromPoints([startPt, endPt]);
  const lineMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(accent),
    transparent: true,
    opacity: 0.85,
  });
  const line = new THREE.Line(lineGeo, lineMat);
  pinGroup.add(line);

  // Metallic target anchor dot
  const dotGeo = new THREE.SphereGeometry(0.026, 16, 16);
  const dotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(accent) });
  const dot = new THREE.Mesh(dotGeo, dotMat);
  dot.position.copy(startPt);
  pinGroup.add(dot);

  // Badge billboard canvas with crisp high-contrast pill
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 72;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
  ctx.beginPath();
  ctx.roundRect(4, 4, 292, 64, 10);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Accent vertical indicator
  ctx.fillStyle = accent;
  ctx.fillRect(10, 14, 5, 44);

  // Text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(text, 26, 42);

  const badgeTex = new THREE.CanvasTexture(canvas);
  const badgeGeo = new THREE.PlaneGeometry(0.68, 0.17);
  const badgeMat = new THREE.MeshBasicMaterial({
    map: badgeTex,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const badge = new THREE.Mesh(badgeGeo, badgeMat);
  badge.position.copy(endPt);
  pinGroup.add(badge);

  return { group: pinGroup, startPoint: startPt, endPoint: endPt, line, badge };
}

// ════════════════════════════════════════════════════════════════════════════
// 0. GI RIVINITY: 5D Fused Quartz Optical Memory Engine & Femtosecond Laser
// ════════════════════════════════════════════════════════════════════════════

export function createQuartzLatticeReel(): MultiSceneArtifact {
  const group = new THREE.Group();
  const calloutGroup = new THREE.Group();
  group.add(calloutGroup);

  // 1. Titanium Base Plinth with Silkscreen Markings
  const plinthTex = createSilkscreenTexture(
    'GI-RIVINITY // 5D QUARTZ',
    'PERSISTENT KNOWLEDGE ENGINE',
    'SPEC: RM-10K // ZERO DRIFT',
    '#8b5cf6',
    false
  );
  const plinthGeo = new THREE.CylinderGeometry(0.74, 0.8, 0.24, 48);
  const plinthMat = new THREE.MeshStandardMaterial({
    map: plinthTex,
    color: 0xe2e8f0, // Bright satin aircraft titanium
    metalness: 0.88,
    roughness: 0.2,
  });
  const plinth = new THREE.Mesh(plinthGeo, plinthMat);
  plinth.position.y = -0.58;
  group.add(plinth);

  // Circular Array of 8 Status Micro-LEDs on Plinth
  const ledGroup = new THREE.Group();
  ledGroup.position.y = -0.46;
  const leds: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const ledGeo = new THREE.SphereGeometry(0.02, 12, 12);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x8b5cf6 });
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(Math.cos(angle) * 0.72, 0, Math.sin(angle) * 0.72);
    ledGroup.add(led);
    leds.push(led);
  }
  group.add(ledGroup);

  // 2. 4 Satin Platinum Quadrant Petals (Kinematic Bloom Aperture)
  const petalGeo = createCurvedPetalGeometry(0.75, 0.86, Math.PI * 0.46, 0.08);
  const platinumMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9, // Satin platinum silver
    metalness: 0.92,
    roughness: 0.16,
  });

  const petalHinges: THREE.Group[] = [];
  const petalAngles = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];

  petalAngles.forEach((angle) => {
    const hinge = new THREE.Group();
    hinge.position.set(0, -0.48, 0);
    hinge.rotation.y = angle;

    const mesh = new THREE.Mesh(petalGeo, platinumMat);
    mesh.position.set(0, 0.44, 0);
    mesh.rotation.x = -Math.PI / 2;
    hinge.add(mesh);

    // Visible Brass Hinge Pin Cylinder
    const pinGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.18, 16);
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.95, roughness: 0.1 });
    const pin = new THREE.Mesh(pinGeo, pinMat);
    pin.rotation.z = Math.PI / 2;
    pin.position.set(0.75, 0, 0);
    hinge.add(pin);

    petalHinges.push(hinge);
    group.add(hinge);
  });

  // 3. Central Rising Spindle Carriage
  const carriageGroup = new THREE.Group();
  carriageGroup.position.y = -0.32; // Partially visible even in Act 1

  // 24k Gold Titanium Spindle Hub
  const spindleGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.32, 32);
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    metalness: 0.95,
    roughness: 0.12,
  });
  const spindle = new THREE.Mesh(spindleGeo, goldMat);
  carriageGroup.add(spindle);

  // 4. Ultra-Clear Fused-Silica Quartz Memory Disc (Refractive Physical Crystal)
  const discGeo = new THREE.CylinderGeometry(0.56, 0.56, 0.08, 64);
  const quartzMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 0.94,
    roughness: 0.04,
    metalness: 0.05,
    ior: 1.54,
    thickness: 0.8,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
  });
  const disc = new THREE.Mesh(discGeo, quartzMat);
  disc.position.y = 0.18;
  carriageGroup.add(disc);

  // Rainbow Holographic Inscription Tracks on Quartz
  const trackCount = 1400;
  const tPos = new Float32Array(trackCount * 3);
  const tCols = new Float32Array(trackCount * 3);
  for (let i = 0; i < trackCount; i++) {
    const r = 0.26 + Math.random() * 0.28;
    const a = Math.random() * Math.PI * 2;
    tPos[i * 3] = Math.cos(a) * r;
    tPos[i * 3 + 1] = 0.18 + (Math.random() - 0.5) * 0.02;
    tPos[i * 3 + 2] = Math.sin(a) * r;

    // Iridescent rainbow spectral tracks
    tCols[i * 3] = Math.sin(a * 2.5) * 0.5 + 0.5;
    tCols[i * 3 + 1] = Math.sin(a * 2.5 + 2.09) * 0.5 + 0.5;
    tCols[i * 3 + 2] = Math.sin(a * 2.5 + 4.18) * 0.5 + 0.5;
  }
  const trackGeo = new THREE.BufferGeometry();
  trackGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
  trackGeo.setAttribute('color', new THREE.BufferAttribute(tCols, 3));
  const trackMat = new THREE.PointsMaterial({
    size: 0.034,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
  });
  const trackPoints = new THREE.Points(trackGeo, trackMat);
  carriageGroup.add(trackPoints);

  // Concentric Gold Track Guide Rings
  for (let r = 0.32; r <= 0.52; r += 0.06) {
    const ringGeo = new THREE.RingGeometry(r, r + 0.006, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.222;
    carriageGroup.add(ring);
  }

  // 5. Articulated Femtosecond Laser Arm & Optic Lens
  const laserArmGroup = new THREE.Group();
  laserArmGroup.position.set(0.38, 0.26, 0);

  const armGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.36, 16);
  const armMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.2 });
  const arm = new THREE.Mesh(armGeo, armMat);
  arm.rotation.z = Math.PI / 4;
  arm.position.set(0.12, 0.12, 0);
  laserArmGroup.add(arm);

  const lensHeadGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.08, 24);
  const lensHeadMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.95, roughness: 0.1 });
  const lensHead = new THREE.Mesh(lensHeadGeo, lensHeadMat);
  lensHead.position.set(0, 0.02, 0);
  laserArmGroup.add(lensHead);

  // Visible Luminous Laser Beam Shooting Directly at Disc Surface
  const beamGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.24, 12);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xa855f7,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.set(0, -0.12, 0);
  laserArmGroup.add(beam);

  // Focal Point Spark / Lens Flare on Disc
  const flareGeo = new THREE.SphereGeometry(0.025, 16, 16);
  const flareMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
  });
  const flare = new THREE.Mesh(flareGeo, flareMat);
  flare.position.set(0, -0.24, 0);
  laserArmGroup.add(flare);

  carriageGroup.add(laserArmGroup);
  group.add(carriageGroup);

  // 6. 3D Callout Annotation Pins
  const pin1 = createCalloutPin('5D Fused Quartz Memory Disc (360 TB)', [0, 0.18, 0.56], [0.35, 0.55, 0.8], '#8b5cf6');
  const pin2 = createCalloutPin('Femtosecond Laser (λ=515nm)', [0.38, 0.28, 0], [0.65, 0.48, 0.2], '#c084fc');
  const pin3 = createCalloutPin('Titanium Petal Hinge (75° Bloom)', [0.75, -0.2, 0], [0.95, 0.1, 0], '#94a3b8');
  calloutGroup.add(pin1.group, pin2.group, pin3.group);
  const pins = [pin1, pin2, pin3];

  return {
    group,
    calloutGroup,
    update: (time, sceneIdx, sceneProgress, pointer, camera) => {
      const px = pointer ? pointer.x * 0.25 : 0;
      const py = pointer ? pointer.y * 0.25 : 0;
      group.rotation.x = 0.45 + py;
      group.rotation.y = time * 0.12 + px;

      // Pulse status micro-LEDs
      leds.forEach((led, i) => {
        const pulse = (Math.sin(time * 6 + i * 0.8) + 1) * 0.5;
        (led.material as THREE.MeshBasicMaterial).color.setHex(pulse > 0.5 ? 0x8b5cf6 : 0x38bdf8);
      });

      // Billboarding for callout pins
      if (camera) {
        pins.forEach((p) => p.badge.quaternion.copy(camera.quaternion));
      }

      if (sceneIdx === 0) {
        // Act 1: Sealed Capsule (Partially cracked petals so interior glints!)
        petalHinges.forEach((h) => (h.rotation.z = 0.15));
        carriageGroup.position.y = -0.32;
        disc.rotation.y = time * 0.2;
        trackPoints.rotation.y = time * 0.2;
        laserArmGroup.position.set(0.35, 0.22, 0);
        beamMat.opacity = 0.4;
        flareMat.opacity = 0.5;
        beamMat.color.set(0x8b5cf6);
      } else if (sceneIdx === 1) {
        // Act 2: Kinematic Bloom (Petals open to 75°, spindle lifts)
        const ease = sceneProgress * sceneProgress * (3 - 2 * sceneProgress);
        petalHinges.forEach((h) => (h.rotation.z = 0.15 + ease * 1.15));
        carriageGroup.position.y = -0.32 + ease * 0.32;
        disc.rotation.y = time * (0.2 + ease * 2.0);
        trackPoints.rotation.y = disc.rotation.y;
        beamMat.opacity = 0.4 + ease * 0.5;
        flareMat.opacity = 0.5 + ease * 0.5;
      } else if (sceneIdx === 2) {
        // Act 3: 8,000 RPM Optical Operation
        petalHinges.forEach((h) => (h.rotation.z = 1.3));
        carriageGroup.position.y = 0.0;
        disc.rotation.y = time * 6.5;
        trackPoints.rotation.y = time * 6.5;
        beamMat.opacity = 0.95;
        flareMat.opacity = 1.0;
        beamMat.color.set(0x38bdf8);
        laserArmGroup.position.x = 0.35 + Math.sin(time * 2.5) * 0.08;
      } else {
        // Act 4: Hero Exploded View
        petalHinges.forEach((h) => (h.rotation.z = 1.15));
        carriageGroup.position.y = -0.05;
        disc.rotation.y = time * 0.8;
        trackPoints.rotation.y = time * 0.8;
        beamMat.opacity = 0.85;
        flareMat.opacity = 0.9;
        beamMat.color.set(0xfacc15);
      }
    },
    dispose: () => {
      plinthGeo.dispose();
      plinthMat.dispose();
      petalGeo.dispose();
      platinumMat.dispose();
      spindleGeo.dispose();
      goldMat.dispose();
      discGeo.dispose();
      quartzMat.dispose();
      trackGeo.dispose();
      trackMat.dispose();
      armGeo.dispose();
      armMat.dispose();
      beamGeo.dispose();
      beamMat.dispose();
      flareGeo.dispose();
      flareMat.dispose();
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 1. RIVINITY CORE: Milled Modular Unibody Server Blade & 48.2 GB/s Optical Fabric
// ════════════════════════════════════════════════════════════════════════════

export function createComputeFabricReel(): MultiSceneArtifact {
  const group = new THREE.Group();
  const calloutGroup = new THREE.Group();
  group.add(calloutGroup);

  // 4 Milled Aluminum Quadrants with Crisp Engineering Silkscreen
  const blockTex = createSilkscreenTexture(
    'RIVINITY CORE // MOD: RC-900',
    'UNIVERSAL INTELLIGENCE OS',
    'OPTICAL BUS: 48.2 GB/s',
    '#f59e0b',
    false
  );
  const blockGeo = createBeveledBoxGeometry(0.58, 0.34, 0.58, 0.05, 0.015);
  const aluminumMat = new THREE.MeshStandardMaterial({
    map: blockTex,
    color: 0xe2e8f0, // Bright satin anodized silver aluminum
    metalness: 0.9,
    roughness: 0.18,
  });

  const assembledVectors = [
    [-0.31, -0.31],
    [0.31, -0.31],
    [-0.31, 0.31],
    [0.31, 0.31],
  ];

  const quadrantMeshes: THREE.Mesh[] = [];
  assembledVectors.forEach(([ax, az]) => {
    const mesh = new THREE.Mesh(blockGeo, aluminumMat);
    mesh.position.set(ax, -0.15, az);

    // Visible Gold Edge Connector Fingers on internal mating faces
    const edgeGeo = new THREE.BoxGeometry(0.52, 0.02, 0.02);
    const goldEdgeMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.96, roughness: 0.1 });
    const edge = new THREE.Mesh(edgeGeo, goldEdgeMat);
    edge.position.set(0, -0.14, -az * 0.45);
    mesh.add(edge);

    quadrantMeshes.push(mesh);
    group.add(mesh);
  });

  // Top Radial Polished Copper Heatsink (Gleaming Metallic Orange)
  const copperGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.1, 48);
  const copperMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b, // Bright lustrous copper
    metalness: 0.96,
    roughness: 0.14,
  });
  const copperLid = new THREE.Mesh(copperGeo, copperMat);
  copperLid.position.y = 0.08;

  // Concentric Radial Fin Cuts on Copper Cooler
  for (let f = 0; f < 12; f++) {
    const angle = (f / 12) * Math.PI;
    const finSlotGeo = new THREE.BoxGeometry(0.92, 0.04, 0.012);
    const finSlotMat = new THREE.MeshBasicMaterial({ color: 0xb45309 });
    const slot = new THREE.Mesh(finSlotGeo, finSlotMat);
    slot.rotation.y = angle;
    slot.position.y = 0.04;
    copperLid.add(slot);
  }
  group.add(copperLid);

  // Central Logic Processor Die (Illuminated Gold & Cyan Matrix)
  const coreDieGeo = createBeveledBoxGeometry(0.38, 0.08, 0.38, 0.02, 0.008);
  const coreDieMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.6,
    metalness: 0.85,
    roughness: 0.15,
  });
  const coreDie = new THREE.Mesh(coreDieGeo, coreDieMat);
  coreDie.position.y = -0.12;
  group.add(coreDie);

  // 4 Arching Luminous Optical Waveguides Bridging Modules
  const waveguideMat = new THREE.LineBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.9,
  });
  assembledVectors.forEach(([ax, az]) => {
    const pts = [
      new THREE.Vector3(0, -0.12, 0),
      new THREE.Vector3(ax * 0.45, -0.04, az * 0.45),
      new THREE.Vector3(ax, -0.12, az),
    ];
    const curve = new THREE.CatmullRomCurve3(pts);
    const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(20));
    const line = new THREE.Line(lineGeo, waveguideMat);
    group.add(line);
  });

  // Flowing High-Velocity Data Packet Sparks Along Waveguides
  const sparkCount = 600;
  const sPos = new Float32Array(sparkCount * 3);
  for (let i = 0; i < sparkCount; i++) {
    sPos[i * 3] = (Math.random() - 0.5) * 0.6;
    sPos[i * 3 + 1] = -0.12;
    sPos[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
  }
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  const sparkMat = new THREE.PointsMaterial({
    size: 0.042,
    color: 0xfde047,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
  });
  const sparkPoints = new THREE.Points(sparkGeo, sparkMat);
  group.add(sparkPoints);

  // 3D Callout Pins
  const pin1 = createCalloutPin('Copper Heat Sink (65W TDP)', [0, 0.12, 0], [0.35, 0.45, 0.4], '#d97706');
  const pin2 = createCalloutPin('48.2 GB/s Optical Waveguide', [0.15, -0.12, 0.15], [0.55, 0.12, 0.5], '#f59e0b');
  const pin3 = createCalloutPin('Milled Unibody Blade (x4)', [-0.31, -0.15, 0.31], [-0.65, 0.15, 0.65], '#94a3b8');
  calloutGroup.add(pin1.group, pin2.group, pin3.group);
  const pins = [pin1, pin2, pin3];

  return {
    group,
    calloutGroup,
    update: (time, sceneIdx, sceneProgress, pointer, camera) => {
      const px = pointer ? pointer.x * 0.25 : 0;
      const py = pointer ? pointer.y * 0.25 : 0;
      group.rotation.x = 0.52 + py;
      group.rotation.y = time * 0.15 + px;

      if (camera) {
        pins.forEach((p) => p.badge.quaternion.copy(camera.quaternion));
      }

      if (sceneIdx === 0) {
        // Act 1: Monolithic Unibody (Slightly cracked seams showing optical glow)
        quadrantMeshes.forEach((mesh, i) => {
          const [ax, az] = assembledVectors[i];
          mesh.position.set(ax * 1.05, -0.15, az * 1.05);
        });
        copperLid.position.y = 0.08;
        waveguideMat.opacity = 0.4;
      } else if (sceneIdx === 1) {
        // Act 2: Diagonal Rail Glide
        const ease = sceneProgress * sceneProgress * (3 - 2 * sceneProgress);
        quadrantMeshes.forEach((mesh, i) => {
          const [ax, az] = assembledVectors[i];
          mesh.position.set(ax * (1.05 + ease * 0.85), -0.15, az * (1.05 + ease * 0.85));
        });
        copperLid.position.y = 0.08 + ease * 0.52;
        waveguideMat.opacity = 0.4 + ease * 0.55;
      } else if (sceneIdx === 2) {
        // Act 3: Waveguide Concurrency
        quadrantMeshes.forEach((mesh, i) => {
          const [ax, az] = assembledVectors[i];
          mesh.position.set(ax * 1.9, -0.15, az * 1.9);
        });
        copperLid.position.y = 0.6;
        waveguideMat.opacity = 0.95;

        const sArray = sparkGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < sparkCount; i++) {
          const quad = i % assembledVectors.length;
          const [ax, az] = assembledVectors[quad];
          const flow = (time * 3.5 + i * 0.02) % 1;
          sArray[i * 3] = THREE.MathUtils.lerp(0, ax * 1.9, flow);
          sArray[i * 3 + 1] = -0.12 + Math.sin(flow * Math.PI) * 0.12;
          sArray[i * 3 + 2] = THREE.MathUtils.lerp(0, az * 1.9, flow);
        }
        sparkGeo.attributes.position.needsUpdate = true;
      } else {
        // Act 4: Exploded Server View
        quadrantMeshes.forEach((mesh, i) => {
          const [ax, az] = assembledVectors[i];
          mesh.position.set(ax * 1.6, -0.15, az * 1.6);
        });
        copperLid.position.y = 0.5;
        waveguideMat.opacity = 0.8;
      }
    },
    dispose: () => {
      blockGeo.dispose();
      aluminumMat.dispose();
      copperGeo.dispose();
      copperMat.dispose();
      coreDieGeo.dispose();
      coreDieMat.dispose();
      waveguideMat.dispose();
      sparkGeo.dispose();
      sparkMat.dispose();
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 2. IoT INTELLIGENCE: Solid-State LiDAR Optical Engine & 360° Laser Sweep
// ════════════════════════════════════════════════════════════════════════════

export function createLidarPointcloudReel(): MultiSceneArtifact {
  const group = new THREE.Group();
  const calloutGroup = new THREE.Group();
  group.add(calloutGroup);

  // Dual Clamshell Anodized Aluminum Housing with Silkscreen Markings
  const shellTex = createSilkscreenTexture(
    'SOLID-STATE LiDAR // 360°',
    'TIME-OF-FLIGHT SENSOR UNIT',
    'DENSITY: 1.2M PTS/SEC',
    '#10b981',
    false
  );
  const shellGeo = new THREE.CylinderGeometry(0.68, 0.72, 0.35, 48);
  const shellMat = new THREE.MeshStandardMaterial({
    map: shellTex,
    color: 0xe2e8f0, // Satin anodized silver metal
    metalness: 0.9,
    roughness: 0.18,
  });

  const topShell = new THREE.Mesh(shellGeo, shellMat);
  topShell.position.y = 0.22;
  group.add(topShell);

  const bottomShell = new THREE.Mesh(shellGeo, shellMat);
  bottomShell.position.y = -0.22;
  group.add(bottomShell);

  // Telescoping Internal Optical Barrel (Gunmetal Slate)
  const barrelGroup = new THREE.Group();
  const barrelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.55, 48);
  const barrelMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.92,
    roughness: 0.18,
  });
  const barrel = new THREE.Mesh(barrelGeo, barrelMat);
  barrelGroup.add(barrel);

  // Optical Germanium Aperture Window (Glowing Emerald Glass)
  const windowGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.06, 48);
  const windowMat = new THREE.MeshPhysicalMaterial({
    color: 0x10b981,
    transmission: 0.88,
    roughness: 0.04,
    ior: 1.6,
    emissive: 0x059669,
    emissiveIntensity: 0.3,
  });
  const windowMesh = new THREE.Mesh(windowGeo, windowMat);
  windowMesh.position.y = 0.28;
  barrelGroup.add(windowMesh);

  // 6-Sided Chrome Polygon Mirror Prism (Spinning at High RPM)
  const prismGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.22, 6);
  const prismMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.99,
    roughness: 0.03,
  });
  const prism = new THREE.Mesh(prismGeo, prismMat);
  prism.position.y = 0.12;
  barrelGroup.add(prism);

  // 360° Planar Laser Fan Cone (Sweeping Emerald Sheet)
  const fanGeo = new THREE.ConeGeometry(2.4, 0.08, 32, 1, true, 0, Math.PI * 0.45);
  const fanMat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const fan = new THREE.Mesh(fanGeo, fanMat);
  fan.rotation.x = Math.PI / 2;
  fan.position.y = 0.28;
  barrelGroup.add(fan);

  group.add(barrelGroup);

  // 3D Point-Cloud Voxels (Emerald to Cyan to Violet Depth Gradient)
  const ptCount = 2200;
  const pPos = new Float32Array(ptCount * 3);
  const pCols = new Float32Array(ptCount * 3);
  const cGreen = new THREE.Color(0x10b981);
  const cCyan = new THREE.Color(0x06b6d4);
  const cPurple = new THREE.Color(0xa855f7);

  for (let i = 0; i < ptCount; i++) {
    const ang = Math.random() * Math.PI * 2;
    const dist = 0.95 + Math.random() * 1.5;
    const y = (Math.random() - 0.5) * 1.4;
    pPos[i * 3] = Math.cos(ang) * dist;
    pPos[i * 3 + 1] = y;
    pPos[i * 3 + 2] = Math.sin(ang) * dist;

    const col = dist > 1.8 ? cPurple : dist > 1.3 ? cCyan : cGreen;
    pCols[i * 3] = col.r;
    pCols[i * 3 + 1] = col.g;
    pCols[i * 3 + 2] = col.b;
  }
  const ptGeo = new THREE.BufferGeometry();
  ptGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  ptGeo.setAttribute('color', new THREE.BufferAttribute(pCols, 3));
  const ptMat = new THREE.PointsMaterial({
    size: 0.038,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
  });
  const pointCloud = new THREE.Points(ptGeo, ptMat);
  group.add(pointCloud);

  // 3D Callout Pins
  const pin1 = createCalloutPin('Germanium Optical Aperture', [0, 0.28, 0.42], [0.35, 0.55, 0.7], '#10b981');
  const pin2 = createCalloutPin('6,000 RPM Polygon Scanner', [0, 0.12, 0.18], [0.45, 0.35, 0.3], '#38bdf8');
  const pin3 = createCalloutPin('Telescoping Sensor Cowling', [0, 0.55, 0], [0, 0.85, 0], '#94a3b8');
  calloutGroup.add(pin1.group, pin2.group, pin3.group);
  const pins = [pin1, pin2, pin3];

  return {
    group,
    calloutGroup,
    update: (time, sceneIdx, sceneProgress, pointer, camera) => {
      const px = pointer ? pointer.x * 0.25 : 0;
      const py = pointer ? pointer.y * 0.25 : 0;
      group.rotation.x = 0.42 + py;
      group.rotation.y = time * 0.15 + px;

      if (camera) {
        pins.forEach((p) => p.badge.quaternion.copy(camera.quaternion));
      }

      if (sceneIdx === 0) {
        // Act 1: Hermetic Cowling (Partially parted seam showing laser lens)
        topShell.position.y = 0.24;
        bottomShell.position.y = -0.24;
        barrelGroup.position.z = 0;
        fanMat.opacity = 0.15;
        ptMat.opacity = 0.35;
      } else if (sceneIdx === 1) {
        // Act 2: Clamshell Decoupling
        const ease = sceneProgress * sceneProgress * (3 - 2 * sceneProgress);
        topShell.position.y = 0.24 + ease * 0.46;
        bottomShell.position.y = -0.24 - ease * 0.36;
        barrelGroup.position.z = ease * 0.22;
        fanMat.opacity = 0.15 + ease * 0.3;
        ptMat.opacity = 0.35 + ease * 0.45;
      } else if (sceneIdx === 2) {
        // Act 3: Active 6,000 RPM 360° Laser Scan
        topShell.position.y = 0.7;
        bottomShell.position.y = -0.6;
        barrelGroup.position.z = 0.22;
        prism.rotation.y = time * 8.0;
        fan.rotation.z = time * 5.0;
        fanMat.opacity = 0.5;
        ptMat.opacity = 0.95;
      } else {
        // Act 4: Exploded Spatial Voxel Map
        topShell.position.y = 0.62;
        bottomShell.position.y = -0.52;
        barrelGroup.position.z = 0.18;
        prism.rotation.y = time * 2.0;
        fan.rotation.z = time * 2.0;
        fanMat.opacity = 0.3;
        ptMat.opacity = 0.85;
      }
    },
    dispose: () => {
      shellGeo.dispose();
      shellMat.dispose();
      barrelGeo.dispose();
      barrelMat.dispose();
      windowGeo.dispose();
      windowMat.dispose();
      prismGeo.dispose();
      prismMat.dispose();
      fanGeo.dispose();
      fanMat.dispose();
      ptGeo.dispose();
      ptMat.dispose();
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 3. GEO INTELLIGENCE: 3D Topographic Terrain Scanner & Azimuth GIS Table
// ════════════════════════════════════════════════════════════════════════════

export function createProceduralTerrainReel(): MultiSceneArtifact {
  const group = new THREE.Group();
  const calloutGroup = new THREE.Group();
  group.add(calloutGroup);

  // Exterior Base Plinth with Geospatial Silkscreen
  const plinthTex = createSilkscreenTexture(
    'GEOSPATIAL AI // MORPHOLOGY',
    'DATUM: WGS-84 // 28°36\'N 77°12\'E',
    'TIERS: 8 STEPPED CONTOURS',
    '#0ea5e9',
    false
  );
  const basePlinthGeo = createBeveledBoxGeometry(1.6, 0.12, 1.6, 0.03, 0.01);
  const darkStoneMat = new THREE.MeshStandardMaterial({
    map: plinthTex,
    color: 0xe2e8f0,
    metalness: 0.85,
    roughness: 0.22,
  });
  const basePlinth = new THREE.Mesh(basePlinthGeo, darkStoneMat);
  basePlinth.position.y = -0.55;
  group.add(basePlinth);

  // 4 Perimeter Retaining Walls
  const wallGeo = createBeveledBoxGeometry(1.48, 0.45, 0.08, 0.02, 0.008);
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x64748b, // Gunmetal slate
    metalness: 0.88,
    roughness: 0.2,
  });

  const wallHinges: THREE.Group[] = [];
  const wallConfigs = [
    { pos: [0, -0.49, 0.74], rotY: 0 },
    { pos: [0, -0.49, -0.74], rotY: Math.PI },
    { pos: [-0.74, -0.49, 0], rotY: Math.PI / 2 },
    { pos: [0.74, -0.49, 0], rotY: -Math.PI / 2 },
  ];

  wallConfigs.forEach((cfg) => {
    const hinge = new THREE.Group();
    hinge.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
    hinge.rotation.y = cfg.rotY;

    const mesh = new THREE.Mesh(wallGeo, wallMat);
    mesh.position.set(0, 0.22, 0);
    hinge.add(mesh);

    wallHinges.push(hinge);
    group.add(hinge);
  });

  // 8 Distinct Stepped Topographic Relief Slabs (Realistic GIS Elevation Gradient)
  const layers = 8;
  const terraceMeshes: THREE.Mesh[] = [];
  const targetHeights = [-0.45, -0.34, -0.22, -0.1, 0.02, 0.15, 0.28, 0.42];

  const layerColors = [
    0x0369a1, // Deep Oceanic Datum
    0x0284c7, // River Estuary
    0x0ea5e9, // Lowland Valley
    0x38bdf8, // Mid Plateau
    0x7dd3fc, // High Ridge
    0xba68c8, // Mountain Pass
    0xe0f2fe, // Sub-Alpine Limestone
    0xffffff, // Glacial Summit Peak
  ];

  for (let l = 0; l < layers; l++) {
    const scale = 1.35 - l * 0.12;
    const tGeo = createBeveledBoxGeometry(scale, 0.08, scale, 0.04, 0.012);
    const tMat = new THREE.MeshStandardMaterial({
      color: layerColors[l],
      roughness: 0.24,
      metalness: 0.25,
    });
    const tMesh = new THREE.Mesh(tGeo, tMat);
    tMesh.position.y = -0.45;

    // Glowing Contour Line on Perimeter of Each Tier
    const edgeGeo = new THREE.EdgesGeometry(tGeo);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.6,
    });
    const edgeLine = new THREE.LineSegments(edgeGeo, edgeMat);
    tMesh.add(edgeLine);

    terraceMeshes.push(tMesh);
    group.add(tMesh);
  }

  // Gleaming Brass Azimuth Compass Rose Needle
  const arrowGeo = new THREE.ConeGeometry(0.12, 0.32, 4);
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    metalness: 0.98,
    roughness: 0.12,
  });
  const arrow = new THREE.Mesh(arrowGeo, brassMat);
  arrow.rotation.x = Math.PI / 2;
  arrow.position.set(0, 0.54, 0);
  arrow.scale.set(0.6, 0.6, 0.6);
  group.add(arrow);

  // Vertical Cyan Elevation Laser Probe Beam
  const probeGeo = new THREE.CylinderGeometry(0.006, 0.006, 1.2, 12);
  const probeMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
  });
  const probe = new THREE.Mesh(probeGeo, probeMat);
  probe.position.set(0, 0.2, 0);
  group.add(probe);

  // 3D Callout Pins
  const pin1 = createCalloutPin('8-Tier Geomorphic Elevation', [0, 0.42, 0], [0.35, 0.68, 0.4], '#0ea5e9');
  const pin2 = createCalloutPin('Hinged Retention Walls', [0.74, -0.22, 0], [0.95, 0.1, 0], '#64748b');
  const pin3 = createCalloutPin('WGS-84 Azimuth Orientation', [0, 0.54, 0], [-0.35, 0.78, 0], '#fbbf24');
  calloutGroup.add(pin1.group, pin2.group, pin3.group);
  const pins = [pin1, pin2, pin3];

  return {
    group,
    calloutGroup,
    update: (time, sceneIdx, sceneProgress, pointer, camera) => {
      const px = pointer ? pointer.x * 0.25 : 0;
      const py = pointer ? pointer.y * 0.25 : 0;
      group.rotation.x = 0.52 + py;
      group.rotation.y = time * 0.12 + px;

      if (camera) {
        pins.forEach((p) => p.badge.quaternion.copy(camera.quaternion));
      }

      if (sceneIdx === 0) {
        // Act 1: Terraced Base (Contour relief partially elevated)
        wallHinges.forEach((h) => (h.rotation.x = 0.15));
        terraceMeshes.forEach((mesh, l) => {
          mesh.position.y = -0.45 + (l / layers) * 0.2;
        });
        arrow.scale.setScalar(0.7);
        arrow.rotation.z = time * 0.5;
        probeMat.opacity = 0.4;
      } else if (sceneIdx === 1) {
        // Act 2: Wall Unfolding & Terrace Stepping
        const ease = sceneProgress * sceneProgress * (3 - 2 * sceneProgress);
        wallHinges.forEach((h) => (h.rotation.x = 0.15 + ease * 1.0));

        terraceMeshes.forEach((mesh, l) => {
          const lProgress = Math.max(0, Math.min(1, (sceneProgress - (l / layers) * 0.5) * 2.2));
          mesh.position.y = THREE.MathUtils.lerp(-0.45 + (l / layers) * 0.2, targetHeights[l], lProgress);
        });
        probeMat.opacity = 0.4 + ease * 0.45;
      } else if (sceneIdx === 2) {
        // Act 3: Solar Raking & Elevation Scanning
        wallHinges.forEach((h) => (h.rotation.x = 1.15));
        terraceMeshes.forEach((mesh, l) => {
          mesh.position.y = targetHeights[l] + Math.sin(time * 3 + l * 0.4) * 0.02;
        });
        arrow.scale.setScalar(1);
        arrow.rotation.z = time * 2;
        probeMat.opacity = 0.9;
        probe.position.y = 0.2 + Math.sin(time * 4) * 0.1;
      } else {
        // Act 4: Exploded Elevation Contours
        wallHinges.forEach((h) => (h.rotation.x = 1.05));
        terraceMeshes.forEach((mesh, l) => {
          mesh.position.y = targetHeights[l];
        });
        arrow.scale.setScalar(1);
        arrow.rotation.z = 0;
        probeMat.opacity = 0.7;
      }
    },
    dispose: () => {
      basePlinthGeo.dispose();
      darkStoneMat.dispose();
      wallGeo.dispose();
      wallMat.dispose();
      arrowGeo.dispose();
      brassMat.dispose();
      probeGeo.dispose();
      probeMat.dispose();
      terraceMeshes.forEach((m) => m.geometry.dispose());
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 4. DEFENSE INTELLIGENCE: Hardened Cryptographic Enclave & Quantum Vault
// ════════════════════════════════════════════════════════════════════════════

export function createTungstenVaultReel(): MultiSceneArtifact {
  const group = new THREE.Group();
  const calloutGroup = new THREE.Group();
  group.add(calloutGroup);

  // Monolithic Tungsten Chassis with Military Stencil Silkscreen
  const tungstenTex = createSilkscreenTexture(
    'SOVEREIGN ENCLAVE // AIR-GAPPED',
    'ZK-PROOF HARDWARE MODULE',
    'SECURITY LEVEL: SOV-1 // CLASSIFIED',
    '#ef4444',
    true
  );
  const baseChassisGeo = createBeveledBoxGeometry(1.35, 0.22, 1.35, 0.04, 0.015);
  const tungstenMat = new THREE.MeshStandardMaterial({
    map: tungstenTex,
    color: 0x475569, // Slate titanium gunmetal
    metalness: 0.92,
    roughness: 0.2,
  });
  const baseChassis = new THREE.Mesh(baseChassisGeo, tungstenMat);
  baseChassis.position.y = -0.42;
  group.add(baseChassis);

  // Heavy Monolithic Armor Lid
  const lidGeo = createBeveledBoxGeometry(1.35, 0.18, 1.35, 0.04, 0.015);
  const lid = new THREE.Mesh(lidGeo, tungstenMat);
  lid.position.y = 0.08;
  group.add(lid);

  // 4 Gleaming 24k Gold Torx Fastening Bolts (Visible Hex Socket Head)
  const boltGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.1, 16);
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    metalness: 0.98,
    roughness: 0.1,
  });

  const boltCoords = [
    [-0.52, 0.52],
    [0.52, 0.52],
    [-0.52, -0.52],
    [0.52, -0.52],
  ];

  const boltMeshes: THREE.Mesh[] = [];
  boltCoords.forEach(([bx, bz]) => {
    const bolt = new THREE.Mesh(boltGeo, goldMat);
    bolt.position.set(bx, 0.18, bz);
    boltMeshes.push(bolt);
    group.add(bolt);
  });

  // Central Cryptographic Processor Die (Illuminated Emerald Quantum Core)
  const dieGeo = createBeveledBoxGeometry(0.48, 0.08, 0.48, 0.02, 0.008);
  const dieMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x15803d,
    emissiveIntensity: 0.6,
    metalness: 0.88,
    roughness: 0.15,
  });
  const die = new THREE.Mesh(dieGeo, dieMat);
  die.position.y = -0.22;
  group.add(die);

  // Geodesic Zero-Knowledge Quantum Tripwire Cage (Emerald Holographic Lattice)
  const cageGeo = new THREE.IcosahedronGeometry(0.68, 1);
  const cageMat = new THREE.MeshBasicMaterial({
    color: 0x22c55e,
    wireframe: true,
    transparent: true,
    opacity: 0.4,
  });
  const cage = new THREE.Mesh(cageGeo, cageMat);
  cage.position.y = -0.15;
  group.add(cage);

  // Diagonal Crimson Laser Tripwires Crossing Perimeter
  const tripwireMat = new THREE.LineBasicMaterial({
    color: 0xef4444,
    transparent: true,
    opacity: 0.85,
  });
  const tripwireGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.6, -0.15, -0.6),
    new THREE.Vector3(0.6, -0.15, 0.6),
    new THREE.Vector3(-0.6, -0.15, 0.6),
    new THREE.Vector3(0.6, -0.15, -0.6),
  ]);
  const tripwire = new THREE.LineSegments(tripwireGeo, tripwireMat);
  group.add(tripwire);

  // 3D Callout Pins
  const pin1 = createCalloutPin('Tungsten Armor Lid (19.3 g/cm³)', [0, 0.18, 0], [0.35, 0.45, 0.4], '#64748b');
  const pin2 = createCalloutPin('24k Gold Torx Fasteners', [0.52, 0.18, 0.52], [0.75, 0.35, 0.75], '#fbbf24');
  const pin3 = createCalloutPin('ZK Quantum Tripwire Cage', [0, -0.15, 0.48], [0, 0.15, 0.8], '#22c55e');
  calloutGroup.add(pin1.group, pin2.group, pin3.group);
  const pins = [pin1, pin2, pin3];

  return {
    group,
    calloutGroup,
    update: (time, sceneIdx, sceneProgress, pointer, camera) => {
      const px = pointer ? pointer.x * 0.25 : 0;
      const py = pointer ? pointer.y * 0.25 : 0;
      group.rotation.x = 0.52 + py;
      group.rotation.y = time * 0.15 + px;

      if (camera) {
        pins.forEach((p) => p.badge.quaternion.copy(camera.quaternion));
      }

      if (sceneIdx === 0) {
        // Act 1: Sealed Vault (Bolts slightly exposed, green internal die glint)
        boltMeshes.forEach((b, i) => {
          const [bx, bz] = boltCoords[i];
          b.position.set(bx, 0.18, bz);
        });
        lid.position.y = 0.1;
        cageMat.opacity = 0.25;
      } else if (sceneIdx === 1) {
        // Act 2: Torx Bolt Unscrew & Lid Elevation
        const ease = sceneProgress * sceneProgress * (3 - 2 * sceneProgress);
        boltMeshes.forEach((b, i) => {
          const [bx, bz] = boltCoords[i];
          b.position.set(bx, 0.18 + ease * 0.75, bz);
          b.rotation.y = time * 8;
        });
        lid.position.y = 0.1 + ease * 0.62;
        cageMat.opacity = 0.25 + ease * 0.45;
      } else if (sceneIdx === 2) {
        // Act 3: Active Zero-Knowledge Enclave
        boltMeshes.forEach((b, i) => {
          const [bx, bz] = boltCoords[i];
          b.position.set(bx * 1.3, 0.93, bz * 1.3);
        });
        lid.position.y = 0.72;
        cageMat.opacity = 0.85;
        cage.rotation.y = -time * 0.8;
      } else {
        // Act 4: Exploded Defense Architecture
        boltMeshes.forEach((b, i) => {
          const [bx, bz] = boltCoords[i];
          b.position.set(bx * 1.2, 0.82, bz * 1.2);
        });
        lid.position.y = 0.64;
        cageMat.opacity = 0.7;
      }
    },
    dispose: () => {
      baseChassisGeo.dispose();
      tungstenMat.dispose();
      lidGeo.dispose();
      boltGeo.dispose();
      goldMat.dispose();
      dieGeo.dispose();
      dieMat.dispose();
      cageGeo.dispose();
      cageMat.dispose();
      tripwireGeo.dispose();
      tripwireMat.dispose();
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 5. MINIATURE INTELLIGENCE: 3nm Neuromorphic Edge Silicon Package (0.8W)
// ════════════════════════════════════════════════════════════════════════════

export function createNeuromorphicDieReel(): MultiSceneArtifact {
  const group = new THREE.Group();
  const calloutGroup = new THREE.Group();
  group.add(calloutGroup);

  // Dark Organic Substrate with Gold Contacts & Silkscreen
  const subTex = createSilkscreenTexture(
    'BHARATTECH BGA-3NM // EDGE AI',
    'NEUROMORPHIC RUNTIME CORE',
    'TDP: 0.8W // 62 TOK/SEC',
    '#eab308',
    false
  );
  const substrateGeo = createBeveledBoxGeometry(1.35, 0.08, 1.35, 0.04, 0.015);
  const substrateMat = new THREE.MeshStandardMaterial({
    map: subTex,
    color: 0xe2e8f0, // Bright carrier board
    metalness: 0.88,
    roughness: 0.2,
  });
  const substrate = new THREE.Mesh(substrateGeo, substrateMat);
  substrate.position.y = -0.52;
  group.add(substrate);

  // Miniature BGA Solder Balls Underneath Substrate
  const bgaGroup = new THREE.Group();
  const ballGeo = new THREE.SphereGeometry(0.02, 10, 10);
  const ballMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.95, roughness: 0.1 });
  for (let bx = -0.5; bx <= 0.5; bx += 0.25) {
    for (let bz = -0.5; bz <= 0.5; bz += 0.25) {
      const ball = new THREE.Mesh(ballGeo, ballMat);
      ball.position.set(bx, -0.58, bz);
      bgaGroup.add(ball);
    }
  }
  group.add(bgaGroup);

  // Mirror-Polished Nickel Heat-Spreader Lid (Lifts Upward)
  const lidGeo = createBeveledBoxGeometry(1.2, 0.06, 1.2, 0.03, 0.01);
  const lidMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9, // Gleaming polished nickel
    metalness: 0.98,
    roughness: 0.1,
  });
  const lid = new THREE.Mesh(lidGeo, lidMat);
  lid.position.y = -0.4;
  group.add(lid);

  // 3nm Bare Silicon Die (Iridescent Royal Blue / Cyan)
  const dieGeo = createBeveledBoxGeometry(0.55, 0.04, 0.55, 0.01, 0.005);
  const dieMat = new THREE.MeshStandardMaterial({
    color: 0x2563eb,
    emissive: 0x1d4ed8,
    emissiveIntensity: 0.6,
    metalness: 0.88,
    roughness: 0.08,
  });
  const die = new THREE.Mesh(dieGeo, dieMat);
  die.position.y = -0.46;
  group.add(die);

  // 16 Microscopic Arced Gold Wire Bond Tubes
  const wireGroup = new THREE.Group();
  const wires = 16;
  const wireMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    metalness: 0.98,
    roughness: 0.08,
  });

  for (let w = 0; w < wires; w++) {
    const a = (w / wires) * Math.PI * 2;
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(Math.cos(a) * 0.26, -0.44, Math.sin(a) * 0.26),
      new THREE.Vector3(Math.cos(a) * 0.42, -0.32, Math.sin(a) * 0.42),
      new THREE.Vector3(Math.cos(a) * 0.54, -0.48, Math.sin(a) * 0.54)
    );
    const wGeo = new THREE.TubeGeometry(curve, 12, 0.009, 8, false);
    const wMesh = new THREE.Mesh(wGeo, wireMat);
    wireGroup.add(wMesh);
  }
  group.add(wireGroup);

  // 3D Branching Synaptic Neural Dendrite Tree Firing Upward
  const branches = 16;
  const lineMat = new THREE.LineBasicMaterial({
    color: 0xeab308,
    transparent: true,
    opacity: 0.85,
  });

  for (let b = 0; b < branches; b++) {
    const a = (b / branches) * Math.PI * 2;
    const pts = [
      new THREE.Vector3(0, -0.44, 0),
      new THREE.Vector3(Math.cos(a) * 0.2, -0.25, Math.sin(a) * 0.2),
      new THREE.Vector3(Math.cos(a + 0.2) * 0.38, 0.05, Math.sin(a + 0.2) * 0.38),
      new THREE.Vector3(Math.cos(a) * 0.62, 0.38, Math.sin(a) * 0.62),
    ];
    const curve = new THREE.CatmullRomCurve3(pts);
    const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(16));
    const line = new THREE.Line(lineGeo, lineMat);
    group.add(line);
  }

  // Golden Action-Potential Spark Impulses Along Dendrites
  const sparkCount = 800;
  const sPos = new Float32Array(sparkCount * 3);
  for (let i = 0; i < sparkCount; i++) {
    sPos[i * 3] = (Math.random() - 0.5) * 0.8;
    sPos[i * 3 + 1] = -0.44;
    sPos[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
  }
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  const sparkMat = new THREE.PointsMaterial({
    size: 0.038,
    color: 0xfde047,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
  });
  const sparkPoints = new THREE.Points(sparkGeo, sparkMat);
  group.add(sparkPoints);

  // 3D Callout Pins
  const pin1 = createCalloutPin('Nickel Heat Spreader Lid', [0, -0.4, 0], [0.35, 0.18, 0.4], '#cbd5e1');
  const pin2 = createCalloutPin('3nm Bare Silicon Die', [0, -0.46, 0.27], [0.45, -0.22, 0.65], '#38bdf8');
  const pin3 = createCalloutPin('Gold Wire Bond Arcs (x16)', [0.26, -0.44, 0], [0.65, -0.35, 0], '#fbbf24');
  calloutGroup.add(pin1.group, pin2.group, pin3.group);
  const pins = [pin1, pin2, pin3];

  return {
    group,
    calloutGroup,
    update: (time, sceneIdx, sceneProgress, pointer, camera) => {
      const px = pointer ? pointer.x * 0.25 : 0;
      const py = pointer ? pointer.y * 0.25 : 0;
      group.rotation.x = 0.52 + py;
      group.rotation.y = time * 0.15 + px;

      if (camera) {
        pins.forEach((p) => p.badge.quaternion.copy(camera.quaternion));
      }

      if (sceneIdx === 0) {
        // Act 1: BGA Package (Lid slightly hovering showing wire bonds and blue die)
        lid.position.y = -0.38;
        lineMat.opacity = 0.35;
        sparkMat.opacity = 0.4;
      } else if (sceneIdx === 1) {
        // Act 2: Heat Spreader Decoupling
        const ease = sceneProgress * sceneProgress * (3 - 2 * sceneProgress);
        lid.position.y = -0.38 + ease * 0.68;
        lineMat.opacity = 0.35 + ease * 0.45;
        sparkMat.opacity = 0.4 + ease * 0.45;
      } else if (sceneIdx === 2) {
        // Act 3: 0.8W Neuromorphic Action Potentials
        lid.position.y = 0.3;
        lineMat.opacity = 0.85;
        sparkMat.opacity = 0.95;

        const sArr = sparkGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < sparkCount; i++) {
          const b = i % branches;
          const a = (b / branches) * Math.PI * 2;
          const flow = (time * 4.2 + i * 0.03) % 1;
          sArr[i * 3] = Math.cos(a) * flow * 0.62;
          sArr[i * 3 + 1] = -0.44 + flow * 0.82;
          sArr[i * 3 + 2] = Math.sin(a) * flow * 0.62;
        }
        sparkGeo.attributes.position.needsUpdate = true;
      } else {
        // Act 4: Exploded Neuromorphic Architecture
        lid.position.y = 0.24;
        lineMat.opacity = 0.65;
        sparkMat.opacity = 0.75;
      }
    },
    dispose: () => {
      substrateGeo.dispose();
      substrateMat.dispose();
      lidGeo.dispose();
      lidMat.dispose();
      dieGeo.dispose();
      dieMat.dispose();
      wireMat.dispose();
      lineMat.dispose();
      sparkGeo.dispose();
      sparkMat.dispose();
      ballGeo.dispose();
      ballMat.dispose();
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Factory
// ════════════════════════════════════════════════════════════════════════════

export function createMultiSceneArtifact(index: number): MultiSceneArtifact {
  switch (index) {
    case 0:
      return createQuartzLatticeReel();
    case 1:
      return createComputeFabricReel();
    case 2:
      return createLidarPointcloudReel();
    case 3:
      return createProceduralTerrainReel();
    case 4:
      return createTungstenVaultReel();
    case 5:
      return createNeuromorphicDieReel();
    default:
      return createQuartzLatticeReel();
  }
}
