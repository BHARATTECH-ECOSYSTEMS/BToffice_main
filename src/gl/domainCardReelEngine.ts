import * as THREE from 'three';
import {
  createBeveledBoxGeometry,
  createCurvedPetalGeometry,
} from './beveledGeometries';

export interface MultiSceneArtifact {
  group: THREE.Group;
  cameraOffset?: { x: number; y: number; z: number };
  update: (time: number, sceneIdx: number, sceneProgress: number, pointer?: { x: number; y: number }) => void;
  dispose: () => void;
}

// ── Shared Materials & Studio Shadows ────────────────────────────────────────

export function createContactShadow(w = 3.2, d = 3.2, opacity = 0.42): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, `rgba(5, 6, 10, ${opacity})`);
  grad.addColorStop(0.35, `rgba(5, 6, 10, ${opacity * 0.55})`);
  grad.addColorStop(0.75, `rgba(5, 6, 10, ${opacity * 0.12})`);
  grad.addColorStop(1, 'rgba(5, 6, 10, 0)');
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
// 0. GI RIVINITY: The Fused-Silica Quantum Quartz Memory Vault
// Kinematics: 4 curved titanium quadrant petals hinge open 75° like a mechanical
// bloom; central quartz disc elevates, spins at 8,000 RPM with rainbow dispersion.
// ════════════════════════════════════════════════════════════════════════════

