import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EMAIL_KINDS, timeAgo, toBellNotes } from '../../src/portal/notifications';
import { ApiError } from '../../src/portal/api';

// GET /api/notifications as the local backend returns it
const raw = {
  notes: [
    { id: 'n1', kind: 'task', title: 'New task: Write the onboarding notes', detail: 'From Test Admin · Due 30 Oct 2026', link: '/portal', at: '2026-10-23T09:00:00.000Z', read: false },
    { id: 'n2', kind: 'certificate', title: 'Course Completion issued to you', detail: 'By Test Admin', link: '/portal/certificates', at: '2026-10-20T09:00:00.000Z', read: true },
    { id: 'n3', kind: 'policy', title: 'Policy to review: Leave Policy', detail: '4 pages', link: '/portal/policy', at: '2026-10-19T09:00:00.000Z', read: false },
    { id: 'n4', kind: 'work-handed-in', title: 'Work handed in: Field visit report', detail: 'By Asha Rao', link: '/portal', at: '2026-10-18T09:00:00.000Z', read: false },
    { id: 'n5', kind: 'task-update', title: 'Task changed: Review', detail: 'By Test Admin', link: '/portal', at: '2026-10-17T09:00:00.000Z', read: true },
  ],
  unread: 3,
};

test("the backend's notes become the bell's, with an icon per kind and their read state", () => {
  const { notes, unread } = toBellNotes(raw);
  assert.equal(unread, 3);
  assert.deepEqual(
    notes.map((n) => [n.id, n.icon, n.to, n.read]),
    [
      ['n1', 'clipboard', '/portal', false],
      ['n2', 'award', '/portal/certificates', true],
      ['n3', 'file', '/portal/policy', false],
      ['n4', 'upload', '/portal', false],
      ['n5', 'edit', '/portal', true],
    ],
  );
  assert.equal(notes[0].title, 'New task: Write the onboarding notes');
  assert.equal(notes[0].detail, 'From Test Admin · Due 30 Oct 2026');
  assert.equal(notes[0].at, '2026-10-23T09:00:00.000Z');
});

test('a note that would lead outside the portal, or of a kind the site does not know, is never shown', () => {
  const bad = ['https://evil.example.test', '//evil.example.test', 'javascript:alert(1)', '/portalx', '/login'].map((link, i) => ({ ...raw.notes[0], id: `b${i}`, link }));
  const { notes } = toBellNotes({ notes: [...bad, { ...raw.notes[0], id: 'k', kind: 'mystery' }, raw.notes[1]], unread: 1 });
  assert.deepEqual(
    notes.map((n) => n.id),
    ['n2'],
  );
});

test('an answer that is not the bell is an error, and a broken entry is skipped', () => {
  assert.throws(() => toBellNotes([]), ApiError);
  assert.throws(() => toBellNotes({ notes: 'x' }), ApiError);
  assert.equal(toBellNotes({ notes: [{ kind: 'task' }, raw.notes[0]], unread: 1 }).notes.length, 1);
});

test('an unread count that is missing or nonsense falls back to counting the unread notes', () => {
  assert.equal(toBellNotes({ notes: raw.notes }).unread, 3);
  assert.equal(toBellNotes({ notes: raw.notes, unread: -4 }).unread, 3);
});

test('times read as "just now", minutes, hours, days, then the date', () => {
  const now = Date.parse('2026-10-23T12:00:00.000Z');
  assert.equal(timeAgo('2026-10-23T11:59:40.000Z', now), 'just now');
  assert.equal(timeAgo('2026-10-23T11:55:00.000Z', now), '5 min ago');
  assert.equal(timeAgo('2026-10-23T09:00:00.000Z', now), '3 h ago');
  assert.equal(timeAgo('2026-10-22T11:00:00.000Z', now), 'yesterday');
  assert.equal(timeAgo('2026-10-19T12:00:00.000Z', now), '4 days ago');
  assert.match(timeAgo('2026-09-01T12:00:00.000Z', now), /1 Sept 2026|1 Sep 2026/);
  assert.equal(timeAgo('not a date', now), '');
});

test('connected, every email switch is offered, course updates included', () => {
  assert.deepEqual(
    EMAIL_KINDS.map((k) => k.id),
    ['tasks', 'certificates', 'policies', 'courses', 'events'],
  );
  assert.match(EMAIL_KINDS.find((k) => k.id === 'courses')!.hint, /new course/i);
});

test('a new course note shows in the bell with the course icon and links to the course', () => {
  const { notes } = toBellNotes({ unread: 1, notes: [{ id: 'c1', kind: 'course', title: 'New course: Docker', detail: 'By Test Admin · 3 lectures', link: '/portal/lms/course/6ad8bc3dd430c9b545aa2a01', at: '2026-10-23T09:00:00.000Z', read: false }] });
  assert.equal(notes.length, 1);
  assert.equal(notes[0].icon, 'cap');
  assert.equal(notes[0].to, '/portal/lms/course/6ad8bc3dd430c9b545aa2a01');
});

test("an admin's note about a verification request from another company shows with the shield, opening that request", () => {
  const note = { id: 'n9', kind: 'verification', title: 'Verification request VR-0001: Asha Rao', detail: 'From Acme Hiring Pvt Ltd', link: '/portal/verification/requests?file=6ad8bc3dd430c9b545aa3003', at: '2026-10-24T09:00:00.000Z', read: false };
  const { notes } = toBellNotes({ notes: [note], unread: 1 });
  assert.deepEqual(notes.map((n) => [n.id, n.icon, n.to]), [['n9', 'shield', '/portal/verification/requests?file=6ad8bc3dd430c9b545aa3003']]);
});
