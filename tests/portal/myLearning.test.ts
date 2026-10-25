import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchMyLearning, learningLink, toMyLearning } from '../../src/portal/myLearning';
import { isLmsLink } from '../../src/portal/lmsHandoff';
import { readToolLinks } from '../../src/portal/toolLinks';

// Group C Part 6 (2026-10-26, owner's 6A): the dashboard's "My learning" lists the courses someone is enrolled in on the
// LMS Platform with how far they are; each opens that course's player, and the hand-over signs them in there too.

const PLATFORM = 'http://localhost:5175/';
const API = 'http://localhost:5176';

test('the LMS reply becomes rows, unknown or broken entries left out', () => {
  const rows = toMyLearning({
    data: {
      courses: [
        { courseId: 'c1', courseTitle: 'Basics', educatorName: 'Asha Rao', done: 1, total: 4, completed: false },
        { courseId: 'c2', courseTitle: 'Extra', educatorName: '', done: 2, total: 2, completed: true },
        { courseId: '', courseTitle: 'No id' },
        { courseId: 'c4', courseTitle: '   ', done: 'x', total: -1 },
        // more done than there are lectures, or "completed" with none: read as what can be true
        { courseId: 'c5', courseTitle: 'Odd', done: 9, total: 2, completed: false },
        { courseId: 'c6', courseTitle: 'Empty', done: 0, total: 0, completed: true },
        null,
      ],
    },
  });
  assert.deepEqual(rows, [
    { id: 'c1', title: 'Basics', educator: 'Asha Rao', done: 1, total: 4, completed: false, percent: 25 },
    { id: 'c2', title: 'Extra', educator: undefined, done: 2, total: 2, completed: true, percent: 100 },
    { id: 'c4', title: 'Untitled course', educator: undefined, done: 0, total: 0, completed: false, percent: 0 },
    { id: 'c5', title: 'Odd', educator: undefined, done: 2, total: 2, completed: false, percent: 100 },
    { id: 'c6', title: 'Empty', educator: undefined, done: 0, total: 0, completed: false, percent: 0 },
  ]);
  assert.deepEqual(toMyLearning({ data: { courses: 'nope' } }), []);
});

test("each course opens its player on the LMS Platform", () => {
  assert.equal(learningLink(PLATFORM, 'c1'), 'http://localhost:5175/player/c1');
  assert.equal(learningLink('http://localhost:5175', 'a/b'), 'http://localhost:5175/player/a%2Fb');
});

test('the sign-in is handed over for any page of the LMS Platform, and nowhere else', () => {
  assert.equal(isLmsLink('http://localhost:5175/', PLATFORM), true);
  assert.equal(isLmsLink('http://localhost:5175/player/c1', PLATFORM), true);
  assert.equal(isLmsLink('http://localhost:5175/my-enrollments', PLATFORM), true);
  assert.equal(isLmsLink('http://localhost:5176/player/c1', PLATFORM), false);
  assert.equal(isLmsLink('https://evil.test/player/c1', PLATFORM), false);
  assert.equal(isLmsLink('http://localhost:5175/', undefined), false);
});

test('the LMS API address is a setting of its own, web addresses only', () => {
  assert.equal(readToolLinks({ VITE_LMS_API_URL: ` ${API} ` }).lmsApi, API);
  assert.equal(readToolLinks({ VITE_LMS_API_URL: 'javascript:alert(1)' }).lmsApi, undefined);
});

test('the list is asked for with the portal sign-in, and failures say what kind they are', async () => {
  const asked: { url: string; auth: string | null }[] = [];
  const answer = (status: number, body: unknown) => (async (url: string, init?: RequestInit) => {
    asked.push({ url, auth: new Headers(init?.headers).get('Authorization') });
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;

  const ok = await fetchMyLearning(API, async () => 'token-1', answer(200, { data: { courses: [{ courseId: 'c1', courseTitle: 'Basics', done: 0, total: 1, completed: false }] } }));
  assert.equal(ok.kind, 'ready');
  assert.deepEqual(asked[0], { url: 'http://localhost:5176/api/user/learning', auth: 'Bearer token-1' });

  assert.deepEqual(await fetchMyLearning(API, async () => 'token-1', answer(401, {})), { kind: 'error', reason: 'signed-out' });
  assert.deepEqual(await fetchMyLearning(API, async () => null, answer(200, {})), { kind: 'error', reason: 'signed-out' });
  assert.deepEqual(await fetchMyLearning(API, async () => 'token-1', answer(500, {})), { kind: 'error', reason: 'unavailable' });
  const offline = (async () => {
    throw new TypeError('Failed to fetch');
  }) as unknown as typeof fetch;
  assert.deepEqual(await fetchMyLearning(API, async () => 'token-1', offline), { kind: 'error', reason: 'unavailable' });
});
