import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toVerification, toVerifications, verificationBody, verificationFailedMessage } from '../../src/portal/verifications';
import { sendEmploymentRequest } from '../../src/portal/inbox';
import { localDay } from '../../src/portal/eoffice';
import { ApiError, BUSY_MESSAGE } from '../../src/portal/api';

// GET /api/verifications?kind=…, as the local backend returns it (controllers/verificationController.js view)
const OPENED = '2026-10-20T05:30:00.000Z';
const DECIDED = '2026-10-23T09:15:00.000Z';
const northwind = {
  id: '6ad8bc3dd430c9b545aa3001',
  kind: 'company',
  status: 'pending',
  done: ['tax', 'registration'],
  note: '',
  openedBy: 'Test Admin',
  openedAt: OPENED,
  decidedBy: '',
  decidedAt: null,
  log: [
    { at: OPENED, by: 'Test Admin', text: 'Opened the request' },
    { at: '2026-10-21T06:00:00.000Z', by: 'Sana Iyer', text: 'Checked GST / tax registration' },
  ],
  company: 'Northwind Logistics Pvt Ltd',
  registration: 'U12345MH2020PTC000001',
  contactEmail: 'accounts@northwind.example.com',
  website: 'https://northwind.example.com/',
};
const asha = {
  ...northwind,
  id: '6ad8bc3dd430c9b545aa3002',
  kind: 'employee',
  done: ['education'],
  company: undefined,
  registration: undefined,
  contactEmail: undefined,
  website: undefined,
  person: { id: '6ad8bc3dd430c9b545aa2844', name: 'Asha Rao', email: 'asha@example.test', role: 'Employee', team: 'Platform', employeeId: 'BT-0001', removed: false },
};

test("a company request becomes the desk's record, dated in the viewer's own calendar day", () => {
  assert.deepEqual(toVerification(northwind), {
    kind: 'company',
    id: '6ad8bc3dd430c9b545aa3001',
    status: 'pending',
    done: ['tax', 'registration'],
    note: '',
    requestedBy: 'Test Admin',
    requested: localDay(Date.parse(OPENED)),
    log: [
      { at: OPENED, by: 'Test Admin', text: 'Opened the request' },
      { at: '2026-10-21T06:00:00.000Z', by: 'Sana Iyer', text: 'Checked GST / tax registration' },
    ],
    company: 'Northwind Logistics Pvt Ltd',
    registration: 'U12345MH2020PTC000001',
    contactEmail: 'accounts@northwind.example.com',
    website: 'https://northwind.example.com/',
  });
});

test("an employee request carries who it's about, with their role as the portal names it", () => {
  const v = toVerification(asha)!;
  assert.equal(v.kind, 'employee');
  assert.equal(v.kind === 'employee' && v.personId, '6ad8bc3dd430c9b545aa2844');
  assert.deepEqual(v.person, { name: 'Asha Rao', email: 'asha@example.test', roleLabel: 'Employee', team: 'Platform', employeeId: 'BT-0001', removed: false });
  assert.equal(toVerification({ ...asha, person: { ...asha.person, role: 'Subadmin' } })!.person!.roleLabel, 'Sub Admin');
  const gone = toVerification({ ...asha, person: { id: asha.person.id, name: '', email: '', role: '', team: '', employeeId: '', removed: true } })!;
  assert.deepEqual([gone.person!.name, gone.person!.removed], ['', true], 'a removed person stays on the record');
  // someone removed from the directory has no role here any more, whatever their record last said
  const left = toVerification({ ...asha, person: { ...asha.person, removed: true } })!;
  assert.deepEqual([left.person!.roleLabel, left.person!.removed], ['', true]);
});

test("the day is the viewer's own, even when UTC is still on the day before", () => {
  // 20:00 UTC is 01:30 the next morning in India: the desk counts days from the day the admin saw
  const late = '2026-10-20T20:00:00.000Z';
  const v = toVerification({ ...northwind, openedAt: late, status: 'verified', decidedBy: 'Test Admin', decidedAt: late })!;
  assert.equal(v.requested, localDay(Date.parse(late)));
  assert.equal(v.decided, localDay(Date.parse(late)));
});

test('a decision keeps who made it and on which day; none leaves both unset', () => {
  const decided = toVerification({ ...northwind, status: 'rejected', note: 'Bank letter is for another company', decidedBy: 'Sana Iyer', decidedAt: DECIDED })!;
  assert.deepEqual([decided.status, decided.decidedBy, decided.decided, decided.note], ['rejected', 'Sana Iyer', localDay(Date.parse(DECIDED)), 'Bank letter is for another company']);
  const open = toVerification(northwind)!;
  assert.equal(open.decidedBy, undefined);
  assert.equal(open.decided, undefined);
});

test("only the request's own checks count as done", () => {
  assert.deepEqual(toVerification({ ...northwind, done: ['tax', 'education', 7, null, 'bank'] })!.done, ['tax', 'bank']);
  assert.deepEqual(toVerification({ ...asha, done: ['registration', 'aadhaar', 'references'] })!.done, ['aadhaar', 'references']);
});

