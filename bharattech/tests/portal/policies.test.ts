import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categoryValue, toPolicies } from '../../src/portal/policies';
import { ApiError } from '../../src/portal/api';

// One document as GET /api/policies returns it to an admin (controllers/policyController.js normalizePolicy)
const leave = {
  _id: '6ada11223344556677889900',
  name: 'Leave Policy',
  pdfUrl: 'http://localhost:5000/uploads/policies/1761-leave-policy.pdf',
  pdfName: 'leave policy.pdf',
  storedFileName: '1761-leave-policy.pdf',
  pages: 4,
  category: 'Policies',
  uploadedBy: 'test.admin',
  acceptedBy: [
    { userId: '6ad8bc3dd430c9b545aa2845', username: 'test.intern', fullName: 'Test Intern', email: 'test.intern@example.test', role: 'Intern', acceptedAt: '2026-10-22T10:15:00.000Z' },
  ],
  createdAt: '2026-10-22T09:00:00.000Z',
  updatedAt: '2026-10-22T10:15:00.000Z',
  __v: 1,
  fileUrl: '/uploads/policies/1761-leave-policy.pdf',
  userAccepted: false,
};

test('a document from the backend becomes the row the page shows', () => {
  assert.deepEqual(toPolicies([leave]), [
    {
      id: '6ada11223344556677889900',
      name: 'Leave Policy',
      category: 'policy',
      categoryLabel: 'Policy',
      pages: 4,
      fileName: 'leave policy.pdf',
      uploadedAt: '2026-10-22',
      acceptedByMe: false,
      acceptances: [{ personId: '6ad8bc3dd430c9b545aa2845', name: 'Test Intern', email: 'test.intern@example.test', role: 'intern', roleLabel: 'Intern', acceptedAt: '2026-10-22' }],
    },
  ]);
});

test('every way the company app has written a category is understood', () => {
  const read = (category: string) => toPolicies([{ ...leave, category }])[0];
  assert.equal(read('Policies').category, 'policy');
  assert.equal(read('Policy PDF').category, 'policy');
  assert.equal(read('Compliances').category, 'compliance');
  assert.equal(read('Compliance PDF').category, 'compliance');
  const unknown = read('Handbook');
  assert.deepEqual([unknown.category, unknown.categoryLabel], [undefined, 'Handbook']);
});

test('a document I accepted says so', () => {
  assert.equal(toPolicies([{ ...leave, userAccepted: true }])[0].acceptedByMe, true);
});

test('an entry without an id is skipped, and broken acceptances are left out', () => {
  const rows = toPolicies([{ ...leave, _id: undefined }, { ...leave, acceptedBy: [null, { fullName: 'No id' }, ...leave.acceptedBy] }]);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].acceptances.map((a) => a.name), ['Test Intern']);
});

test('an answer that is not a list of documents is an error', () => {
  for (const raw of [null, { message: 'hi' }, 'oops']) {
    assert.throws(() => toPolicies(raw), (e: unknown) => e instanceof ApiError && e.kind === 'unavailable');
  }
});

test('a new document is filed under the category names the company app uses', () => {
  assert.equal(categoryValue('policy'), 'Policies');
  assert.equal(categoryValue('compliance'), 'Compliances');
});
