import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  attendanceFailedMessage,
  correctionBody,
  correctionProblem,
  formatMinutes,
  indiaClock,
  officeNow,
  spentMs,
  toDayOverview,
  toMyAttendance,
  toPersonHistory,
} from '../../src/portal/attendance';
import { ApiError } from '../../src/portal/api';
import { helpGroups } from '../../src/portal/helpTopics';

// What the local backend sends (controllers/attendanceController.js)
const at = (day: string, hhmm: string) => new Date(`${day}T${hhmm}:00+05:30`).toISOString();
const ms = (day: string, hhmm: string) => Date.parse(at(day, hhmm));
const visit = (id: string, day: string, from: string, to: string | null, extra = {}) => ({
  id,
  inAt: at(day, from),
  outAt: to ? at(day, to) : null,
  noCheckOut: false,
  corrections: [],
  ...extra,
});
const correction = {
  at: at('2026-10-24', '10:00'),
  byName: 'Test Admin',
  reason: 'Forgot to check out',
  from: { inAt: at('2026-10-23', '18:00'), outAt: '2026-10-23T18:29:59.999Z' },
  to: { inAt: at('2026-10-23', '09:00'), outAt: at('2026-10-23', '17:30') },
};

test('my attendance becomes days of visits with times as numbers', () => {
  const mine = toMyAttendance({
    today: '2026-10-24',
    inNow: true,
    days: [
      { day: '2026-10-24', minutes: 75, noCheckOut: false, visits: [visit('v1', '2026-10-24', '09:00', '10:00'), visit('v2', '2026-10-24', '11:00', null)] },
      { day: '2026-10-23', minutes: 510, noCheckOut: true, visits: [visit('v0', '2026-10-23', '09:00', '17:30', { noCheckOut: true, corrections: [correction] })] },
    ],
  });
  assert.equal(mine.today, '2026-10-24');
  assert.equal(mine.inNow, true);
  assert.deepEqual(mine.days.map((d) => [d.day, d.minutes, d.noCheckOut]), [['2026-10-24', 75, false], ['2026-10-23', 510, true]]);
  assert.deepEqual(mine.days[0].visits[1], { id: 'v2', inAt: ms('2026-10-24', '11:00'), outAt: null, noCheckOut: false, idle: [], corrections: [] });
  const [c] = mine.days[1].visits[0].corrections;
  assert.equal(c.byName, 'Test Admin');
  assert.equal(c.reason, 'Forgot to check out');
  assert.equal(c.to.outAt, ms('2026-10-23', '17:30'));
});

test('a broken visit is left out; an answer that is not attendance is an error', () => {
  const mine = toMyAttendance({
    today: '2026-10-24',
    inNow: false,
    days: [
      {
        day: '2026-10-24',
        minutes: 60,
        visits: [
          visit('v1', '2026-10-24', '09:00', '10:00'),
          { id: 'v2', inAt: 'soon' },
          null,
          { inAt: at('2026-10-24', '11:00') },
          { ...visit('v3', '2026-10-24', '11:00', '12:00'), id: '' },
          { ...visit('v4', '2026-10-24', '12:00', null), inAt: 'soon' },
          { ...visit('v5', '2026-10-24', '13:00', '14:00'), outAt: 'later' },
        ],
      },
    ],
  });
  assert.deepEqual(mine.days[0].visits.map((v) => v.id), ['v1']);
  // only a real true means "in now"
  for (const inNow of ['yes', 1, null]) assert.equal(toMyAttendance({ today: '2026-10-24', inNow, days: [] }).inNow, false, String(inNow));
  for (const raw of [null, 'oops', [], { today: 'yesterday', days: [] }, { today: '2026-10-24', days: 'none' }]) {
    assert.throws(() => toMyAttendance(raw), (e: unknown) => e instanceof ApiError && e.kind === 'unavailable', JSON.stringify(raw));
  }
});

test('a day for managers lists everyone, with who is in and who may be corrected', () => {
  const day = toDayOverview({
    day: '2026-10-24',
    inNow: 1,
    people: [
      { id: 'p1', name: 'Asha Rao', employeeId: 'BT-0001', role: 'Employee', canCorrect: true, inNow: true, minutes: 40, firstIn: at('2026-10-24', '09:00'), lastOut: null, noCheckOut: false, visits: [visit('v1', '2026-10-24', '09:00', null)] },
      { id: 'p2', name: 'Kabir Das', employeeId: 'BT-0002', role: 'Intern', canCorrect: 'yes', inNow: false, minutes: 0, firstIn: null, lastOut: null, noCheckOut: false, visits: [] },
      { id: '', name: 'Broken' },
    ],
  });
  assert.equal(day.inNow, 1);
  assert.deepEqual(day.people.map((p) => [p.name, p.inNow, p.canCorrect, p.firstIn]), [
    ['Asha Rao', true, true, ms('2026-10-24', '09:00')],
    ['Kabir Das', false, false, null],
  ]);
  assert.throws(() => toDayOverview({ day: '2026-10-24', people: null }), ApiError);
});

test("one person's history keeps who they are and whether the viewer may correct them", () => {
  const history = toPersonHistory({
    person: { id: 'p1', name: 'Asha Rao', employeeId: 'BT-0001', role: 'Employee', canCorrect: false },
    from: '2026-09-24',
    to: '2026-10-24',
    days: [{ day: '2026-10-23', minutes: 480, noCheckOut: false, visits: [visit('v0', '2026-10-23', '09:00', '17:00')] }],
  });
  assert.deepEqual(history.person, { id: 'p1', name: 'Asha Rao', employeeId: 'BT-0001', role: 'Employee', canCorrect: false });
  assert.equal(history.days[0].minutes, 480);
  assert.throws(() => toPersonHistory({ person: null, days: [] }), ApiError);
});

