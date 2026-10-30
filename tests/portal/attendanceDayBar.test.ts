import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayBar, historySummary, visitIdleSeconds, type AttendanceDay, type Visit } from '../../src/portal/attendance';

// A day's bar runs 10:00–20:30 India time (630 minutes), wider only when a visit falls outside it
const ms = (hhmm: string, day = '2026-10-26') => Date.parse(`${day}T${hhmm}:00+05:30`);
const visit = (inAt: string, outAt: string | null, idle: [string, string][] = []): Visit => ({
  id: inAt,
  inAt: ms(inAt),
  outAt: outAt === null ? null : ms(outAt),
  noCheckOut: false,
  idle: idle.map(([from, to]) => ({ from: ms(from), to: ms(to), seconds: (ms(to) - ms(from)) / 1000, ongoing: false })),
  corrections: [],
});
const dayOf = (visits: Visit[], extra: Partial<AttendanceDay> = {}): AttendanceDay => ({
  day: '2026-10-26',
  minutes: 0,
  seconds: 0,
  idleSeconds: 0,
  noCheckOut: false,
  visits,
  ...extra,
});
const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`);

test('a visit inside working hours sits on the 10:00–20:30 bar by its share of it', () => {
  const bar = dayBar(dayOf([visit('11:00', '12:03')]), ms('23:00'));
  assert.equal(bar.start, ms('10:00'));
  assert.equal(bar.end, ms('20:30'));
  assert.equal(bar.visits.length, 1);
  close(bar.visits[0].left, 60 / 630);
  close(bar.visits[0].width, 63 / 630);
  assert.deepEqual(bar.idle, []);
});

test('the bar widens to take in a visit before 10:00 or after 20:30', () => {
  const bar = dayBar(dayOf([visit('09:00', '09:30'), visit('21:00', '23:59')]), ms('23:59'));
  assert.equal(bar.start, ms('09:00'));
  assert.equal(bar.end, ms('23:59'));
  close(bar.visits[0].left, 0);
  close(bar.visits[1].left + bar.visits[1].width, 1);
});

test('a visit still going reaches up to now, and its inactive stretches sit on top of it', () => {
  const bar = dayBar(dayOf([visit('10:00', null, [['10:30', '10:51']])]), ms('11:03'));
  close(bar.visits[0].width, 63 / 630);
  assert.equal(bar.idle.length, 1);
  close(bar.idle[0].left, 30 / 630);
  close(bar.idle[0].width, 21 / 630);
});

test('a visit’s inactive time adds up its stretches', () => {
  assert.equal(visitIdleSeconds(visit('10:00', '11:00', [['10:10', '10:11'], ['10:20', '10:20']])), 60);
  assert.equal(visitIdleSeconds(visit('10:00', '11:00')), 0);
});

test('the history summary counts days in, time in, inactive time and the average per day in', () => {
  const days = [dayOf([visit('10:00', '11:00')], { seconds: 3600, idleSeconds: 120 }), dayOf([visit('10:00', '12:00')], { day: '2026-10-25', seconds: 7200, idleSeconds: 0 })];
  assert.deepEqual(historySummary(days), { daysIn: 2, seconds: 10800, idleSeconds: 120, perDay: 5400 });
  // a day without a visit isn't a day in; nothing in gives a 0 average, never NaN
  assert.deepEqual(historySummary([dayOf([], { seconds: 0 })]), { daysIn: 0, seconds: 0, idleSeconds: 0, perDay: 0 });
});
