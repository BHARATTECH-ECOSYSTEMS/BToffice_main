import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { indiaHour, indiaToday } from '../../src/portal/attendance';
import { documentsDeleteOn } from '../../src/portal/data';

// Review 2026-10-26 low list, portal (owner's 6A): Verification's "open N days" counted to today in UTC, the
// dashboard's greeting read the device's clock, and the demo's "today" was UTC, so early on an Indian morning (before
// 05:30) each was a day or a part of the day behind. They all use India's clock now, as attendance always has.

test("India's hour, whatever the device's clock says", () => {
  assert.equal(indiaHour(Date.parse('2026-10-27T03:00:00Z')), 8);
  assert.equal(indiaHour(Date.parse('2026-10-26T19:00:00Z')), 0, '00:30 the next day in India');
  assert.equal(indiaToday(Date.parse('2026-10-26T19:00:00Z')), '2026-10-27');
});

test('Verification counts "open N days" to today in India', () => {
  const src = readFileSync('src/portal/pages/Verification.tsx', 'utf8');
  assert.doesNotMatch(src, /toISOString\(\)\.slice\(0, 10\)/);
  assert.match(src, /request\.decided \?\? indiaToday\(\)/);
  assert.match(src, /v\.decided \?\? indiaToday\(\)/);
});

test("the dashboard greets by India's hour", () => {
  assert.match(readFileSync('src/portal/pages/Dashboard.tsx', 'utf8'), /\{greeting\(indiaHour\(\)\)\}/);
});

test("the demo's today is India's", () => {
  const src = readFileSync('src/portal/store.tsx', 'utf8');
  assert.match(src, /const today = \(\) => indiaToday\(\);/);
});

test('the day ID documents go is counted from the day they left, the same in any time zone', () => {
  // 60 days (ID_RETENTION_DAYS) after 30 June is 29 August, wherever the device is
  assert.equal(documentsDeleteOn('2026-06-30'), '2026-08-29');
});