test('a broken entry is left out instead of breaking the desk', () => {
  const rows = toVerifications([
    northwind,
    asha,
    { ...northwind, id: '' },
    { ...northwind, kind: 'employment' },
    { ...northwind, status: 'approved' },
    { ...northwind, company: '  ' },
    { ...northwind, openedAt: 'yesterday' },
    { ...asha, person: null },
    { ...asha, person: { ...asha.person, id: '' } },
    null,
    'junk',
  ]);
  assert.deepEqual(rows.map((r) => r.id), [northwind.id, asha.id]);
  assert.deepEqual(toVerification({ ...northwind, log: [northwind.log[0], { at: 'never', by: 'x', text: 'y' }, { at: OPENED, by: '', text: 'z' }, 'junk'] })!.log, [northwind.log[0]]);
});

test('an answer that is not a list is an error, not an empty desk', () => {
  for (const raw of [null, { message: 'hi' }, 'oops']) {
    assert.throws(() => toVerifications(raw), (e: unknown) => e instanceof ApiError && e.kind === 'unavailable');
  }
});

test('a new request sends only what the backend reads', () => {
  assert.deepEqual(
    verificationBody({ kind: 'company', company: 'Northwind Logistics Pvt Ltd', registration: 'U12345', website: '', contactEmail: 'a@b.example', extra: 'x' } as never),
    { kind: 'company', company: 'Northwind Logistics Pvt Ltd', registration: 'U12345', website: '', contactEmail: 'a@b.example' },
  );
  assert.deepEqual(verificationBody({ kind: 'employee', personId: 'p1', name: 'Asha' } as never), { kind: 'employee', personId: 'p1' });
});

test("a refusal shows the backend's own words where they help; anything else a plain explanation", () => {
  assert.equal(verificationFailedMessage(new ApiError('conflict', 'This company already has a pending request.')), 'This company already has a pending request.');
  assert.equal(verificationFailedMessage(new ApiError('bad-request', 'Add a note saying why it was rejected.')), 'Add a note saying why it was rejected.');
  assert.equal(verificationFailedMessage(new ApiError('forbidden', 'Only Super Admins and Admins use HR OPS.')), 'Only Super Admins and Admins use HR OPS.');
  assert.equal(verificationFailedMessage(new ApiError('busy')), BUSY_MESSAGE);
  assert.match(verificationFailedMessage(new ApiError('not-found')), /refreshed/);
  assert.match(verificationFailedMessage(new ApiError('unavailable')), /nothing was saved/);
  assert.match(verificationFailedMessage(new ApiError('signed-out')), /sign in again/i);
  // a conflict without words of its own still says something useful
  assert.match(verificationFailedMessage(new ApiError('conflict')), /refreshed/);
});

// GET /api/verifications?kind=employment: a request another company sent from the website's form
const acme = {
  ...northwind,
  id: '6ad8bc3dd430c9b545aa3003',
  kind: 'employment',
  done: ['record', 'tax'],
  openedBy: 'Riya Sen (Acme Hiring Pvt Ltd)',
  company: undefined,
  registration: undefined,
  contactEmail: undefined,
  website: undefined,
  reference: 'VR-0001',
  requesterCompany: 'Acme Hiring Pvt Ltd',
  requesterName: 'Riya Sen',
  requesterEmail: 'riya.sen@acme.example',
  candidate: 'Asha Rao',
  designation: 'Software Engineer',
  employeeId: 'BT-0001',
  from: '2024-03',
  to: '',
  consentAt: OPENED,
  answerEmailed: false,
  directoryMatch: { name: 'Asha Rao', employeeId: 'BT-0001', role: 'Employee', joinedOn: '2024-03-04', current: true },
};

test("another company's request becomes the desk's record, with its reference and our directory's lead", () => {
  const v = toVerification(acme)!;
  assert.equal(v.kind, 'employment');
  if (v.kind !== 'employment') return;
  assert.deepEqual(
    [v.requesterCompany, v.requesterName, v.requesterEmail, v.candidate, v.designation, v.employeeId, v.from, v.to, v.requestedBy, v.reference, v.answerEmailed],
    ['Acme Hiring Pvt Ltd', 'Riya Sen', 'riya.sen@acme.example', 'Asha Rao', 'Software Engineer', 'BT-0001', '2024-03', '', 'Riya Sen (Acme Hiring Pvt Ltd)', 'VR-0001', false],
  );
  assert.deepEqual(v.done, ['record'], 'only its own checks');
  assert.deepEqual(v.lead, { name: 'Asha Rao', employeeId: 'BT-0001', roleLabel: 'Employee', joinedOn: '2024-03-04', current: true });
  assert.equal(toVerification({ ...acme, directoryMatch: null })!.lead, null);
  const former = toVerification({ ...acme, directoryMatch: { ...acme.directoryMatch, current: false, joinedOn: '' } })!;
  assert.deepEqual([former.lead!.current, former.lead!.joinedOn], [false, '']);
  assert.equal(toVerification({ ...acme, answerEmailed: true, status: 'verified', decidedBy: 'Test Admin', decidedAt: DECIDED })!.answerEmailed, true);
  // only a clear yes from the backend counts as emailed: the desk must never imply an answer went out
  for (const answerEmailed of [undefined, 'yes', 1, null]) assert.equal(toVerification({ ...acme, answerEmailed })!.answerEmailed, false, String(answerEmailed));
  assert.equal(toVerification({ ...acme, directoryMatch: { ...acme.directoryMatch, joinedOn: 'soon' } })!.lead!.joinedOn, '', 'not a day');
});

