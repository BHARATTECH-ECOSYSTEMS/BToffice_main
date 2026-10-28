// The interview's order (owner, 2026-10-28; 1A 2B 3 "frontend, backend, database" 4A 5A): introduction, the
// candidate's project, 3 or 4 questions the AI draws from it (the AI decides when it reads the project), the
// researcher's own fixed questions, then three code snippets, one frontend, one backend, one database, each with one
// planted bug. The server picks each step from the turns it saved itself, so neither the AI nor the browser can skip
// or cut the interview short.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { emptyDatabase, closeDatabase, jsonRequest, signOut, saveStudy, makeLink, studyConfig } = require('./support/helpers.cjs');
const { providerCalls, scriptTurns } = require('./support/fakeProviders.cjs');

const { nextStep, phaseOf, SNIPPET_KINDS } = require('@/lib/interviewFlow');
const { POST: interviewTurn } = require('@/app/api/interview/route');
const { POST: complete } = require('@/app/api/interview/complete/route');
const { getParticipantToken } = require('@/lib/kv');
const { serverTranscript } = require('@/lib/transcript');

const asked = (...steps) => steps.map((s) => (typeof s === 'string' ? { step: s } : s));

test('the order: introduction, project, the planned project questions, fixed questions, three snippets, end', () => {
  assert.deepEqual(SNIPPET_KINDS, ['frontend', 'backend', 'database']);
  assert.equal(nextStep([], 0), 'introduction');
  assert.equal(nextStep(asked('introduction'), 0), 'project');
  assert.equal(nextStep(asked('introduction', 'project'), 0), 'deepdive');
  const three = asked('introduction', 'project', { step: 'deepdive', planned: 3 }, 'deepdive');
  assert.equal(nextStep(three, 0), 'deepdive');
  assert.equal(nextStep([...three, { step: 'deepdive' }], 0), 'snippet:frontend');
  const four = asked('introduction', 'project', { step: 'deepdive', planned: 4 }, 'deepdive', 'deepdive');
  assert.equal(nextStep(four, 0), 'deepdive');
  assert.equal(nextStep([...four, { step: 'deepdive' }], 2), 'core:0');
  const done = [...four, { step: 'deepdive' }, ...asked('core:0', 'core:1')];
  assert.equal(nextStep(done, 2), 'snippet:frontend');
  assert.equal(nextStep([...done, ...asked('snippet:frontend')], 2), 'snippet:backend');
  assert.equal(nextStep([...done, ...asked('snippet:frontend', 'snippet:backend')], 2), 'snippet:database');
  assert.equal(nextStep([...done, ...asked('snippet:frontend', 'snippet:backend', 'snippet:database')], 2), 'ending');
});

test('a re-asked question or a retry after an AI failure does not count as a step', () => {
  assert.equal(nextStep(asked('introduction', 'reask', 'retry'), 0), 'project');
  // anything but 3 or 4 planned means 3
  assert.equal(nextStep(asked('introduction', 'project', { step: 'deepdive', planned: 9 }, 'deepdive', 'deepdive'), 0), 'snippet:frontend');
});

test('the progress bar shows five stages', () => {
  assert.equal(phaseOf('introduction'), 'introduction');
  assert.equal(phaseOf('project'), 'project');
  assert.equal(phaseOf('deepdive'), 'questions');
  assert.equal(phaseOf('core:1'), 'questions');
  assert.equal(phaseOf('snippet:database'), 'code');
  assert.equal(phaseOf('ending'), 'ending');
});

/* ── through the real route, with the stand-in AI ── */

const STUDY = studyConfig('flow-study', { name: 'Backend developer', jobTitle: 'Full-stack developer', jobRequirements: 'React, Node.js, PostgreSQL' });
before(async () => {
  await emptyDatabase();
  await saveStudy(STUDY);
});
after(closeDatabase);
beforeEach(() => {
  signOut();
  providerCalls.length = 0;
});

const bearer = (token) => ({ Authorization: `Bearer ${token}` });
// the browser sends its own idea of the progress and history; the server must not follow it
const turn = (token, text) =>
  interviewTurn(jsonRequest('/api/interview', {
    headers: bearer(token),
    body: { history: [{ id: randomUUID(), role: 'user', content: text, timestamp: Date.now() }], participantProfile: null, questionProgress: { questionsAsked: [], currentPhase: 'ending', steps: [{ step: 'snippet:database' }] }, currentContext: '' },
  }));

