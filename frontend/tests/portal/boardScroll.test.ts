import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hasOverflow } from '../../src/portal/scrollBox';

// Owner, 2026-10-30: scrolling the portal with the cursor on the task board lagged. The whole board carried
// data-lenis-prevent, so the site's smooth scroll let go of every wheel over it even when the board had nothing to
// scroll: measured, the page jumped 100 px then stood still for 6 frames per wheel tick (46 frozen frames in one
// scroll) instead of gliding. The board now keeps the wheel only while its tasks overflow it.

test('a box overflows only when its content is taller than it, by more than rounding', () => {
  assert.equal(hasOverflow({ scrollHeight: 107, clientHeight: 107 }), false);
  assert.equal(hasOverflow({ scrollHeight: 108, clientHeight: 107 }), false, 'a sub-pixel rounding difference is not overflow');
  assert.equal(hasOverflow({ scrollHeight: 300, clientHeight: 107 }), true);
});

test('the task board takes the wheel only while it has something to scroll', () => {
  const dash = readFileSync('src/portal/pages/Dashboard.tsx', 'utf8');
  const at = dash.indexOf('className="p-card p-board"');
  assert.notEqual(at, -1, 'board not found');
  const tag = dash.slice(dash.lastIndexOf('<section', at), dash.indexOf('>', at) + 1);
  assert.match(tag, /data-lenis-prevent=\{boardScrolls \|\| undefined\}/);
  assert.match(tag, /ref=\{boardRef\}/);
  assert.match(dash, /const boardScrolls = useScrollBox\(boardRef\);/);
});
