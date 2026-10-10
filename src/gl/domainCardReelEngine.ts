import * as THREE from 'three';

export interface MultiSceneArtifact {
  group: THREE.Group;
  update: (time: number, sceneIdx: number, sceneProgress: number, pointer?: { x: number; y: number }) => void;
  dispose: () => void;
}

// ── Contact Shadow Generator ────────────────────────────────────────────────

export function createContactShadow(w = 2.4, d = 2.4, opacity = 0.32): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, `rgba(20, 19, 15, ${opacity})`);
  grad.addColorStop(0.4, `rgba(20, 19, 15, ${opacity * 0.4})`);
  grad.addColorStop(0.75, `rgba(20, 19, 15, ${opacity * 0.1})`);
  grad.addColorStop(1, 'rgba(20, 19, 15, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  const geo = new THREE.PlaneGeometry(w, d);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.78;
  return mesh;
}

// ── Custom Shaders ──────────────────────────────────────────────────────────

/** Quartz Dispersion Shader with Laser-Inscription Animation */
const QUARTZ_VS = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying vec3 vViewPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const QUARTZ_FS = `
  uniform float uTime;
  uniform float uInscribeRadius; // Progress of tracks being carved outward
  uniform float uDispersionIntensity;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying vec3 vViewPosition;

  void main() {
    vec3 viewDir = normalize(vViewPosition);
    vec3 norm = normalize(vNormal);

    // Fresnel reflection
    float fresnel = pow(1.0 - max(dot(viewDir, norm), 0.0), 3.0);

    // Distance from center on disc face
    float dist = length(vPosition.xz);
    
    // Laser etched tracks (only visible up to uInscribeRadius)
    float isEtched = smoothstep(dist, dist - 0.04, uInscribeRadius);
    float trackRings = sin(dist * 190.0) * 0.5 + 0.5;
    trackRings *= smoothstep(0.34, 0.42, dist) * isEtched;

    // Laser tip glow at cutting edge
    float laserTip = exp(-abs(dist - uInscribeRadius) * 45.0) * step(uInscribeRadius, 1.18);

    // Spectral dispersion colors
    float angle = atan(vPosition.z, vPosition.x) + uTime * 0.4;
    vec3 spectral;
    spectral.r = sin(angle + dist * 14.0) * 0.5 + 0.5;
    spectral.g = sin(angle + dist * 14.0 + 2.094) * 0.5 + 0.5;
    spectral.b = sin(angle + dist * 14.0 + 4.188) * 0.5 + 0.5;

    vec3 baseGlass = vec3(0.97, 0.98, 1.0);
    vec3 color = mix(baseGlass, spectral, trackRings * 0.45 * uDispersionIntensity);
    color += laserTip * vec3(0.85, 0.4, 1.0) * 1.5; // Glowing purple laser edge
    color += fresnel * vec3(0.35, 0.3, 0.65);

    float alpha = mix(0.22, 0.88, fresnel + trackRings * 0.3 + laserTip * 0.5);
    gl_FragColor = vec4(color, alpha);
  }
`;