test('minutes read as hours and minutes', () => {
  assert.equal(formatMinutes(0), '0m');
  assert.equal(formatMinutes(45), '45m');
  assert.equal(formatMinutes(60), '1h 0m');
  assert.equal(formatMinutes(150), '2h 30m');
  assert.equal(formatMinutes(200), '3h 20m');
});

test("the card's running time adds every visit today and counts the open one up to now", () => {
  const now = ms('2026-10-24', '12:30');
  const visits = toMyAttendance({ today: '2026-10-24', inNow: true, days: [{ day: '2026-10-24', minutes: 0, visits: [visit('v1', '2026-10-24', '09:00', '10:00'), visit('v2', '2026-10-24', '11:00', null)] }] }).days[0].visits;
  assert.equal(spentMs(visits, now), 150 * 60000);
  assert.equal(spentMs([], now), 0);
});

test('the card knows whether you are in, since when, or when you left', () => {
  const mine = (visits: unknown[]) => toMyAttendance({ today: '2026-10-24', inNow: false, days: visits.length ? [{ day: '2026-10-24', minutes: 0, visits }] : [] });
  assert.deepEqual(officeNow(mine([])), { inside: false, visited: false });
  assert.deepEqual(officeNow(mine([visit('v1', '2026-10-24', '09:00', '10:00'), visit('v2', '2026-10-24', '11:00', null)])), { inside: true, visited: true, since: ms('2026-10-24', '11:00') });
  assert.deepEqual(officeNow(mine([visit('v1', '2026-10-24', '09:00', '10:00'), visit('v2', '2026-10-24', '11:00', '12:15')])), { inside: false, visited: true, leftAt: ms('2026-10-24', '12:15') });
  // only today's visits count, whatever else came back
  const older = toMyAttendance({ today: '2026-10-24', inNow: false, days: [{ day: '2026-10-23', minutes: 60, visits: [visit('v0', '2026-10-23', '09:00', '10:00')] }] });
  assert.deepEqual(officeNow(older), { inside: false, visited: false });
});

test("times are shown and entered in India time, whatever the browser's time zone", () => {
  assert.equal(indiaClock(ms('2026-10-24', '09:05')), '09:05');
  assert.equal(indiaClock(ms('2026-10-24', '23:59')), '23:59');
  assert.equal(indiaClock(Date.parse('2026-10-23T18:29:59.999Z')), '23:59');
});

test('a correction needs a reason and times that make sense, checked before anything is sent', () => {
  const now = ms('2026-10-24', '12:00');
  const draft = { day: '2026-10-23', inTime: '09:00', outTime: '17:30', reason: ' Forgot to check out ' };
  assert.equal(correctionProblem(draft, now), null);
  assert.match(correctionProblem({ ...draft, reason: '  ' }, now)!, /why/i);
  assert.match(correctionProblem({ ...draft, reason: 'x'.repeat(301) }, now)!, /300/);
  assert.match(correctionProblem({ ...draft, inTime: '' }, now)!, /both times/i);
  assert.match(correctionProblem({ ...draft, outTime: '25:00' }, now)!, /both times/i);
  assert.match(correctionProblem({ ...draft, outTime: '08:00' }, now)!, /after/i);
  assert.match(correctionProblem({ ...draft, day: '2026-10-24', outTime: '13:00' }, now)!, /future/i);
  assert.deepEqual(correctionBody(draft), { inAt: at('2026-10-23', '09:00'), outAt: at('2026-10-23', '17:30'), reason: 'Forgot to check out' });
});

test("a refusal shows the backend's own words; other failures a plain explanation", () => {
  assert.equal(attendanceFailedMessage(new ApiError('conflict', "You're already checked in.")), "You're already checked in.");
  assert.equal(attendanceFailedMessage(new ApiError('bad-request', 'Both times must be on 2026-10-23 (India time).')), 'Both times must be on 2026-10-23 (India time).');
  assert.match(attendanceFailedMessage(new ApiError('forbidden', 'forbidden')), /role/i);
  assert.match(attendanceFailedMessage(new ApiError('unavailable')), /nothing was saved/i);
  assert.match(attendanceFailedMessage(new ApiError('busy')), /wait a few minutes/i);
});

test('Help says check-ins are saved, and explains attendance to everyone and corrections to admins', () => {
  const saves = (role: 'admin' | 'employee') => helpGroups(true, role, 'which pages save')[0].topics[0].a;
  assert.ok(!/stay in this browser/.test(saves('employee')));
  assert.match(saves('employee'), /e-Office check-ins/);
  const asked = (role: 'admin' | 'subadmin' | 'employee') => helpGroups(true, role, '').flatMap((g) => g.topics.map((t) => t.q));
  for (const role of ['admin', 'subadmin', 'employee'] as const) assert.ok(asked(role).includes('How does e-Office attendance work?'), role);
  assert.ok(asked('admin').includes('How do I correct someone’s attendance?'));
  assert.ok(!asked('subadmin').includes('How do I correct someone’s attendance?'));
  assert.ok(!asked('employee').includes('How do I correct someone’s attendance?'));
});
