import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, BUSY_MESSAGE, createApi } from '../../src/portal/api';
import { communityCalls, communityFailedMessage, emailedLine, jobBody, jobProblem, nextStages, personalEmailProblem, referralBody, referralProblem, toJobs, toJoiners, toMembers, toReferrals } from '../../src/portal/community';
import { localDay } from '../../src/portal/eoffice';
import { canMarkLeft, ACCOUNT_ROLES, type AccountRole } from '../../src/portal/people';

// GET /api/community/members as the local backend returns it (controllers/communityController.js), admin view
const vikram = { id: '6ad8bc3dd430c9b545aa4001', name: 'Vikram Joshi', stream: 'operations', leftOn: '2026-08-14', employeeId: 'BT-0010', personalEmail: '', canBringBack: true };
const neha = { id: '6ad8bc3dd430c9b545aa4002', name: 'Neha Kapoor', stream: 'tech', leftOn: '2026-06-30', employeeId: 'BT-0009', personalEmail: 'neha.home@example.net', canBringBack: false };

test('members come in as the community shows them, in the order the backend sent (newest leaver first)', () => {
  assert.deepEqual(toMembers([vikram, neha]), [
    { id: vikram.id, name: 'Vikram Joshi', stream: 'operations', left: '2026-08-14', employeeId: 'BT-0010', personalEmail: undefined, canBringBack: true },
    { id: neha.id, name: 'Neha Kapoor', stream: 'tech', left: '2026-06-30', employeeId: 'BT-0009', personalEmail: 'neha.home@example.net', canBringBack: false },
  ]);
});

test("what an employee is sent (no Employee ID, personal email or buttons) comes in without them", () => {
  assert.deepEqual(toMembers([{ id: neha.id, name: 'Neha Kapoor', stream: 'tech', leftOn: '2026-06-30' }]), [
    { id: neha.id, name: 'Neha Kapoor', stream: 'tech', left: '2026-06-30', employeeId: undefined, personalEmail: undefined, canBringBack: false },
  ]);
});

test('a broken member is left out instead of breaking the wall; an answer that is not a list is an error', () => {
  const broken = [{ ...neha, id: '' }, { ...neha, name: '' }, { ...neha, stream: 'sales' }, { ...neha, leftOn: '2026-02-30' }, { ...neha, leftOn: 'yesterday' }, null, 'Neha'];
  assert.deepEqual(toMembers([...broken, vikram]).map((m) => m.id), [vikram.id]);
  assert.throws(() => toMembers({ members: [] }), (e: unknown) => e instanceof ApiError && e.kind === 'unavailable');
});

test("who may mark someone as left matches the backend: whoever may delete them, never yourself, and only with a stream", () => {
  const allowed: [AccountRole, AccountRole][] = [
    ['Superadmin', 'Admin'],
    ['Superadmin', 'Subadmin'],
    ['Superadmin', 'Employee'],
    ['Superadmin', 'Intern'],
    ['Admin', 'Subadmin'],
    ['Admin', 'Employee'],
    ['Admin', 'Intern'],
  ];
  for (const actor of ACCOUNT_ROLES) {
    for (const target of ACCOUNT_ROLES) {
      const yes = allowed.some(([a, t]) => a === actor && t === target);
      assert.equal(canMarkLeft(actor, { accountRole: target, stream: 'tech' }, false) === '', yes, `${actor} → ${target}`);
    }
  }
  assert.match(canMarkLeft('Superadmin', { accountRole: 'Employee', stream: 'tech' }, true), /yourself/);
  assert.match(canMarkLeft('Admin', { accountRole: 'Employee' }, false), /stream/i);
  assert.match(canMarkLeft('Subadmin', { accountRole: 'Employee', stream: 'tech' }, false), /admins/i);
  // security report 2026-10-28 lead 10 (owner's A2): a blocked leaver could never be unblocked or brought back
  assert.match(canMarkLeft('Superadmin', { accountRole: 'Employee', stream: 'tech', status: 'inactive' }, false), /unblock/i);
  assert.equal(canMarkLeft('Superadmin', { accountRole: 'Employee', stream: 'tech', status: 'active' }, false), '');
});

