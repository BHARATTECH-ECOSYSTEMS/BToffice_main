import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IDLE_AFTER_MS, shouldDraw } from '../../src/gl/idlePace';

// Roadmap step 18, Part 2 (owner's 1A–4A): the speed fixes, measured with Chrome traces before and after.

const styles = (name: string) => readFileSync(join('src/styles', name), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
/** Each CSS rule as [selector list, declarations], nested at-rules included. */
const rules = (css: string) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => [m[1].replace(/\s+/g, ' ').trim(), m[2]] as const);

// the login dialog sits outside the page's sections, so nothing marks it off screen
const OUTSIDE_SECTIONS = new Set(['login.css']);

test('off screen, every endless animation in a section holds still, and nothing else is restyled', () => {
  const base = styles('base.css');
  const pausing = rules(base).filter(([sel, decl]) => sel.includes('[data-offscreen]') && /animation-play-state:\s*paused/.test(decl));
  const paused = new Set(pausing.flatMap(([sel]) => sel.split(',').map((s) => s.trim())));
  // the old rule restyled every element of a section each time it crossed the screen's edge
  assert.equal([...paused].some((s) => /\[data-offscreen\]\s*\*/.test(s)), false, 'the catch-all [data-offscreen] * is back');
  const endless = readdirSync('src/styles')
    .filter((f) => f.endsWith('.css') && !OUTSIDE_SECTIONS.has(f))
    .flatMap((f) => rules(styles(f)).filter(([, decl]) => /animation(-iteration-count)?\s*:[^;]*\binfinite\b/.test(decl)).flatMap(([sel]) => sel.split(',').map((s) => `${f}: ${s.trim()}`)));
  assert.ok(endless.length > 20, `only ${endless.length} endless animations found: the scan is broken`);
  const missing = endless.filter((e) => !paused.has(`[data-offscreen] ${e.split(': ')[1]}`));
  assert.deepEqual(missing, []);
});


/** Which of `frames` (rAF timestamps) draw, with input last at `input`. */
const drawn = (frames: number[], input: number, busy = () => false) => {
  let last = -Infinity;
  return frames.filter((t) => (shouldDraw(t, input, last, busy()) ? ((last = t), true) : false));
};
const at60Hz = (from: number, n: number) => Array.from({ length: n }, (_, i) => from + i * (1000 / 60));

test('the hero draws every frame while the page is in use', () => {
  const frames = at60Hz(10_000, 60);
  assert.equal(drawn(frames, 9_500).length, 60);
});

test('two seconds after the last input, the hero draws 30 frames a second', () => {
  const frames = at60Hz(10_000 + IDLE_AFTER_MS, 60);
  assert.equal(drawn(frames, 10_000).length, 30);
  // on a 120 Hz screen too
  const fast = Array.from({ length: 120 }, (_, i) => 20_000 + i * (1000 / 120));
  assert.equal(drawn(fast, 0).length, 30);
});

test('a transition keeps the full rate even without input', () => {
  assert.equal(drawn(at60Hz(50_000, 60), 0, () => true).length, 60);
});

test("the hero's own slow-machine check doesn't run while it draws at 30 on purpose", () => {
  const studio = readFileSync('src/gl/Studio.ts', 'utf8');
  assert.match(studio, /shouldDraw\(/);
  assert.match(studio, /if \(!pacing\) this\.adapt\(dt\)/);
});
