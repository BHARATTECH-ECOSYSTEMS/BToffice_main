import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventFailedMessage, toEvents } from '../../src/portal/events';
import { toBellNotes, EMAIL_KINDS } from '../../src/portal/notifications';
import { ApiError } from '../../src/portal/api';

// GET /api/events, as the local backend returns it (controllers/eventController.js view)
const sync = { id: '6ad8bc3dd430c9b545aa2901', title: 'Team sync', kind: 'meeting', date: '2026-10-27', time: '10:00', addedBy: 'Test Admin', canChange: true };

test("the backend's events become what the calendar shows", () => {
  assert.deepEqual(toEvents([sync, { ...sync, id: 'e2', title: 'Office closed', kind: 'holiday', time: '', canChange: false }]), [
    { id: '6ad8bc3dd430c9b545aa2901', title: 'Team sync', kind: 'meeting', date: '2026-10-27', time: '10:00', addedBy: 'Test Admin', canChange: true },
    { id: 'e2', title: 'Office closed', kind: 'holiday', date: '2026-10-27', time: '', addedBy: 'Test Admin', canChange: false },
  ]);
});

test('a broken entry is left out instead of breaking the calendar', () => {
  const rows = toEvents([
    sync,
    { ...sync, id: '' },
    { ...sync, title: '  ' },
    { ...sync, kind: 'party' },
    { ...sync, date: '27/10/2026' },
    { ...sync, time: '10am' },
    null,
    'junk',
  ]);
  assert.deepEqual(rows.map((r) => r.id), ['6ad8bc3dd430c9b545aa2901']);
});

test('canChange is only true when the backend says so', () => {
  for (const canChange of [undefined, 'yes', 1, null]) assert.equal(toEvents([{ ...sync, canChange }])[0].canChange, false, String(canChange));
});

test('an answer that is not a list is an error, not an empty calendar', () => {
  for (const raw of [null, { message: 'hi' }, 'oops']) {
    assert.throws(() => toEvents(raw), (e: unknown) => e instanceof ApiError && e.kind === 'unavailable');
  }
});

test("a refusal shows the backend's own words; other failures a plain explanation", () => {
  assert.equal(eventFailedMessage(new ApiError('bad-request', 'The date has already passed. Pick today or a later day.')), 'The date has already passed. Pick today or a later day.');
  assert.match(eventFailedMessage(new ApiError('forbidden', 'You can only change events you added.')), /only change events you added/);
  assert.match(eventFailedMessage(new ApiError('not-found')), /isn’t on the calendar any more/);
  assert.match(eventFailedMessage(new ApiError('unavailable')), /nothing was changed/);
});

test('event notes show in the bell with the calendar icon, and the Events email switch is offered', () => {
  const { notes } = toBellNotes({ notes: [{ id: 'n1', kind: 'event', title: 'New event: Team sync', detail: 'Meeting · Tue, 27 Oct 2026, 10:00 · By Test Admin', link: '/portal', read: false }], unread: 1 });
  assert.equal(notes.length, 1);
  assert.equal(notes[0].icon, 'calendar');
  assert.ok(EMAIL_KINDS.some((k) => k.id === 'events'));
});