test("a personal email is checked as the backend checks it; empty is fine (it takes the email away)", () => {
  assert.equal(personalEmailProblem('', 'asha@bharattech.example'), '');
  assert.equal(personalEmailProblem('  Asha.Home@Example.net ', 'asha@bharattech.example'), '');
  assert.match(personalEmailProblem('asha.home', 'asha@bharattech.example'), /name@gmail\.com/);
  assert.match(personalEmailProblem('ASHA@bharattech.example', 'asha@bharattech.example'), /work email/i);
  assert.match(personalEmailProblem(`${'a'.repeat(120)}@example.net`, ''), /long/i);
});

test("a refusal shows the backend's own words where they say what to do; otherwise a plain explanation", () => {
  const words = "Set their stream in Details first: it decides which community they join.";
  assert.equal(communityFailedMessage(new ApiError('bad-request', words)), words);
  assert.equal(communityFailedMessage(new ApiError('conflict', 'Someone else already uses this email.')), 'Someone else already uses this email.');
  assert.equal(communityFailedMessage(new ApiError('forbidden', "You can't bring this person back.")), "You can't bring this person back.");
  // the backend's 502 says Keycloak didn't answer and that nothing changed
  const kc = "Their sign-in couldn't be switched off right now, so nothing was changed. Try again in a minute.";
  assert.equal(communityFailedMessage(new ApiError('unavailable', kc)), kc);
  assert.match(communityFailedMessage(new ApiError('unavailable')), /couldn’t reach/);
  assert.match(communityFailedMessage(new ApiError('not-found')), /refreshed/);
  assert.equal(communityFailedMessage(new ApiError('busy')), BUSY_MESSAGE);
  assert.match(communityFailedMessage(new ApiError('signed-out')), /sign in again/i);
});

/** A stand-in backend that records each request and answers with the next reply. */
const backend = (...replies: [number, unknown][]) => {
  const calls: { url: string; method: string; body: unknown }[] = [];
  const request = async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const [status, body] = replies.shift() ?? [500, {}];
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  };
  const calls$ = communityCalls(createApi({ base: 'http://api.test/api', token: async () => 'token', signedIn: () => true, request: request as typeof fetch }));
  return { calls, community: calls$ };
};

test('each action goes to its own address with only what the backend reads', async () => {
  const { calls, community } = backend(
    [200, [neha]],
    [200, { member: { id: neha.id } }],
    [200, { person: { id: neha.id, name: 'Neha Kapoor' }, needsInvite: true }],
    [200, { personalEmail: '' }],
    [200, { personalEmail: 'asha.home@example.net' }],
    [200, { personalEmail: 'neha.2@example.net' }],
  );
  assert.equal((await community.members())[0].name, 'Neha Kapoor');
  await community.leave('6ad8 bc');
  assert.deepEqual(await community.bringBack(neha.id), { needsInvite: true });
  assert.equal(await community.myPersonalEmail(), '');
  assert.equal(await community.saveMyPersonalEmail(' Asha.Home@example.net '), 'asha.home@example.net');
  assert.equal(await community.saveMemberPersonalEmail(neha.id, 'neha.2@example.net'), 'neha.2@example.net');

  assert.deepEqual(
    calls.map((c) => [c.method, c.url.replace('http://api.test/api', ''), c.body]),
    [
      ['GET', '/community/members', undefined],
      ['POST', '/community/leave/6ad8%20bc', {}],
      ['POST', `/community/members/${neha.id}/back`, {}],
      ['GET', '/community/me/personal-email', undefined],
      ['PUT', '/community/me/personal-email', { personalEmail: 'asha.home@example.net' }],
      ['PUT', `/community/members/${neha.id}/personal-email`, { personalEmail: 'neha.2@example.net' }],
    ],
  );
});

