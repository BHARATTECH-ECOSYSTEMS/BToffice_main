import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// 2026-10-26, owner's 4-1A and 4-2A: on desktop the home page shows its opening story first and builds the sections
// below it in the browser's quiet moments; phones and tablets build the whole page at once, as before.

const home = readFileSync('src/pages/Home.tsx', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');
const phoneCss = readFileSync('src/styles/phone.css', 'utf8');

const SECTIONS = ['Capabilities', 'HowItWorks', 'Architecture', 'Network', 'Research', 'Audiences', 'Journal', 'CareersSection', 'Faq', 'Finale'];

test('the opening story is built first, then every other section in page order', () => {
  const render = home.slice(home.indexOf('return ('));
  assert.match(render, /<Story \/>\s*\{whole \? LOWER : LOWER\.slice\(0, built\)\}/);
  const lower = home.slice(home.indexOf('const LOWER = ['), home.indexOf('];', home.indexOf('const LOWER = [')));
  assert.deepEqual([...lower.matchAll(/<(\w+) key=/g)].map((m) => m[1]), SECTIONS);
});

test('only desktop is staged: the same width where the phone and tablet layout stops', () => {
  assert.match(home, /STAGED_MEDIA = '\(min-width: 1025px\)'/);
  assert.match(phoneCss, /@media \(max-width: 1024px\)/);
  assert.match(home, /useState\(\(\) => \(window\.matchMedia\(STAGED_MEDIA\)\.matches \? 0 : LOWER\.length\)\)/);
});

test('any input, or a link to one of the sections, builds the whole page at once, and it never shrinks again', () => {
  assert.match(home, /BUILD_ALL_ON = \['pointerdown', 'wheel', 'keydown', 'touchstart'\]/);
  assert.match(home, /addEventListener\(type, everything, \{ capture: true, passive: true \}\)/);
  assert.match(home, /const whole = jump \|\| built >= LOWER\.length/);
  assert.match(home, /scrollTo\?: string/);
  assert.match(home, /if \(built < LOWER\.length\) setBuilt\(LOWER\.length\)/);
  // a section waits at most a moment, so the page is whole within a second or two even when it's busy
  assert.match(home, /requestIdleCallback\(fn, \{ timeout: QUIET_WAIT_MS \}\)/);
});

test('sections built later still pause their endless animations off screen', () => {
  assert.match(app, /new MutationObserver\(watch\)/);
  assert.match(app, /added\.observe\(main, \{ childList: true \}\)/);
});
