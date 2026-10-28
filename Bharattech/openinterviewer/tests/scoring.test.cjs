// The answer score (owner, 2026-10-28: every question; shown on the interview's Synthesis & Insights tab and in the
// study's interview list). The server picks the scored questions and pairs each with the candidate's final answer; the
// AI only says correct / partly / wrong per answer; the server works out the percentages (correct 1, partly ½, wrong 0).
const { test, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readFileSync } = require('node:fs');
const { randomUUID } = require('node:crypto');
const { emptyDatabase, closeDatabase, jsonRequest, signOut, saveStudy, makeLink, studyConfig } = require('./support/helpers.cjs');
const { providerCalls, scriptTurns } = require('./support/fakeProviders.cjs');

const { scoredQuestions, buildScorecard } = require('@/lib/scoring');
const { POST: interviewTurn } = require('@/app/api/interview/route');
const { POST: complete } = require('@/app/api/interview/complete/route');
const { getInterviewProvider } = require(path.join(__dirname, '..', 'src', 'lib', 'providers', 'index.ts'));

const ex = (step, question, answer, note) => ({ step, question, answer, at: 1, ...(note && { note }) });
// each turn: the candidate's answer, then the question that followed it (and that question's step)
const EXCHANGES = [
  ex('introduction', 'Please introduce yourself.', 'ready'),
  ex('project', 'Describe a project.', 'I am Rohan'),
  ex('deepdive', 'How did you keep inventory consistent?', 'I built ShopFlow', 'Project analysis: ...'),
  ex('reask', 'How did you keep inventory consistent? (again)', 'what is the weather'),
  ex('core:0', 'Why do you want this job?', 'Row locks in a transaction'),
  ex('snippet:frontend', 'Snippet 1 of 3: Frontend\n```jsx\n1. x\n```\nWhich line has the bug?', 'I like the team', 'frontend snippet: line 8: missing deps. Fix: add []'),
  ex('retry', 'Sorry, something went wrong on my side.', 'Line 8, the effect has no dependency list'),
  ex('ending', 'Thank you.', 'Line 8, the effect has no dependency list'),
];

test('scored: every project, fixed and code question, each with the final answer to it', () => {
  const qs = scoredQuestions(EXCHANGES);
  assert.deepEqual(qs.map((q) => [q.id, q.kind, q.step]), [['Q1', 'project', 'deepdive'], ['Q2', 'fixed', 'core:0'], ['Q3', 'code', 'snippet:frontend']]);
  // a re-asked question is answered by what came after the re-ask, all of it kept
  assert.equal(qs[0].answer, 'what is the weather / Row locks in a transaction');
  assert.equal(qs[1].answer, 'I like the team');
  assert.equal(qs[2].answer, 'Line 8, the effect has no dependency list');
  assert.equal(qs[2].bug, 'frontend snippet: line 8: missing deps. Fix: add []');
  assert.equal(qs[2].label, 'Snippet 1 of 3: Frontend');
});

test('the percentages: correct 1, partly half, wrong 0, overall and per kind', () => {
  const qs = scoredQuestions(EXCHANGES);
  const card = buildScorecard(qs, [
    { id: 'Q1', verdict: 'correct', reason: 'sound' },
    { id: 'Q2', verdict: 'partly', reason: 'vague' },
    { id: 'Q3', verdict: 'wrong', reason: 'missed it' },
  ]);
  assert.equal(card.overall, 50);
  assert.deepEqual(card.byKind, { project: 100, fixed: 50, code: 0 });
  assert.deepEqual(card.items.map((i) => [i.id, i.verdict, i.reason]), [['Q1', 'correct', 'sound'], ['Q2', 'partly', 'vague'], ['Q3', 'wrong', 'missed it']]);
});

test('a verdict that is missing or unknown leaves that question unscored; none at all means no score', () => {
  const qs = scoredQuestions(EXCHANGES);
  const card = buildScorecard(qs, [{ id: 'Q1', verdict: 'Correct' }, { id: 'Q9', verdict: 'correct' }, { id: 'Q2', verdict: 'great' }]);
  assert.equal(card.overall, 100);
  assert.equal(card.scored, 1);
  assert.equal(card.total, 3);
  assert.equal(buildScorecard(qs, 'nonsense'), null);
  assert.equal(buildScorecard([], []), null);
});

