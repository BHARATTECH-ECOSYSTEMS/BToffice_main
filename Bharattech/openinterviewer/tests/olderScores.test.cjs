// Scores for interviews held before answers were scored (owner, 2026-10-28; 1A 2A). The server pairs each interviewer
// message in the old transcript with the candidate's reply; the AI says which pairs are scorable (project / code) and
// gives a verdict; the server works out the percentages as for new interviews and keeps the result once, marked as
// estimated (no planted bug was on record). The interview's Synthesis & Insights tab asks for it the first time it is
// opened, and the study's Interviews tab can score the rest.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readFileSync } = require('node:fs');
const mongoose = require('mongoose');
const { emptyDatabase, closeDatabase, jsonRequest, signInResearcher, signOut, saveStudy, studyConfig } = require('./support/helpers.cjs');
const { providerCalls, scriptScores } = require('./support/fakeProviders.cjs');

const { transcriptPairs, buildEstimatedScorecard, scorecardOf } = require('@/lib/scoring');
const { POST: scoreInterview } = require('@/app/api/interviews/[id]/score/route');
const { saveInterview } = require('@/lib/kv');

const msg = (role, content) => ({ id: `${role}-${content.slice(0, 8)}`, role, content, timestamp: 1 });
const OLD_TRANSCRIPT = [
  msg('ai', 'Welcome! Are you ready to begin?'),
  msg('user', 'Yes'),
  msg('ai', 'Please introduce yourself.'),
  msg('user', 'I am Asha, a Node developer.'),
  msg('ai', 'Thanks.\nWhat is the event loop in Node.js?'),
  msg('user', 'It runs callbacks from a queue'),
  msg('user', 'after the call stack is empty.'),
  msg('ai', 'Look at this:\n```js\n1. for (var i = 0; i < 3; i++) setTimeout(() => console.log(i));\n```\nWhat does it print?'),
  msg('user', '0 1 2'),
  msg('ai', 'Thank you for your time. This concludes the interview.'),
];

test('each interviewer message is paired with every reply the candidate gave to it', () => {
  const pairs = transcriptPairs(OLD_TRANSCRIPT);
  assert.deepEqual(pairs.map((p) => p.id), ['P1', 'P2', 'P3', 'P4']);
  assert.equal(pairs[2].answer, 'It runs callbacks from a queue / after the call stack is empty.');
  assert.equal(pairs[2].label, 'What is the event loop in Node.js?');
  assert.equal(pairs[3].label, 'Code question');
  assert.deepEqual(transcriptPairs([msg('ai', 'Ready?')]), [], 'a message with no reply is not scored');
});

test('the estimated scorecard counts only what the AI found scorable, and says it is estimated', () => {
  const pairs = transcriptPairs(OLD_TRANSCRIPT);
  const card = buildEstimatedScorecard(pairs, [
    { id: 'P1', kind: 'skip' },
    { id: 'P2', kind: 'skip' },
    { id: 'P3', kind: 'project', verdict: 'partly', reason: 'vague' },
    { id: 'P4', kind: 'code', verdict: 'wrong', reason: 'it prints 3 3 3' },
  ]);
  assert.equal(card.estimated, true);
  assert.equal(card.overall, 25);
  assert.deepEqual(card.byKind, { project: 50, code: 0 });
  assert.equal(card.total, 2);
  assert.equal(buildEstimatedScorecard(pairs, [{ id: 'P1', kind: 'skip' }]), null);
});

test("an interview's score is the one in its summary, else the estimated one kept beside it", () => {
  assert.equal(scorecardOf({ synthesis: { scorecard: { overall: 80 } }, scorecard: { overall: 10 } }).overall, 80);
  assert.equal(scorecardOf({ synthesis: { bottomLine: 'x' }, scorecard: { overall: 10, estimated: true } }).overall, 10);
  assert.equal(scorecardOf({ synthesis: null }), null);
});

/* ── the score route ── */

