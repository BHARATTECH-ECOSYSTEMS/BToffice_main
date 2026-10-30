import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rangeProblem, withRange } from '../../src/portal/attendance';

// Owner's 4A (2026-10-25): attendance history for any dates, not only the last 30 days. The backend takes at most
// 400 days at a time (attendanceController RANGE_MAX_DAYS).

const TODAY = '2026-10-25';

test('a range from an earlier day up to today is fine, as is a single day', () => {
  assert.equal(rangeProblem({ from: '2026-09-25', to: TODAY }, TODAY), null);
  assert.equal(rangeProblem({ from: '2026-10-01', to: '2026-10-01' }, TODAY), null);
  assert.equal(rangeProblem({ from: '2025-09-20', to: TODAY }, TODAY), null);
});

test('a range that is empty, backwards, in the future or too long is explained', () => {
  assert.match(rangeProblem({ from: '', to: TODAY }, TODAY) ?? '', /both/i);
  assert.match(rangeProblem({ from: '2026-10-10', to: '2026-10-01' }, TODAY) ?? '', /before/i);
  assert.match(rangeProblem({ from: '2026-10-20', to: '2026-10-26' }, TODAY) ?? '', /today/i);
  assert.match(rangeProblem({ from: '2025-09-19', to: TODAY }, TODAY) ?? '', /400 days/);
  assert.match(rangeProblem({ from: '2026-13-01', to: TODAY }, TODAY) ?? '', /both/i);
  assert.match(rangeProblem({ from: '2026-02-31', to: TODAY }, TODAY) ?? '', /both/i);
});

test('the dates go to the backend in the address', () => {
  assert.equal(withRange('/attendance/me', { from: '2026-09-01', to: '2026-10-25' }), '/attendance/me?from=2026-09-01&to=2026-10-25');
  assert.equal(withRange('/attendance/people/abc', undefined), '/attendance/people/abc');
});
