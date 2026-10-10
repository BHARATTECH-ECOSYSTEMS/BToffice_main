import * as THREE from 'three';

export interface MultiSceneArtifact {
  group: THREE.Group;
  cameraOffset?: { x: number; y: number; z: number };
  update: (time: number, sceneIdx: number, sceneProgress: number, pointer?: { x: number; y: number }) => void;
  dispose: () => void;
}

// ── Contact Shadow Helper ────────────────────────────────────────────────────
export function createContactShadow(w = 2.8, d = 2.8, opacity = 0.35): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, `rgba(10, 12, 16, ${opacity})`);
  grad.addColorStop(0.4, `rgba(10, 12, 16, ${opacity * 0.45})`);
  grad.addColorStop(0.75, `rgba(10, 12, 16, ${opacity * 0.1})`);
  grad.addColorStop(1, 'rgba(10, 12, 16, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  const geo = new THREE.PlaneGeometry(w, d);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -1.1;
  return mesh;
}

// ════════════════════════════════════════════════════════════════════════════
// 0. GI RIVINITY: 5D Quantum Quartz Memory Lattice (8,000 Particles + Core)
// ════════════════════════════════════════════════════════════════════════════

export function createQuartzLatticeReel(): MultiSceneArtifact {
  const group = new THREE.Group();

  // 1. Central Refractive Crystal Core
  const coreGeo = new THREE.IcosahedronGeometry(0.55, 3);
  const coreMat = new THREE.MeshPhysicalMaterial({
    color: 0x9333ea,
    emissive: 0x581c87,
    emissiveIntensity: 0.4,
    roughness: 0.1,
    metalness: 0.1,
    transmission: 0.85,
    ior: 1.6,
    thickness: 1.2,
    wireframe: true,
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  group.add(coreMesh);

  // 2. 6,000 Holographic Memory Particles in Concentric Fibonacci Shells
  const particleCount = 4500;
  const posArr = new Float32Array(particleCount * 3);
  const targetArr = new Float32Array(particleCount * 3);
  const colorArr = new Float32Array(particleCount * 3);

  const cViolet = new THREE.Color(0xa855f7);
  const cGold = new THREE.Color(0xfacc15);
  const cRed = new THREE.Color(0xef4444);

  for (let i = 0; i < particleCount; i++) {
    const phi = Math.acos(-1 + (2 * i) / particleCount);
    const theta = Math.sqrt(particleCount * Math.PI) * phi;
    const layer = 0.85 + (i % 5) * 0.22;

    // Structured target coordinates (Concentric Riemann Shells)
    const tx = layer * Math.cos(theta) * Math.sin(phi);
    const ty = layer * Math.sin(theta) * Math.sin(phi);
    const tz = layer * Math.cos(phi);

    targetArr[i * 3] = tx;
    targetArr[i * 3 + 1] = ty;
    targetArr[i * 3 + 2] = tz;

    // Disordered initial coordinates (Entropy state)
    posArr[i * 3] = tx * (1 + (Math.random() - 0.5) * 1.5);
    posArr[i * 3 + 1] = ty * (1 + (Math.random() - 0.5) * 1.5);
    posArr[i * 3 + 2] = tz * (1 + (Math.random() - 0.5) * 1.5);

    colorArr[i * 3] = cViolet.r;
    colorArr[i * 3 + 1] = cViolet.g;
    colorArr[i * 3 + 2] = cViolet.b;
  }

  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  particleGeo.setAttribute('color', new THREE.BufferAttribute(colorArr, 3));

  const particleMat = new THREE.PointsMaterial({
    size: 0.038,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  group.add(particles);

  // 3. Laser Inscription Beam Line
  const laserGeo = new THREE.CylinderGeometry(0.012, 0.012, 2.6, 16);
  const laserMat = new THREE.MeshBasicMaterial({ color: 0xc084fc, transparent: true, opacity: 0 });
  const laserBeam = new THREE.Mesh(laserGeo, laserMat);
  laserBeam.position.set(0, 0, 0);
  group.add(laserBeam);

  // 4. Concentric Holographic Equatorial Reticle Rings
  const ringGroup = new THREE.Group();
  for (let r = 0; r < 3; r++) {
    const ringGeo = new THREE.RingGeometry(0.9 + r * 0.35, 0.908 + r * 0.35, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.25 + r * 0.15,
      side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2 + r * 0.2;
    ringGroup.add(ringMesh);
  }
  group.add(ringGroup);

  return {
    group,
    update: (time, sceneIdx, sceneProgress, pointer) => {
      const px = pointer ? pointer.x * 0.3 : 0;
      const py = pointer ? pointer.y * 0.3 : 0;
      const pAttr = particleGeo.attributes.position as THREE.BufferAttribute;
      const cAttr = particleGeo.attributes.color as THREE.BufferAttribute;
      const pData = pAttr.array as Float32Array;
      const cData = cAttr.array as Float32Array;

      // Base rotation
      group.rotation.x = 0.35 + py;
      group.rotation.y = time * 0.15 + px;

      if (sceneIdx === 0) {
        // Act 1: Attention Drift (High entropy, disordered red/amber jitter)
        laserMat.opacity = 0;
        ringGroup.scale.setScalar(0.7);
        coreMesh.rotation.y = time * 0.2;
        coreMesh.rotation.x = time * 0.15;

        for (let i = 0; i < particleCount; i++) {
          const idx = i * 3;
          const noise = Math.sin(time * 3 + i) * 0.15;
          pData[idx] = targetArr[idx] * (1.3 + noise);
          pData[idx + 1] = targetArr[idx + 1] * (1.3 + noise);
          pData[idx + 2] = targetArr[idx + 2] * (1.3 + noise);

          // Drift color towards red
          cData[idx] = cRed.r;
          cData[idx + 1] = cRed.g;
          cData[idx + 2] = cRed.b;
        }
      } else if (sceneIdx === 1) {
        // Act 2: Femtosecond Laser Inscription (Laser beam sweeps, particles snap to crystal lattice)
        laserMat.opacity = 0.85;
        laserBeam.rotation.z = Math.sin(time * 6) * 0.4;
        laserBeam.position.x = Math.cos(time * 6) * 0.6;

        for (let i = 0; i < particleCount; i++) {
          const idx = i * 3;
          const snap = Math.min(1, Math.max(0, (sceneProgress - (i / particleCount) * 0.7) * 3));
          pData[idx] = THREE.MathUtils.lerp(targetArr[idx] * 1.4, targetArr[idx], snap);
          pData[idx + 1] = THREE.MathUtils.lerp(targetArr[idx + 1] * 1.4, targetArr[idx + 1], snap);
          pData[idx + 2] = THREE.MathUtils.lerp(targetArr[idx + 2] * 1.4, targetArr[idx + 2], snap);

          cData[idx] = THREE.MathUtils.lerp(cRed.r, cViolet.r, snap);
          cData[idx + 1] = THREE.MathUtils.lerp(cRed.g, cViolet.g, snap);
          cData[idx + 2] = THREE.MathUtils.lerp(cRed.b, cViolet.b, snap);
        }
      } else if (sceneIdx === 2) {
        // Act 3: 8,000 RPM Readback (High-speed counter-rotation, rainbow chromatic waves)
        laserMat.opacity = 0;
        group.rotation.y = time * 0.85 + px;
        coreMesh.rotation.y = -time * 1.2;

        for (let i = 0; i < particleCount; i++) {
          const idx = i * 3;
          const wave = Math.sin(time * 8 + i * 0.05);
          pData[idx] = targetArr[idx] * (1 + wave * 0.04);
          pData[idx + 1] = targetArr[idx + 1] * (1 + wave * 0.04);
          pData[idx + 2] = targetArr[idx + 2] * (1 + wave * 0.04);

          // Spectral rainbow phase
          cData[idx] = (Math.sin(time * 4 + i * 0.02) * 0.5 + 0.5);
          cData[idx + 1] = (Math.sin(time * 4 + i * 0.02 + 2.09) * 0.5 + 0.5);
          cData[idx + 2] = (Math.sin(time * 4 + i * 0.02 + 4.18) * 0.5 + 0.5);
        }
      } else {
        // Act 4: Verified 10,000-Yr Enclave (Stable breathing gold/cyan crystalline torus)
        laserMat.opacity = 0;
        group.rotation.y = time * 0.25 + px;
        ringGroup.rotation.z = time * 0.15;

        for (let i = 0; i < particleCount; i++) {
          const idx = i * 3;
          const breath = Math.sin(time * 1.8 + i * 0.01) * 0.02;
          pData[idx] = targetArr[idx] * (1 + breath);
          pData[idx + 1] = targetArr[idx + 1] * (1 + breath);
          pData[idx + 2] = targetArr[idx + 2] * (1 + breath);

          cData[idx] = cGold.r;
          cData[idx + 1] = cGold.g;
          cData[idx + 2] = cGold.b;
        }
      }

      pAttr.needsUpdate = true;
      cAttr.needsUpdate = true;
    },
    dispose: () => {
      coreGeo.dispose();
      coreMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      laserGeo.dispose();
      laserMat.dispose();
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 1. RIVINITY CORE: Distributed Compute Fabric & 48.2 GB/s Optical Bus Network
// ════════════════════════════════════════════════════════════════════════════

export function createComputeFabricReel(): MultiSceneArtifact {
  const group = new THREE.Group();

  // Central Router Node
  const hubGeo = new THREE.OctahedronGeometry(0.48, 2);
  const hubMat = new THREE.MeshStandardMaterial({
    color: 0x1e2029,
    metalness: 0.95,
    roughness: 0.18,
    wireframe: false,
  });
  const hub = new THREE.Mesh(hubGeo, hubMat);
  group.add(hub);

  // 4 Orbital Compute Clusters
  const satelliteCoords = [
    [-0.95, 0.45, 0.5],
    [0.95, 0.45, -0.5],
    [-0.7, -0.55, -0.65],
    [0.7, -0.55, 0.65],
  ];
  const satMeshes: THREE.Mesh[] = [];
  const satGeo = new THREE.BoxGeometry(0.32, 0.32, 0.32);

  satelliteCoords.forEach(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.85,
      roughness: 0.25,
    });
    const m = new THREE.Mesh(satGeo, mat);
    satMeshes.push(m);
    group.add(m);
  });

  // Flowing Optical Interconnect Bus Lines (16 Bezier spline curves)
  const busCurves: THREE.Line[] = [];
  const lineMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.6 });

  for (let i = 0; i < satelliteCoords.length; i++) {
    const pts = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(satelliteCoords[i][0] * 0.5, satelliteCoords[i][1] * 0.5 + 0.15, satelliteCoords[i][2] * 0.5),
      new THREE.Vector3(...satelliteCoords[i]),
    ];
    const curve = new THREE.CatmullRomCurve3(pts);
    const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(24));
    const line = new THREE.Line(lineGeo, lineMat);
    busCurves.push(line);
    group.add(line);
  }

  // 1,200 High-Velocity Optical Data Packets
  const packetCount = 1200;
  const packetPos = new Float32Array(packetCount * 3);
  const packetColors = new Float32Array(packetCount * 3);
  const pColor = new THREE.Color(0xfbbf24);

  for (let i = 0; i < packetCount; i++) {
    packetPos[i * 3] = (Math.random() - 0.5) * 2;
    packetPos[i * 3 + 1] = (Math.random() - 0.5) * 2;
    packetPos[i * 3 + 2] = (Math.random() - 0.5) * 2;
    packetColors[i * 3] = pColor.r;
    packetColors[i * 3 + 1] = pColor.g;
    packetColors[i * 3 + 2] = pColor.b;
  }

  const packetGeo = new THREE.BufferGeometry();
  packetGeo.setAttribute('position', new THREE.BufferAttribute(packetPos, 3));
  packetGeo.setAttribute('color', new THREE.BufferAttribute(packetColors, 3));
  const packetMat = new THREE.PointsMaterial({
    size: 0.04,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
  });
  const packetPoints = new THREE.Points(packetGeo, packetMat);
  group.add(packetPoints);

  return {
    group,
    update: (time, sceneIdx, sceneProgress, pointer) => {
      const px = pointer ? pointer.x * 0.25 : 0;
      const py = pointer ? pointer.y * 0.25 : 0;
      group.rotation.x = 0.4 + py;
      group.rotation.y = time * 0.2 + px;

      hub.rotation.x = time * 0.4;
      hub.rotation.y = time * 0.6;

      const pPosAttr = packetGeo.attributes.position as THREE.BufferAttribute;
      const pData = pPosAttr.array as Float32Array;

      if (sceneIdx === 0) {
        // Act 1: Siloed, isolated cluster drift
        satMeshes.forEach((sat, i) => {
          const [sx, sy, sz] = satelliteCoords[i];
          sat.position.set(sx * 1.8 + Math.sin(time * 2 + i) * 0.2, sy * 1.8, sz * 1.8);
        });
        lineMat.opacity = 0.1;
        packetMat.opacity = 0.15;
      } else if (sceneIdx === 1) {
        // Act 2: Mechanical lock into unified constellation
        const ease = sceneProgress * sceneProgress * (3 - 2 * sceneProgress);
        satMeshes.forEach((sat, i) => {
          const [sx, sy, sz] = satelliteCoords[i];
          sat.position.set(
            THREE.MathUtils.lerp(sx * 1.8, sx, ease),
            THREE.MathUtils.lerp(sy * 1.8, sy, ease),
            THREE.MathUtils.lerp(sz * 1.8, sz, ease)
          );
        });
        lineMat.opacity = THREE.MathUtils.lerp(0.1, 0.7, ease);
        packetMat.opacity = THREE.MathUtils.lerp(0.15, 0.8, ease);
      } else if (sceneIdx === 2) {
        // Act 3: 48.2 GB/s Optical Bus Concurrency (stream packets along bus lines)
        satMeshes.forEach((sat, i) => {
          const [sx, sy, sz] = satelliteCoords[i];
          sat.position.set(sx, sy, sz);
        });
        lineMat.opacity = 0.85;
        packetMat.opacity = 1;

        for (let i = 0; i < packetCount; i++) {
          const satIdx = i % satelliteCoords.length;
          const [sx, sy, sz] = satelliteCoords[satIdx];
          const flow = (time * 3.5 + i * 0.05) % 1;
          pData[i * 3] = THREE.MathUtils.lerp(0, sx, flow);
          pData[i * 3 + 1] = THREE.MathUtils.lerp(0, sy, flow) + Math.sin(flow * Math.PI) * 0.1;
          pData[i * 3 + 2] = THREE.MathUtils.lerp(0, sz, flow);
        }
        pPosAttr.needsUpdate = true;
      } else {
        // Act 4: Synchronized steady state
        satMeshes.forEach((sat, i) => {
          const [sx, sy, sz] = satelliteCoords[i];
          sat.position.set(sx, sy, sz);
        });
        lineMat.opacity = 0.55;
        packetMat.opacity = 0.7;
      }
    },
    dispose: () => {
      hubGeo.dispose();
      hubMat.dispose();
      satGeo.dispose();
      packetGeo.dispose();
      packetMat.dispose();
      lineMat.dispose();
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 2. IoT INTELLIGENCE: 3D LiDAR Optical Sensor & 360° Point Cloud Environment
// ════════════════════════════════════════════════════════════════════════════

export function createLidarPointcloudReel(): MultiSceneArtifact {
  const group = new THREE.Group();

  // 1. Rotating Sensor Unit Housing
  const sensorGeo = new THREE.CylinderGeometry(0.38, 0.42, 0.65, 32);
  const sensorMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    metalness: 0.9,
    roughness: 0.2,
  });
  const sensorMesh = new THREE.Mesh(sensorGeo, sensorMat);
  sensorMesh.position.y = -0.4;
  group.add(sensorMesh);

  // Optical Window
  const windowGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.35, 32);
  const windowMat = new THREE.MeshPhysicalMaterial({
    color: 0x10b981,
    transmission: 0.75,
    roughness: 0.05,
    ior: 1.5,
  });
  const windowMesh = new THREE.Mesh(windowGeo, windowMat);
  windowMesh.position.y = 0.05;
  group.add(windowMesh);

  // 2. Sweeping Laser Fan Cone
  const fanGeo = new THREE.ConeGeometry(2.4, 0.15, 32, 1, true, 0, Math.PI * 0.45);
  const fanMat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
  });
  const fanMesh = new THREE.Mesh(fanGeo, fanMat);
  fanMesh.rotation.x = Math.PI / 2;
  fanMesh.position.y = 0.05;
  group.add(fanMesh);

  // 3. 3,500 Detected 3D Environment Point Cloud Points
  const pointCount = 3500;
  const pPos = new Float32Array(pointCount * 3);
  const pColors = new Float32Array(pointCount * 3);

  const cEmerald = new THREE.Color(0x10b981);
  const cCyan = new THREE.Color(0x06b6d4);
  const cAmber = new THREE.Color(0xf59e0b);

  for (let i = 0; i < pointCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 0.9 + Math.random() * 1.6;
    const height = (Math.random() - 0.5) * 1.8;

    pPos[i * 3] = Math.cos(angle) * dist;
    pPos[i * 3 + 1] = height;
    pPos[i * 3 + 2] = Math.sin(angle) * dist;

    const col = dist > 1.8 ? cAmber : dist > 1.3 ? cCyan : cEmerald;
    pColors[i * 3] = col.r;
    pColors[i * 3 + 1] = col.g;
    pColors[i * 3 + 2] = col.b;
  }

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));

  const pMat = new THREE.PointsMaterial({
    size: 0.034,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(pGeo, pMat);
  group.add(points);

  return {
    group,
    update: (time, sceneIdx, sceneProgress, pointer) => {
      const px = pointer ? pointer.x * 0.25 : 0;
      const py = pointer ? pointer.y * 0.25 : 0;
      group.rotation.x = 0.35 + py;
      group.rotation.y = px;

      if (sceneIdx === 0) {
        // Act 1: Blind dormant sensor
        fanMat.opacity = 0;
        pMat.opacity = 0;
        windowMesh.rotation.y = 0;
      } else if (sceneIdx === 1) {
        // Act 2: Prism spool-up
        const speed = sceneProgress * sceneProgress * 8;
        windowMesh.rotation.y += speed * 0.05;
        fanMat.opacity = THREE.MathUtils.lerp(0, 0.25, sceneProgress);
        pMat.opacity = THREE.MathUtils.lerp(0, 0.4, sceneProgress);
      } else if (sceneIdx === 2) {
        // Act 3: 360° Continuous LiDAR Sweep
        windowMesh.rotation.y += 0.35;
        fanMesh.rotation.z = time * 6;
        fanMat.opacity = 0.45;
        pMat.opacity = 0.95;
      } else {
        // Act 4: Situational spatial concurrency locked
        windowMesh.rotation.y += 0.15;
        fanMesh.rotation.z = time * 3;
        fanMat.opacity = 0.25;
        pMat.opacity = 0.85;
      }
    },
    dispose: () => {
      sensorGeo.dispose();
      sensorMat.dispose();
      windowGeo.dispose();
      windowMat.dispose();
      fanGeo.dispose();
      fanMat.dispose();
      pGeo.dispose();
      pMat.dispose();
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 3. GEO INTELLIGENCE: Procedural 3D Topographic Terrain & Raking Solar Shadows
// ════════════════════════════════════════════════════════════════════════════

export function createProceduralTerrainReel(): MultiSceneArtifact {
  const group = new THREE.Group();

  // 1. Procedural 3D Mesh (80x80 grid with dynamic elevation)
  const segments = 80;
  const terrainGeo = new THREE.PlaneGeometry(2.6, 2.6, segments, segments);
  terrainGeo.rotateX(-Math.PI / 2);

  const baseHeights = new Float32Array((segments + 1) * (segments + 1));
  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i <= segments; i++) {
    for (let j = 0; j <= segments; j++) {
      const idx = i * (segments + 1) + j;
      const u = (i / segments) * 4 - 2;
      const v = (j / segments) * 4 - 2;

      // Multi-frequency fractal elevation
      const elevation =
        Math.sin(u * 1.8) * Math.cos(v * 1.8) * 0.35 +
        Math.sin(u * 4.2 + v * 3.1) * 0.18 +
        Math.cos(u * 8.5) * 0.06;

      // Center mountain falloff
      const r = Math.sqrt(u * u + v * v);
      const falloff = Math.max(0, 1 - r / 2.6);
      baseHeights[idx] = elevation * falloff;
    }
  }

  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.35,
    metalness: 0.15,
    wireframe: true,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.position.y = -0.3;
  group.add(terrainMesh);

  // 2. Stepped Contour Elevation Watermark Rings
  const contourGroup = new THREE.Group();
  for (let c = 0; c < 5; c++) {
    const ringGeo = new THREE.RingGeometry(0.3 + c * 0.3, 0.306 + c * 0.3, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = -0.25 + c * 0.12;
    contourGroup.add(ringMesh);
  }
  group.add(contourGroup);

  return {
    group,
    update: (time, sceneIdx, sceneProgress, pointer) => {
      const px = pointer ? pointer.x * 0.25 : 0;
      const py = pointer ? pointer.y * 0.25 : 0;
      group.rotation.x = 0.55 + py;
      group.rotation.y = time * 0.15 + px;

      const pData = posAttr.array as Float32Array;

      if (sceneIdx === 0) {
        // Act 1: Flat 2D orthographic raster
        terrainMat.color.set(0x334155);
        contourGroup.scale.set(0, 0, 0);
        for (let k = 0; k < baseHeights.length; k++) {
          pData[k * 3 + 1] = 0; // Flat
        }
      } else if (sceneIdx === 1) {
        // Act 2: Sequential stepped terrace extrusion
        terrainMat.color.set(0x0284c7);
        const ease = sceneProgress * sceneProgress * (3 - 2 * sceneProgress);
        contourGroup.scale.setScalar(ease);
        for (let k = 0; k < baseHeights.length; k++) {
          pData[k * 3 + 1] = baseHeights[k] * ease;
        }
      } else if (sceneIdx === 2) {
        // Act 3: Raking solar audit (flowing elevation contours)
        terrainMat.color.set(0x38bdf8);
        contourGroup.scale.set(1, 1, 1);
        for (let k = 0; k < baseHeights.length; k++) {
          pData[k * 3 + 1] = baseHeights[k] * (1 + Math.sin(time * 3 + k * 0.05) * 0.05);
        }
      } else {
        // Act 4: Planetary ground-truth locked
        terrainMat.color.set(0x0ea5e9);
        contourGroup.scale.set(1, 1, 1);
        for (let k = 0; k < baseHeights.length; k++) {
          pData[k * 3 + 1] = baseHeights[k];
        }
      }
      posAttr.needsUpdate = true;
    },
    dispose: () => {
      terrainGeo.dispose();
      terrainMat.dispose();
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 4. DEFENSE INTELLIGENCE: Crystalline Tungsten Vault & ZK Quantum Shield
// ════════════════════════════════════════════════════════════════════════════

export function createTungstenVaultReel(): MultiSceneArtifact {
  const group = new THREE.Group();

  // 1. Inner Cryptographic Die Core
  const coreGeo = new THREE.DodecahedronGeometry(0.45, 1);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    metalness: 0.95,
    roughness: 0.1,
    wireframe: true,
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  group.add(coreMesh);

  // 2. Outer Ballistic Tungsten Facets (8 segmented interlocking shield plates)
  const shieldGeo = new THREE.BoxGeometry(0.45, 0.45, 0.12);
  const shieldMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    metalness: 0.95,
    roughness: 0.22,
  });

  const shieldOffsets = [
    [-0.55, 0.55, 0.55],
    [0.55, 0.55, 0.55],
    [-0.55, -0.55, 0.55],
    [0.55, -0.55, 0.55],
    [-0.55, 0.55, -0.55],
    [0.55, 0.55, -0.55],
    [-0.55, -0.55, -0.55],
    [0.55, -0.55, -0.55],
  ];

  const shieldMeshes: THREE.Mesh[] = [];
  shieldOffsets.forEach(() => {
    const sm = new THREE.Mesh(shieldGeo, shieldMat);
    shieldMeshes.push(sm);
    group.add(sm);
  });

  // 3. Quantum Geodesic Tripwire Cage
  const cageGeo = new THREE.IcosahedronGeometry(1.2, 1);
  const cageMat = new THREE.MeshBasicMaterial({
    color: 0x22c55e,
    wireframe: true,
    transparent: true,
    opacity: 0,
  });
  const cage = new THREE.Mesh(cageGeo, cageMat);
  group.add(cage);

  return {
    group,
    update: (time, sceneIdx, sceneProgress, pointer) => {
      const px = pointer ? pointer.x * 0.25 : 0;
      const py = pointer ? pointer.y * 0.25 : 0;
      group.rotation.x = 0.4 + py;
      group.rotation.y = time * 0.2 + px;

      coreMesh.rotation.x = time * 0.5;
      coreMesh.rotation.y = time * 0.7;

      if (sceneIdx === 0) {
        // Act 1: Exposed vulnerable surface
        coreMat.color.set(0xef4444);
        cageMat.opacity = 0;
        shieldMeshes.forEach((sm, i) => {
          const [ox, oy, oz] = shieldOffsets[i];
          sm.position.set(ox * 2.2, oy * 2.2, oz * 2.2);
        });
      } else if (sceneIdx === 1) {
        // Act 2: Tungsten chassis hermetically seats and seals
        const ease = sceneProgress * sceneProgress * (3 - 2 * sceneProgress);
        shieldMeshes.forEach((sm, i) => {
          const [ox, oy, oz] = shieldOffsets[i];
          sm.position.set(
            THREE.MathUtils.lerp(ox * 2.2, ox, ease),
            THREE.MathUtils.lerp(oy * 2.2, oy, ease),
            THREE.MathUtils.lerp(oz * 2.2, oz, ease)
          );
        });
        cageMat.opacity = THREE.MathUtils.lerp(0, 0.4, ease);
      } else if (sceneIdx === 2) {
        // Act 3: Air-gapped ZK tripwires active
        cageMat.opacity = 0.85;
        cage.rotation.y = -time * 0.5;
        coreMat.color.set(0x22c55e);
        shieldMeshes.forEach((sm, i) => {
          const [ox, oy, oz] = shieldOffsets[i];
          sm.position.set(ox, oy, oz);
        });
      } else {
        // Act 4: Sovereign Enclave Locked
        cageMat.opacity = 0.6;
        coreMat.color.set(0x22c55e);
        shieldMeshes.forEach((sm, i) => {
          const [ox, oy, oz] = shieldOffsets[i];
          sm.position.set(ox, oy, oz);
        });
      }
    },
    dispose: () => {
      coreGeo.dispose();
      coreMat.dispose();
      shieldGeo.dispose();
      shieldMat.dispose();
      cageGeo.dispose();
      cageMat.dispose();
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 5. MINIATURE INTELLIGENCE: 3nm Neuromorphic Synaptic Neural Tree (0.8W)
// ════════════════════════════════════════════════════════════════════════════

export function createNeuromorphicDieReel(): MultiSceneArtifact {
  const group = new THREE.Group();

  // 1. 3nm Silicon Die Plinth
  const dieGeo = new THREE.BoxGeometry(0.85, 0.08, 0.85);
  const dieMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.95,
    roughness: 0.15,
  });
  const dieMesh = new THREE.Mesh(dieGeo, dieMat);
  dieMesh.position.y = -0.55;
  group.add(dieMesh);

  // 2. Microscopic Gold Bond Wire Arcs
  const wireGroup = new THREE.Group();
  for (let w = 0; w < 12; w++) {
    const angle = (w / 12) * Math.PI * 2;
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(Math.cos(angle) * 0.38, -0.51, Math.sin(angle) * 0.38),
      new THREE.Vector3(Math.cos(angle) * 0.55, -0.32, Math.sin(angle) * 0.55),
      new THREE.Vector3(Math.cos(angle) * 0.68, -0.55, Math.sin(angle) * 0.68)
    );
    const wireGeo = new THREE.TubeGeometry(curve, 16, 0.012, 8, false);
    const wireMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.98,
      roughness: 0.1,
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    wireGroup.add(wireMesh);
  }
  group.add(wireGroup);

  // 3. 3D Synaptic Neural Dendrite Axon Tree (Branching Splines)
  const treeLines: THREE.Line[] = [];
  const lineMat = new THREE.LineBasicMaterial({ color: 0xeab308, transparent: true, opacity: 0.85 });

  const branches = 18;
  for (let b = 0; b < branches; b++) {
    const a = (b / branches) * Math.PI * 2;
    const pts = [
      new THREE.Vector3(0, -0.5, 0),
      new THREE.Vector3(Math.cos(a) * 0.25, -0.2, Math.sin(a) * 0.25),
      new THREE.Vector3(Math.cos(a + 0.3) * 0.5, 0.15, Math.sin(a + 0.3) * 0.5),
      new THREE.Vector3(Math.cos(a) * 0.75, 0.45, Math.sin(a) * 0.75),
    ];
    const curve = new THREE.CatmullRomCurve3(pts);
    const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(20));
    const line = new THREE.Line(lineGeo, lineMat);
    treeLines.push(line);
    group.add(line);
  }

  // 4. 1,800 Synaptic Action Potential Energy Sparks
  const sparkCount = 1800;
  const sparkPos = new Float32Array(sparkCount * 3);
  const sparkColors = new Float32Array(sparkCount * 3);
  const cGold = new THREE.Color(0xfde047);

  for (let i = 0; i < sparkCount; i++) {
    sparkPos[i * 3] = (Math.random() - 0.5) * 1.4;
    sparkPos[i * 3 + 1] = -0.5 + Math.random() * 1.1;
    sparkPos[i * 3 + 2] = (Math.random() - 0.5) * 1.4;
    sparkColors[i * 3] = cGold.r;
    sparkColors[i * 3 + 1] = cGold.g;
    sparkColors[i * 3 + 2] = cGold.b;
  }

  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkColors, 3));
  const sparkMat = new THREE.PointsMaterial({
    size: 0.035,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
  });
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  group.add(sparks);

  return {
    group,
    update: (time, sceneIdx, sceneProgress, pointer) => {
      const px = pointer ? pointer.x * 0.25 : 0;
      const py = pointer ? pointer.y * 0.25 : 0;
      group.rotation.x = 0.5 + py;
      group.rotation.y = time * 0.2 + px;

      const pPosAttr = sparkGeo.attributes.position as THREE.BufferAttribute;
      const pData = pPosAttr.array as Float32Array;

      if (sceneIdx === 0) {
        // Act 1: High latency cloud anchor (sparks drift upwards into void)
        wireGroup.scale.set(0, 0, 0);
        sparkMat.opacity = 0.25;
        for (let i = 0; i < sparkCount; i++) {
          pData[i * 3 + 1] += 0.01;
          if (pData[i * 3 + 1] > 1.2) pData[i * 3 + 1] = -0.5;
        }
      } else if (sceneIdx === 1) {
        // Act 2: 3nm Silicon bonding & gold wire arcs snap into pads
        const ease = sceneProgress * sceneProgress * (3 - 2 * sceneProgress);
        wireGroup.scale.setScalar(ease);
        sparkMat.opacity = THREE.MathUtils.lerp(0.25, 0.8, ease);
      } else if (sceneIdx === 2) {
        // Act 3: 0.8W Synaptic neural firing pulses
        wireGroup.scale.set(1, 1, 1);
        sparkMat.opacity = 1;
        for (let i = 0; i < sparkCount; i++) {
          const bIdx = i % branches;
          const a = (bIdx / branches) * Math.PI * 2;
          const flow = (time * 4.5 + i * 0.03) % 1;
          pData[i * 3] = Math.cos(a) * flow * 0.75;
          pData[i * 3 + 1] = -0.5 + flow * 0.95;
          pData[i * 3 + 2] = Math.sin(a) * flow * 0.75;
        }
      } else {
        // Act 4: Local on-device sovereignty locked
        wireGroup.scale.set(1, 1, 1);
        sparkMat.opacity = 0.75;
      }
      pPosAttr.needsUpdate = true;
    },
    dispose: () => {
      dieGeo.dispose();
      dieMat.dispose();
      sparkGeo.dispose();
      sparkMat.dispose();
      lineMat.dispose();
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
