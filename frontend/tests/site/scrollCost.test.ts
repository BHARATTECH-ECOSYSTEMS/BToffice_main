import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { beatUpdates } from '../../src/sections/storyBeats';

// Owner, 2026-10-30: "the whole website should be ultra smooth". A Chrome trace of the home hero found it restyled all
// 8 headlines (and everything in them) on every scroll frame, ~8 ms a pass; only the ones on screen need it.

const BEATS = 8;
const run = (b: number, shown: (boolean | undefined)[]) => beatUpdates(b, BEATS, shown);

test('the hero writes every headline once, then only the ones on screen', () => {
  const shown: (boolean | undefined)[] = [];
  assert.equal(run(0, shown).length, BEATS, 'first frame sets every headline, hidden ones included');
  const mid = run(3.5, shown).map((u) => u.i);
  // beat 3 is fully in; the frame before it set beats 0..2 last time, so only beat 0 (leaving) and 3 change
  assert.ok(mid.includes(3));
  assert.ok(mid.length <= 3, `wrote ${mid.length} headlines mid-film`);
  const again = run(3.6, shown).map((u) => u.i);
  assert.deepEqual(again, [3], 'a hidden headline is left alone while it stays hidden');
});

test('a headline that leaves the screen gets one last write, hidden', () => {
  const shown: (boolean | undefined)[] = [];
  run(3.5, shown);
  const leaving = run(4.5, shown).find((u) => u.i === 3);
  assert.ok(leaving, 'the headline that just left is written once more');
  assert.equal(leaving.visible, false);
  assert.equal(run(4.6, shown).some((u) => u.i === 3), false);
});

test('the values match the film as before', () => {
  const at = (b: number, i: number) => beatUpdates(b, BEATS, [])[i];
  // the first headline rests until the scroll begins; the last stays settled once it arrives
  assert.deepEqual([at(0, 0).d, at(0, 0).v], [0, 1]);
  assert.deepEqual([at(8, 7).d, at(8, 7).v], [0, 1]);
  // a middle one: fully set for most of its beat, out quickly at the edges
  assert.equal(at(3.5, 3).v, 1);
  assert.equal(at(4.2, 3).v, 0);
  assert.equal(at(3.5, 5).d, -1);
});

test('Story uses the helper instead of writing all eight headlines', () => {
  const story = readFileSync('src/sections/Story.tsx', 'utf8');
  assert.match(story, /beatUpdates\(/);
  assert.doesNotMatch(story, /beats\.current\.forEach/);
});