const STUDY = studyConfig('older-study', { name: 'Node developer', jobRequirements: 'Node.js' });
const interviews = () => mongoose.connection.collection('interviews');
const oldInterview = (id, transcript, extra = {}) =>
  saveInterview({ id, studyId: STUDY.id, studyName: STUDY.name, participantProfile: { fields: [] }, transcript, messages: transcript, history: transcript, synthesis: { bottomLine: 'Old summary', keyInsights: [], themes: [], statedPreferences: [], revealedPreferences: [], contradictions: [] }, behaviorData: {}, createdAt: 1, completedAt: 2, status: 'completed', ...extra });
const score = (id) => scoreInterview(jsonRequest(`/api/interviews/${id}/score`, { body: {} }), { params: { id } });

before(async () => {
  await emptyDatabase();
  await saveStudy(STUDY);
});
after(closeDatabase);
beforeEach(() => {
  signOut();
  providerCalls.length = 0;
});

test('only a signed-in researcher can score an interview', async () => {
  await oldInterview('old-0', OLD_TRANSCRIPT);
  assert.equal((await score('old-0')).status, 401);
});

test('an older interview is scored once, kept as estimated, and its summary is left as it was', async () => {
  await signInResearcher();
  await oldInterview('old-1', OLD_TRANSCRIPT);
  scriptScores([{ id: 'P3', kind: 'project', verdict: 'correct', reason: 'r' }, { id: 'P4', kind: 'code', verdict: 'partly', reason: 'r' }]);
  const res = await score('old-1');
  assert.equal(res.status, 200);
  assert.equal((await res.json()).scorecard.overall, 75);
  const saved = await interviews().findOne({ id: 'old-1' });
  assert.equal(saved.scorecard.estimated, true);
  assert.equal(saved.synthesis.bottomLine, 'Old summary');
  assert.equal(providerCalls.filter((c) => c.kind === 'score').length, 1);
  // asked again: the kept score, no second AI call
  assert.equal((await (await score('old-1')).json()).scorecard.overall, 75);
  assert.equal(providerCalls.filter((c) => c.kind === 'score').length, 1);
});

test('an interview that already has a score from its summary is not scored again', async () => {
  await signInResearcher();
  await oldInterview('new-1', OLD_TRANSCRIPT, { synthesis: { bottomLine: 'x', scorecard: { overall: 90, byKind: {}, items: [], scored: 0, total: 0 } } });
  assert.equal((await (await score('new-1')).json()).scorecard.overall, 90);
  assert.equal(providerCalls.length, 0);
});

test('nothing to score, or an AI that finds nothing scorable: 422 and nothing kept', async () => {
  await signInResearcher();
  await oldInterview('old-2', [msg('ai', 'Ready?')]);
  const empty = await score('old-2');
  assert.equal(empty.status, 422);
  assert.match((await empty.json()).error, /Not enough answers to score/);
  assert.equal(providerCalls.length, 0);
  await oldInterview('old-3', OLD_TRANSCRIPT);
  scriptScores([{ id: 'P1', kind: 'skip' }]);
  assert.equal((await score('old-3')).status, 422);
  assert.equal((await interviews().findOne({ id: 'old-3' })).scorecard ?? null, null);
});

test('an AI failure: 502, so the page can offer to try again', async () => {
  await signInResearcher();
  await oldInterview('old-4', OLD_TRANSCRIPT);
  scriptScores(null);
  assert.equal((await score('old-4')).status, 502);
});

/* ── where it shows ── */

test('the tab asks for the score when it is missing, and the study page can score the rest', () => {
  const read = (f) => readFileSync(path.join(__dirname, '..', 'src', 'components', f), 'utf8');
  const detail = read('InterviewDetail.tsx');
  assert.match(detail, /fetch\(`\/api\/interviews\/\$\{interviewId\}\/score`/);
  assert.match(detail, /Scoring answers/);
  assert.match(detail, /<ScoreCard scorecard=\{scorecard\} \/>/);
  assert.match(read('ScoreCard.tsx'), /Estimated from the transcript/);
  const list = read('StudyDetail.tsx');
  assert.match(list, /Score older interviews/);
  assert.match(list, /scorecardOf\(interview\)/);
  assert.match(list, /estimated \? '≈ ' : ''/);
});
