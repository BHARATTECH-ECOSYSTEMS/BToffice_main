import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { firstBuilt, isWhole, nextBuilt } from '../../src/pages/homeStaging';

// 2026-10-26, owner's 4-1A and 4-2A: on desktop the home page shows its opening story first and builds the sections
// below it in the browser's quiet moments; phones and tablets build the whole page at once, as before.

// Review 2026-10-26, tests area (owner's 4A): the rules themselves, run for real. The tests further down only check
// that Home.tsx uses them, which is how the H4 slip got past.
const TOTAL = 10;

test('desktop starts with no lower sections; phones and tablets get all of them at once', () => {
  assert.equal(firstBuilt(TOTAL, true), 0);
  assert.equal(firstBuilt(TOTAL, false), TOTAL);
  assert.equal(isWhole(firstBuilt(TOTAL, false), TOTAL, false), true);
  assert.equal(isWhole(firstBuilt(TOTAL, true), TOTAL, false), false);
});

test('each quiet moment builds the next section, in order, until the page is whole', () => {
  let built = firstBuilt(TOTAL, true);
  const seen = [built];
  while (!isWhole(built, TOTAL, false)) seen.push((built = nextBuilt(built, TOTAL, 'quiet')));
  assert.deepEqual(seen, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  // a quiet moment after that changes nothing
  assert.equal(nextBuilt(TOTAL, TOTAL, 'quiet'), TOTAL);
});

test('any input builds the whole page at once, from any point', () => {
  for (const built of [0, 3, 9]) {
    assert.equal(nextBuilt(built, TOTAL, 'input'), TOTAL);
    assert.equal(isWhole(nextBuilt(built, TOTAL, 'input'), TOTAL, false), true);
  }
});

test('a link to one of the sections makes the page whole straight away', () => {
  assert.equal(isWhole(0, TOTAL, true), true);
  assert.equal(isWhole(4, TOTAL, true), true);
});

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
  assert.match(home, /useState\(\(\) => firstBuilt\(LOWER\.length, window\.matchMedia\(STAGED_MEDIA\)\.matches\)\)/);
});

test('any input, or a link to one of the sections, builds the whole page at once, and it never shrinks again', () => {
  assert.match(home, /BUILD_ALL_ON = \['pointerdown', 'wheel', 'keydown', 'touchstart'\]/);
  assert.match(home, /addEventListener\(type, everything, \{ capture: true, passive: true \}\)/);
  assert.match(home, /const whole = isWhole\(built, LOWER\.length, jump\)/);
  assert.match(home, /const everything = \(\) => setBuilt\(\(n\) => nextBuilt\(n, LOWER\.length, 'input'\)\)/);
  assert.match(home, /whenQuiet\(\(\) => setBuilt\(\(n\) => nextBuilt\(n, LOWER\.length, 'quiet'\)\)\)/);
  assert.match(home, /scrollTo\?: string/);
  assert.match(home, /if \(built < LOWER\.length\) setBuilt\(LOWER\.length\)/);
  // a section waits at most a moment, so the page is whole within a second or two even when it's busy
  assert.match(home, /requestIdleCallback\(fn, \{ timeout: QUIET_WAIT_MS \}\)/);
});

test('sections built later still pause their endless animations off screen', () => {
  assert.match(app, /new MutationObserver\(watch\)/);
  assert.match(app, /added\.observe\(main, \{ childList: true \}\)/);
});
