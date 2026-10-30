import { test } from 'node:test';
import assert from 'node:assert/strict';
import { documentForm, myDocumentsFailedMessage, toMyDocuments } from '../../src/portal/myDocuments';
import { localDay } from '../../src/portal/eoffice';
import { ApiError, BUSY_MESSAGE } from '../../src/portal/api';

// GET /api/verification-documents/mine, as the local backend returns it (controllers/idDocumentController.js)
const UPLOADED = '2026-10-24T05:30:00.000Z';
const mine = {
  request: { id: '6ad8bc3dd430c9b545aa3002', status: 'pending', openedAt: '2026-10-23T05:30:00.000Z' },
  documents: [{ kind: 'aadhaar', fileName: 'aadhaar scan.pdf', size: 52_000, uploadedAt: UPLOADED }],
};

test("the employee's own verification and uploads become the Profile card's, dated in their own day", () => {
  assert.deepEqual(toMyDocuments(mine), {
    request: { id: '6ad8bc3dd430c9b545aa3002', status: 'pending' },
    documents: [{ kind: 'aadhaar', fileName: 'aadhaar scan.pdf', size: 52_000, uploaded: localDay(Date.parse(UPLOADED)) }],
    notApplicable: [],
  });
  assert.deepEqual(toMyDocuments({ request: null, documents: [] }), { request: null, documents: [], notApplicable: [] });
  // 20:00 UTC is 01:30 the next morning in India: the day the employee saw
  const late = '2026-10-24T20:00:00.000Z';
  assert.equal(toMyDocuments({ ...mine, documents: [{ ...mine.documents[0], uploadedAt: late }] }).documents[0].uploaded, localDay(Date.parse(late)));
});

test('a broken upload or request is left out instead of breaking the card', () => {
  const read = toMyDocuments({
    request: { id: '', status: 'pending' },
    documents: [
      mine.documents[0],
      { ...mine.documents[0], kind: 'passport' },
      { ...mine.documents[0], kind: 'pan', fileName: ' ' },
      { ...mine.documents[0], kind: 'pan', size: 'big' },
      { ...mine.documents[0], kind: 'pan', uploadedAt: 'today' },
      null,
    ],
  });
  assert.equal(read.request, null);
  assert.deepEqual(read.documents.map((d) => d.kind), ['aadhaar']);
  assert.equal(toMyDocuments({ ...mine, request: { ...mine.request, status: 'approved' } }).request, null);
});

test('an answer that is not the card is an error, not an empty card', () => {
  for (const raw of [null, 'oops', { documents: 'x' }]) {
    assert.throws(() => toMyDocuments(raw), (e: unknown) => e instanceof ApiError && e.kind === 'unavailable');
  }
});

test('an upload goes as one PDF in the "file" field', () => {
  const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], 'pan.pdf', { type: 'application/pdf' });
  const form = documentForm(file);
  assert.deepEqual([...form.keys()], ['file']);
  assert.equal((form.get('file') as File).name, 'pan.pdf');
});

test("a refused upload says the backend's own words; anything else a plain explanation", () => {
  assert.equal(myDocumentsFailedMessage(new ApiError('conflict', "HR hasn't asked for your documents, or your verification is already decided.")), "HR hasn't asked for your documents, or your verification is already decided.");
  assert.equal(myDocumentsFailedMessage(new ApiError('bad-request', 'Only PDF files can be uploaded.')), 'Only PDF files can be uploaded.');
  assert.equal(myDocumentsFailedMessage(new ApiError('busy')), BUSY_MESSAGE);
  assert.match(myDocumentsFailedMessage(new ApiError('unavailable')), /nothing was saved|try again/i);
  assert.match(myDocumentsFailedMessage(new ApiError('signed-out')), /sign in again/i);
});