test('a candidate goes through every step in order, and the hidden notes stay on the server', async () => {
  const token = await makeLink(`link-${randomUUID()}`, STUDY);
  scriptTurns({ deepdive: { plannedQuestions: 4, analysis: 'Built a React + Node shop' }, snippet: { bug: { line: 4, explanation: 'off by one', fix: 'use <' } } });
  const seen = [];
  for (let i = 0; i < 12; i++) {
    const body = await (await turn(token, `answer ${i + 1}`)).json();
    seen.push([body.step, body.phaseTransition, body.shouldConclude]);
    assert.ok(!('bug' in body) && !('analysis' in body) && !('plannedQuestions' in body), 'the browser never gets the answer key');
    if (body.shouldConclude) break;
  }
  assert.deepEqual(seen.map(([s]) => s), ['introduction', 'project', 'deepdive', 'deepdive', 'deepdive', 'deepdive', 'snippet:frontend', 'snippet:backend', 'snippet:database', 'ending']);
  assert.deepEqual(seen.at(-1), ['ending', 'ending', true]);
  assert.deepEqual(providerCalls.map((c) => c.step), ['introduction', 'project', 'deepdive', 'deepdive', 'deepdive', 'deepdive', 'snippet:frontend', 'snippet:backend', 'snippet:database'], 'no AI call to say goodbye');

  const link = await getParticipantToken(token);
  assert.equal(link.exchanges[2].planned, 4);
  assert.match(link.exchanges[2].note, /React \+ Node shop/);
  assert.match(link.exchanges[6].note, /line 4/);
  // the candidate's transcript shows questions and answers only
  assert.ok(!JSON.stringify(serverTranscript(STUDY, link.exchanges)).includes('off by one'));
});

test("an off-topic answer is re-asked once and doesn't move the interview on; a second one does", async () => {
  const token = await makeLink(`link-${randomUUID()}`, STUDY);
  scriptTurns({});
  await turn(token, 'ready');
  scriptTurns({ notAnswered: true });
  assert.equal((await (await turn(token, 'what is the weather')).json()).step, 'reask');
  assert.equal(providerCalls.at(-1).reaskAllowed, true);
  const next = await (await turn(token, 'still off topic')).json();
  assert.equal(next.step, 'project');
  assert.equal(providerCalls.at(-1).reaskAllowed, false, 'only one re-ask in a row');
});

test('a failed turn between two off-topic answers does not allow a second re-ask', async () => {
  const token = await makeLink(`link-${randomUUID()}`, STUDY);
  scriptTurns({});
  await turn(token, 'ready');
  scriptTurns({ notAnswered: true });
  assert.equal((await (await turn(token, 'off topic')).json()).step, 'reask');
  scriptTurns({ fail: true });
  assert.equal((await (await turn(token, 'off topic again')).json()).step, 'retry');
  scriptTurns({ notAnswered: true });
  await turn(token, 'off topic once more');
  assert.equal(providerCalls.at(-1).reaskAllowed, false);
});

test('a reply with no question in it is asked for once more before the candidate sees anything (seen on Groq)', async () => {
  const token = await makeLink(`link-${randomUUID()}`, STUDY);
  scriptTurns({ noQuestion: 1 });
  providerCalls.length = 0;
  const body = await (await turn(token, 'ready')).json();
  assert.equal(body.step, 'introduction');
  assert.match(body.message, /\?/);
  assert.equal(providerCalls.length, 2);
});

test('two replies with no question: the candidate is asked to send the answer again, and nothing counts', async () => {
  const token = await makeLink(`link-${randomUUID()}`, STUDY);
  scriptTurns({ noQuestion: 2 });
  const body = await (await turn(token, 'ready')).json();
  assert.equal(body.step, 'retry');
  scriptTurns({});
  assert.equal((await (await turn(token, 'ready')).json()).step, 'introduction');
});

test('when the AI fails the candidate is asked to send the answer again and the step is kept', async () => {
  const token = await makeLink(`link-${randomUUID()}`, STUDY);
  scriptTurns({ fail: true });
  const body = await (await turn(token, 'ready')).json();
  assert.equal(body.step, 'retry');
  assert.match(body.message, /send your answer again/i);
  scriptTurns({});
  assert.equal((await (await turn(token, 'ready')).json()).step, 'introduction');
});

test('a snippet whose closing fence is followed by a written-out "\\n" still closes its code block (seen on Groq)', async () => {
  const token = await makeLink(`link-${randomUUID()}`, STUDY);
  scriptTurns({ snippet: { message: 'Snippet 1 of 3: Frontend\n```jsx\n1. const a = "x\\n";\n```\\nWhich line has the bug?' } });
  let body;
  for (let i = 0; i < 10 && !String(body?.step).startsWith('snippet:'); i++) body = await (await turn(token, `answer ${i}`)).json();
  assert.equal(body.message, 'Snippet 1 of 3: Frontend\n```jsx\n1. const a = "x\\n";\n```\nWhich line has the bug?', 'only the fence\'s own "\\n" changes; the one inside the code stays');
});

test('the summary is given the planted bugs to judge the answers against', async () => {
  const token = await makeLink(`link-${randomUUID()}`, STUDY);
  scriptTurns({ snippet: { bug: { line: 7, explanation: 'missing await', fix: 'await the query' } } });
  for (let i = 0; i < 10; i++) if ((await (await turn(token, `answer ${i}`)).json()).shouldConclude) break;
  providerCalls.length = 0;
  assert.equal((await complete(jsonRequest('/api/interview/complete', { headers: bearer(token), body: { history: [] } }))).status, 200);
  for (let i = 0; i < 40 && !providerCalls.some((c) => c.kind === 'synthesis'); i++) await new Promise((r) => setTimeout(r, 25));
  const call = providerCalls.find((c) => c.kind === 'synthesis');
  assert.match(call.notes, /frontend snippet: line 7: missing await\. Fix: await the query/);
});
