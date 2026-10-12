export interface ReelChapter {
  act: string;
  tag: string;
  title: string;
  sub: string;
  statusPill: string;
  statusType: 'standby' | 'deploy' | 'active' | 'verified';
}

export interface DomainReelData {
  id: string;
  name: string;
  field: string;
  accent: string;
  chapters: ReelChapter[];
}

/**
 * Four chapters per domain, taken from each domain's focus areas in content.ts.
 * Each chapter is one layer of that domain's ink scene (src/gl/domainInkScenes.ts),
 * so keep the two in the same order.
 */
export const DOMAIN_REELS: DomainReelData[] = [
  {
    id: 'gi-rivinity',
    name: 'GI Rivinity',
    field: 'Generative Intelligence',
    accent: '#6E58F5',
    chapters: [
      {
        act: 'ACT 01 / 04',
        tag: 'CONTINUOUS LEARNING',
        title: 'Learning never stops',
        sub: 'New signals stream in and are absorbed as they arrive.',
        statusPill: 'LEARNING',
        statusType: 'standby',
      },
      {
        act: 'ACT 02 / 04',
        tag: 'LONG-TERM MEMORY',
        title: 'Memory that compounds',
        sub: 'Every experience is kept in layered long-term memory.',
        statusPill: 'REMEMBERING',
        statusType: 'deploy',
      },
      {
        act: 'ACT 03 / 04',
        tag: 'AUTONOMOUS REASONING',
        title: 'Reasoning across memory',
        sub: 'What it remembers is linked into a chain of reasoning.',
        statusPill: 'REASONING',
        statusType: 'active',
      },
      {
        act: 'ACT 04 / 04',
        tag: 'ADAPTIVE DECISIONS',
        title: 'Deciding, then adapting',
        sub: 'It weighs the options and commits, with context preserved.',
        statusPill: '✓ DECIDED',
        statusType: 'verified',
      },
    ],
  },
  {
    id: 'rivinity-core',
    name: 'Rivinity Core',
    field: 'Universal Intelligence OS',
    accent: '#FF8643',
    chapters: [
      {
        act: 'ACT 01 / 04',
        tag: 'UNIFIED LAYER',
        title: 'One capability layer',
        sub: 'A single operating layer sits beneath every system.',
        statusPill: 'LAYER ONLINE',
        statusType: 'standby',
      },
      {
        act: 'ACT 02 / 04',
        tag: 'CROSS-SYSTEM',
        title: 'Everything plugs in',
        sub: 'Applications, industries and devices connect to the same core.',
        statusPill: 'CONNECTING',
        statusType: 'deploy',
      },
      {
        act: 'ACT 03 / 04',
        tag: 'INTELLIGENCE ROUTING',
        title: 'Routing intelligence',
        sub: 'Requests travel through the core to the right model.',
        statusPill: 'ROUTING',
        statusType: 'active',
      },
      {
        act: 'ACT 04 / 04',
        tag: 'SHARED FABRIC',
        title: 'Working as one',
        sub: 'A shared knowledge fabric keeps every system in sync.',
        statusPill: '✓ IN SYNC',
        statusType: 'verified',
      },
    ],
  },
  {
    id: 'iot-intelligence',
    name: 'IoT Intelligence',
    field: 'Embedded & Physical AI',
    accent: '#F59E00',
    chapters: [
      {
        act: 'ACT 01 / 04',
        tag: 'CONNECTED DEVICES',
        title: 'Devices come online',
        sub: 'Sensors and machines join one network.',
        statusPill: 'ONLINE',
        statusType: 'standby',
      },
      {
        act: 'ACT 02 / 04',
        tag: 'SENSOR FUSION',
        title: 'Signals fused',
        sub: 'Readings from many sensors merge into one picture.',
        statusPill: 'FUSING',
        statusType: 'deploy',
      },
      {
        act: 'ACT 03 / 04',
        tag: 'INDUSTRIAL AUTOMATION',
        title: 'Machines act',
        sub: 'Robotics and production lines respond to what sensors see.',
        statusPill: 'AUTOMATING',
        statusType: 'active',
      },
      {
        act: 'ACT 04 / 04',
        tag: 'SMART INFRASTRUCTURE',
        title: 'The environment thinks',
        sub: 'The whole site works as one intelligent system.',
        statusPill: '✓ THINKING',
        statusType: 'verified',
      },
    ],
  },
  {
    id: 'geo-intelligence',
    name: 'Geo Intelligence',
    field: 'Geospatial & Location AI',
    accent: '#6E58F5',
    chapters: [
      {
        act: 'ACT 01 / 04',
        tag: 'REMOTE SENSING',
        title: 'Eyes in orbit',
        sub: 'Satellites scan the ground below.',
        statusPill: 'SCANNING',
        statusType: 'standby',
      },
      {
        act: 'ACT 02 / 04',
        tag: 'SATELLITE IMAGERY',
        title: 'Terrain mapped',
        sub: 'Imagery becomes a readable map of the land.',
        statusPill: 'MAPPING',
        statusType: 'deploy',
      },
      {
        act: 'ACT 03 / 04',
        tag: 'TRANSPORT NETWORKS',
        title: 'Networks traced',
        sub: 'Roads and routes are understood and followed.',
        statusPill: 'TRACING',
        statusType: 'active',
      },
      {
        act: 'ACT 04 / 04',
        tag: 'CLIMATE INTELLIGENCE',
        title: 'Reasoning about change',
        sub: 'Weather and climate patterns are layered over the map.',
        statusPill: '✓ ANALYSED',
        statusType: 'verified',
      },
    ],
  },
  {
    id: 'defense-intelligence',
    name: 'Defense Intelligence',
    field: 'Secure & Mission-Critical AI',
    accent: '#FF8643',
    chapters: [
      {
        act: 'ACT 01 / 04',
        tag: 'SECURE ARCHITECTURE',
        title: 'Secure by design',
        sub: 'The core is protected from the first layer up.',
        statusPill: 'SECURED',
        statusType: 'standby',
      },
      {
        act: 'ACT 02 / 04',
        tag: 'CYBERSECURITY',
        title: 'Threats stopped',
        sub: 'Incoming attacks are detected and blocked at the edge.',
        statusPill: 'DEFENDING',
        statusType: 'deploy',
      },
      {
        act: 'ACT 03 / 04',
        tag: 'AUTONOMOUS MONITORING',
        title: 'Always watching',
        sub: 'Continuous monitoring flags anything unusual.',
        statusPill: 'MONITORING',
        statusType: 'active',
      },
      {
        act: 'ACT 04 / 04',
        tag: 'MISSION-CRITICAL',
        title: 'Reliable under pressure',
        sub: 'It keeps running when it matters most.',
        statusPill: '✓ RESILIENT',
        statusType: 'verified',
      },
    ],
  },
  {
    id: 'miniature-intelligence',
    name: 'Miniature Intelligence',
    field: 'Edge AI & Lightweight Models',
    accent: '#F59E00',
    chapters: [
      {
        act: 'ACT 01 / 04',
        tag: 'LIGHTWEIGHT MODELS',
        title: 'Shrunk to fit',
        sub: 'A large model is compressed into a lightweight one.',
        statusPill: 'COMPRESSING',
        statusType: 'standby',
      },
      {
        act: 'ACT 02 / 04',
        tag: 'EDGE DEPLOYMENT',
        title: 'On every device',
        sub: 'It runs on laptops, phones and embedded boards.',
        statusPill: 'DEPLOYED',
        statusType: 'deploy',
      },
      {
        act: 'ACT 03 / 04',
        tag: 'ON-DEVICE INFERENCE',
        title: 'Local by default',
        sub: 'Inference happens on the device itself.',
        statusPill: 'LOCAL',
        statusType: 'active',
      },
      {
        act: 'ACT 04 / 04',
        tag: 'CONNECTED EDGE',
        title: 'Still connected',
        sub: 'Devices stay linked to the wider intelligence network.',
        statusPill: '✓ CONNECTED',
        statusType: 'verified',
      },
    ],
  },
];
