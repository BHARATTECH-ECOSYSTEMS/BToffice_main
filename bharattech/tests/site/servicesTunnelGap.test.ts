import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Owner, 2026-10-30 (screenshot): in the Services hero, "Enterprise Intelligence" and "Developers" overlapped on the
// left wall. The tunnel loops, so the last card is followed by the first; with 19 cards those two land on the same
// wall one step (230) apart, while a card is 280 long along the wall. One empty step at the join keeps them clear.
const scene = readFileSync('src/gl/journeyScene.ts', 'utf8');

test('the tunnel loop has one empty step where the last card meets the first', () => {
  assert.match(scene, /const tunnelLen = \(n \+ 1\) \* TUN_GAP;/);
});

test('so the last and first card, on the same wall, sit two steps apart: more than a card is long', () => {
  const gap = Number(scene.match(/const TUN_GAP = (\d+);/)?.[1]);
  const cardW = Number(scene.match(/const CARD_W = (\d+);/)?.[1]);
  assert.ok(2 * gap > cardW, `${2 * gap} vs ${cardW}`);
  assert.ok(gap < cardW, 'cards one step apart on the same wall would overlap: only the join needs the space');
});