test("a refused action rejects with the backend's reason, and a strange answer counts as no answer", async () => {
  const { community } = backend([409, { message: 'Someone else already uses this email.' }], [200, { nothing: true }], [200, { person: {} }]);
  await assert.rejects(community.saveMyPersonalEmail('x@example.net'), (e: unknown) => e instanceof ApiError && e.kind === 'conflict' && e.message === 'Someone else already uses this email.');
  await assert.rejects(community.myPersonalEmail(), (e: unknown) => e instanceof ApiError && e.kind === 'unavailable');
  assert.deepEqual(await community.bringBack(neha.id), { needsInvite: false });
});

/* ── Referrals (Part 2) ── */

// GET /api/community/referrals as the local backend returns it (controllers/referralController.js)
const SHARED = '2026-10-24T09:30:00.000Z';
const go = { id: '6ad8bc3dd430c9b545aa5001', stream: 'tech', title: 'Backend Engineer (Go)', company: 'Northwind Logistics', link: 'https://northwind.example.com/careers', note: 'Ask for Meghna.', sharedBy: 'Test Admin', sharedOn: SHARED, emailed: 2, failed: 1 };

test('referrals come in as the list shows them, dated in the viewer’s own day, in the backend’s order', () => {
  const plain = { ...go, id: '6ad8bc3dd430c9b545aa5002', link: '', note: '', emailed: 0, failed: 0 };
  assert.deepEqual(toReferrals([go, plain]), [
    { id: go.id, stream: 'tech', title: 'Backend Engineer (Go)', company: 'Northwind Logistics', link: 'https://northwind.example.com/careers', note: 'Ask for Meghna.', postedBy: 'Test Admin', posted: localDay(Date.parse(SHARED)), emailed: 2, failed: 1 },
    { id: plain.id, stream: 'tech', title: 'Backend Engineer (Go)', company: 'Northwind Logistics', link: '', note: '', postedBy: 'Test Admin', posted: localDay(Date.parse(SHARED)), emailed: 0, failed: 0 },
  ]);
});

test('a broken referral is left out, and a link that isn’t a web address is never shown as one', () => {
  const broken = [{ ...go, id: '' }, { ...go, title: '' }, { ...go, company: '' }, { ...go, stream: 'sales' }, { ...go, sharedOn: 'soon' }, null];
  assert.deepEqual(toReferrals([...broken, go]).map((r) => r.id), [go.id]);
  assert.equal(toReferrals([{ ...go, link: 'javascript:alert(1)' }])[0].link, '');
  assert.throws(() => toReferrals({}), (e: unknown) => e instanceof ApiError && e.kind === 'unavailable');
});

