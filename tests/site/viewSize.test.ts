import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Group 2 of the smoothness pass (owner, 2026-10-30): on a phone or tablet, reading window.innerHeight / innerWidth
// right after any style change makes the browser lay the page out on the spot (measured: 60 reads after a write cost
// 10–17 ms on a phone-sized page, 0.2 ms on desktop). The scroll and frame code read them every frame, so phones laid
// the page out twice a frame. The size is now kept by trackBox and refreshed only when the window resizes.

const listeners: Record<string, (() => void)[]> = {};
const fakeWindow = {
  innerWidth: 390,
  innerHeight: 844,
  scrollY: 0,
  addEventListener: (type: string, fn: () => void) => (listeners[type] ??= []).push(fn),
};
(globalThis as Record<string, unknown>).window = fakeWindow;
const { viewHeight, viewWidth } = await import('../../src/components/trackBox');

test('the window size is read once, then only again on resize', () => {
  assert.equal(viewHeight(), 844);
  assert.equal(viewWidth(), 390);
  // the address bar hiding: the size changes, but nothing has told the page yet
  fakeWindow.innerHeight = 900;
  assert.equal(viewHeight(), 844, 'no read between resizes');
  listeners.resize.forEach((fn) => fn());
  assert.equal(viewHeight(), 900);
  fakeWindow.innerWidth = 844;
  listeners.resize.forEach((fn) => fn());
  assert.equal(viewWidth(), 844);
});

// the per-frame and per-scroll code, by file: none of it may read the window's size directly
const FRAME_CODE: [string, string, string][] = [
  ['src/gl/Scene.tsx', 'function perPx()', 'export const isCompact'],
  ['src/gl/Scene.tsx', 'export function poseAt(', ' s };'],
  ['src/gl/Scene.tsx', 'const pick = (force = false) => {', 'const loop = '],
  ['src/gl/Engine.ts', 'const dustOn =', 'du.uFromC.value'],
  ['src/sections/Story.tsx', 'const measure = () => {', 'const onScroll = '],
  ['src/sections/Capabilities.tsx', 'const run = Math.max(1, box.height', ';'],
  ['src/sections/Journal.tsx', 'const run = Math.max(1, box.height', ';'],
  ['src/sections/Network.tsx', 'const progressOf = ', ';'],
  ['src/sections/Network.tsx', 'pose: poseAt(r.stageX, Math.max(', 'GLOBE_SIZE'],
  ['src/sections/Network.tsx', "trackEl.style.height = riding", ';'],
  ['src/components/HowWeWorkPipeline.tsx', 'const measure = () => {', 'const onScroll = '],
  ['src/components/DomainGrid.tsx', 'const reached = ', ';'],
];

for (const [file, from, to] of FRAME_CODE) {
  test(`${file}: "${from.trim()}" uses the kept size`, () => {
    const src = readFileSync(file, 'utf8');
    const at = src.indexOf(from);
    assert.notEqual(at, -1, 'code not found');
    const end = src.indexOf(to, at + from.length);
    assert.notEqual(end, -1, 'end of the code not found');
    const part = src.slice(at, end + to.length);
    assert.doesNotMatch(part, /window\.inner(Height|Width)/);
  });
}
