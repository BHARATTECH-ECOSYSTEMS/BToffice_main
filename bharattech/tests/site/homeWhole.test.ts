import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHomeWholeStore } from '../../src/pages/homeWhole';

// Review 2026-10-26 H4 (owner's 1A): on desktop the home page builds its lower sections after its first paint, but
// the nav's chapter bars, its Capabilities key and the globe's dot ride looked those sections up once, before they
// were there, and never again. Now the home page says once when it is whole, and those three set themselves up then.

const home = readFileSync('src/pages/Home.tsx', 'utf8');
const nav = readFileSync('src/components/Nav.tsx', 'utf8');
const network = readFileSync('src/sections/Network.tsx', 'utf8');

test('the store starts not whole and tells its listeners once per change', () => {
  const store = createHomeWholeStore();
  assert.equal(store.get(), false);
  let heard = 0;
  const stop = store.subscribe(() => (heard += 1));
  store.set(true);
  store.set(true);
  assert.equal(store.get(), true);
  assert.equal(heard, 1);
  store.set(false);
  assert.equal(heard, 2);
  stop();
  store.set(true);
  assert.equal(heard, 2);
});

test('the home page says when it is whole, and not whole again once it is left', () => {
  assert.match(home, /useEffect\(\(\) => setHomeWhole\(whole\), \[whole\]\)/);
  assert.match(home, /useEffect\(\(\) => \(\) => setHomeWhole\(false\), \[\]\)/);
});

test("the nav's chapter bars wait for the whole page", () => {
  assert.match(nav, /const pageWhole = useHomeWhole\(\);/);
  assert.match(nav, /useChapterProgress\(home && pageWhole, progressRef\)/);
});

test("the nav's Capabilities key waits for the whole page", () => {
  const effect = nav.slice(nav.indexOf("document.getElementById('capabilities')") - 200, nav.indexOf("document.getElementById('capabilities')") + 400);
  assert.match(effect, /if \(!home \|\| !pageWhole\) return;/);
  assert.match(effect, /\}, \[home, pageWhole\]\);/);
});

test("the globe looks for the Research heading again once the page is whole", () => {
  assert.match(network, /const pageWhole = useHomeWhole\(\);/);
  assert.match(network, /\}, \[landOn, engine, pageWhole\]\);/);
});
