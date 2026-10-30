import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { onPageClock } from '../../src/components/logoClock';

// Every copy of the live logo (top bar, back-to-top orb, sign-in window, FAQ, Contact…) shows the same moment of its
// loop: each one's loop is pinned to the page's one clock, whenever it was drawn (owner, 2026-10-30).
const fake = (animationName: string, startTime: number | null) => ({ animationName, startTime });

test("the logo's loops start at the page's own start, so every copy shows the same moment", () => {
  const thread = fake('faq-thread', 81_234);
  const origin = fake('faq-origin', 4_000);
  const lift = fake('to-top-loop', 9_000);
  const root = { getAnimations: (o?: { subtree?: boolean }) => (o?.subtree ? [thread, origin, lift] : []) };
  onPageClock(root as unknown as Element);
  assert.equal(thread.startTime, 0);
  assert.equal(origin.startTime, 0);
  // the back-to-top orb's own one-off lift is left alone
  assert.equal(lift.startTime, 9_000);
});

test('a browser without the animations list is left as it is', () => {
  assert.doesNotThrow(() => onPageClock({} as Element));
});

test('every live logo pins its loop when drawn, and again whenever the browser restarts it', () => {
  const ui = readFileSync('src/components/ui.tsx', 'utf8');
  const mark = ui.slice(ui.indexOf('export function ThreadMark'));
  assert.match(mark, /useLayoutEffect\(\(\) => \{\s*if \(ref\.current\) onPageClock\(ref\.current\);\s*\}, \[\]\);/);
  assert.match(mark, /onAnimationStart=\{\(e\) => onPageClock\(e\.currentTarget\)\}/);
  assert.match(mark, /<svg ref=\{ref\}/);
});
