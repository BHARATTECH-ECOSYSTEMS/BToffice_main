export interface ReelChapter {
  act: string;
  tag: string;
  title: string;
  sub: string;
  statusPill: string;
  statusType: 'problem' | 'building' | 'active' | 'verified';
  metric: {
    label: string;
    value: string;
  };
}

export interface DomainReelData {
  id: string;
  name: string;
  field: string;
  image: string;
  accent: string;
  chapters: ReelChapter[];
}

export const DOMAIN_REELS: DomainReelData[] = [
  // 0. GI Rivinity
  {
    id: 'gi-rivinity',
    name: 'GI Rivinity',
    field: 'Generative Intelligence',
    image: '/assets/domains/domain-0-quartz.jpg',
    accent: '#8b5cf6',
    chapters: [
      {
        act: 'ACT 01 / 04',
        tag: 'DRIFT CONFLICT',
        title: 'Uncompressed Context Decay',
        sub: 'Standard LLMs lose conversational state and degrade across multi-epoch dialogues.',
        statusPill: 'ATTENTION DRIFT',
        statusType: 'problem',
        metric: { label: 'CONTEXT LOSS', value: '+18.4% / epoch' },
      },
      {
        act: 'ACT 02 / 04',
        tag: '5D FEMTOSECOND ETCH',
        title: 'Quartz Nanograting Inscription',
        sub: 'Laser pulse carves continuous 5D optical tracks into fused silica quartz at 0.34µm.',
        statusPill: 'FEMTOSECOND LASER',
        statusType: 'building',
        metric: { label: 'TRACK RESOLUTION', value: '0.34 µm' },
      },
      {
        act: 'ACT 03 / 04',
        tag: 'CHROMATIC READBACK',
        title: 'High-Velocity Spectral Sweep',
        sub: 'Multi-wavelength dispersion optics decode permanent memory layers at 8,000 RPM.',
        statusPill: 'DIFFRACTION DECODE',
        statusType: 'active',
        metric: { label: 'READ THROUGHPUT', value: '8,000 RPM' },
      },
      {
        act: 'ACT 04 / 04',
        tag: 'ZERO CONTEXT LOSS',
        title: 'Permanent 10,000-Yr Enclave',
        sub: 'Verified fused-silica compound substrate: zero context loss across all future epochs.',
        statusPill: '✓ VERIFIED PERMANENT',
        statusType: 'verified',
        metric: { label: 'RETENTION SPEC', value: '10,000 Years' },
      },
    ],
  },

  // 1. Rivinity Core
  {
    id: 'rivinity-core',
    name: 'Rivinity Core',
    field: 'Universal Intelligence OS',
    image: '/assets/domains/domain-1-core.jpg',
    accent: '#f59e0b',
    chapters: [
      {
        act: 'ACT 01 / 04',
        tag: 'ISOLATED SILOS',
        title: 'Fragmented Micro-Fabrics',
        sub: 'Disjoint AI infrastructure incurs severe inter-cluster serialization latency.',
        statusPill: 'INTER-NODE BOTTLENECK',
        statusType: 'problem',
        metric: { label: 'CLUSTER OVERHEAD', value: '14.8 ms' },
      },
      {
        act: 'ACT 02 / 04',
        tag: 'PRECISION MATING',
        title: 'Monolithic Unibody Lock',
        sub: 'Four bead-blasted aluminum modules join seamlessly; copper heat plate seats.',
        statusPill: 'CNC UNIBODY ASSEMBLY',
        statusType: 'building',
        metric: { label: 'TOLERANCE', value: '±0.002 mm' },
      },
      {
        act: 'ACT 03 / 04',
        tag: 'OPTICAL MULTI-BUS',
        title: 'Microsecond Data Concurrency',
        sub: 'Quad high-bandwidth optical channels route synchronous state across model layers.',
        statusPill: 'OPTICAL SYNCHRONY',
        statusType: 'active',
        metric: { label: 'BUS BANDWIDTH', value: '48.2 GB/s' },
      },
      {
        act: 'ACT 04 / 04',
        tag: 'UNIFIED RUNTIME',
        title: 'Single Universal Backbone',
        sub: 'Edge, cloud, and specialized intelligence nodes operating as one unified OS.',
        statusPill: '✓ FABRIC LOCKED',
        statusType: 'verified',
        metric: { label: 'FABRIC LATENCY', value: '< 42 µs' },
      },
    ],
  },

  // 2. IoT Intelligence
  {
    id: 'iot-intelligence',
    name: 'IoT Intelligence',
    field: 'Embedded & Physical AI',
    image: '/assets/domains/domain-2-lidar.jpg',
    accent: '#10b981',
    chapters: [
      {
        act: 'ACT 01 / 04',
        tag: 'DORMANT NODE',
        title: 'Uncalibrated Edge Telemetry',
        sub: 'Connected edge devices capture noisy scalar data without spatial grounding.',
        statusPill: 'SCALAR DRIFT',
        statusType: 'problem',
        metric: { label: 'SPATIAL ERROR', value: '±42.5 cm' },
      },
      {
        act: 'ACT 02 / 04',
        tag: 'PRISM ACCELERATION',
        title: 'Optical Mirror Spool-Up',
        sub: 'Internal polygon mirror accelerates to operational speed behind germanium optics.',
        statusPill: 'GERMANIUM SPOOL-UP',
        statusType: 'building',
        metric: { label: 'POLYGON VELOCITY', value: '6,000 RPM' },
      },
      {
        act: 'ACT 03 / 04',
        tag: '360° PLANAR LASER',
        title: 'Real-Time Point-Cloud Sweep',
        sub: 'Coherent laser matrix sweeps 1.2M points/sec to reconstruct surrounding 3D space.',
        statusPill: 'TIME-OF-FLIGHT SWEEP',
        statusType: 'active',
        metric: { label: 'POINT DENSITY', value: '1.2M pts/sec' },
      },
      {
        act: 'ACT 04 / 04',
        tag: 'EMBEDDED COGNITION',
        title: 'Situational Concurrency',
        sub: 'Physical infrastructure perceives, reasons, and executes local decisions in milliseconds.',
        statusPill: '✓ REAL-TIME SPATIAL LOCK',
        statusType: 'verified',
        metric: { label: 'UPDATE FREQUENCY', value: '60 Hz Sync' },
      },
    ],
  },

  // 3. Geo Intelligence
  {
    id: 'geo-intelligence',
    name: 'Geo Intelligence',
    field: 'Geospatial & Location AI',
    image: '/assets/domains/domain-3-geo.jpg',
    accent: '#0ea5e9',
    chapters: [
      {
        act: 'ACT 01 / 04',
        tag: '2D PROJECTION',
        title: 'Flattened Satellite Raster',
        sub: 'Conventional 2D satellite views discard critical slope, watershed, and topological depth.',
        statusPill: 'ORTHOGONAL DISTORTION',
        statusType: 'problem',
        metric: { label: 'ALTITUDE RESOLUTION', value: '0-D Flat' },
      },
      {
        act: 'ACT 02 / 04',
        tag: 'CONTOUR MILLING',
        title: 'Stepped Elevation Terraces',
        sub: '8 geometric elevation tiers rise sequentially from calibrated radar altimetry.',
        statusPill: 'RADAR ALTIMETRY TIER',
        statusType: 'building',
        metric: { label: 'TERRACE STEPS', value: '8 Contours' },
      },
      {
        act: 'ACT 03 / 04',
        tag: 'SOLAR RAKING AUDIT',
        title: 'Micro-Watershed Illumination',
        sub: 'Low-angle sun reveals slope hazards, hydrological basins, and transit corridors.',
        statusPill: 'SHADOW MORPHOLOGY',
        statusType: 'active',
        metric: { label: 'DRAINAGE AUDIT', value: '100% Mapped' },
      },
      {
        act: 'ACT 04 / 04',
        tag: 'PLANETARY ACCURACY',
        title: 'True Ground-Truth Geometry',
        sub: 'Geospatial foundation model reasoning directly on Earth’s physical morphology.',
        statusPill: '✓ 3D GEO-GROUNDED',
        statusType: 'verified',
        metric: { label: 'SPATIAL FIDELITY', value: 'Sub-Meter' },
      },
    ],
  },

  // 4. Defense Intelligence
  {
    id: 'defense-intelligence',
    name: 'Defense Intelligence',
    field: 'Secure & Mission-Critical AI',
    image: '/assets/domains/domain-4-defense.jpg',
    accent: '#ef4444',
    chapters: [
      {
        act: 'ACT 01 / 04',
        tag: 'EXPOSED SURFACE',
        title: 'Vulnerable Compute Die',
        sub: 'Bare silicon substrates are susceptible to electrical and physical side-channel interrogation.',
        statusPill: 'SIDE-CHANNEL LEAKAGE',
        statusType: 'problem',
        metric: { label: 'SURFACE EXPOSURE', value: 'UNPROTECTED' },
      },
      {
        act: 'ACT 02 / 04',
        tag: 'MONOLITHIC ARMOR',
        title: 'Hermetic Tungsten Seal',
        sub: 'Heavy ballistic enclosure descends; gold Torx fasteners lock the perimeter.',
        statusPill: 'TUNGSTEN TORX SEAL',
        statusType: 'building',
        metric: { label: 'DENSITY SPEC', value: '19.3 g/cm³' },
      },
      {
        act: 'ACT 03 / 04',
        tag: 'ZK-PROOF CIRCUIT',
        title: 'Cryptographic Tripwires Active',
        sub: 'Continuous zero-knowledge verification validates state without data leakage.',
        statusPill: 'ZERO-KNOWLEDGE CIRCUIT',
        statusType: 'active',
        metric: { label: 'TAMPER PROOF', value: '100% Cryptographic' },
      },
      {
        act: 'ACT 04 / 04',
        tag: 'SOVEREIGN HARDWARE',
        title: 'Zero-Trust Mission Enclave',
        sub: 'Air-gapped autonomous intelligence trusted in contested and adversarial environments.',
        statusPill: '✓ ENCLAVE ISOLATED',
        statusType: 'verified',
        metric: { label: 'AIR-GAP STATUS', value: 'Classified Lock' },
      },
    ],
  },

  // 5. Miniature Intelligence
  {
    id: 'miniature-intelligence',
    name: 'Miniature Intelligence',
    field: 'Edge AI & Lightweight Models',
    image: '/assets/domains/domain-5-miniature.jpg',
    accent: '#eab308',
    chapters: [
      {
        act: 'ACT 01 / 04',
        tag: 'DATACENTER ANCHOR',
        title: 'Multi-Kilowatt Dependency',
        sub: 'Frontier AI models traditionally tethered to high-power cloud clusters.',
        statusPill: 'CLOUD LATENCY & POWER',
        statusType: 'problem',
        metric: { label: 'DRAW / PING', value: '850W // 140ms' },
      },
      {
        act: 'ACT 02 / 04',
        tag: '3NM BONDING',
        title: 'Silicon Die Landing & Arcs',
        sub: 'Diffraction-grating die bonds to organic substrate; microscopic gold wires arc into pads.',
        statusPill: '3NM GAA WIRE BOND',
        statusType: 'building',
        metric: { label: 'DIE NODE', value: '3nm GAA' },
      },
      {
        act: 'ACT 03 / 04',
        tag: 'SUB-WATT SYNAPSE',
        title: 'Neuromorphic Neural Pulses',
        sub: 'Quantized neural pathways fire concurrently at 0.8W with zero remote latency.',
        statusPill: 'SYNAPTIC INFERENCE',
        statusType: 'active',
        metric: { label: 'POWER DRAW', value: '0.8 Watts' },
      },
      {
        act: 'ACT 04 / 04',
        tag: 'LOCAL SOVEREIGNTY',
        title: 'Pocket Frontier Intelligence',
        sub: 'Full model reasoning running privately on device, completely independent of cloud connection.',
        statusPill: '✓ UNTETHERED ON-DEVICE',
        statusType: 'verified',
        metric: { label: 'LOCAL TOKENS', value: '62 tok/sec' },
      },
    ],
  },
];