/* ── the summary asks Groq for the verdicts (fetch replaced: nothing leaves) ── */

let realFetch;
beforeEach(() => {
  signOut();
  providerCalls.length = 0;
  realFetch = global.fetch;
  process.env.GROQ_API_KEY = 'gsk_test_key';
});
afterEach(() => {
  global.fetch = realFetch;
  delete process.env.GROQ_API_KEY;
});

test('the summary sends the scored questions with the planted bug and returns the scorecard', async () => {
  let prompt = '';
  global.fetch = async (url, init) => {
    prompt = JSON.parse(init.body).messages[0].content;
    const content = JSON.stringify({ statedPreferences: [], revealedPreferences: [], themes: [], contradictions: [], keyInsights: ['ok'], bottomLine: 'Fine', scores: [{ id: 'Q1', verdict: 'correct', reason: 'r1' }, { id: 'Q2', verdict: 'correct', reason: 'r2' }, { id: 'Q3', verdict: 'partly', reason: 'r3' }] });
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
  };
  const study = studyConfig('s', { name: 'Dev' });
  const result = await getInterviewProvider(study).synthesizeInterview([], study, {}, null, 'notes', scoredQuestions(EXCHANGES));
  assert.match(prompt, /Q3 \(code\)/);
  assert.match(prompt, /PLANTED BUG: frontend snippet: line 8/);
  assert.equal(result.scorecard.overall, 83);
  assert.deepEqual(result.scorecard.byKind, { project: 100, fixed: 100, code: 50 });
});

/* ── through the routes, with the stand-in AI ── */

const STUDY = studyConfig('score-study', { name: 'Backend developer', jobRequirements: 'Node.js, PostgreSQL' });
before(async () => {
  await emptyDatabase();
  await saveStudy(STUDY);
});
after(closeDatabase);

test("finishing hands the summary the candidate's scored questions", async () => {
  const token = await makeLink(`link-${randomUUID()}`, STUDY);
  scriptTurns({});
  for (let i = 0; i < 12; i++) {
    const body = await (await interviewTurn(jsonRequest('/api/interview', { headers: { Authorization: `Bearer ${token}` }, body: { history: [{ id: randomUUID(), role: 'user', content: `answer ${i}`, timestamp: Date.now() }], participantProfile: null, questionProgress: { questionsAsked: [], currentPhase: 'introduction' }, currentContext: '' } }))).json();
    if (body.shouldConclude) break;
  }
  providerCalls.length = 0;
  assert.equal((await complete(jsonRequest('/api/interview/complete', { headers: { Authorization: `Bearer ${token}` }, body: { history: [] } }))).status, 200);
  for (let i = 0; i < 40 && !providerCalls.some((c) => c.kind === 'synthesis'); i++) await new Promise((r) => setTimeout(r, 25));
  const call = providerCalls.find((c) => c.kind === 'synthesis');
  assert.deepEqual(call.questions.map((q) => q.kind), ['project', 'project', 'project', 'code', 'code', 'code']);
});

/* ── where it shows ── */

test('the Synthesis & Insights tab and the interview list show the score', () => {
  const detail = readFileSync(path.join(__dirname, '..', 'src', 'components', 'InterviewDetail.tsx'), 'utf8');
  // since the older-interview scores, both read the score through scorecardOf (summary first, then the estimated one)
  assert.match(detail, /const scorecard = interview \? scorecardOf\(interview\) : null;/);
  assert.match(detail, /<ScoreCard scorecard=\{scorecard\} \/>/);
  const list = readFileSync(path.join(__dirname, '..', 'src', 'components', 'StudyDetail.tsx'), 'utf8');
  assert.match(list, /scorecardOf\(interview\)/);
  assert.match(list, /\{card\.overall\}%/);
});
