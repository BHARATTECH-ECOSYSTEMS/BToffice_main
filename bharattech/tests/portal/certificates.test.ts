import { test } from 'node:test';
import assert from 'node:assert/strict';
import { certificateTitle, toCertificates } from '../../src/portal/certificates';
import { ApiError } from '../../src/portal/api';

// One certificate as GET /api/certificates returns it (issuedBy and userId filled in by the backend)
const issued = {
  _id: '6ad9a1b2c3d4e5f6a7b8c9d0',
  userId: { _id: '6ad8bc3dd430c9b545aa2845', fullName: 'Test Intern', email: 'test.intern@example.test', username: 'test.intern', role: 'Intern' },
  title: 'Character Certificate',
  certificateNumber: 'CERT-1761120000000-4821',
  filePath: '/certificates/1761120000000-Test_Intern.pdf',
  issuedBy: { _id: '6ad8bc3dd430c9b545aa2847', fullName: 'Test Admin', email: 'test.admin@example.test', role: 'Admin' },
  issuedAt: '2026-10-22T09:30:00.000Z',
  createdAt: '2026-10-22T09:30:00.000Z',
  updatedAt: '2026-10-22T09:30:00.000Z',
  __v: 0,
};

test("a certificate from the backend becomes the row the page shows", () => {
  assert.deepEqual(toCertificates([issued]), [
    {
      id: '6ad9a1b2c3d4e5f6a7b8c9d0',
      number: 'CERT-1761120000000-4821',
      title: 'Character Certificate',
      type: 'character',
      recipient: { id: '6ad8bc3dd430c9b545aa2845', name: 'Test Intern', email: 'test.intern@example.test' },
      issuedBy: 'Test Admin',
      issuedAt: '2026-10-22',
    },
  ]);
});

test('"my certificates" comes wrapped with a count, and reads the same', () => {
  assert.deepEqual(toCertificates({ count: 1, certificates: [issued] }), toCertificates([issued]));
});

test('a title the website does not know is still shown, by its own name', () => {
  const [c] = toCertificates([{ ...issued, title: 'Internship Letter' }]);
  assert.equal(c.title, 'Internship Letter');
  assert.equal(c.type, undefined);
});

test('a certificate whose person or issuer was removed still shows', () => {
  const [c] = toCertificates([{ ...issued, userId: null, issuedBy: null }]);
  assert.equal(c.recipient, undefined);
  assert.equal(c.issuedBy, undefined);
});

test('an entry without an id is skipped instead of breaking the list', () => {
  assert.deepEqual(toCertificates([{ ...issued, _id: undefined }, issued, null]).map((c) => c.id), ['6ad9a1b2c3d4e5f6a7b8c9d0']);
});

test('an answer that is not a list of certificates is an error', () => {
  for (const raw of [null, 'oops', { message: 'hi' }]) {
    assert.throws(() => toCertificates(raw), (e: unknown) => e instanceof ApiError && e.kind === 'unavailable');
  }
});

test('each certificate type is sent with the title the backend knows', () => {
  assert.equal(certificateTitle('bonafide'), 'Bonafide Certificate');
  assert.equal(certificateTitle('character'), 'Character Certificate');
  assert.equal(certificateTitle('transfer'), 'Transfer Certificate');
  assert.equal(certificateTitle('completion'), 'Course Completion');
});
