import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { coverPage, isPageCovered, onPageCover } from '../../src/components/pageCover';

// Owner, 2026-10-30 ("sign in takes time"): over the home page the sign-in window opened at ~30 fps, over a page
// without the 3D hero it was smooth. The hero's glass film kept drawing behind the window's backdrop, so the two glass
// scenes shared the graphics chip. While a window covers the page, the hero holds still.

test('covering tells listeners once per change, and two covers need two uncovers', () => {
  const seen: boolean[] = [];
  const off = onPageCover((c) => seen.push(c));
  assert.equal(isPageCovered(), false);
  const uncoverA = coverPage();
  const uncoverB = coverPage();
  assert.deepEqual(seen, [true]);
  uncoverA();
  uncoverA(); // a second call of the same uncover does nothing
  assert.equal(isPageCovered(), true, 'still covered by the other window');
  uncoverB();
  assert.deepEqual(seen, [true, false]);
  off();
  coverPage()();
  assert.deepEqual(seen, [true, false], 'no calls after unsubscribing');
});

test('the sign-in window covers the page while it is open', () => {
  const login = readFileSync('src/components/Login.tsx', 'utf8');
  const open = login.slice(login.indexOf('d.showModal();'), login.indexOf('}, [lenis]);'));
  assert.match(open, /const uncover = coverPage\(\);/);
  assert.match(open, /return \(\) => \{[\s\S]*uncover\(\);/);
});

test('the hero stops while covered and starts again only if it is on screen and ready', () => {
  const story = readFileSync('src/sections/Story.tsx', 'utf8');
  assert.match(story, /onPageCover\(/);
  assert.match(story, /const play = \(\) => \{\s*if \(visible && warmed && !isPageCovered\(\)\) studio\?\.start\(\);\s*else studio\?\.stop\(\);\s*\};/);
});