test('the share form checks what the backend checks, and sends only what it reads', () => {
  const draft = { stream: 'tech' as const, title: ' Backend Engineer ', company: ' Northwind ', link: ' https://northwind.example.com/jobs?a=1&b=2 ', note: ' Ask for Meghna. ' };
  assert.equal(referralProblem(draft), '');
  assert.match(referralProblem({ ...draft, title: ' ' }), /role/i);
  assert.match(referralProblem({ ...draft, company: '' }), /company/i);
  assert.match(referralProblem({ ...draft, title: 'x'.repeat(121) }), /120/);
  assert.match(referralProblem({ ...draft, company: 'x'.repeat(121) }), /120/);
  assert.match(referralProblem({ ...draft, note: 'x'.repeat(501) }), /500/);
  for (const link of ['javascript:alert(1)', 'ftp://x.example.com', 'northwind.example.com']) assert.match(referralProblem({ ...draft, link }), /https?:\/\//, link);
  assert.equal(referralProblem({ ...draft, link: '', note: '' }), '');
  assert.deepEqual(referralBody({ ...draft, extra: 'no' } as typeof draft), { stream: 'tech', title: 'Backend Engineer', company: 'Northwind', link: 'https://northwind.example.com/jobs?a=1&b=2', note: 'Ask for Meghna.' });
});

test('each referral says who it was emailed to, without naming anyone', () => {
  assert.equal(emailedLine({ stream: 'tech', emailed: 1, failed: 0 }), 'Emailed to 1 member');
  assert.equal(emailedLine({ stream: 'tech', emailed: 3, failed: 0 }), 'Emailed to 3 members');
  assert.equal(emailedLine({ stream: 'tech', emailed: 2, failed: 1 }), 'Emailed to 2 of 3 members; 1 couldn’t be sent');
  assert.equal(emailedLine({ stream: 'hr', emailed: 0, failed: 2 }), 'Couldn’t be emailed to the 2 members; pass it on by hand');
  assert.equal(emailedLine({ stream: 'finance', emailed: 0, failed: 0 }), 'Nobody in the Finance community has a personal email yet, so it wasn’t emailed');
});

test('sharing, listing and removing go to their own addresses', async () => {
  const { calls, community } = backend([200, [go]], [201, { referral: go }], [200, { message: 'Referral removed.' }]);
  assert.equal((await community.referrals())[0].title, 'Backend Engineer (Go)');
  const shared = await community.shareReferral({ stream: 'tech', title: ' Backend Engineer (Go) ', company: 'Northwind Logistics', link: '', note: '' });
  assert.deepEqual([shared.id, shared.emailed], [go.id, 2]);
  await community.removeReferral('6ad8 bc');
  assert.deepEqual(
    calls.map((c) => [c.method, c.url.replace('http://api.test/api', ''), c.body]),
    [
      ['GET', '/community/referrals', undefined],
      ['POST', '/community/referrals', { stream: 'tech', title: 'Backend Engineer (Go)', company: 'Northwind Logistics', link: '', note: '' }],
      ['DELETE', '/community/referrals/6ad8%20bc', undefined],
    ],
  );
});

test('a share the backend answers oddly counts as not saved, so the page never claims who was emailed', async () => {
  const { community } = backend([201, { nothing: true }], [201, { referral: { ...go, title: '' } }]);
  for (let i = 0; i < 2; i++) await assert.rejects(community.shareReferral({ stream: 'tech', title: 'Role', company: 'Co', link: '', note: '' }), (e: unknown) => e instanceof ApiError && e.kind === 'unavailable');
});

/* ── Internal jobs (Part 3) ── */

const POSTED = '2026-10-24T10:00:00.000Z';
const APP_ID = '6ad8bc3dd430c9b545aa7001';
const frontendJob = {
  id: '6ad8bc3dd430c9b545aa6001', stream: 'tech', title: 'Frontend Engineer', about: 'Build the portal.', location: 'Kanpur', mode: 'hybrid', experience: '1+ year',
  openings: 2, closes: '2026-11-15', criteria: ['Worked with us for a year'], check: 'A 45-minute test.', applyEmail: 'hr@bharattech.example',
  postedBy: 'Test Admin', postedOn: POSTED, open: true, emailed: 3, failed: 0,
  applicants: [{ id: APP_ID, personId: neha.id, name: 'Neha Kapoor', stage: 'eligible', updatedAt: POSTED, hasPersonalEmail: true }],
};

test('jobs come in as the page shows them, with applicants only when the backend sent them', () => {
  const [job] = toJobs([frontendJob]);
  assert.deepEqual(job, {
    id: frontendJob.id, stream: 'tech', title: 'Frontend Engineer', about: 'Build the portal.', location: 'Kanpur', mode: 'hybrid', experience: '1+ year',
    openings: 2, closes: '2026-11-15', criteria: ['Worked with us for a year'], check: 'A 45-minute test.', applyEmail: 'hr@bharattech.example',
    postedBy: 'Test Admin', posted: localDay(Date.parse(POSTED)), open: true, emailed: 3, failed: 0,
    applicants: [{ id: APP_ID, personId: neha.id, name: 'Neha Kapoor', stage: 'eligible', updated: localDay(Date.parse(POSTED)), hasPersonalEmail: true }],
  });
  const { applicants: _gone, ...forSubadmin } = frontendJob;
  assert.equal(toJobs([forSubadmin])[0].applicants, undefined);
  assert.equal(toJobs([{ ...frontendJob, closes: '' }])[0].closes, undefined);
});

test('a broken job or applicant is left out; an answer that is not a list is an error', () => {
  const broken = [{ ...frontendJob, id: '' }, { ...frontendJob, stream: 'sales' }, { ...frontendJob, mode: 'anywhere' }, { ...frontendJob, openings: 0 }, { ...frontendJob, postedOn: 'soon' }, null];
  assert.deepEqual(toJobs([...broken, frontendJob]).map((j) => j.id), [frontendJob.id]);
  const odd = { ...frontendJob, applicants: [{ ...frontendJob.applicants[0], stage: 'hired' }, frontendJob.applicants[0]] };
  assert.equal(toJobs([odd])[0].applicants!.length, 1);
  assert.throws(() => toJobs({}), (e: unknown) => e instanceof ApiError && e.kind === 'unavailable');
});

test('the post form checks what the backend checks, and sends only what it reads', () => {
  const today = '2026-10-24';
  const draft = { stream: 'tech' as const, title: ' Frontend Engineer ', about: ' Build it. ', location: ' Kanpur ', mode: 'hybrid' as const, experience: ' 1+ year ', openings: 2, closes: '', criteria: [' A year with us ', ' '], check: ' A test. ', applyEmail: ' HR@Example.com ' };
  assert.equal(jobProblem(draft, today), '');
  const refused: [Partial<typeof draft>, RegExp][] = [
    [{ title: '' }, /role/i], [{ about: '' }, /involves/i], [{ location: '' }, /based/i], [{ experience: '' }, /experience/i],
    [{ openings: 0 }, /1 to 50/], [{ openings: 51 }, /1 to 50/], [{ openings: 1.5 }, /1 to 50/],
    [{ closes: '2026-10-23' }, /passed/i], [{ criteria: [' '] }, /who can apply/i], [{ criteria: Array.from({ length: 11 }, (_, i) => `L${i}`) }, /10/],
    [{ check: '' }, /knowledge check/i], [{ applyEmail: 'hr at example' }, /email/i], [{ title: 'x'.repeat(121) }, /120/],
  ];
  for (const [change, pattern] of refused) assert.match(jobProblem({ ...draft, ...change }, today), pattern, JSON.stringify(change).slice(0, 40));
  assert.equal(jobProblem({ ...draft, closes: today }, today), '');
  assert.deepEqual(jobBody({ ...draft, extra: 1 } as typeof draft), {
    stream: 'tech', title: 'Frontend Engineer', about: 'Build it.', location: 'Kanpur', mode: 'hybrid', experience: '1+ year', openings: 2, closes: '', criteria: ['A year with us'], check: 'A test.', applyEmail: 'hr@example.com',
  });
});

test('each stage offers only the next steps the backend allows', () => {
  assert.deepEqual(nextStages('applied'), ['eligible', 'declined']);
  assert.deepEqual(nextStages('eligible'), ['checking']);
  assert.deepEqual(nextStages('checking'), ['rejoined', 'declined']);
  assert.deepEqual(nextStages('rejoined'), []);
  assert.deepEqual(nextStages('declined'), []);
});

test('a job id with odd characters is encoded, so it can never reach another address', async () => {
  const { calls, community } = backend([200, { message: 'Internal job deleted.' }]);
  await community.removeJob('../users 1');
  assert.equal(calls[0].url, 'http://api.test/api/community/jobs/..%2Fusers%201');
});

test('job actions go to their own addresses, with the stage the page saw', async () => {
  const { calls, community } = backend(
    [200, [frontendJob]],
    [201, { job: frontendJob }],
    [200, { job: { ...frontendJob, open: false } }],
    [201, { job: frontendJob }],
    [200, { job: frontendJob, emailed: true }],
    [200, { job: frontendJob, emailed: false, needsInvite: true }],
    [200, { message: 'Internal job deleted.' }],
  );
  assert.equal((await community.jobs())[0].title, 'Frontend Engineer');
  await community.postJob({ stream: 'tech', title: 'Frontend Engineer', about: 'a', location: 'b', mode: 'onsite', experience: 'c', openings: 1, closes: '', criteria: ['d'], check: 'e', applyEmail: 'hr@example.com' });
  assert.equal((await community.setJobOpen(frontendJob.id, false)).open, false);
  await community.addApplicant(frontendJob.id, neha.id);
  assert.equal((await community.moveApplicant(frontendJob.id, APP_ID, 'eligible', 'checking', ' https://t.example ')).emailed, true);
  const rejoined = await community.moveApplicant(frontendJob.id, APP_ID, 'checking', 'rejoined');
  assert.deepEqual([rejoined.emailed, rejoined.needsInvite], [false, true]);
  await community.removeJob(frontendJob.id);
  const stage = `/community/jobs/${frontendJob.id}/applicants/${APP_ID}/stage`;
  assert.deepEqual(
    calls.map((c) => [c.method, c.url.replace('http://api.test/api', ''), c.body]),
    [
      ['GET', '/community/jobs', undefined],
      ['POST', '/community/jobs', { stream: 'tech', title: 'Frontend Engineer', about: 'a', location: 'b', mode: 'onsite', experience: 'c', openings: 1, closes: '', criteria: ['d'], check: 'e', applyEmail: 'hr@example.com' }],
      ['PATCH', `/community/jobs/${frontendJob.id}`, { open: false }],
      ['POST', `/community/jobs/${frontendJob.id}/applicants`, { personId: neha.id }],
      ['POST', stage, { from: 'eligible', to: 'checking', instructions: 'https://t.example' }],
      ['POST', stage, { from: 'checking', to: 'rejoined' }],
      ['DELETE', `/community/jobs/${frontendJob.id}`, undefined],
    ],
  );
});

/* Staff who joined ahead of leaving (owner's 1A 2A 3A 4A, 2026-10-26) */

test('early joiners keep their stream, or none yet; only admins are sent their Employee ID and personal email', () => {
  assert.deepEqual(
    toJoiners([
      { id: 'a1', name: 'Asha Rao', stream: 'tech', employeeId: 'BT-0007', personalEmail: 'asha.home@example.net' },
      { id: 'z1', name: 'Zoya Khan', stream: null },
      { id: 'q1', name: 'Odd Stream', stream: 'sales' },
      { id: '', name: 'No id', stream: 'tech' },
      { id: 'n1', name: ' ', stream: 'tech' },
      'junk',
    ]),
    [
      { id: 'a1', name: 'Asha Rao', stream: 'tech', employeeId: 'BT-0007', personalEmail: 'asha.home@example.net' },
      { id: 'z1', name: 'Zoya Khan', stream: null, employeeId: undefined, personalEmail: undefined },
      { id: 'q1', name: 'Odd Stream', stream: null, employeeId: undefined, personalEmail: undefined },
    ],
  );
  assert.throws(() => toJoiners({ joiners: [] }), ApiError);
});

test('the early joiners come from their own address', async () => {
  const { calls, community } = backend([200, [{ id: 'a1', name: 'Asha Rao', stream: 'tech' }]]);
  assert.equal((await community.joiners())[0].name, 'Asha Rao');
  assert.deepEqual(calls.map((c) => [c.method, c.url.replace('http://api.test/api', '')]), [['GET', '/community/joiners']]);
});
