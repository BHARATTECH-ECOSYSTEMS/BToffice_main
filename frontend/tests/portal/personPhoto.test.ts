import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from '../../src/portal/api';
import { helpGroups } from '../../src/portal/helpTopics';
import { toBellNotes } from '../../src/portal/notifications';
import { personPhotoCalls, personPhotoProblem } from '../../src/portal/photos';
import type { AccountRole } from '../../src/portal/people';

// 2026-10-26, owner's 2-1A, 2-2A and 2-3A: admins change or remove someone's photo in People → Details, by the same
// rule as their other details; the person is told in their bell, without an email.

const ID = '6ad8bc3dd430c9b545aa2844';
const PHOTO = `/api/user/${ID}/photo?v=6ad8bc3dd430c9b545aa3001`;

test('who may change whose photo: the details rule, and never your own (that is Settings)', () => {
  assert.equal(personPhotoProblem('Admin', 'Employee', false), '');
  assert.equal(personPhotoProblem('Admin', 'Subadmin', false), '');
  assert.equal(personPhotoProblem('Superadmin', 'Admin', false), '');
  assert.equal(personPhotoProblem('Superadmin', 'Superadmin', false), '');

  assert.match(personPhotoProblem('Superadmin', 'Superadmin', true), /Settings/);
  assert.match(personPhotoProblem('Admin', 'Admin', false), /your role/i);
  assert.match(personPhotoProblem('Admin', 'Superadmin', false), /your role/i);
  for (const actor of ['Subadmin', 'Employee', 'Intern'] as AccountRole[]) assert.match(personPhotoProblem(actor, 'Intern', false), /your role/i, actor);
});

/** A stand-in backend that records each request and answers with the next reply. */
const backend = (...replies: [number, unknown][]) => {
  const calls: { url: string; method: string; body: unknown }[] = [];
  const request = async (url: RequestInfo | URL, init?: RequestInit) => {
    const body = init?.body;
    calls.push({ url: String(url), method: init?.method ?? 'GET', body: body instanceof FormData ? [...body.keys()] : body ? JSON.parse(String(body)) : undefined });
    const [status, reply] = replies.shift() ?? [500, {}];
    return new Response(JSON.stringify(reply), { status, headers: { 'Content-Type': 'application/json' } });
  };
  return { calls, photo: personPhotoCalls(createApi({ base: 'http://api.test/api', token: async () => 'token', signedIn: () => true, request: request as typeof fetch })) };
};

test("someone's saved photo is read from their record; none, or an old broken address, is no photo", async () => {
  const { calls, photo } = backend([200, { id: ID, profilePicture: PHOTO }], [200, { id: ID, profilePicture: '' }], [200, { profilePicture: '/uploads/a.png' }]);
  assert.deepEqual(await photo.load(ID), { kind: 'stored', path: `/user/${ID}/photo?v=6ad8bc3dd430c9b545aa3001` });
  assert.equal(await photo.load(ID), undefined);
  assert.equal(await photo.load(ID), undefined);
  assert.deepEqual(calls[0], { url: `http://api.test/api/user/${ID}`, method: 'GET', body: undefined });
});

test('a new photo goes to the edit route as the profilePicture file, and nothing else is sent', async () => {
  const { calls, photo } = backend([200, { id: ID, profilePicture: PHOTO }]);
  const saved = await photo.save(ID, new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' }));
  assert.deepEqual(saved, { kind: 'stored', path: `/user/${ID}/photo?v=6ad8bc3dd430c9b545aa3001` });
  assert.deepEqual(calls, [{ url: `http://api.test/api/user/${ID}`, method: 'PUT', body: ['profilePicture'] }]);
});

test('removing a photo uses its own route', async () => {
  const { calls, photo } = backend([200, { id: ID, profilePicture: '' }]);
  await photo.remove(ID);
  assert.deepEqual(calls, [{ url: `http://api.test/api/user/${ID}/photo`, method: 'DELETE', body: undefined }]);
});

test("the note about a photo an admin changed shows in the bell and opens Settings", () => {
  const note = { id: 'n1', kind: 'photo', title: 'Your photo was changed by Ravi Menon', detail: 'You can change it in Settings.', link: '/portal/settings', at: '2026-10-26T09:00:00.000Z', read: false };
  const { notes } = toBellNotes({ notes: [note], unread: 1 });
  assert.deepEqual(notes.map((n) => [n.id, n.icon, n.to]), [['n1', 'settings', '/portal/settings']]);
});

test('Help tells admins how to change a photo, and everyone that an admin may', () => {
  const topics = (role: 'admin' | 'subadmin' | 'employee') => helpGroups(true, role, '').flatMap((g) => g.topics);
  assert.ok(topics('admin').some((t) => /someone’s photo/.test(t.q) && /Details/.test(t.a) && /bell/.test(t.a)));
  assert.ok(!topics('employee').some((t) => /someone’s photo/.test(t.q)));
  for (const role of ['admin', 'subadmin', 'employee'] as const) {
    assert.ok(topics(role).some((t) => /my name or photo/.test(t.q) && /An admin can also change or remove your photo/.test(t.a)), role);
  }
});
