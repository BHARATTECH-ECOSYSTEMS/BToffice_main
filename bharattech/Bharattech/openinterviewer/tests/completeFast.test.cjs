// Finishing an interview (owner's A, 2026-10-28): the candidate waited on "Generating your interview analysis…" while
// the server asked the AI for the researcher's summary (up to 15 s), though their thank-you page never shows it. Now
// /api/interview/complete answers once the interview is saved, and the summary is written into the record afterwards.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const { emptyDatabase, closeDatabase, jsonRequest, signOut, saveStudy, makeLink, studyConfig } = require('./support/helpers.cjs');
const { holdSynthesis, failNextSynthesis } = require('./support/fakeProviders.cjs');

const { POST: interviewTurn } = require('@/app/api/interview/route');
const { POST: complete } = require('@/app/api/interview/complete/route');
const { linkHashOf } = require('@/lib/auth');

const STUDY = studyConfig('complete-fast-study', { name: 'Finishing fast', coreQuestions: ['q1'] });

before(async () => {
  await emptyDatabase();
  await saveStudy(STUDY);
});
after(closeDatabase);
beforeEach(signOut);

const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const recordOf = (token) => mongoose.connection.collection('interviews').findOne({ linkHash: linkHashOf(token) });
const answered = async () => {
  const token = await makeLink(`link-${randomUUID()}`, STUDY);
  const res = await interviewTurn(jsonRequest('/api/interview', { headers: bearer(token), body: { history: [{ id: 'u1', role: 'user', content: 'Yes, ready', timestamp: Date.now() }], participantProfile: null, questionProgress: { questionsAsked: [], currentPhase: 'introduction' }, currentContext: '' } }));
  assert.equal(res.status, 200);
  return token;
};
const finish = (token) => complete(jsonRequest('/api/interview/complete', { headers: bearer(token), body: { history: [] } }));
const eventually = async (check, ms = 5000) => {
  for (const end = Date.now() + ms; Date.now() < end; await new Promise((r) => setTimeout(r, 25))) if (await check()) return true;
  return false;
};

test('the candidate gets their answer while the AI summary is still being written', async () => {
  const token = await answered();
  const release = holdSynthesis();
  try {
    const reply = await Promise.race([finish(token), new Promise((resolve) => setTimeout(() => resolve('still waiting'), 2000))]);
    assert.notEqual(reply, 'still waiting', 'the reply waited on the summary');
    assert.equal(reply.status, 200);
    const { interviewId } = await reply.json();
    const saved = await recordOf(token);
    assert.equal(saved.id, interviewId);
    assert.equal(saved.status, 'completed');
    assert.equal(saved.synthesis, null);
  } finally {
    release();
  }
  assert.ok(await eventually(async () => (await recordOf(token))?.synthesis?.bottomLine === 'stand-in'), 'the summary was never saved');
});

test('a summary that fails leaves the saved interview as it is', async () => {
  const token = await answered();
  failNextSynthesis();
  const reply = await finish(token);
  assert.equal(reply.status, 200);
  await new Promise((r) => setTimeout(r, 200));
  const saved = await recordOf(token);
  assert.equal(saved.status, 'completed');
  assert.equal(saved.synthesis, null);
  assert.ok(saved.transcript.length > 0);
});

test('an interview deleted before its summary arrives stays deleted', async () => {
  const token = await answered();
  const release = holdSynthesis();
  let id;
  try {
    ({ interviewId: id } = await (await finish(token)).json());
    await mongoose.connection.collection('interviews').deleteOne({ id });
  } finally {
    release();
  }
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(await mongoose.connection.collection('interviews').countDocuments({ id }), 0);
});

test('the waiting screen says what it is doing for the candidate', () => {
  const chat = readFileSync(path.join(__dirname, '..', 'src', 'components', 'InterviewChat.tsx'), 'utf8');
  assert.match(chat, /Saving your interview\.\.\./);
  assert.doesNotMatch(chat, /Generating your interview analysis/);
});
