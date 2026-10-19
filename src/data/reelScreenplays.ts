/**
 * Four chapters per domain, taken from each domain's focus areas in content.ts.
 * Each chapter is one layer of that domain's ink scene (src/gl/domainInkScenes.ts),
 * so keep the two in the same order.
 */
export const DOMAIN_REELS: { name: string; chapters: { title: string }[] }[] = [
  {
    name: 'GI Rivinity',
    chapters: [
      { title: 'Learning never stops' },
      { title: 'Memory that compounds' },
      { title: 'Reasoning across memory' },
      { title: 'Deciding, then adapting' },
    ],
  },
  {
    name: 'Rivinity Core',
    chapters: [
      { title: 'One capability layer' },
      { title: 'Everything plugs in' },
      { title: 'Routing intelligence' },
      { title: 'Working as one' },
    ],
  },
  {
    name: 'IoT Intelligence',
    chapters: [
      { title: 'Devices come online' },
      { title: 'Signals fused' },
      { title: 'Machines act' },
      { title: 'The environment thinks' },
    ],
  },
  {
    name: 'Geo Intelligence',
    chapters: [
      { title: 'Eyes in orbit' },
      { title: 'Terrain mapped' },
      { title: 'Networks traced' },
      { title: 'Reasoning about change' },
    ],
  },
  {
    name: 'Defense Intelligence',
    chapters: [
      { title: 'Secure by design' },
      { title: 'Threats stopped' },
      { title: 'Always watching' },
      { title: 'Reliable under pressure' },
    ],
  },
  {
    name: 'Miniature Intelligence',
    chapters: [
      { title: 'Shrunk to fit' },
      { title: 'On every device' },
      { title: 'Local by default' },
      { title: 'Still connected' },
    ],
  },
];
