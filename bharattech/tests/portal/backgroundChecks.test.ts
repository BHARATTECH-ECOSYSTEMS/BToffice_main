import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toMyDocuments } from '../../src/portal/myDocuments';
import { checkReady, notApplicableProblem, toVerification, type RemoteVerification } from '../../src/portal/verifications';
import { SKIPPABLE_CHECKS, VERIFICATION_FILES } from '../../src/portal/data';
import { localDay } from '../../src/portal/eoffice';

// The employee checks beyond Aadhaar and PAN: education certificates and a previous employer's letter (uploads), and
// "Not applicable" for previous employment; References is a plain tick (backend: controllers/idDocumentController.js
// and verificationController.js).

const UPLOADED = '2026-10-24T05:30:00.000Z';
const file = (kind: string) => ({ kind, fileName: `${kind}.pdf`, size: 40_000, uploadedAt: UPLOADED });

test('the upload slots match the backend: Aadhaar, PAN, three education certificates and a letter, each with its check', () => {
  assert.deepEqual(
    VERIFICATION_FILES.map((f) => [f.id, f.check]),
    [
      ['aadhaar', 'aadhaar'],
      ['pan', 'pan'],
      ['degree', 'education'],
      ['marksheet', 'education'],
      ['class12', 'education'],
      ['experience', 'employment'],
    ],
  );
  assert.deepEqual([...SKIPPABLE_CHECKS], ['employment']);
});

test("the employee's card reads every upload and which checks are marked not applicable", () => {
  const mine = toMyDocuments({
    request: { id: 'r1', status: 'pending' },
    documents: ['aadhaar', 'degree', 'class12', 'experience'].map(file),
    notApplicable: [{ check: 'employment', byYou: true }],
  });
  assert.deepEqual(mine.documents.map((d) => d.kind), ['aadhaar', 'degree', 'class12', 'experience']);
  assert.equal(mine.documents[1].uploaded, localDay(Date.parse(UPLOADED)));
  assert.deepEqual(mine.notApplicable, [{ check: 'employment', byYou: true }]);
});

test('unknown not-applicable marks are left out; only an exact true is "by you"; a missing list is empty', () => {
  const mine = toMyDocuments({
    request: null,
    documents: [],
    notApplicable: [{ check: 'education', byYou: true }, { check: 'references', byYou: true }, { check: 'employment', byYou: 'yes' }, null],
  });
  assert.deepEqual(mine.notApplicable, [{ check: 'employment', byYou: false }]);
  assert.deepEqual(toMyDocuments({ request: null, documents: [], notApplicable: {} }).notApplicable, []);
});

// GET /api/verifications?kind=employee, one request (controllers/verificationController.js view)
const OPENED = '2026-10-20T05:30:00.000Z';
const ashaRequest = {
  id: 'v1',
  kind: 'employee',
  status: 'pending',
  done: [],
  note: '',
  openedBy: 'Test Admin',
  openedAt: OPENED,
  log: [],
  person: { id: 'p1', name: 'Asha Rao', email: 'asha@example.test', role: 'Employee', team: '', employeeId: 'BT-0001', removed: false },
  documents: [file('aadhaar'), file('marksheet')],
  notApplicable: [{ check: 'employment', reason: 'Fresher', by: 'Test Admin', byEmployee: false, at: OPENED }],
};

test("an employee request on the desk carries each not-applicable mark with HR's reason", () => {
  const v = toVerification(ashaRequest)!;
  assert.deepEqual(v.notApplicable, [{ check: 'employment', reason: 'Fresher', by: 'Test Admin', byEmployee: false, at: OPENED }]);
  assert.deepEqual(v.documents!.map((d) => d.kind), ['aadhaar', 'marksheet']);
  const broken = toVerification({
    ...ashaRequest,
    notApplicable: [
      { check: 'employment', reason: '', by: 'X', at: OPENED },
      { check: 'pan', reason: 'No', by: 'X', at: OPENED },
      { check: 'references', reason: 'No', by: 'X', at: OPENED },
    ],
  })!;
  assert.deepEqual(broken.notApplicable, []);
});

test('a check proved by a file can be ticked once one is there, or once it is marked not applicable; References always', () => {
  const v = toVerification(ashaRequest) as RemoteVerification;
  assert.deepEqual(
    ['aadhaar', 'pan', 'education', 'employment', 'references'].map((c) => [c, checkReady(v, c)]),
    [
      ['aadhaar', true],
      ['pan', false],
      ['education', true],
      ['employment', true],
      ['references', true],
    ],
  );
  const bare = toVerification({ ...ashaRequest, documents: [file('aadhaar')], notApplicable: [] }) as RemoteVerification;
  assert.equal(checkReady(bare, 'education'), false, 'an Aadhaar is not an education certificate');
  assert.equal(checkReady(bare, 'employment'), false, 'no letter, no mark');
  assert.equal(checkReady(bare, 'references'), true, 'a plain tick');
  assert.equal(checkReady(toVerification({ ...ashaRequest, documents: [file('experience')], notApplicable: [] }) as RemoteVerification, 'employment'), true);
});

test('a not-applicable reason is required and kept short', () => {
  assert.equal(notApplicableProblem('Joined straight from college'), '');
  assert.match(notApplicableProblem('   '), /why/i);
  assert.match(notApplicableProblem('x'.repeat(301)), /300/);
});
