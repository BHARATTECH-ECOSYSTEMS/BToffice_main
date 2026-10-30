import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { turns } from '../../src/portal/newestReply';

// Review 2026-10-26 W7 (owner's 5A): Attendance's day and range views (and the events calendar) showed whichever
// reply came back last, so after a quick change of date a slow reply for the old date could show under the new one.
// Now each load takes a turn, and only the newest turn's reply is shown.

test('a newer load makes the older one stale; the newest stays current', () => {
  const next = turns();
  const first = next();
  assert.equal(first(), true);
  const second = next();
  assert.equal(first(), false, 'the older reply is not shown');
  assert.equal(second(), true);
});

test('each hook keeps its own turns', () => {
  const a = turns();
  const b = turns();
  const fromA = a();
  b();
  assert.equal(fromA(), true);
});

test("attendance's loader shows a reply or an error only while its turn is the newest", () => {
  const src = readFileSync('src/portal/attendance.ts', 'utf8');
  const loader = src.slice(src.indexOf('function useLoaded'), src.indexOf('export type DayRange'));
  assert.match(loader, /const \[nextTurn\] = useState\(turns\);/);
  assert.match(loader, /const current = nextTurn\(\);/);
  assert.match(loader, /if \(current\(\)\) setState\(\{ kind: 'ready', value \}\);/);
  assert.match(loader, /if \(current\(\)\) setState\(\{ kind: 'error', error: asApiError\(error\) \}\);/);
});

test("the events calendar's loader does the same", () => {
  const src = readFileSync('src/portal/events.ts', 'utf8');
  const loader = src.slice(src.indexOf('export function useEvents'), src.indexOf('const act = useCallback'));
  assert.match(loader, /const \[nextTurn\] = useState\(turns\);/);
  assert.match(loader, /const current = nextTurn\(\);/);
  assert.match(loader, /if \(current\(\)\) setState\(\{ kind: 'ready', events \}\);/);
  assert.match(loader, /if \(current\(\)\) setState\(\{ kind: 'error', error: asApiError\(error\) \}\);/);
});
