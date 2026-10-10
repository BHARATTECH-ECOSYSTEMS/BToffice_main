export interface ReelChapter {
  act: string;
  tag: string;
  title: string;
  sub: string;
  statusPill: string;
  statusType: 'standby' | 'deploy' | 'active' | 'verified';
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
        title: 'Sealed Titanium Optical Vault',
        sub: 'Precision titanium housing isolates fused-silica crystal lattice with zero environmental drift.',
        statusPill: 'HERMETIC SEAL',
        statusType: 'standby',
        metric: { label: 'CHASSIS ISOLATION', value: 'IP68 / Vacuum' },
      },
      {
        act: 'ACT 02 / 04',
        tag: 'KINEMATIC BLOOM',
        title: 'Four-Petal Aperture Unlatch',
        sub: 'Quadrant titanium petals swing open 75°; 24k gold spindle carriage elevates on Z-axis.',
        statusPill: '75.0° BLOOM',
        statusType: 'deploy',
        metric: { label: 'HINGE DEPLOYMENT', value: '75.0° Radial' },
      },
      {
        act: 'ACT 03 / 04',
        tag: 'OPTICAL OPERATION',
        title: '8,000 RPM Quartz Readback',
        sub: 'Femtosecond laser (λ=515nm) targets spinning fused-silica disc with full chromatic refraction.',
        statusPill: '8,000 RPM ONLINE',
        statusType: 'active',
        metric: { label: 'READ VELOCITY', value: '8,000 RPM' },
      },
      {
        act: 'ACT 04 / 04',
        tag: 'EXPLODED ENCLAVE',
        title: 'Permanent 10,000-Yr Context Lock',
        sub: 'Suspended optical components hover in harmonic balance with permanent zero-drift retention.',
        statusPill: '✓ 10,000-YR VERIFIED',
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
        title: 'Milled Aluminum Blade Array',
        sub: 'Bead-blasted unibody chassis houses distributed multi-model orchestration fabric.',
        statusPill: 'UNIBODY SEALED',
        statusType: 'standby',
        metric: { label: 'MACHINED VOLUME', value: '1.4 × 1.4 m' },
      },
      {
        act: 'ACT 02 / 04',
        tag: 'LINEAR RAIL GLIDE',
        title: 'Four-Quadrant Deconstruction',
        sub: 'Radial copper cooler lifts vertically; four aluminum chassis modules glide outward on rails.',
        statusPill: 'RAIL DECOUPLING',
        statusType: 'deploy',
        metric: { label: 'LINEAR TRAVEL', value: '0.6 m Travel' },
      },
      {
        act: 'ACT 03 / 04',
        tag: 'WAVEGUIDE FABRIC',
        title: '48.2 GB/s Optical Multi-Bus',
        sub: 'Central neural processor die ignites; optical waveguides stream photon wave packets.',
        statusPill: '48.2 GB/s ACTIVE',
        statusType: 'active',
        metric: { label: 'BUS BANDWIDTH', value: '48.2 GB/s' },
      },
      {
        act: 'ACT 04 / 04',
        tag: 'EXPLODED SERVER',
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
        title: 'Dormant Spatial LiDAR Unit',
        sub: 'Interlocked dual clamshell cowlings protect internal polygon optics from physical exposure.',
        statusPill: 'COWLING SEALED',
        statusType: 'standby',
        metric: { label: 'ENVIRONMENT SPEC', value: 'MIL-STD-810H' },
      },
      {
        act: 'ACT 02 / 04',
        tag: 'TELESCOPIC BARREL',
        title: 'Clamshell Separation & Extension',
        sub: 'Cowlings slide apart vertically; central optical barrel extends on precision helicoid cams.',
        statusPill: 'HELICOID EXTEND',
        statusType: 'deploy',
        metric: { label: 'BARREL EXTENSION', value: '0.25 m Travel' },
      },
      {
        act: 'ACT 03 / 04',
        tag: '360° LASER SWEEP',
        title: '6,000 RPM Polygon Perception',
        sub: 'Polygon mirror spins; emerald laser fan sweeps 360° capturing 1.2M points per second.',
        statusPill: '1.2M PTS/S ONLINE',
        statusType: 'active',
        metric: { label: 'POINT DENSITY', value: '1.2M Pts/s' },
      },
      {
        act: 'ACT 04 / 04',
        tag: 'EXPLODED VOXEL MAP',
        title: 'Full Spatial Volumetric Mesh',
        sub: 'Physical sensor casing hovers above dynamic point-cloud voxels with zero physical latency.',
        statusPill: '✓ VOXEL SYNCED',
        statusType: 'verified',
        metric: { label: 'SPATIAL LATENCY', value: '1.2 ms' },
      },
    ],
  },

  // 3. Geo Intelligence
  {
    id: 'geo-intelligence',
    name: 'Geo Intelligence',
    field: 'Spatial Computing',
    accent: '#0ea5e9',
    chapters: [
      {
        act: 'ACT 01 / 04',
        tag: 'SURVEY MONOLITH',
        title: 'Terraced Topographic Base',
        sub: 'Heavy architectural stone plinth stores multi-tier elevation datum and hydrologic vectors.',
        statusPill: 'DATUM ALIGNED',
        statusType: 'standby',
        metric: { label: 'SURFACE DATUM', value: 'WGS-84 / EGM96' },
      },
      {
        act: 'ACT 02 / 04',
        tag: 'WALL APERTURE',
        title: 'Perimeter Wall Unfolding',
        sub: 'Four retaining walls hinge outward 60°; internal geomorphic contour slabs rise into relief.',
        statusPill: '60.0° WALL TILT',
        statusType: 'deploy',
        metric: { label: 'CONTOUR TIERS', value: '8 Slabs Active' },
      },
      {
        act: 'ACT 03 / 04',
        tag: 'AZIMUTH SCAN',
        title: 'Solar Raking & Elevation Audit',
        sub: 'Brass azimuth rose needle aligns to true north; cyan laser elevation probe computes contour slopes.',
        statusPill: 'GIS SCAN ACTIVE',
        statusType: 'active',
        metric: { label: 'TERRAIN RESOLUTION', value: '0.12 m/px' },
      },
      {
        act: 'ACT 04 / 04',
        tag: 'EXPLODED GIS MESH',
        title: 'Multi-Spectral Topographic Matrix',
        sub: 'Separated contour slabs, azimuth needle, and coordinate grid suspended in precision alignment.',
        statusPill: '✓ ELEVATION LOCKED',
        statusType: 'verified',
        metric: { label: 'TOPOLOGY DRIFT', value: '0.00 mm' },
      },
    ],
  },

  // 4. Defense Intelligence
  {
    id: 'defense-intelligence',
    name: 'Defense Intelligence',
    field: 'Critical Infrastructure',
    accent: '#ef4444',
    chapters: [
      {
        act: 'ACT 01 / 04',
        tag: 'ARMORED ENCLAVE',
        title: 'Hermetic Tungsten Vault',
        sub: 'Tungsten-carbide armor body with 24k gold Torx bolts secures zero-knowledge cryptographic core.',
        statusPill: 'ENCLAVE LOCKED',
        statusType: 'standby',
        metric: { label: 'BLAST RESISTANCE', value: 'STANAG 4569' },
      },
      {
        act: 'ACT 02 / 04',
        tag: 'TORX FASTENER RELEASE',
        title: 'Heavy Armor Lid Elevation',
        sub: 'Four perimeter gold Torx fasteners spin up into suspension; heavy armor lid glides vertically.',
        statusPill: 'BOLTS RELEASED',
        statusType: 'deploy',
        metric: { label: 'FASTENER TRAVEL', value: '0.75 m Z-Axis' },
      },
      {
        act: 'ACT 03 / 04',
        tag: 'QUANTUM TRIPWIRE',
        title: 'Zero-Knowledge Lattice Shield',
        sub: 'Cryptographic die radiates emerald glow; counter-rotating geodesic security lattice activates.',
        statusPill: 'ZK-LATTICE ONLINE',
        statusType: 'active',
        metric: { label: 'ENTROPY POOL', value: 'Quantum TRNG' },
      },
      {
        act: 'ACT 04 / 04',
        tag: 'EXPLODED VAULT',
        title: 'Permanent Air-Gapped Fortress',
        sub: 'Floating armor lid, suspended fasteners, and emerald crypto die operating in sovereign isolation.',
        statusPill: '✓ SOV-1 CERTIFIED',
        statusType: 'verified',
        metric: { label: 'SECURITY LEVEL', value: 'Air-Gapped SOV-1' },
      },
    ],
  },

  // 5. Miniature Intelligence
  {
    id: 'miniature-intelligence',
    name: 'Miniature Intelligence',
    field: 'Edge & Embedded Systems',
    accent: '#eab308',
    chapters: [
      {
        act: 'ACT 01 / 04',
        tag: 'BGA PACKAGE',
        title: 'Dormant Edge Silicon Node',
        sub: 'High-density organic BGA substrate with nickel heat-spreader lid housing 3nm NPU accelerator.',
        statusPill: 'PKG STANDBY',
        statusType: 'standby',
        metric: { label: 'STANDBY POWER', value: '0.01 W' },
      },
      {
        act: 'ACT 02 / 04',
        tag: 'HEAT SPREADER LIFT',
        title: 'Silicon Die & Wire Bond Reveal',
        sub: 'Mirror-polished nickel lid elevates; bare 3nm GAA die and 16 arced gold wire bonds emerge.',
        statusPill: 'LID SUSPENDED',
        statusType: 'deploy',
        metric: { label: 'DIE DIMENSION', value: '2.8 × 2.8 mm' },
      },
      {
        act: 'ACT 03 / 04',
        tag: 'SYNAPTIC TREE PULSE',
        title: '0.8W Neuromorphic Inference',
        sub: '3D neural arbor ignites; gold action-potential sparks fire continuously at 62 tokens/second.',
        statusPill: '0.8W INFERENCE',
        statusType: 'active',
        metric: { label: 'ENERGY EFFICIENCY', value: '62 Tok/W' },
      },
      {
        act: 'ACT 04 / 04',
        tag: 'EXPLODED SILICON',
        title: 'Full Nanometer Edge Hierarchy',
        sub: 'Suspended lid, wire bonds, silicon die, and substrate hovering in multi-layer balance.',
        statusPill: '✓ LOCAL ZERO-NET',
        statusType: 'verified',
        metric: { label: 'NETWORK DEPENDENCY', value: '0% Cloud' },
      },
    ],
  },
];