test("a broken request from another company is left out", () => {
  const rows = toVerifications([acme, { ...acme, id: 'x1', candidate: ' ' }, { ...acme, id: 'x2', requesterEmail: '' }, { ...acme, id: 'x3', from: 'March' }, { ...acme, id: 'x4', reference: '' }]);
  assert.deepEqual(rows.map((r) => r.id), [acme.id]);
});

const draft = {
  requesterCompany: 'Acme Hiring Pvt Ltd',
  requesterName: 'Riya Sen',
  requesterEmail: 'riya.sen@acme.example',
  candidate: 'Asha Rao',
  employeeId: 'BT-0001',
  designation: 'Software Engineer',
  from: '2024-03',
  to: '',
};
/** A stand-in for fetch that records the call and answers `status` with `body`, or fails like a dead connection. */
const server = (status: number | 'down', body: unknown = {}) => {
  const calls: { url: string; init: RequestInit }[] = [];
  const request = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    if (status === 'down') throw new TypeError('Failed to fetch');
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  };
  return { calls, request };
};

test("the website's form sends the request to the backend without a sign-in, and gets its reference", async () => {
  const net = server(201, { reference: 'VR-0007', message: 'Request received.' });
  const sent = await sendEmploymentRequest(draft, '', { base: 'http://api.test/api', request: net.request });
  assert.deepEqual(sent, { ok: true, reference: 'VR-0007' });
  const [{ url, init }] = net.calls;
  assert.equal(url, 'http://api.test/api/verification-requests');
  assert.equal(init.method, 'POST');
  const headers = new Headers(init.headers);
  assert.equal(headers.get('Authorization'), null, 'nobody is signed in on the website');
  assert.equal(headers.get('Content-Type'), 'application/json');
  assert.deepEqual(JSON.parse(String(init.body)), { ...draft, consent: true, website: '' });
});

test("the hidden field goes along as it was filled, and a bot's calm answer has no reference", async () => {
  const net = server(202, { message: 'Request received.' });
  assert.deepEqual(await sendEmploymentRequest(draft, 'https://spam.example', { base: 'http://api.test/api', request: net.request }), { ok: true, reference: '' });
  assert.equal(JSON.parse(String(net.calls[0].init.body)).website, 'https://spam.example');
});

test("a refused form shows the backend's own words; too many, or no answer, says what to do", async () => {
  const base = 'http://api.test/api';
  assert.deepEqual(await sendEmploymentRequest(draft, '', { base, request: server(400, { message: "Employment months can't be in the future." }).request }), {
    ok: false,
    message: "Employment months can't be in the future.",
  });
  const busy = await sendEmploymentRequest(draft, '', { base, request: server(429, { message: 'Too many requests from here. Try again in an hour, or email our HR team.' }).request });
  assert.deepEqual(busy, { ok: false, message: 'Too many requests from here. Try again in an hour, or email our HR team.' });
  for (const status of [500, 'down'] as const) {
    const res = await sendEmploymentRequest(draft, '', { base, request: server(status).request });
    assert.equal(res.ok, false);
    assert.match(!res.ok ? res.message : '', /couldn.t send|try again/i, String(status));
  }
});

test("an employee request carries the employee's uploads as the desk lists them", () => {
  const uploaded = '2026-10-24T05:30:00.000Z';
  const v = toVerification({
    ...asha,
    documents: [
      { kind: 'aadhaar', fileName: 'aadhaar scan.pdf', size: 52_000, uploadedAt: uploaded },
      { kind: 'pan', fileName: 'pan.pdf', size: 40_000, uploadedAt: uploaded },
      { kind: 'passport', fileName: 'x.pdf', size: 1, uploadedAt: uploaded },
      { kind: 'pan', fileName: '', size: 1, uploadedAt: uploaded },
    ],
  })!;
  assert.deepEqual(v.documents, [
    { kind: 'aadhaar', fileName: 'aadhaar scan.pdf', size: 52_000, uploaded: localDay(Date.parse(uploaded)) },
    { kind: 'pan', fileName: 'pan.pdf', size: 40_000, uploaded: localDay(Date.parse(uploaded)) },
  ]);
  assert.deepEqual(toVerification(asha)!.documents, [], 'none uploaded yet');
});
