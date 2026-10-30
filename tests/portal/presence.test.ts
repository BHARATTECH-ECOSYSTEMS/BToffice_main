import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PRESENCE_LABEL, readPresence, shouldSignal, SIGNAL_EVERY_MS, USE_COUNTS_MS, OUT_RECHECK_MS } from '../../src/portal/presence';
import { toDirectory } from '../../src/portal/people';
import { toDayOverview, toMyAttendance } from '../../src/portal/attendance';
import { helpGroups } from '../../src/portal/helpTopics';

const source = (path: string) => readFileSync(path, 'utf8');

test('the four dots the backend sends are read, anything else is no dot', () => {
  for (const p of ['active', 'inactive', 'out', 'off'] as const) assert.equal(readPresence(p), p);
  for (const junk of ['Active', 'away', '', null, undefined, 3, {}]) assert.equal(readPresence(junk), undefined);
  assert.deepEqual(PRESENCE_LABEL, { active: 'Active', inactive: 'Inactive', out: 'Not in e-Office', off: 'Off hours' });
});

test('the directory, my attendance and the day overview carry the dot', () => {
  const [asha, kabir] = toDirectory([
    { id: '1', email: 'asha@example.test', name: 'Asha', role: 'Employee', status: 'active', presence: 'inactive' },
    { id: '2', email: 'kabir@example.test', name: 'Kabir', role: 'Intern', status: 'active' },
  ]);
  assert.equal(asha.presence, 'inactive');
  assert.equal(kabir.presence, undefined);
  // the account status is a different thing and stays as it was
  assert.equal(asha.status, 'active');

  assert.equal(toMyAttendance({ today: '2026-10-26', inNow: true, presence: 'active', days: [] }).presence, 'active');
  assert.equal(toMyAttendance({ today: '2026-10-26', inNow: false, days: [] }).presence, undefined);

  const day = toDayOverview({
    day: '2026-10-26',
    inNow: 1,
    people: [
      { id: '1', name: 'Asha', presence: 'active', visits: [] },
      { id: '2', name: 'Kabir', presence: null, visits: [] },
    ],
  });
  assert.deepEqual(day.people.map((p) => p.presence), ['active', undefined]);
});

test('a signal goes while the laptop is in use, at most once a minute', () => {
  const now = 1_000_000_000;
  const base = { now, lastSent: now - SIGNAL_EVERY_MS, lastUse: now - 1000, idle: null, mine: 'active' as const };
  assert.equal(shouldSignal(base), true);
  assert.equal(shouldSignal({ ...base, lastSent: now - SIGNAL_EVERY_MS + 1 }), false);
  // no use for a while: nothing goes, and the backend turns the dot red after five minutes
  assert.equal(shouldSignal({ ...base, lastUse: now - USE_COUNTS_MS }), false);
  assert.equal(shouldSignal({ ...base, lastUse: now - USE_COUNTS_MS + 1 }), true);
  // the first signal of the page goes at once
  assert.equal(shouldSignal({ ...base, lastSent: 0 }), true);
});

test('with the browser watching the whole laptop, its answer counts too', () => {
  const now = 1_000_000_000;
  const base = { now, lastSent: 0, lastUse: 0, mine: 'active' as const };
  assert.equal(shouldSignal({ ...base, idle: { userState: 'active', screenState: 'unlocked' } }), true);
  assert.equal(shouldSignal({ ...base, idle: { userState: 'idle', screenState: 'unlocked' } }), false);
  assert.equal(shouldSignal({ ...base, idle: { userState: 'active', screenState: 'locked' } }), false);
  // use inside the portal still counts when the browser's answer lags
  assert.equal(shouldSignal({ ...base, lastUse: now, idle: { userState: 'idle', screenState: 'unlocked' } }), true);
});

test('someone not in the e-Office sends nothing, apart from a check every few minutes', () => {
  const now = 1_000_000_000;
  const base = { now, lastUse: now, idle: null, mine: 'out' as const };
  assert.equal(shouldSignal({ ...base, lastSent: now - SIGNAL_EVERY_MS }), false);
  assert.equal(shouldSignal({ ...base, lastSent: now - OUT_RECHECK_MS }), true);
  // until the backend has said, the first signal finds out
  assert.equal(shouldSignal({ ...base, mine: undefined, lastSent: 0 }), true);
});

test('the signal runs on every portal page, and joining asks the browser to watch the whole laptop', () => {
  assert.match(source('src/portal/PortalLayout.tsx'), /useActivitySignal\(\)/);
  const dashboard = source('src/portal/pages/Dashboard.tsx');
  // asked inside the click, before anything waits, or the browser refuses to ask
  assert.match(dashboard, /const enter = async \(\) => \{\s*askToWatchActivity\(\);/);
});

test('the live dot shows on the profile card, the team table, People and the Attendance day', () => {
  const dashboard = source('src/portal/pages/Dashboard.tsx');
  assert.match(dashboard, /function ConnectedProfileCard[\s\S]*?<PresenceDot/);
  assert.match(source('src/portal/pages/DashboardConnected.tsx'), /<PresenceDot presence=\{p\.presence\}/);
  assert.match(source('src/portal/pages/PeopleConnected.tsx'), /<PresenceDot presence=\{(p|person)\.presence\}/);
  assert.match(source('src/portal/pages/Attendance.tsx'), /<PresenceDot presence=\{r\.presence\}/);
});

test('today on Attendance has a labelled Activity column that refreshes itself', () => {
  const page = source('src/portal/pages/Attendance.tsx');
  assert.match(page, /\{isToday && <th scope="col">Activity<\/th>\}/);
  assert.match(page, /<PresenceDot presence=\{r\.presence\} label \/>/);
  assert.match(page, /if \(!isToday\) return;[\s\S]{0,200}void reload\(\)[\s\S]{0,80}SIGNAL_EVERY_MS/);
  // a signal every 10 seconds keeps up with a dot that turns red after 20
  assert.equal(SIGNAL_EVERY_MS, 10_000);
  assert.equal(USE_COUNTS_MS, 10_000);
});

test('Help explains the dots to connected staff', () => {
  const topics = helpGroups(true, 'employee', '').flatMap((g) => g.topics);
  const dots = topics.find((t) => /dot/i.test(t.q));
  assert.ok(dots, 'a Help answer about the dots');
  assert.match(dots!.a, /green/i);
  assert.match(dots!.a, /red/i);
  assert.match(dots!.a, /grey/i);
  assert.match(dots!.a, /20 seconds/i);
  assert.match(dots!.a, /10:00 am.*8:30 pm/i);
});
