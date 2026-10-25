import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchesCertificate, type IssuedCertificate } from '../../src/portal/certificates';

// 2026-10-25 gap audit (group A4): the company's certificate search also found the person's email.

const cert = {
  id: 'c1',
  type: 'bonafide',
  title: 'Bonafide Certificate',
  number: 'BT-CERT-0042',
  issuedAt: '2026-10-20',
  issuedBy: 'Test Admin',
  recipient: { id: 'u1', name: 'Asha Rao', email: 'asha.rao@example.test' },
} as unknown as IssuedCertificate;

test('a search finds a certificate by its type, person, issuer, number or the person’s email, in any case', () => {
  for (const q of ['bonafide', 'ASHA', 'test admin', 'cert-0042', 'asha.rao@example', '@EXAMPLE.TEST']) assert.equal(matchesCertificate(cert, q), true, q);
});

test('an empty search shows everything; a search for something else hides it', () => {
  assert.equal(matchesCertificate(cert, '   '), true);
  assert.equal(matchesCertificate(cert, 'kabir'), false);
  assert.equal(matchesCertificate({ ...cert, recipient: undefined, issuedBy: undefined } as IssuedCertificate, 'asha'), false);
});
