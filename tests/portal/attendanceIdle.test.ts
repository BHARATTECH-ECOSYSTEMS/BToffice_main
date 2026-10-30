import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formatDuration, indiaTimeSec, toDayOverview, toMyAttendance, toPersonHistory } from '../../src/portal/attendance';

// What the local backend sends (controllers/attendanceController.js)
const at = (hhmmss: string) => new Date(`2026-10-26T${hhmmss}+05:30`).toISOString();
const ms = (hhmmss: string) => Date.parse(at(hhmmss));
const visit = {
  id: 'v1',
  inAt: at('11:00:00'),
  outAt: at('11:01:10'),
  noCheckOut: false,
  corrections: [],
  idle: [
    { from: at('11:00:00'), to: at('11:00:30'), seconds: 30 },
    { from: at('11:00:35'), to: at('11:01:10'), seconds: 35, ongoing: true },
  ],
};
const day = { day: '2026-10-26', minutes: 1, seconds: 70, idleSeconds: 65, noCheckOut: false, visits: [visit] };

test('a visit carries its inactive stretches, and a day its seconds in and inactive', () => {
  const [d] = toMyAttendance({ today: '2026-10-26', inNow: false, days: [day] }).days;
  assert.equal(d.seconds, 70);
  assert.equal(d.idleSeconds, 65);
  assert.deepEqual(d.visits[0].idle, [
    { from: ms('11:00:00'), to: ms('11:00:30'), seconds: 30, ongoing: false },
    { from: ms('11:00:35'), to: ms('11:01:10'), seconds: 35, ongoing: true },
  ]);
  assert.equal(toPersonHistory({ person: { id: 'p1', name: 'Asha' }, days: [day] }).days[0].idleSeconds, 65);
  const [row] = toDayOverview({ day: '2026-10-26', inNow: 0, people: [{ id: 'p1', name: 'Asha', minutes: 1, seconds: 70, idleSeconds: 65, visits: [visit] }] }).people;
  assert.equal(row.seconds, 70);
  assert.equal(row.idleSeconds, 65);
});

test('an older backend answer without seconds still adds up, from the minutes', () => {
  const [d] = toMyAttendance({ today: '2026-10-26', inNow: false, days: [{ day: '2026-10-26', minutes: 3, visits: [{ id: 'v', inAt: at('10:00:00'), outAt: at('10:03:00') }] }] }).days;
  assert.equal(d.seconds, 180);
  assert.equal(d.idleSeconds, 0);
  assert.deepEqual(d.visits[0].idle, []);
});

test('times and lengths show seconds', () => {
  assert.equal(formatDuration(0), '0s');
  assert.equal(formatDuration(45), '45s');
  assert.equal(formatDuration(303), '5m 3s');
  assert.equal(formatDuration(3600), '1h 0m 0s');
  assert.equal(formatDuration(5480), '1h 31m 20s');
  assert.equal(formatDuration(-5), '0s');
  // India's clock whatever the device's (the tests run on UTC)
  assert.match(indiaTimeSec(ms('10:06:15')), /^10:06:15\s?am$/i);
  assert.match(indiaTimeSec(ms('14:05:09')), /^2:05:09\s?pm$/i);
});

test('History lists each inactive stretch with its times and length, and the day’s total', () => {
  const page = readFileSync('src/portal/pages/Attendance.tsx', 'utf8');
  assert.match(page, /v\.idle\.map\(/);
  assert.match(page, /Inactive \{indiaTimeSec\(s\.from\)\} – \{s\.ongoing \? 'now' : indiaTimeSec\(s\.to\)\}/);
  assert.match(page, /formatDuration\(s\.seconds\)/);
  assert.match(page, /d\.idleSeconds > 0/);
  assert.match(page, /formatDuration\(d\.seconds\)/);
  assert.doesNotMatch(page, /indiaTime\(/, 'every time on Attendance shows seconds');
});

test('the e-Office card shows seconds and counts them as they pass', () => {
  const dashboard = readFileSync('src/portal/pages/Dashboard.tsx', 'utf8');
  assert.match(dashboard, /const time = source\.connected \? indiaTimeSec : clockTime;/);
  assert.match(dashboard, /const clockTime = \(t: number\) => new Date\(t\)\.toLocaleTimeString\('en-IN', \{ hour: 'numeric', minute: '2-digit', second: '2-digit' \}\);/);
  assert.match(dashboard, /\{duration\(source\.spent\(now\)\)\}/);
  assert.match(dashboard, /const duration = \(ms: number\) => formatDuration\(Math\.floor\(ms \/ 1000\)\);/);
  assert.match(dashboard, /setInterval\(\(\) => setNow\(Date\.now\(\)\), 1000\)/);
});
