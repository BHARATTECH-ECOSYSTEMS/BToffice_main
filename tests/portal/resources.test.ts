import { test } from 'node:test';
import assert from 'node:assert/strict';
import { audience, isWebLink, toResources } from '../../src/portal/resources';
import { ApiError } from '../../src/portal/api';

// One link as GET /api/resources returns it
const docs = {
  _id: '6ad9f0b2c3d4e5f6a7b8c9d1',
  title: 'React documentation',
  link: 'https://react.dev/learn',
  assignedTo: ['6ad8bc3dd430c9b545aa2845', '6ad8bc3dd430c9b545aa2846'],
  createdBy: '6ad8bc3dd430c9b545aa2847',
  createdAt: '2026-10-23T09:30:00.000Z',
  updatedAt: '2026-10-23T09:30:00.000Z',
  __v: 0,
};

test('a link from the backend becomes the card the page shows', () => {
  assert.deepEqual(toResources([docs]), [
    { id: '6ad9f0b2c3d4e5f6a7b8c9d1', name: 'React documentation', url: 'https://react.dev/learn', assignedTo: ['6ad8bc3dd430c9b545aa2845', '6ad8bc3dd430c9b545aa2846'] },
  ]);
});

test('assigned people filled in as records are read by their id', () => {
  const [link] = toResources([{ ...docs, assignedTo: [{ _id: '6ad8bc3dd430c9b545aa2845', fullName: 'Test Employee' }] }]);
  assert.deepEqual(link.assignedTo, ['6ad8bc3dd430c9b545aa2845']);
});

test('a link nobody was assigned to has an empty list, however the backend spells it', () => {
  for (const assignedTo of [[], null, undefined]) assert.deepEqual(toResources([{ ...docs, assignedTo }])[0].assignedTo, []);
});

test('a link without a name is shown by its address', () => {
  assert.equal(toResources([{ ...docs, title: '  ' }])[0].name, 'https://react.dev/learn');
});

test('broken rows are skipped instead of breaking the page', () => {
  const rows = toResources([docs, null, { title: 'No id' }, { _id: 'x1', title: 'No link' }]);
  assert.deepEqual(rows.map((r) => r.id), ['6ad9f0b2c3d4e5f6a7b8c9d1']);
});

test('an answer that is not a list reads as the server being unavailable', () => {
  assert.throws(() => toResources({ message: 'Server error' }), (e: unknown) => e instanceof ApiError && e.kind === 'unavailable');
});

test('only http and https addresses count as safe to open', () => {
  for (const ok of ['https://react.dev/learn', 'http://intranet.example.test/docs']) assert.equal(isWebLink(ok), true, ok);
  for (const bad of ['javascript:alert(1)', 'data:text/html,hi', 'ftp://files.example.test', 'react.dev', '']) assert.equal(isWebLink(bad), false, bad);
});

test('a link assigned to nobody is visible to everyone', () => {
  assert.equal(audience([], () => undefined), 'Everyone can see this');
});

test('an assigned link names the only people who see it, including removed accounts', () => {
  const names: Record<string, string> = { a: 'Asha Rao', k: 'Kabir Das' };
  assert.equal(audience(['a', 'k', 'gone'], (id) => names[id]), 'Only Asha Rao, Kabir Das and a removed account can see this');
  assert.equal(audience(['a'], (id) => names[id]), 'Only Asha Rao can see this');
});
