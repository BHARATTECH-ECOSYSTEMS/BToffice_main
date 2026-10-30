// Making a candidate link (owner's A, 2026-10-28): /api/generate-link kept whatever study settings the browser sent
// with the link, so a stale or changed copy in the browser could give candidates other questions than the saved study.
// The link now carries the study as saved, found by its id; a study that was never saved gets no link.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { emptyDatabase, closeDatabase, jsonRequest, signInResearcher, signOut, saveStudy, studyConfig } = require('./support/helpers.cjs');

const { POST: generateLink } = require('@/app/api/generate-link/route');
const { getParticipantToken } = require('@/lib/kv');

const SAVED = studyConfig('saved-link-study', { name: 'Saved study', coreQuestions: ['saved-q-1', 'saved-q-2'], jobRequirements: 'saved-req' });

before(async () => {
  await emptyDatabase();
  await saveStudy(SAVED);
});
after(closeDatabase);
beforeEach(signOut);

const make = (studyConfig) => generateLink(jsonRequest('/api/generate-link', { body: { studyConfig } }));

test('the link carries the saved study, whatever copy of it the browser sends', async () => {
  await signInResearcher();
  const res = await make({ ...SAVED, name: 'Changed in the browser', coreQuestions: ['browser-q'], jobRequirements: 'browser-req' });
  assert.equal(res.status, 200);
  const link = await getParticipantToken((await res.json()).token);
  assert.equal(link.studyId, SAVED.id);
  assert.equal(link.studyConfig.name, 'Saved study');
  assert.deepEqual(link.studyConfig.coreQuestions, ['saved-q-1', 'saved-q-2']);
  assert.equal(link.studyConfig.jobRequirements, 'saved-req');
});

test('a study that was never saved gets no link', async () => {
  await signInResearcher();
  const res = await make(studyConfig('never-saved-study', { name: 'Draft' }));
  assert.equal(res.status, 404);
  assert.match((await res.json()).error, /Save the study first/);
});

test('a request naming no study is refused', async () => {
  await signInResearcher();
  assert.equal((await make({ name: 'No id' })).status, 400);
});

test('signed out, nothing changes: still no link', async () => {
  assert.equal((await make(SAVED)).status, 401);
});
