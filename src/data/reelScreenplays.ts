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
  accent: string;
  chapters: ReelChapter[];
}

export const DOMAIN_REELS: DomainReelData[] = [
  // 0. GI Rivinity
  {
    id: 'gi-rivinity',
    name: 'GI Rivinity',
    field: 'Generative Intelligence',
    accent: '#8b5cf6',
    chapters: [
      {
        act: 'ACT 01 / 04',
        tag: 'HERMETIC CAPSULE',
        title: 'Sealed Titanium Storage Enclosure',
        sub: 'Precision titanium housing isolates optical memory lattice from external environmental degradation.',
        statusPill: 'HERMETIC SEAL',
        statusType: 'problem',
        metric: { label: 'CHASSIS ISOLATION', value: 'IP68 / Vacuum' },
      },
      {
        act: 'ACT 02 / 04',
        tag: 'KINEMATIC BLOOM',
        title: 'Four-Petal Aperture Unfolding',
        sub: 'Quadrant titanium petals swing open 75°; internal gold spindle carriage elevates on Z-axis.',
        statusPill: 'MECHANICAL BLOOM',
        statusType: 'building',
        metric: { label: 'HINGE DEPLOYMENT', value: '75.0° Radial' },
      },
      {
        act: 'ACT 03 / 04',
        tag: 'OPTICAL OPERATION',
        title: '8,000 RPM Quartz Readback',
        sub: 'Laser arm swings over tracks; fused-silica disc accelerates with full spectral chromatic dispersion.',
        statusPill: '8000 RPM ACTIVE',
        statusType: 'active',
        metric: { label: 'READ VELOCITY', value: '8,000 RPM' },
      },
      {
        act: 'ACT 04 / 04',
        tag: 'EXPLODED ENCLAVE',
        title: 'Permanent 10,000-Yr Zero Loss',
        sub: 'Kinematic components hover in suspended architectural balance with permanent context persistence.',
        statusPill: '✓ VERIFIED 10,000-YR',
        statusType: 'verified',
        metric: { label: 'PERSISTENCE SPEC', value: '10,000 Years' },
      },
    ],
  },

  // 1. Rivinity Core
  {
    id: 'rivinity-core',
    name: 'Rivinity Core',
    field: 'Universal Intelligence OS',
    accent: '#f59e0b',
    chapters: [
      {
        act: 'ACT 01 / 04',
        tag: 'MONOLITHIC UNIBODY',
        title: 'Milled Aluminum Server Enclosure',
        sub: 'Bead-blasted unibody chassis houses distributed multi-model orchestration fabric.',
        statusPill: 'MONOLITHIC UNIBODY',
        statusType: 'problem',
        metric: { label: 'MACHINED VOLUME', value: '1.4 × 1.4 m' },
      },
      {
        act: 'ACT 02 / 04',
        tag: 'DIAGONAL RAIL GLIDE',
        title: 'Four-Quadrant Deconstruction',
        sub: 'Circular copper heatsink lifts vertically; four aluminum chassis modules glide outward on rails.',
        statusPill: 'RAIL DECOUPLING',
        statusType: 'building',
        metric: { label: 'LINEAR TRAVEL', value: '0.6 m Travel' },
      },
      {
        act: 'ACT 03 / 04',
        tag: 'WAVEGUIDE CONCURRENCY',
        title: '48.2 GB/s Optical Multi-Bus',
        sub: 'Central processor die ignites; optical waveguides bridge separated modules with high-speed data.',
        statusPill: 'OPTICAL CONCURRENCY',
        statusType: 'active',
        metric: { label: 'BUS BANDWIDTH', value: '48.2 GB/s' },
      },
      {
        act: 'ACT 04 / 04',
        tag: 'EXPLODED ARCHITECTURE',
        title: 'Synchronized Universal Runtime',
        sub: 'Suspended copper block, separated modules, and glowing core operating as one unified intelligence.',
        statusPill: '✓ RUNTIME LOCKED',
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
    accent: '#10b981',
    chapters: [
      {
        act: 'ACT 01 / 04',
        tag: 'SEALED COWLING',
        title: 'Dormant Cylindrical Sensor Unit',
        sub: 'Interlocked dual clamshell cowlings protect internal polygon optics from physical exposure.',
        statusPill: 'COWLING SEALED',
        statusType: 'problem',
        metric: { label: 'ENVIRONMENT SPEC', value: 'MIL-STD-810H' },
      },
      {
        act: 'ACT 02 / 04',
        tag: 'TELESCOPIC BARREL',
        title: 'Clamshell Separation & Extension',
        sub: 'Cowlings slide apart vertically; central optical barrel extends on precision helicoid cams.',
        statusPill: 'HELICOID EXTENSION',
        statusType: 'building',
        metric: { label: 'BARREL EXTENSION', value: '0.25 m Travel' },
      },
      {
        act: 'ACT 03 / 04',
        tag: '360° PLANAR SWEEP',
        title: '6,000 RPM LiDAR Point Cloud',
        sub: 'Internal polygon mirror prism accelerates; coherent laser fan reconstructs 3D surrounding space.',
        statusPill: '6000 RPM SWEEP',
        statusType: 'active',
        metric: { label: 'POINT DENSITY', value: '1.2M pts/sec' },
      },
      {
        act: 'ACT 04 / 04',
        tag: 'SPATIAL CONCURRENCY',
        title: 'Real-Time Physical-Digital Grounding',
        sub: 'Suspended optical barrel and point cloud field executing real-time spatial decisions.',
        statusPill: '✓ SPATIAL GROUNDING',
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
    accent: '#0ea5e9',
    chapters: [
      {
        act: 'ACT 01 / 04',
        tag: 'SEALED PLINTH',
        title: 'Architectural Stone Baseline',
        sub: 'Flush perimeter retaining walls enclose geological terrain model at sea-level baseline.',
        statusPill: 'PLINTH ENCLOSURE',
        statusType: 'problem',
        metric: { label: 'DATUM REFERENCE', value: 'WGS84 Zero' },
      },
      {
        act: 'ACT 02 / 04',
        tag: 'WALL HINGE & RISERS',
        title: '8-Tier Contour Terrace Elevation',
        sub: 'Perimeter walls drop outward 60°; internal hydraulic risers lift 8 contour slabs into vertical relief.',
        statusPill: 'TERRACE ELEVATION',
        statusType: 'building',
        metric: { label: 'CONTOUR TIERS', value: '8 Formations' },
      },
      {
        act: 'ACT 03 / 04',
        tag: 'SOLAR RAKING AUDIT',
        title: 'Micro-Watershed Illumination',
        sub: 'Raking sun sweeps across the terraces, casting realistic architectural shadows across ridges and valleys.',
        statusPill: 'SHADOW MORPHOLOGY',
        statusType: 'active',
        metric: { label: 'DRAINAGE AUDIT', value: '100% Mapped' },
      },
      {
        act: 'ACT 04 / 04',
        tag: 'EXPLODED MONUMENT',
        title: '3D Planetary Ground-Truth',
        sub: 'Brass azimuth compass snaps into orientation above the peak in suspended architectural relief.',
        statusPill: '✓ 3D GEO-GROUNDED',
        statusType: 'verified',
        metric: { label: 'SPATIAL ACCURACY', value: 'Sub-Meter' },
      },
    ],
  },

  // 4. Defense Intelligence
  {
    id: 'defense-intelligence',
    name: 'Defense Intelligence',
    field: 'Secure & Mission-Critical AI',
    accent: '#ef4444',
    chapters: [
      {
        act: 'ACT 01 / 04',
        tag: 'BALLISTIC ENCLAVE',
        title: 'Sealed Tungsten Armor Vault',
        sub: 'Monolithic tungsten-carbide chassis secured by four recessed 24k gold Torx fasteners.',
        statusPill: 'BALLISTIC LOCK',
        statusType: 'problem',
        metric: { label: 'ARMOR DENSITY', value: '19.3 g/cm³' },
      },
      {
        act: 'ACT 02 / 04',
        tag: 'TORX BOLT RETRACTION',
        title: 'Fastener Release & Lid Ascension',
        sub: 'Gold bolts unscrew into suspension; heavy top armor lid elevates +0.65m vertically.',
        statusPill: 'TORX DISENGAGEMENT',
        statusType: 'building',
        metric: { label: 'LID ELEVATION', value: '0.65 m Vertical' },
      },
      {
        act: 'ACT 03 / 04',
        tag: 'ZK QUANTUM CIRCUIT',
        title: 'Geodesic Tripwire Cage Active',
        sub: 'Cryptographic die illuminates; geodesic zero-knowledge tripwire cage validates tamper-proof boundary.',
        statusPill: 'ZK TRIPWIRE ACTIVE',
        statusType: 'active',
        metric: { label: 'VERIFICATION', value: '100% Cryptographic' },
      },
      {
        act: 'ACT 04 / 04',
        tag: 'AIR-GAPPED SOVEREIGNTY',
        title: 'Zero-Trust Enclave Isolation',
        sub: 'Suspended armor lid, floating bolts, and glowing quantum core locked in sovereign equilibrium.',
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
    accent: '#eab308',
    chapters: [
      {
        act: 'ACT 01 / 04',
        tag: 'CERAMIC LID',
        title: 'Packaged BGA Micro-Module',
        sub: 'Metallic heat-spreader lid protects microscopic 3nm silicon die on dark organic substrate.',
        statusPill: 'BGA PACKAGED',
        statusType: 'problem',
        metric: { label: 'PACKAGE FORM', value: 'FC-BGA 12×12' },
      },
      {
        act: 'ACT 02 / 04',
        tag: 'LID SUSPENSION',
        title: 'Die Reveal & Gold Wire Arcs',
        sub: 'Heat-spreader lifts into suspension; bare 3nm die is revealed; 16 gold wire bond tubes arc to pads.',
        statusPill: 'DIE EXPOSURE',
        statusType: 'building',
        metric: { label: 'DIE NODE', value: '3nm TSMC GAA' },
      },
      {
        act: 'ACT 03 / 04',
        tag: 'SYNAPTIC NEURAL TREE',
        title: '0.8W Synaptic Action Potentials',
        sub: 'Volumetric 3D synaptic dendrite tree unfurls into the air, firing 1,200 action-potential pulses.',
        statusPill: '0.8W SYNAPSE ACTIVE',
        statusType: 'active',
        metric: { label: 'POWER CONSUMPTION', value: '0.80 Watts' },
      },
      {
        act: 'ACT 04 / 04',
        tag: 'LOCAL SOVEREIGNTY',
        title: 'Untethered On-Device Reasoning',
        sub: 'Suspended lid, gold bond wire arcs, and neural tree operating privately on device with zero cloud latency.',
        statusPill: '✓ UNTETHERED LOCAL',
        statusType: 'verified',
        metric: { label: 'INFERENCE SPEED', value: '62 tok/sec' },
      },
    ],
  },
];