export function createQuartzLatticeReel(): MultiSceneArtifact {
  const group = new THREE.Group();

  // 1. Titanium Base Plinth
  const plinthGeo = new THREE.CylinderGeometry(0.72, 0.78, 0.22, 48);
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1a1c23,
    metalness: 0.95,
    roughness: 0.22,
  });
  const plinth = new THREE.Mesh(plinthGeo, darkMetalMat);
  plinth.position.y = -0.58;
  group.add(plinth);

  // 2. 4 Curved Quadrant Shell Petals mounted on Base Hinges
  const petalGeo = createCurvedPetalGeometry(0.74, 0.85, Math.PI * 0.46, 0.08);
  const silverMetalMat = new THREE.MeshStandardMaterial({
    color: 0x8a909d,
    metalness: 0.95,
    roughness: 0.18,
  });

  const petalHinges: THREE.Group[] = [];
  const petalAngles = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];

  petalAngles.forEach((angle) => {
    // Pivot located at bottom edge of cylinder
    const hinge = new THREE.Group();
    hinge.position.set(0, -0.48, 0);
    hinge.rotation.y = angle;

    const mesh = new THREE.Mesh(petalGeo, silverMetalMat);
    mesh.position.set(0, 0.44, 0); // Center petal along height
    mesh.rotation.x = -Math.PI / 2;
    hinge.add(mesh);

    petalHinges.push(hinge);
    group.add(hinge);
  });

  // 3. Central Rising Spindle Carriage
  const carriageGroup = new THREE.Group();
  carriageGroup.position.y = -0.38;

  // Spindle Shaft
  const spindleGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.32, 32);
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.98,
    roughness: 0.12,
  });
  const spindle = new THREE.Mesh(spindleGeo, goldMat);
  carriageGroup.add(spindle);

  // 4. Fused-Silica Quartz Memory Disc (Refractive Physical Glass)
  const discGeo = new THREE.CylinderGeometry(0.56, 0.56, 0.08, 64);
  const quartzMat = new THREE.MeshPhysicalMaterial({
    color: 0xf8f9fa,
    transmission: 0.92,
    roughness: 0.04,
    metalness: 0.05,
    ior: 1.55,
    thickness: 0.6,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });
  const disc = new THREE.Mesh(discGeo, quartzMat);
  disc.position.y = 0.18;
  carriageGroup.add(disc);

  // Holographic Diffraction Track Particles embedded in disc
  const trackCount = 1400;
  const tPos = new Float32Array(trackCount * 3);
  const tCols = new Float32Array(trackCount * 3);
  for (let i = 0; i < trackCount; i++) {
    const r = 0.26 + Math.random() * 0.28;
    const a = Math.random() * Math.PI * 2;
    tPos[i * 3] = Math.cos(a) * r;
    tPos[i * 3 + 1] = 0.18 + (Math.random() - 0.5) * 0.04;
    tPos[i * 3 + 2] = Math.sin(a) * r;

    // Prismatic spectral colors
    tCols[i * 3] = Math.sin(a * 2) * 0.5 + 0.5;
    tCols[i * 3 + 1] = Math.sin(a * 2 + 2.09) * 0.5 + 0.5;
    tCols[i * 3 + 2] = Math.sin(a * 2 + 4.18) * 0.5 + 0.5;
  }
  const trackGeo = new THREE.BufferGeometry();
  trackGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
  trackGeo.setAttribute('color', new THREE.BufferAttribute(tCols, 3));
  const trackMat = new THREE.PointsMaterial({
    size: 0.03,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
  });
  const trackPoints = new THREE.Points(trackGeo, trackMat);
  carriageGroup.add(trackPoints);

  // Laser Inscription Arm
  const armGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.45, 16);
  const armMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 });
  const arm = new THREE.Mesh(armGeo, armMat);
  arm.rotation.z = Math.PI / 4;
  arm.position.set(0.35, 0.38, 0);
  carriageGroup.add(arm);

  const laserHeadGeo = new THREE.SphereGeometry(0.03, 16, 16);
  const laserHeadMat = new THREE.MeshBasicMaterial({ color: 0xc084fc });
  const laserHead = new THREE.Mesh(laserHeadGeo, laserHeadMat);
  laserHead.position.set(0.2, 0.23, 0);
  carriageGroup.add(laserHead);

  group.add(carriageGroup);

  return {
    group,
    update: (time, sceneIdx, sceneProgress, pointer) => {
      const px = pointer ? pointer.x * 0.25 : 0;
      const py = pointer ? pointer.y * 0.25 : 0;
      group.rotation.x = 0.45 + py;
      group.rotation.y = time * 0.12 + px;

      if (sceneIdx === 0) {
        // Act 1: The Sealed Capsule
        petalHinges.forEach((h) => (h.rotation.z = 0));
        carriageGroup.position.y = -0.38;
        disc.rotation.y = 0;
        laserHeadMat.color.set(0xef4444);
      } else if (sceneIdx === 1) {
        // Act 2: Kinematic Bloom (Petals swing open 75°, carriage lifts)
        const ease = sceneProgress * sceneProgress * (3 - 2 * sceneProgress);
        petalHinges.forEach((h) => (h.rotation.z = ease * 1.3)); // ~75 degrees
        carriageGroup.position.y = -0.38 + ease * 0.35;
        laserHeadMat.color.set(0xa855f7);
      } else if (sceneIdx === 2) {
        // Act 3: 8,000 RPM Optical Operation
        petalHinges.forEach((h) => (h.rotation.z = 1.3));
        carriageGroup.position.y = -0.03;
        disc.rotation.y = time * 6.0;
        trackPoints.rotation.y = time * 6.0;
        laserHeadMat.color.set(0x38bdf8);
      } else {
        // Act 4: Hero Exploded View
        petalHinges.forEach((h) => (h.rotation.z = 1.15));
        carriageGroup.position.y = -0.05;
        disc.rotation.y = time * 0.8;
        trackPoints.rotation.y = time * 0.8;
        laserHeadMat.color.set(0xfacc15);
      }
    },
    dispose: () => {
      plinthGeo.dispose();
      darkMetalMat.dispose();
      petalGeo.dispose();
      silverMetalMat.dispose();
      spindleGeo.dispose();
      goldMat.dispose();
      discGeo.dispose();
      quartzMat.dispose();
      trackGeo.dispose();
      trackMat.dispose();
      armGeo.dispose();
      armMat.dispose();
      laserHeadGeo.dispose();
      laserHeadMat.dispose();
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 1. RIVINITY CORE: The Monolithic Modular Unibody Router
// Kinematics: Monolithic aluminum unibody splits into 4 quarter-chassis modules
// that slide diagonally outward on precision rails; top copper heatsink lifts up;
// internal optical bus lines stream data between modules.
// ════════════════════════════════════════════════════════════════════════════

export function createComputeFabricReel(): MultiSceneArtifact {
  const group = new THREE.Group();

  // 4 Milled Aluminum Quadrants (Beveled Chassis Blocks)
  const blockGeo = createBeveledBoxGeometry(0.58, 0.34, 0.58, 0.05, 0.015);
  const aluminumMat = new THREE.MeshStandardMaterial({
    color: 0x272a34,
    metalness: 0.94,
    roughness: 0.22,
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
    quadrantMeshes.push(mesh);
    group.add(mesh);
  });

  // Top Circular Brushed Copper Heatsink Block
  const copperGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.08, 48);
  const copperMat = new THREE.MeshStandardMaterial({
    color: 0xbd6936,
    metalness: 0.92,
    roughness: 0.24,
  });
  const copperLid = new THREE.Mesh(copperGeo, copperMat);
  copperLid.position.y = 0.06;
  group.add(copperLid);

  // Central Logic Processor Die (Gold and Silicon)
  const coreDieGeo = createBeveledBoxGeometry(0.36, 0.06, 0.36, 0.02, 0.008);
  const coreDieMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.35,
    metalness: 0.9,
    roughness: 0.15,
  });
  const coreDie = new THREE.Mesh(coreDieGeo, coreDieMat);
  coreDie.position.y = -0.12;
  group.add(coreDie);

  // 4 Optical Waveguide Bridges with High-Velocity Data Packets
  const waveguideMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.8 });
  const busLines: THREE.Line[] = [];
  assembledVectors.forEach(([ax, az]) => {
    const pts = [
      new THREE.Vector3(0, -0.12, 0),
      new THREE.Vector3(ax * 0.5, -0.05, az * 0.5),
      new THREE.Vector3(ax, -0.12, az),
    ];
    const curve = new THREE.CatmullRomCurve3(pts);
    const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(16));
    const line = new THREE.Line(lineGeo, waveguideMat);
    busLines.push(line);
    group.add(line);
  });

  // Flowing Data Packet Sparks
  const sparkCount = 400;
  const sPos = new Float32Array(sparkCount * 3);
  for (let i = 0; i < sparkCount; i++) {
    sPos[i * 3] = (Math.random() - 0.5) * 0.5;
    sPos[i * 3 + 1] = -0.12;
    sPos[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
  }
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  const sparkMat = new THREE.PointsMaterial({
    size: 0.035,
    color: 0xfde047,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
  });
  const sparkPoints = new THREE.Points(sparkGeo, sparkMat);
  group.add(sparkPoints);

  return {
    group,
    update: (time, sceneIdx, sceneProgress, pointer) => {
      const px = pointer ? pointer.x * 0.25 : 0;
      const py = pointer ? pointer.y * 0.25 : 0;
      group.rotation.x = 0.52 + py;
      group.rotation.y = time * 0.15 + px;

      if (sceneIdx === 0) {
        // Act 1: Solid Monolithic Unibody (Closed)
        quadrantMeshes.forEach((mesh, i) => {
          const [ax, az] = assembledVectors[i];
          mesh.position.set(ax, -0.15, az);
        });
        copperLid.position.y = 0.06;
        waveguideMat.opacity = 0.1;
        sparkMat.opacity = 0.15;
      } else if (sceneIdx === 1) {
        // Act 2: Kinematic Rail Deconstruction (Lid lifts, modules glide outward)
        const ease = sceneProgress * sceneProgress * (3 - 2 * sceneProgress);
        quadrantMeshes.forEach((mesh, i) => {
          const [ax, az] = assembledVectors[i];
          mesh.position.set(ax * (1 + ease * 0.9), -0.15, az * (1 + ease * 0.9));
        });
        copperLid.position.y = 0.06 + ease * 0.55;
        waveguideMat.opacity = ease * 0.85;
        sparkMat.opacity = ease * 0.8;
      } else if (sceneIdx === 2) {
        // Act 3: 48.2 GB/s Optical Concurrency
        quadrantMeshes.forEach((mesh, i) => {
          const [ax, az] = assembledVectors[i];
          mesh.position.set(ax * 1.9, -0.15, az * 1.9);
        });
        copperLid.position.y = 0.61;
        waveguideMat.opacity = 0.9;
        sparkMat.opacity = 1.0;

        // Animate packets flowing outward
        const sArray = sparkGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < sparkCount; i++) {
          const quad = i % assembledVectors.length;
          const [ax, az] = assembledVectors[quad];
          const flow = (time * 3 + i * 0.02) % 1;
          sArray[i * 3] = THREE.MathUtils.lerp(0, ax * 1.9, flow);
          sArray[i * 3 + 1] = -0.12 + Math.sin(flow * Math.PI) * 0.1;
          sArray[i * 3 + 2] = THREE.MathUtils.lerp(0, az * 1.9, flow);
        }
        sparkGeo.attributes.position.needsUpdate = true;
      } else {
        // Act 4: Hero Exploded Architecture
        quadrantMeshes.forEach((mesh, i) => {
          const [ax, az] = assembledVectors[i];
          mesh.position.set(ax * 1.6, -0.15, az * 1.6);
        });
        copperLid.position.y = 0.52;
        waveguideMat.opacity = 0.65;
        sparkMat.opacity = 0.75;
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
// 2. IoT INTELLIGENCE: The Solid-State LiDAR Optical Engine
// Kinematics: Dual protective clamshell cowlings slide apart vertically;
// optical barrel telescopes forward; internal polygon mirror prism spools
// to 6,000 RPM, projecting 360° laser sweep and dense 3D point cloud.
// ════════════════════════════════════════════════════════════════════════════

export function createLidarPointcloudReel(): MultiSceneArtifact {
  const group = new THREE.Group();

  // 1. Dual Clamshell Aluminum Cowling (Top & Bottom Shells)
  const shellGeo = new THREE.CylinderGeometry(0.68, 0.72, 0.35, 48);
  const shellMat = new THREE.MeshStandardMaterial({
    color: 0x181a20,
    metalness: 0.95,
    roughness: 0.22,
  });

  const topShell = new THREE.Mesh(shellGeo, shellMat);
  topShell.position.y = 0.22;
  group.add(topShell);

  const bottomShell = new THREE.Mesh(shellGeo, shellMat);
  bottomShell.position.y = -0.22;
  group.add(bottomShell);

  // 2. Telescoping Optical Barrel Core
  const barrelGroup = new THREE.Group();

  const barrelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.55, 48);
  const barrelMat = new THREE.MeshStandardMaterial({
    color: 0x2d313b,
    metalness: 0.9,
    roughness: 0.18,
  });
  const barrel = new THREE.Mesh(barrelGeo, barrelMat);
  barrelGroup.add(barrel);

  // Optical Germanium Aperture Window
  const windowGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.06, 48);
  const windowMat = new THREE.MeshPhysicalMaterial({
    color: 0x10b981,
    transmission: 0.85,
    roughness: 0.05,
    ior: 1.6,
  });
  const windowMesh = new THREE.Mesh(windowGeo, windowMat);
  windowMesh.position.y = 0.28;
  barrelGroup.add(windowMesh);

  // Internal Polygon Mirror Prism
  const prismGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.22, 6);
  const prismMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.99,
    roughness: 0.05,
  });
  const prism = new THREE.Mesh(prismGeo, prismMat);
  prism.position.y = 0.12;
  barrelGroup.add(prism);

  // 360° Planar Laser Fan Cone
  const fanGeo = new THREE.ConeGeometry(2.4, 0.08, 32, 1, true, 0, Math.PI * 0.45);
  const fanMat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const fan = new THREE.Mesh(fanGeo, fanMat);
  fan.rotation.x = Math.PI / 2;
  fan.position.y = 0.28;
  barrelGroup.add(fan);

  group.add(barrelGroup);

  // 3. 2,400 Detected 3D Environment Point-Cloud Points
  const ptCount = 2400;
  const pPos = new Float32Array(ptCount * 3);
  const pCols = new Float32Array(ptCount * 3);
  const cGreen = new THREE.Color(0x10b981);
  const cCyan = new THREE.Color(0x06b6d4);

  for (let i = 0; i < ptCount; i++) {
    const ang = Math.random() * Math.PI * 2;
    const dist = 0.95 + Math.random() * 1.5;
    const y = (Math.random() - 0.5) * 1.4;
    pPos[i * 3] = Math.cos(ang) * dist;
    pPos[i * 3 + 1] = y;
    pPos[i * 3 + 2] = Math.sin(ang) * dist;

    const col = dist > 1.6 ? cCyan : cGreen;
    pCols[i * 3] = col.r;
    pCols[i * 3 + 1] = col.g;
    pCols[i * 3 + 2] = col.b;
  }
  const ptGeo = new THREE.BufferGeometry();
  ptGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  ptGeo.setAttribute('color', new THREE.BufferAttribute(pCols, 3));
  const ptMat = new THREE.PointsMaterial({
    size: 0.035,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
  });
  const pointCloud = new THREE.Points(ptGeo, ptMat);
  group.add(pointCloud);

  return {
    group,
    update: (time, sceneIdx, sceneProgress, pointer) => {
      const px = pointer ? pointer.x * 0.25 : 0;
      const py = pointer ? pointer.y * 0.25 : 0;
      group.rotation.x = 0.42 + py;
      group.rotation.y = time * 0.15 + px;

      if (sceneIdx === 0) {
        // Act 1: Sealed Protective Cowling
        topShell.position.y = 0.22;
        bottomShell.position.y = -0.22;
        barrelGroup.position.z = 0;
        fanMat.opacity = 0;
        ptMat.opacity = 0;
      } else if (sceneIdx === 1) {
        // Act 2: Clamshell Separation & Barrel Extension
        const ease = sceneProgress * sceneProgress * (3 - 2 * sceneProgress);
        topShell.position.y = 0.22 + ease * 0.48;
        bottomShell.position.y = -0.22 - ease * 0.38;
        barrelGroup.position.z = ease * 0.25;
        fanMat.opacity = ease * 0.25;
        ptMat.opacity = ease * 0.35;
      } else if (sceneIdx === 2) {
        // Act 3: 360° LiDAR High-Velocity Operation
        topShell.position.y = 0.7;
        bottomShell.position.y = -0.6;
        barrelGroup.position.z = 0.25;
        prism.rotation.y = time * 8.0;
        fan.rotation.z = time * 5.0;
        fanMat.opacity = 0.45;
        ptMat.opacity = 0.95;
      } else {
        // Act 4: Hero Exploded View
        topShell.position.y = 0.62;
        bottomShell.position.y = -0.52;
        barrelGroup.position.z = 0.2;
        prism.rotation.y = time * 2.0;
        fan.rotation.z = time * 2.0;
        fanMat.opacity = 0.25;
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
// 3. GEO INTELLIGENCE: The Architectural Stepped Topography Vault
// Kinematics: 4 exterior plinth walls hinge outward 60°; inside, 8 tiered contour
// terraces lift sequentially on hydraulic risers; raking sun illuminates slopes.
// ════════════════════════════════════════════════════════════════════════════

export function createProceduralTerrainReel(): MultiSceneArtifact {
  const group = new THREE.Group();

  // 1. Exterior Plinth Base
  const basePlinthGeo = createBeveledBoxGeometry(1.6, 0.12, 1.6, 0.03, 0.01);
  const darkStoneMat = new THREE.MeshStandardMaterial({
    color: 0x181a20,
    metalness: 0.85,
    roughness: 0.35,
  });
  const basePlinth = new THREE.Mesh(basePlinthGeo, darkStoneMat);
  basePlinth.position.y = -0.55;
  group.add(basePlinth);

  // 4 Perimeter Retaining Walls mounted on Base Hinges
  const wallGeo = createBeveledBoxGeometry(1.48, 0.45, 0.08, 0.02, 0.008);
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.9,
    roughness: 0.25,
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
    mesh.position.set(0, 0.22, 0); // Wall extends upward from hinge
    hinge.add(mesh);

    wallHinges.push(hinge);
    group.add(hinge);
  });

  // 2. 8 Tiered Architectural Contour Slabs (Stacked Terraces)
  const layers = 8;
  const terraceMeshes: THREE.Mesh[] = [];
  const plasterMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.32,
    metalness: 0.15,
  });

  const targetHeights = [
    -0.45, -0.36, -0.26, -0.15, -0.03, 0.1, 0.24, 0.38,
  ];

  for (let l = 0; l < layers; l++) {
    const scale = 1.35 - l * 0.12;
    const tGeo = createBeveledBoxGeometry(scale, 0.08, scale, 0.04, 0.012);
    const tMesh = new THREE.Mesh(tGeo, plasterMat);
    tMesh.position.y = -0.45; // Start collapsed
    terraceMeshes.push(tMesh);
    group.add(tMesh);
  }

  // Brass Azimuth North Arrow
  const arrowGeo = new THREE.ConeGeometry(0.12, 0.32, 4);
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.98,
    roughness: 0.12,
  });
  const arrow = new THREE.Mesh(arrowGeo, brassMat);
  arrow.rotation.x = Math.PI / 2;
  arrow.position.set(0, 0.52, 0);
  arrow.scale.set(0, 0, 0);
  group.add(arrow);

  return {
    group,
    update: (time, sceneIdx, sceneProgress, pointer) => {
      const px = pointer ? pointer.x * 0.25 : 0;
      const py = pointer ? pointer.y * 0.25 : 0;
      group.rotation.x = 0.52 + py;
      group.rotation.y = time * 0.12 + px;

      if (sceneIdx === 0) {
        // Act 1: Sealed Architectural Plinth
        wallHinges.forEach((h) => (h.rotation.x = 0));
        terraceMeshes.forEach((mesh) => (mesh.position.y = -0.45));
        arrow.scale.set(0, 0, 0);
      } else if (sceneIdx === 1) {
        // Act 2: Walls hinge open, terraces elevate sequentially
        const ease = sceneProgress * sceneProgress * (3 - 2 * sceneProgress);
        wallHinges.forEach((h) => (h.rotation.x = ease * 1.15)); // ~65 degrees

        terraceMeshes.forEach((mesh, l) => {
          const lProgress = Math.max(0, Math.min(1, (sceneProgress - (l / layers) * 0.6) * 2.5));
          mesh.position.y = THREE.MathUtils.lerp(-0.45, targetHeights[l], lProgress);
        });
        arrow.scale.set(0, 0, 0);
      } else if (sceneIdx === 2) {
        // Act 3: Raking Sun & Full Topographic Relief
        wallHinges.forEach((h) => (h.rotation.x = 1.15));
        terraceMeshes.forEach((mesh, l) => {
          mesh.position.y = targetHeights[l] + Math.sin(time * 3 + l * 0.4) * 0.02;
        });
        arrow.scale.setScalar(1);
        arrow.rotation.z = time * 2;
      } else {
        // Act 4: Hero Exploded Topographic Monument
        wallHinges.forEach((h) => (h.rotation.x = 1.05));
        terraceMeshes.forEach((mesh, l) => {
          mesh.position.y = targetHeights[l];
        });
        arrow.scale.setScalar(1);
        arrow.rotation.z = 0;
      }
    },
    dispose: () => {
      basePlinthGeo.dispose();
      darkStoneMat.dispose();
      wallGeo.dispose();
      wallMat.dispose();
      arrowGeo.dispose();
      brassMat.dispose();
      terraceMeshes.forEach((m) => m.geometry.dispose());
      plasterMat.dispose();
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 4. DEFENSE INTELLIGENCE: The Ballistic Tungsten Sovereign Enclave
// Kinematics: 4 gold Torx bolts unscrew and float into suspension; heavy top
// armor plate lifts vertically; 4 side plates slide out; central die activates
// with geodesic zero-knowledge quantum tripwire cage.
// ════════════════════════════════════════════════════════════════════════════

export function createTungstenVaultReel(): MultiSceneArtifact {
  const group = new THREE.Group();

  // 1. Heavy Milled Tungsten Base Chassis
  const baseChassisGeo = createBeveledBoxGeometry(1.35, 0.22, 1.35, 0.04, 0.015);
  const tungstenMat = new THREE.MeshStandardMaterial({
    color: 0x1a1c22,
    metalness: 0.95,
    roughness: 0.2,
  });
  const baseChassis = new THREE.Mesh(baseChassisGeo, tungstenMat);
  baseChassis.position.y = -0.42;
  group.add(baseChassis);

  // 2. Heavy Monolithic Top Armor Lid
  const lidGeo = createBeveledBoxGeometry(1.35, 0.18, 1.35, 0.04, 0.015);
  const lid = new THREE.Mesh(lidGeo, tungstenMat);
  lid.position.y = 0.08;
  group.add(lid);

  // 3. 4 Recessed 24k Gold Torx Fasteners (Bolts)
  const boltGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.08, 16);
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
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

  // 4. Central Cryptographic Processor Die
  const dieGeo = createBeveledBoxGeometry(0.48, 0.08, 0.48, 0.02, 0.008);
  const dieMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x15803d,
    emissiveIntensity: 0.4,
    metalness: 0.92,
    roughness: 0.15,
  });
  const die = new THREE.Mesh(dieGeo, dieMat);
  die.position.y = -0.22;
  group.add(die);

  // 5. Geodesic Zero-Knowledge Quantum Tripwire Cage
  const cageGeo = new THREE.IcosahedronGeometry(0.68, 1);
  const cageMat = new THREE.MeshBasicMaterial({
    color: 0x22c55e,
    wireframe: true,
    transparent: true,
    opacity: 0,
  });
  const cage = new THREE.Mesh(cageGeo, cageMat);
  cage.position.y = -0.15;
  group.add(cage);

  return {
    group,
    update: (time, sceneIdx, sceneProgress, pointer) => {
      const px = pointer ? pointer.x * 0.25 : 0;
      const py = pointer ? pointer.y * 0.25 : 0;
      group.rotation.x = 0.52 + py;
      group.rotation.y = time * 0.15 + px;

      if (sceneIdx === 0) {
        // Act 1: Sealed Ballistic Enclave
        boltMeshes.forEach((b, i) => {
          const [bx, bz] = boltCoords[i];
          b.position.set(bx, 0.18, bz);
        });
        lid.position.y = 0.08;
        cageMat.opacity = 0;
        dieMat.emissiveIntensity = 0.15;
      } else if (sceneIdx === 1) {
        // Act 2: Fasteners unscrew, top armor lifts vertically
        const ease = sceneProgress * sceneProgress * (3 - 2 * sceneProgress);
        boltMeshes.forEach((b, i) => {
          const [bx, bz] = boltCoords[i];
          b.position.set(bx, 0.18 + ease * 0.75, bz);
          b.rotation.y = time * 8;
        });
        lid.position.y = 0.08 + ease * 0.65;
        cageMat.opacity = ease * 0.55;
      } else if (sceneIdx === 2) {
        // Act 3: Air-Gapped ZK Quantum Circuit Verification
        boltMeshes.forEach((b, i) => {
          const [bx, bz] = boltCoords[i];
          b.position.set(bx * 1.3, 0.93, bz * 1.3);
        });
        lid.position.y = 0.73;
        cageMat.opacity = 0.85;
        cage.rotation.y = -time * 0.8;
        dieMat.emissiveIntensity = 0.8 + Math.sin(time * 8) * 0.2;
      } else {
        // Act 4: Hero Sovereign Enclave Exploded State
        boltMeshes.forEach((b, i) => {
          const [bx, bz] = boltCoords[i];
          b.position.set(bx * 1.2, 0.82, bz * 1.2);
        });
        lid.position.y = 0.65;
        cageMat.opacity = 0.65;
        cage.rotation.y = -time * 0.3;
        dieMat.emissiveIntensity = 0.55;
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
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 5. MINIATURE INTELLIGENCE: The 3nm Neuromorphic Micro-Chip Die
// Kinematics: Metallic heat-spreader lid lifts upward into suspension; bare
// 3nm silicon die is revealed; gold wire bond tubes arc to pads; 3D synaptic
// neural tree unfurls and fires electrical action potentials on 0.8W.
// ════════════════════════════════════════════════════════════════════════════

export function createNeuromorphicDieReel(): MultiSceneArtifact {
  const group = new THREE.Group();

  // 1. Dark Organic Substrate Board (BGA Plinth)
  const substrateGeo = createBeveledBoxGeometry(1.35, 0.08, 1.35, 0.04, 0.015);
  const substrateMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.95,
    roughness: 0.2,
  });
  const substrate = new THREE.Mesh(substrateGeo, substrateMat);
  substrate.position.y = -0.52;
  group.add(substrate);

  // 2. Metallic Heat-Spreader Lid (Lifts Upward)
  const lidGeo = createBeveledBoxGeometry(1.2, 0.06, 1.2, 0.03, 0.01);
  const lidMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.96,
    roughness: 0.15,
  });
  const lid = new THREE.Mesh(lidGeo, lidMat);
  lid.position.y = -0.42;
  group.add(lid);

  // 3. 3nm Bare Silicon Die with Diffraction-Grating Iridescence
  const dieGeo = createBeveledBoxGeometry(0.55, 0.04, 0.55, 0.01, 0.005);
  const dieMat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    emissive: 0x1d4ed8,
    emissiveIntensity: 0.45,
    metalness: 0.9,
    roughness: 0.1,
  });
  const die = new THREE.Mesh(dieGeo, dieMat);
  die.position.y = -0.46;
  group.add(die);

  // 4. Microscopic Gold Wire Bond Tubes (16 Curved Arcs)
  const wireGroup = new THREE.Group();
  const wires = 16;
  const wireMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
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
  wireGroup.scale.set(0, 0, 0);
  group.add(wireGroup);

  // 5. Volumetric 3D Neuromorphic Synaptic Tree (Branching Dendrites)
  const branches = 16;
  const treeLines: THREE.Line[] = [];
  const lineMat = new THREE.LineBasicMaterial({ color: 0xeab308, transparent: true, opacity: 0.85 });

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
    treeLines.push(line);
    group.add(line);
  }

  // 1,200 Action-Potential Synaptic Sparks
  const sparkCount = 1200;
  const sPos = new Float32Array(sparkCount * 3);
  for (let i = 0; i < sparkCount; i++) {
    sPos[i * 3] = (Math.random() - 0.5) * 0.8;
    sPos[i * 3 + 1] = -0.44;
    sPos[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
  }
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  const sparkMat = new THREE.PointsMaterial({
    size: 0.03,
    color: 0xfde047,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
  });
  const sparkPoints = new THREE.Points(sparkGeo, sparkMat);
  group.add(sparkPoints);

  return {
    group,
    update: (time, sceneIdx, sceneProgress, pointer) => {
      const px = pointer ? pointer.x * 0.25 : 0;
      const py = pointer ? pointer.y * 0.25 : 0;
      group.rotation.x = 0.52 + py;
      group.rotation.y = time * 0.15 + px;

      if (sceneIdx === 0) {
        // Act 1: Encapsulated BGA Package
        lid.position.y = -0.42;
        wireGroup.scale.set(0, 0, 0);
        lineMat.opacity = 0;
        sparkMat.opacity = 0;
      } else if (sceneIdx === 1) {
        // Act 2: Heat-spreader lifts, bare 3nm die revealed, gold wires arc to pads
        const ease = sceneProgress * sceneProgress * (3 - 2 * sceneProgress);
        lid.position.y = -0.42 + ease * 0.72;
        wireGroup.scale.setScalar(ease);
        lineMat.opacity = ease * 0.65;
        sparkMat.opacity = ease * 0.55;
      } else if (sceneIdx === 2) {
        // Act 3: 0.8W Synaptic Neural Pulses
        lid.position.y = 0.3;
        wireGroup.scale.set(1, 1, 1);
        lineMat.opacity = 0.85;
        sparkMat.opacity = 0.95;

        // Flow sparks along dendrite pathways
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
        // Act 4: Hero Local Sovereignty Exploded View
        lid.position.y = 0.24;
        wireGroup.scale.set(1, 1, 1);
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
