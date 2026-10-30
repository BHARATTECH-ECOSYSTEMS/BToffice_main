// Study setup, 2026-10-28 (owner): the study's post name, the target role and the job description sit in one section,
// "Target Role Details (AI Adaptive Questioning)", and the job description is required, since the AI builds its
// questions from it. Older studies without one keep working for everything but new links and edits on the setup screen.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { emptyDatabase, closeDatabase, jsonRequest, signInResearcher, signOut, saveStudy, studyConfig } = require('./support/helpers.cjs');

const { studyProblem } = require('@/lib/studyRules');
const { POST: createStudy } = require('@/app/api/studies/route');
const { PUT: updateStudy } = require('@/app/api/studies/[id]/route');
const { POST: generateLink } = require('@/app/api/generate-link/route');

const OLD = studyConfig('old-study-no-jd', { name: 'Old study' });
const COMPLETE = { name: 'Backend developer', researchQuestion: 'Backend developer interview', jobRequirements: 'Go, PostgreSQL, 3+ years' };

before(async () => {
  await emptyDatabase();
  await saveStudy(OLD);
});
after(closeDatabase);
beforeEach(signOut);

const put = (id, config) => updateStudy(jsonRequest(`/api/studies/${id}`, { method: 'PUT', body: { config } }), { params: Promise.resolve({ id }) });

test('a study needs a post name, a research objective and a job description', () => {
  assert.equal(studyProblem(COMPLETE), '');
  assert.equal(studyProblem({ ...COMPLETE, jobRequirements: '   ' }), 'Fill in: Job description.');
  assert.equal(studyProblem({}), 'Fill in: Post name, Research objective, Job description.');
});

test('a new study without a job description is refused', async () => {
  await signInResearcher();
  const config = studyConfig(`study-${Date.now()}`, { name: 'Backend developer' });
  const res = await createStudy(jsonRequest('/api/studies', { body: { config } }));
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, 'Fill in: Job description.');
  const ok = await createStudy(jsonRequest('/api/studies', { body: { config: { ...config, jobRequirements: 'Go, PostgreSQL' } } }));
  assert.equal(ok.status, 200);
});

test('an edit that empties the job description is refused; the links switch still works on an older study without one', async () => {
  await signInResearcher();
  const config = { ...studyConfig(`study-${Date.now()}`, { name: 'Edited' }), jobRequirements: 'Go' };
  const { study } = await (await createStudy(jsonRequest('/api/studies', { body: { config } }))).json();
  const emptied = await put(study.id, { ...study.config, jobRequirements: '  ' });
  assert.equal(emptied.status, 400);
  assert.equal((await emptied.json()).error, 'Fill in: Job description.');
  assert.equal((await put(OLD.id, { ...OLD, linksEnabled: false })).status, 200);
});

test('no candidate link for a study without a job description', async () => {
  await signInResearcher();
  const res = await generateLink(jsonRequest('/api/generate-link', { body: { studyConfig: { id: OLD.id } } }));
  assert.equal(res.status, 409);
  assert.match((await res.json()).error, /job description/i);
});

test('the setup screen has one section for the post and the role, with the job description marked required', () => {
  const src = readFileSync(path.join(__dirname, '..', 'src', 'components', 'StudySetup.tsx'), 'utf8');
  assert.equal(src.split('Target Role Details (AI Adaptive Questioning)').length - 1, 1);
  assert.doesNotMatch(src, /Study Details\s*</);
  const section = src.slice(src.indexOf('Target Role Details (AI Adaptive Questioning)'), src.indexOf('Candidate Profile Fields'));
  const order = ['Study / Post Name *', 'Job Title', 'Job Description / Technical Requirements *', 'Research Objective / Topic *'].map((l) => section.indexOf(l));
  assert.ok(order.every((i, n) => i > 0 && (n === 0 || i > order[n - 1])), JSON.stringify(order));
  // the description box was removed (owner, 2026-10-28); an older study keeps its saved description
  assert.doesNotMatch(src, /Description \(optional\)/);
  assert.match(src, /description,\n/);
  assert.match(src, /const isValid = !studyProblem\(\{ name, researchQuestion, jobRequirements \}\);/);
});
