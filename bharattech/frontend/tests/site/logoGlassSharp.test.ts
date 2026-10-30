import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The sign-in pop-up's glass logo (LogoGlass, a "bare" Studio) looked stair-stepped in dark mode: its edge and threads
// are drawn per pixel by the sculpture shader, so the browser can't smooth them, and the canvas was drawn at 1.25× at
// most, then lowered to 0.6× by the speed watcher. Small as it is, it now draws at twice the screen's pixels and keeps
// them (owner, 2026-10-30). The full-screen home film keeps its own limits.
const studio = readFileSync('src/gl/Studio.ts', 'utf8');

test('the pop-up logo draws at twice the screen resolution, the home film as before', () => {
  assert.match(studio, /const SHARP_RATIO = 2;/);
  assert.match(studio, /this\.renderer\.setPixelRatio\(this\.bare \? Math\.min\(window\.devicePixelRatio \* SHARP_RATIO, 4\) : Math\.min\(window\.devicePixelRatio, lite \? 0\.85 : 1\.25\)\);/);
});

test('the speed watcher never lowers the pop-up logo', () => {
  const adapt = studio.slice(studio.indexOf('private adapt(dt: number) {'));
  assert.match(adapt, /^private adapt\(dt: number\) \{\s*\/\/[^\n]*\n\s*if \(this\.bare\) return;/);
});
