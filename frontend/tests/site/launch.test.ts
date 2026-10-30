import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BRANDS, LAUNCH, isPlainClick, launchAllowed, openTab, phaseAt, shardAt, shardGrid } from '../../src/components/launch/launchPlan';

// Every icon in the footer's CONNECT pill opens with an app-launch animation (owner's 1A 2A 3A 4A 5A, 2026-10-25,
// first LinkedIn and Instagram, then "all icons"; from a reel of Spotify's launch): the icon pops out as a thick 3D coin over a bright brand-colour screen, its face
// breaks from the right and swirls away, a hole opens, the rim zooms past like a portal, the profile opens in a new
// tab, and the page fades back as it was.

test('only on computers with a mouse, never with reduced motion', () => {
  assert.equal(launchAllowed({ finePointer: true, reducedMotion: false }), true);
  assert.equal(launchAllowed({ finePointer: false, reducedMotion: false }), false);
  assert.equal(launchAllowed({ finePointer: true, reducedMotion: true }), false);
});

test('a ctrl/cmd/shift/alt or middle click keeps the browser’s own behaviour', () => {
  const click = { button: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false };
  assert.equal(isPlainClick(click), true);
  for (const k of ['ctrlKey', 'metaKey', 'shiftKey', 'altKey'] as const) assert.equal(isPlainClick({ ...click, [k]: true }), false, k);
  assert.equal(isPlainClick({ ...click, button: 1 }), false);
});

test('about 1.4 s in the reel’s order: pop, hold, break, swirl, portal; the tab opens as the portal fills', () => {
  assert.ok(LAUNCH.total >= 1200 && LAUNCH.total <= 1600, String(LAUNCH.total));
  assert.ok(LAUNCH.pop[1] <= LAUNCH.hold[0] && LAUNCH.hold[1] <= LAUNCH.break[0] && LAUNCH.break[0] < LAUNCH.swirl[0]);
  assert.ok(LAUNCH.portal[0] > LAUNCH.break[0] && LAUNCH.portal[1] <= LAUNCH.fade[0]);
  assert.ok(LAUNCH.openAt > LAUNCH.portal[0] && LAUNCH.openAt <= LAUNCH.portal[1], 'opens once the portal has nearly filled the screen');
  assert.ok(LAUNCH.openAt < 2000, 'well inside the browser’s 5 s allowance');
  assert.equal(LAUNCH.fade[1], LAUNCH.total);
});

test('the phases run 0→1 in order and the launch ends at its total', () => {
  const start = phaseAt(0);
  assert.equal(start.pop, 0);
  assert.equal(start.shards, 0);
  assert.equal(start.done, false);
  const holding = phaseAt(LAUNCH.hold[0] + 1);
  assert.equal(holding.pop, 1);
  assert.equal(holding.shards, 0);
  const end = phaseAt(LAUNCH.total);
  assert.equal(end.shards, 1);
  assert.equal(end.portal, 1);
  assert.equal(end.fade, 1);
  assert.equal(end.done, true);
  for (let t = 0; t <= LAUNCH.total; t += 50) {
    const p = phaseAt(t);
    for (const v of [p.pop, p.debris, p.ripples, p.hold, p.shards, p.hole, p.portal, p.fade]) assert.ok(v >= 0 && v <= 1, `${t}: ${v}`);
  }
});

test('every CONNECT icon has its brand: LinkedIn blue, Instagram and Gmail gradients, each with a white glyph', () => {
  assert.deepEqual(Object.keys(BRANDS).sort(), ['discord', 'email', 'github', 'instagram', 'linkedin', 'x', 'youtube']);
  assert.deepEqual(BRANDS.linkedin.colours, ['#0A66C2']);
  assert.deepEqual(BRANDS.youtube.colours, ['#FF0000']);
  assert.deepEqual(BRANDS.discord.colours, ['#5865F2']);
  assert.deepEqual(BRANDS.email.colours, ['#34A853', '#4285F4', '#FBBC04', '#EA4335'], 'it opens Gmail, so Gmail’s four colours');
  assert.ok(BRANDS.instagram.colours.length >= 3);
  // GitHub and X are black and white brands: a gradient of greys, so the glow the portal zooms into isn't flat black
  for (const net of ['github', 'x'] as const) assert.ok(BRANDS[net].colours.length >= 3 && new Set(BRANDS[net].colours).size >= 3, net);
  for (const [net, b] of Object.entries(BRANDS)) {
    assert.ok(b.colours.length >= 1 && b.colours.length <= 5, `${net}: the backdrop shader takes up to five stops`);
    assert.ok(b.glyph.length >= 1, `${net} has a glyph`);
    assert.notEqual(b.rim, b.colours[0], `${net}: the rim stands apart from the face`);
  }
});