/** Silicon Wafer Diffraction Shader */
const SILICON_VS = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying vec3 vViewPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const SILICON_FS = `
  uniform float uTime;
  uniform float uSynapticPulse;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying vec3 vViewPosition;

  void main() {
    vec3 viewDir = normalize(vViewPosition);
    vec3 norm = normalize(vNormal);

    vec3 lightDir = normalize(vec3(0.8, 1.3, 0.6));
    vec3 halfVec = normalize(lightDir + viewDir);
    float spec = pow(max(dot(norm, halfVec), 0.0), 36.0);

    // Circuit grid pattern
    vec2 grid = fract(vUv * 56.0);
    float gridLines = step(0.12, grid.x) * step(0.12, grid.y);

    // Spectral rainbow diffraction
    float angle = dot(vUv - 0.5, vec2(1.2, 0.9)) * 16.0 + uTime * 0.4;
    vec3 rainbow;
    rainbow.r = sin(angle) * 0.5 + 0.5;
    rainbow.g = sin(angle + 2.094) * 0.5 + 0.5;
    rainbow.b = sin(angle + 4.188) * 0.5 + 0.5;

    vec3 darkSilicon = vec3(0.04, 0.05, 0.08);
    vec3 color = mix(darkSilicon, rainbow * 0.85, (1.0 - gridLines) * 0.7);
    color += spec * vec3(1.0, 0.96, 0.88);

    // Synaptic neural firings
    color += uSynapticPulse * vec3(0.95, 0.65, 0.1) * (1.0 - gridLines);

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ── 0. GI Rivinity: Multi-Scene Quartz Memory Disc ───────────────────────────

export function createQuartzDiscReel(): MultiSceneArtifact {
  const group = new THREE.Group();

  // Glass Disc with Shader
  const discGeo = new THREE.CylinderGeometry(1.24, 1.24, 0.18, 64);
  const quartzMat = new THREE.ShaderMaterial({
    vertexShader: QUARTZ_VS,
    fragmentShader: QUARTZ_FS,
    uniforms: {
      uTime: { value: 0 },
      uInscribeRadius: { value: 0.34 },
      uDispersionIntensity: { value: 0.2 },
    },
    transparent: true,
    side: THREE.DoubleSide,
  });
  const disc = new THREE.Mesh(discGeo, quartzMat);
  group.add(disc);

  // Center Titanium Spindle
  const spindleGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.22, 48);
  const spindleMat = new THREE.MeshStandardMaterial({
    color: 0x22242b,
    metalness: 0.95,
    roughness: 0.18,
  });
  const spindle = new THREE.Mesh(spindleGeo, spindleMat);
  group.add(spindle);

  // Gold Retaining Ring
  const ringGeo = new THREE.RingGeometry(0.34, 0.42, 48);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.98,
    roughness: 0.12,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.092;
  group.add(ring);

  // Inscribing Laser Stylus Beam
  const laserGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.8, 16);
  const laserMat = new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0 });
  const laser = new THREE.Mesh(laserGeo, laserMat);
  laser.position.set(0.34, 0.5, 0);
  group.add(laser);

  return {
    group,
    update: (time, sceneIdx, sceneProgress, pointer) => {
      quartzMat.uniforms.uTime.value = time;
      const px = pointer ? pointer.x * 0.15 : 0;
      const py = pointer ? pointer.y * 0.15 : 0;

      if (sceneIdx === 0) {
        // Scene 1: Blank disc, laser descends into center
        quartzMat.uniforms.uInscribeRadius.value = 0.34;
        quartzMat.uniforms.uDispersionIntensity.value = 0.1;
        laserMat.opacity = Math.min(1, sceneProgress * 2);
        laser.position.set(0.34, 0.5 - sceneProgress * 0.35, 0);
        group.rotation.x = 0.55 + py;
        group.rotation.y = px + time * 0.08;
      } else if (sceneIdx === 1) {
        // Scene 2: Laser carves tracks outward from r = 0.34 to 1.18
        const inscribeR = 0.34 + sceneProgress * 0.84;
        quartzMat.uniforms.uInscribeRadius.value = inscribeR;
        quartzMat.uniforms.uDispersionIntensity.value = 0.4;
        laserMat.opacity = 1;
        laser.position.set(inscribeR * Math.cos(time * 3), 0.15, inscribeR * Math.sin(time * 3));
        group.rotation.x = 0.62 + py;
        group.rotation.y = px + time * 0.25;
      } else if (sceneIdx === 2) {
        // Scene 3: Laser leaves, disc accelerates to full read speed with holographic dispersion
        laserMat.opacity = Math.max(0, 1 - sceneProgress * 3);
        quartzMat.uniforms.uInscribeRadius.value = 1.22;
        quartzMat.uniforms.uDispersionIntensity.value = 0.95;
        group.rotation.x = 0.65 + py;
        group.rotation.y = px + time * 0.65;
      } else {
        // Scene 4: Hero lock pose
        laserMat.opacity = 0;
        quartzMat.uniforms.uInscribeRadius.value = 1.22;
        quartzMat.uniforms.uDispersionIntensity.value = 0.7;
        group.rotation.x = 0.58 + py;
        group.rotation.y = px + time * 0.15;
      }

      group.position.y = Math.sin(time * 0.4) * 0.02;
    },
    dispose: () => {
      discGeo.dispose();
      quartzMat.dispose();
      spindleGeo.dispose();
      spindleMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      laserGeo.dispose();
      laserMat.dispose();
    },
  };
}

// ── 1. Rivinity Core: Multi-Scene Machined Unibody Router ────────────────────

export function createMachinedUnitReel(): MultiSceneArtifact {
  const group = new THREE.Group();

  // 4 Modular Aluminum Blocks (start fragmented, assemble in Scene 2)
  const blockGeo = new THREE.BoxGeometry(0.82, 0.65, 0.82);
  const blockMat = new THREE.MeshStandardMaterial({
    color: 0x242730,
    metalness: 0.88,
    roughness: 0.22,
  });

  const blocks: THREE.Mesh[] = [];
  const assembledCoords = [
    [-0.42, -0.42],
    [0.42, -0.42],
    [-0.42, 0.42],
    [0.42, 0.42],
  ];

  assembledCoords.forEach(() => {
    const b = new THREE.Mesh(blockGeo, blockMat);
    blocks.push(b);
    group.add(b);
  });

  // Top Brushed Copper Plate (drops into place during Scene 2)
  const copperGeo = new THREE.CylinderGeometry(0.66, 0.66, 0.025, 48);
  const copperMat = new THREE.MeshStandardMaterial({
    color: 0xbd6936,
    metalness: 0.92,
    roughness: 0.25,
  });
  const copper = new THREE.Mesh(copperGeo, copperMat);
  copper.position.y = 1.5; // Starts above
  group.add(copper);

  // Front Optical Ports
  const portGroup = new THREE.Group();
  const portLeds: THREE.Mesh[] = [];
  for (let i = -1.5; i <= 1.5; i += 1) {
    const portGeo = new THREE.BoxGeometry(0.24, 0.24, 0.08);
    const pMat = new THREE.MeshStandardMaterial({ color: 0x0a0c10, metalness: 0.9, roughness: 0.35 });
    const p = new THREE.Mesh(portGeo, pMat);
    p.position.set(i * 0.36, -0.06, 0.84);

    const ledGeo = new THREE.CircleGeometry(0.025, 16);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x111317 });
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(i * 0.36, -0.22, 0.85);

    portGroup.add(p);
    portGroup.add(led);
    portLeds.push(led);
  }
  group.add(portGroup);

  return {
    group,
    update: (time, sceneIdx, sceneProgress, pointer) => {
      const px = pointer ? pointer.x * 0.15 : 0;
      const py = pointer ? pointer.y * 0.15 : 0;

      if (sceneIdx === 0) {
        // Scene 1: Fragmented blocks floating apart
        const explode = 0.45;
        blocks.forEach((b, i) => {
          const [ax, az] = assembledCoords[i];
          b.position.set(ax * (1 + explode), Math.sin(time * 2 + i) * 0.08, az * (1 + explode));
        });
        copper.position.y = 1.2;
        portGroup.position.set(0, 0, 0);
        portLeds.forEach((l) => (l.material as THREE.MeshBasicMaterial).color.set(0x111317));
        group.rotation.x = 0.35 + py;
        group.rotation.y = -0.4 + px + time * 0.08;
      } else if (sceneIdx === 1) {
        // Scene 2: Mechanical lock together into solid unibody
        const t = Math.min(1, sceneProgress * 1.3);
        const ease = t * t * (3 - 2 * t);
        const explode = 0.45 * (1 - ease);
        blocks.forEach((b, i) => {
          const [ax, az] = assembledCoords[i];
          b.position.set(ax * (1 + explode), 0, az * (1 + explode));
        });
        // Copper plate drops and seats
        copper.position.y = 0.34 + (1 - ease) * 0.8;
        group.rotation.x = 0.42 + py;
        group.rotation.y = -0.35 + px + time * 0.15;
      } else if (sceneIdx === 2) {
        // Scene 3: Assembled unibody active! Optical ports pulse with data
        blocks.forEach((b, i) => {
          const [ax, az] = assembledCoords[i];
          b.position.set(ax, 0, az);
        });
        copper.position.y = 0.34;
        portLeds.forEach((l, i) => {
          const on = Math.sin(time * 12 + i * 2) > 0;
          (l.material as THREE.MeshBasicMaterial).color.set(on ? (i % 2 === 0 ? 0xf59e00 : 0x8b5cf6) : 0x22242c);
        });
        group.rotation.x = 0.45 + py;
        group.rotation.y = -0.3 + px + time * 0.28;
      } else {
        // Scene 4: Hero lock pose
        blocks.forEach((b, i) => {
          const [ax, az] = assembledCoords[i];
          b.position.set(ax, 0, az);
        });
        copper.position.y = 0.34;
        portLeds.forEach((l, i) => (l.material as THREE.MeshBasicMaterial).color.set(i % 2 === 0 ? 0xf59e00 : 0x8b5cf6));
        group.rotation.x = 0.4 + py;
        group.rotation.y = -0.35 + px + time * 0.1;
      }

      group.position.y = Math.sin(time * 0.4) * 0.02;
    },
    dispose: () => {
      blockGeo.dispose();
      blockMat.dispose();
      copperGeo.dispose();
      copperMat.dispose();
    },
  };
}

// ── 2. IoT Intelligence: Multi-Scene LiDAR Optical Sensor ───────────────────

export function createLidarSensorReel(): MultiSceneArtifact {
  const group = new THREE.Group();

  // Flanged Base Collar
  const baseGeo = new THREE.CylinderGeometry(0.85, 0.9, 0.24, 48);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e2129, metalness: 0.9, roughness: 0.25 });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = -0.42;
  group.add(base);

  // Black Aerospace Grooved Barrel
  const barrelGeo = new THREE.CylinderGeometry(0.72, 0.72, 0.58, 48);
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x14161c, metalness: 0.85, roughness: 0.3 });
  const barrel = new THREE.Mesh(barrelGeo, barrelMat);
  barrel.position.y = -0.08;
  group.add(barrel);

  // Sapphire Coated Window
  const windowGeo = new THREE.CylinderGeometry(0.73, 0.73, 0.34, 48);
  const windowMat = new THREE.MeshPhysicalMaterial({
    color: 0x08101a,
    transmission: 0.78,
    roughness: 0.02,
    reflectivity: 0.92,
    ior: 1.77,
  });
  const windowMesh = new THREE.Mesh(windowGeo, windowMat);
  windowMesh.position.y = 0.26;
  group.add(windowMesh);

  // Revolving Prism
  const prismGeo = new THREE.BoxGeometry(0.28, 0.24, 0.28);
  const prismMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.98, roughness: 0.05 });
  const prism = new THREE.Mesh(prismGeo, prismMat);
  prism.position.y = 0.26;
  group.add(prism);

  // 360° Planar Laser Sweep Disc (Scene 3)
  const scanGeo = new THREE.RingGeometry(0.75, 1.9, 48);
  scanGeo.rotateX(-Math.PI / 2);
  const scanMat = new THREE.MeshBasicMaterial({
    color: 0xff8643,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const scanDisc = new THREE.Mesh(scanGeo, scanMat);
  scanDisc.position.y = 0.26;
  group.add(scanDisc);

  return {
    group,
    update: (time, sceneIdx, sceneProgress, pointer) => {
      const px = pointer ? pointer.x * 0.15 : 0;
      const py = pointer ? pointer.y * 0.15 : 0;

      if (sceneIdx === 0) {
        // Scene 1: Dormant sensor
        prism.rotation.y = 0;
        scanMat.opacity = 0;
        group.rotation.x = 0.22 + py;
        group.rotation.y = px + time * 0.05;
      } else if (sceneIdx === 1) {
        // Scene 2: Mechanical prism spool-up
        const speed = sceneProgress * 6.0;
        prism.rotation.y += speed * 0.05;
        scanMat.opacity = 0;
        group.rotation.x = 0.28 + py;
        group.rotation.y = px + time * 0.15;
      } else if (sceneIdx === 2) {
        // Scene 3: Full 360° LiDAR laser sweep active
        prism.rotation.y = time * 8.0;
        scanMat.opacity = 0.35 + Math.sin(time * 16) * 0.15;
        scanDisc.rotation.y = time * 4.0;
        group.rotation.x = 0.32 + py;
        group.rotation.y = px + time * 0.25;
      } else {
        // Scene 4: Hero lock
        prism.rotation.y = time * 3.0;
        scanMat.opacity = 0.15;
        group.rotation.x = 0.26 + py;
        group.rotation.y = px + time * 0.1;
      }

      group.position.y = -0.05 + Math.sin(time * 0.4) * 0.02;
    },
    dispose: () => {
      baseGeo.dispose();
      baseMat.dispose();
      barrelGeo.dispose();
      barrelMat.dispose();
      windowGeo.dispose();
      windowMat.dispose();
      prismGeo.dispose();
      prismMat.dispose();
      scanGeo.dispose();
      scanMat.dispose();
    },
  };
}

// ── 3. Geo Intelligence: Multi-Scene CNC Stepped Topographic Slab ────────────

export function createTopographicSlabReel(): MultiSceneArtifact {
  const group = new THREE.Group();

  // Solid Plinth Base
  const plinthGeo = new THREE.BoxGeometry(1.85, 0.22, 1.85);
  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0xedebe6,
    roughness: 0.88,
    metalness: 0.02,
  });
  const plinth = new THREE.Mesh(plinthGeo, plinthMat);
  plinth.position.y = -0.42;
  group.add(plinth);

  // 8 Stepped CNC Contour Terraces (Extrude upwards in Scene 2!)
  const layers = 8;
  const contourMeshes: THREE.Mesh[] = [];
  const targetHeights: number[] = [];

  for (let i = 0; i < layers; i++) {
    const scale = 1.7 - i * 0.16;
    const h = 0.055;
    const layerGeo = new THREE.BoxGeometry(scale, h, scale);
    const layerMat = new THREE.MeshStandardMaterial({
      color: i === 0 ? 0xe5e2da : i % 2 === 0 ? 0xdcd8ce : 0xd2cdc2,
      roughness: 0.85,
      metalness: 0.02,
    });
    const layer = new THREE.Mesh(layerGeo, layerMat);
    const ox = Math.sin(i * 0.6) * 0.08;
    const oz = Math.cos(i * 0.6) * 0.08;
    layer.position.set(ox, -0.42, oz); // Start inside base
    contourMeshes.push(layer);
    targetHeights.push(-0.28 + i * 0.055);
    group.add(layer);
  }

  // Brass North Pointer (Clicks in during Scene 4)
  const arrowGeo = new THREE.ConeGeometry(0.08, 0.22, 3);
  arrowGeo.rotateX(-Math.PI / 2);
  const arrowMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.95, roughness: 0.1 });
  const arrow = new THREE.Mesh(arrowGeo, arrowMat);
  arrow.position.set(0.68, 0.18, 0.68);
  arrow.scale.set(0, 0, 0);
  group.add(arrow);

  return {
    group,
    update: (time, sceneIdx, sceneProgress, pointer) => {
      const px = pointer ? pointer.x * 0.15 : 0;
      const py = pointer ? pointer.y * 0.15 : 0;

      if (sceneIdx === 0) {
        // Scene 1: Flat blank plinth
        contourMeshes.forEach((mesh) => {
          mesh.position.y = -0.42;
          mesh.scale.y = 0.1;
        });
        arrow.scale.set(0, 0, 0);
        group.rotation.x = 0.42 + py;
        group.rotation.y = px + time * 0.08;
      } else if (sceneIdx === 1) {
        // Scene 2: Stepped contour terraces rise sequentially like CNC milling
        contourMeshes.forEach((mesh, i) => {
          const threshold = i / layers;
          const prog = Math.max(0, Math.min(1, (sceneProgress - threshold) * layers));
          mesh.position.y = -0.42 + prog * (targetHeights[i] - -0.42);
          mesh.scale.y = Math.max(0.1, prog);
        });
        arrow.scale.set(0, 0, 0);
        group.rotation.x = 0.52 + py;
        group.rotation.y = px + time * 0.15;
      } else if (sceneIdx === 2) {
        // Scene 3: Fully raised topography with raking light
        contourMeshes.forEach((mesh, i) => {
          mesh.position.y = targetHeights[i];
          mesh.scale.y = 1;
        });
        arrow.scale.set(0, 0, 0);
        group.rotation.x = 0.54 + py;
        group.rotation.y = px + time * 0.25;
      } else {
        // Scene 4: Hero lock & North arrow snaps in
        contourMeshes.forEach((mesh, i) => {
          mesh.position.y = targetHeights[i];
          mesh.scale.y = 1;
        });
        arrow.scale.set(1, 1, 1);
        group.rotation.x = 0.48 + py;
        group.rotation.y = px + time * 0.1;
      }

      group.position.y = Math.sin(time * 0.4) * 0.02;
    },
    dispose: () => {
      plinthGeo.dispose();
      plinthMat.dispose();
      arrowGeo.dispose();
      arrowMat.dispose();
    },
  };
}

// ── 4. Defense Intelligence: Multi-Scene Cryptographic Enclave (HSM) ────────

export function createCryptographicModuleReel(): MultiSceneArtifact {
  const group = new THREE.Group();

  // Exposed Golden Cryptographic Core (starts visible, gets sealed in Scene 2)
  const coreGeo = new THREE.BoxGeometry(0.6, 0.18, 0.6);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.98,
    roughness: 0.1,
  });
  const coreDie = new THREE.Mesh(coreGeo, coreMat);
  coreDie.position.y = -0.15;
  group.add(coreDie);

  // Heavy Matte-Black Tungsten Ceramic Enclosure (lowers down during Scene 2)
  const bodyGeo = new THREE.BoxGeometry(1.42, 0.62, 1.42);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x16171d,
    metalness: 0.88,
    roughness: 0.18,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 1.4; // Starts above
  group.add(body);

  // 4 Corner Gold Torx Fasteners (thread and seat during Scene 2)
  const screwGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16);
  const screwMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.95, roughness: 0.1 });
  const screws: THREE.Mesh[] = [];
  const screwOffsets = [-0.6, 0.6];
  screwOffsets.forEach((x) => {
    screwOffsets.forEach((z) => {
      const screw = new THREE.Mesh(screwGeo, screwMat);
      screw.position.set(x, 1.6, z);
      screws.push(screw);
      group.add(screw);
    });
  });

  return {
    group,
    update: (time, sceneIdx, sceneProgress, pointer) => {
      const px = pointer ? pointer.x * 0.15 : 0;
      const py = pointer ? pointer.y * 0.15 : 0;

      if (sceneIdx === 0) {
        // Scene 1: Exposed vulnerable core
        body.position.y = 1.4;
        screws.forEach((s) => (s.position.y = 1.6));
        group.rotation.x = 0.35 + py;
        group.rotation.y = px + time * 0.08;
      } else if (sceneIdx === 1) {
        // Scene 2: Heavy enclosure lowers and seals with gold Torx fasteners
        const ease = sceneProgress * sceneProgress * (3 - 2 * sceneProgress);
        body.position.y = 0 + (1 - ease) * 1.4;
        screws.forEach((s) => (s.position.y = 0.32 + (1 - ease) * 1.3));
        group.rotation.x = 0.44 + py;
        group.rotation.y = px + time * 0.15;
      } else if (sceneIdx === 2) {
        // Scene 3: Sealed air-gapped enclave validating zk-proofs
        body.position.y = 0;
        screws.forEach((s) => (s.position.y = 0.32));
        group.rotation.x = 0.48 + py;
        group.rotation.y = px + time * 0.28;
      } else {
        // Scene 4: Hero lock
        body.position.y = 0;
        screws.forEach((s) => (s.position.y = 0.32));
        group.rotation.x = 0.42 + py;
        group.rotation.y = px + time * 0.1;
      }

      group.position.y = Math.sin(time * 0.4) * 0.02;
    },
    dispose: () => {
      coreGeo.dispose();
      coreMat.dispose();
      bodyGeo.dispose();
      bodyMat.dispose();
      screwGeo.dispose();
      screwMat.dispose();
    },
  };
}

// ── 5. Miniature Intelligence: Multi-Scene 3nm Silicon BGA Chip ──────────────

export function createSiliconDieReel(): MultiSceneArtifact {
  const group = new THREE.Group();

  // Dark Organic Substrate Board
  const subGeo = new THREE.BoxGeometry(1.68, 0.06, 1.68);
  const subMat = new THREE.MeshStandardMaterial({
    color: 0x11141a,
    metalness: 0.3,
    roughness: 0.65,
  });
  const substrate = new THREE.Mesh(subGeo, subMat);
  group.add(substrate);

  // 3nm Silicon Die with Diffraction Shader (descends and bonds in Scene 2!)
  const dieGeo = new THREE.BoxGeometry(0.98, 0.045, 0.98);
  const dieMat = new THREE.ShaderMaterial({
    vertexShader: SILICON_VS,
    fragmentShader: SILICON_FS,
    uniforms: {
      uTime: { value: 0 },
      uSynapticPulse: { value: 0 },
    },
  });
  const die = new THREE.Mesh(dieGeo, dieMat);
  die.position.y = 1.2; // Starts floating above
  group.add(die);

  // Gold Wire Bond Group (scales in after die bonds!)
  const wireGroup = new THREE.Group();
  const wireMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.98, roughness: 0.08 });
  for (let i = -3; i <= 3; i++) {
    const x = i * 0.11;
    const curveN = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(x, 0.06, 0.46),
      new THREE.Vector3(x, 0.18, 0.62),
      new THREE.Vector3(x * 1.2, 0.03, 0.76)
    );
    const tubeN = new THREE.TubeGeometry(curveN, 8, 0.009, 8, false);
    wireGroup.add(new THREE.Mesh(tubeN, wireMat));

    const curveS = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(x, 0.06, -0.46),
      new THREE.Vector3(x, 0.18, -0.62),
      new THREE.Vector3(x * 1.2, 0.03, -0.76)
    );
    const tubeS = new THREE.TubeGeometry(curveS, 8, 0.009, 8, false);
    wireGroup.add(new THREE.Mesh(tubeS, wireMat));
  }
  wireGroup.scale.set(0, 0, 0);
  group.add(wireGroup);

  return {
    group,
    update: (time, sceneIdx, sceneProgress, pointer) => {
      dieMat.uniforms.uTime.value = time;
      const px = pointer ? pointer.x * 0.15 : 0;
      const py = pointer ? pointer.y * 0.15 : 0;

      if (sceneIdx === 0) {
        // Scene 1: Bare substrate board
        die.position.y = 1.0;
        wireGroup.scale.set(0, 0, 0);
        dieMat.uniforms.uSynapticPulse.value = 0;
        group.rotation.x = 0.52 + py;
        group.rotation.y = px + time * 0.08;
      } else if (sceneIdx === 1) {
        // Scene 2: Silicon die lands and bonds; wire bonds arc out
        const ease = sceneProgress * sceneProgress * (3 - 2 * sceneProgress);
        die.position.y = 0.052 + (1 - ease) * 0.95;
        const wireScale = Math.max(0, (sceneProgress - 0.4) * 1.6);
        wireGroup.scale.setScalar(Math.min(1, wireScale));
        dieMat.uniforms.uSynapticPulse.value = 0;
        group.rotation.x = 0.62 + py;
        group.rotation.y = px + time * 0.18;
      } else if (sceneIdx === 2) {
        // Scene 3: Synaptic neural pulses firing on 0.8W!
        die.position.y = 0.052;
        wireGroup.scale.setScalar(1);
        dieMat.uniforms.uSynapticPulse.value = (Math.sin(time * 16) * 0.5 + 0.5) * 0.9;
        group.rotation.x = 0.64 + py;
        group.rotation.y = px + time * 0.28;
      } else {
        // Scene 4: Hero lock
        die.position.y = 0.052;
        wireGroup.scale.setScalar(1);
        dieMat.uniforms.uSynapticPulse.value = 0.2;
        group.rotation.x = 0.58 + py;
        group.rotation.y = px + time * 0.1;
      }

      group.position.y = Math.sin(time * 0.4) * 0.02;
    },
    dispose: () => {
      subGeo.dispose();
      subMat.dispose();
      dieGeo.dispose();
      dieMat.dispose();
      wireMat.dispose();
    },
  };
}

// ── Factory Helper ──────────────────────────────────────────────────────────

export function createMultiSceneArtifact(index: number): MultiSceneArtifact {
  switch (index) {
    case 0:
      return createQuartzDiscReel();
    case 1:
      return createMachinedUnitReel();
    case 2:
      return createLidarSensorReel();
    case 3:
      return createTopographicSlabReel();
    case 4:
      return createCryptographicModuleReel();
    case 5:
      return createSiliconDieReel();
    default:
      return createQuartzDiscReel();
  }
}