test('the shards tile the icon exactly: every piece inside, nothing missing', () => {
  const shards = shardGrid(9, 9, 7);
  assert.equal(shards.length, 9 * 9 * 2);
  let area = 0;
  for (const s of shards) {
    for (const [x, y] of s.points) assert.ok(x >= -0.5 - 1e-9 && x <= 0.5 + 1e-9 && y >= -0.5 - 1e-9 && y <= 0.5 + 1e-9);
    const [[ax, ay], [bx, by], [cx, cy]] = s.points;
    area += Math.abs((bx - ax) * (cy - ay) - (cx - ax) * (by - ay)) / 2;
  }
  assert.ok(Math.abs(area - 1) < 1e-9, String(area));
  assert.deepEqual(shardGrid(9, 9, 7), shards, 'the same pieces every time');
});

test('the face breaks from the right, then swirls round the middle, spiralling out, turning and fading', () => {
  const shards = shardGrid(12, 12, 3);
  const s = shards.find((x) => Math.hypot(x.cx, x.cy) > 0.2 && Math.hypot(x.cx, x.cy) < 0.35)!;
  const rest = shardAt(s, 0);
  assert.deepEqual([rest.x, rest.y, rest.z, rest.angle, rest.opacity], [0, 0, 0, 0, 1]);
  const gone = shardAt(s, 1);
  assert.equal(gone.opacity, 0);
  assert.ok(gone.z > 0, 'lifts toward the viewer');
  assert.ok(Math.abs(gone.angle) > 0.5, 'turns as it goes');
  const x = s.cx + gone.x;
  const y = s.cy + gone.y;
  assert.ok(Math.hypot(x, y) > Math.hypot(s.cx, s.cy) * 1.4, 'spirals outward');
  const turned = Math.atan2(s.cx * y - s.cy * x, s.cx * x + s.cy * y);
  assert.ok(turned > 0.8, `swirls round the middle (${turned.toFixed(2)} rad, anticlockwise)`);
  const left = shards.reduce((a, b) => (b.cx < a.cx ? b : a));
  const right = shards.reduce((a, b) => (b.cx > a.cx ? b : a));
  const moved = (sh: typeof s) => { const m = shardAt(sh, 0.2); return Math.hypot(m.x, m.y, m.z) + Math.abs(m.angle); };
  assert.ok(moved(right) > moved(left), 'the break sweeps from the right');
  assert.equal(moved(left), 0, 'the left edge is still whole at first');
});

test('the tab opens without access back to the site, and a blocked tab is reported', () => {
  const tab = { opener: {} as unknown };
  const calls: unknown[][] = [];
  assert.equal(openTab('https://example.test/p', (...a) => (calls.push(a), tab)), 'opened');
  assert.deepEqual(calls[0], ['https://example.test/p', '_blank']);
  assert.equal(tab.opener, null);
  assert.equal(openTab('https://example.test/p', () => null), 'blocked');
});

test('the footer launches every icon, prepares on hover, and loads three.js only when needed', () => {
  const footer = readFileSync('src/components/Footer.tsx', 'utf8');
  assert.match(footer, /useLaunch\(/);
  assert.match(footer, /onPointerEnter=\{[^}]*prepare/);
  const nets = [...footer.matchAll(/net: '([a-z]+)'/g)].map((m) => m[1]);
  assert.equal(nets.length, 7, 'one per letter of CONNECT');
  assert.deepEqual([...nets].sort(), Object.keys(BRANDS).sort(), 'every icon has a brand to launch');
  // links and the icons without an address yet are both clicked into the launch
  assert.equal(footer.match(/onClick=\{[^}]*launch/g)?.length, 2);
  assert.match(footer, /<button[^>]*type="button"[^>]*className="footer-connect-slot/, 'an icon without an address is a real button');
  assert.doesNotMatch(footer, /is-icon-only|aria-hidden="true">\s*\{inner\}/, 'no icon is left unclickable');
  const glue = readFileSync('src/components/launch/useLaunch.ts', 'utf8');
  assert.match(glue, /import\(['"]\.\/launchScene['"]\)/);
  assert.match(glue, /showNote\(`\$\{label\} is coming soon\.`/, 'without an address the launch ends on a note instead of a tab');
  for (const file of ['src/components/Footer.tsx', 'src/components/launch/useLaunch.ts', 'src/components/launch/launchPlan.ts'])
    assert.doesNotMatch(readFileSync(file, 'utf8'), /(?:from|import)\s*['"]three(?:\/[^'"]*)?['"]/, `${file} must not load three.js up front`);
});

test('the note reads in both themes: the page’s own colours turned round', () => {
  const css = readFileSync('src/styles/base.css', 'utf8');
  const note = css.match(/\.launch-note \{[^}]*\}/)?.[0] ?? '';
  assert.match(note, /background: var\(--ink\);/);
  assert.match(note, /color: var\(--paper\);/, 'white text sat on the light --ink of dark mode');
  assert.match(css.match(/\.launch-note a \{[^}]*\}/)?.[0] ?? '', /color: inherit;/);
});
