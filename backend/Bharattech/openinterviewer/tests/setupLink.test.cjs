// The setup page's "Generate Participant Link" (owner's 1A, 2026-10-27): a link only works while its study is stored,
// so the page saves the study first (or updates its changes) and makes the link for the saved study. These run the
// page's helper against the real routes.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { emptyDatabase, closeDatabase, signInResearcher, signOut, saveStudy, studyConfig } = require('./support/helpers.cjs');

const { POST: createStudy } = require('@/app/api/studies/route');
const { PUT: updateStudy } = require('@/app/api/studies/[id]/route');
const { POST: generateLink } = require('@/app/api/generate-link/route');
const { GET: checkLink } = require('@/app/api/participant-token/route');
const { createSetupLink } = require('@/lib/setupLink');

const calls = [];
// the browser's fetch, answered by the route handlers
async function routeFetch(url, init = {}) {
  const method = init.method || 'GET';
  calls.push(`${method} ${url}`);
  const request = new Request(`http://localhost:3000${url}`, init);
  if (method === 'POST' && url === '/api/studies') return createStudy(request);
  if (method === 'PUT' && url.startsWith('/api/studies/')) {
    return updateStudy(request, { params: Promise.resolve({ id: decodeURIComponent(url.split('/').pop()) }) });
  }
  if (method === 'POST' && url === '/api/generate-link') return generateLink(request);
  throw new Error(`unexpected request ${method} ${url}`);
}

const linkWorks = async (url) => {
  const token = new URL(url).pathname.replace(/^\/p\//, '');
  const result = await (await checkLink(new Request(`http://localhost:3000/api/participant-token?token=${encodeURIComponent(token)}`))).json();
  return result.valid === true;
};
const studies = () => mongoose.connection.collection('studies');
const interviews = () => mongoose.connection.collection('interviews');
const draft = (overrides = {}) => studyConfig(`study-${Date.now()}`, { name: 'Backend developer', jobRequirements: 'Go, PostgreSQL', ...overrides });
const neverAsked = () => {
  throw new Error('confirm should not be asked');
};

before(emptyDatabase);
after(closeDatabase);
beforeEach(async () => {
  await studies().deleteMany({});
  await interviews().deleteMany({});
  calls.length = 0;
  await signInResearcher();
});

// since 2026-10-28 the server makes no link at all for it (it used to make one that didn't work)
test("a study that was never saved gets no link (why the page saves first)", async () => {
  const response = await generateLink(new Request('http://localhost:3000/api/generate-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studyConfig: draft() }),
  }));
  assert.equal(response.status, 404);
});

test('a new study is saved, then its link works', async () => {
  const result = await createSetupLink({ config: draft(), savedStudyId: null, isDirty: true, confirm: neverAsked, fetchImpl: routeFetch });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.deepEqual(calls, ['POST /api/studies', 'POST /api/generate-link']);
  assert.equal(await studies().countDocuments(), 1);
  assert.ok(result.study.id);
  assert.equal(result.study.config.id, result.study.id, 'the link is for the saved study');
  assert.equal(await linkWorks(result.url), true);
});

test('a saved study with no changes is not saved again', async () => {
  const config = draft();
  await saveStudy(config);
  const result = await createSetupLink({ config, savedStudyId: config.id, isDirty: false, confirm: neverAsked, fetchImpl: routeFetch });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.deepEqual(calls, ['POST /api/generate-link']);
  assert.equal(result.study, null);
  assert.equal(await studies().countDocuments(), 1);
  assert.equal(await linkWorks(result.url), true);
});

test("a saved study's changes are updated first, without making a second study", async () => {
  const config = draft();
  await saveStudy(config);
  const changed = { ...config, name: 'Frontend developer' };
  const result = await createSetupLink({ config: changed, savedStudyId: config.id, isDirty: true, confirm: neverAsked, fetchImpl: routeFetch });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.deepEqual(calls, [`PUT /api/studies/${config.id}`, 'POST /api/generate-link']);
  assert.equal(await studies().countDocuments(), 1);
  assert.equal(result.study.config.name, 'Frontend developer');
  assert.equal(await linkWorks(result.url), true);
});

test('a study with interviews asks before changing it, and stops if the researcher says no', async () => {
  const config = draft();
  await saveStudy(config);
  await interviews().insertMany([1, 2].map((n) => ({ studyId: config.id, studyName: config.name, transcript: [], createdAt: new Date(), n })));
  const asked = [];
  const changed = { ...config, name: 'Frontend developer' };

  const declined = await createSetupLink({ config: changed, savedStudyId: config.id, isDirty: true, confirm: (warning) => (asked.push(warning), false), fetchImpl: routeFetch });
  assert.deepEqual(declined, { ok: false, error: 'cancelled' });
  assert.equal(asked.length, 1);
  assert.match(asked[0], /2 interview/);
  assert.ok(!calls.includes('POST /api/generate-link'), 'no link without the save');

  const accepted = await createSetupLink({ config: changed, savedStudyId: config.id, isDirty: true, confirm: () => true, fetchImpl: routeFetch });
  assert.equal(accepted.ok, true, JSON.stringify(accepted));
  assert.equal(accepted.study.config.name, 'Frontend developer');
  assert.equal(await linkWorks(accepted.url), true);
});

test('without the researcher session nothing is saved and the page is told to sign in', async () => {
  signOut();
  const result = await createSetupLink({ config: draft(), savedStudyId: null, isDirty: true, confirm: neverAsked, fetchImpl: routeFetch });
  assert.deepEqual(result, { ok: false, error: 'auth' });
  assert.equal(await studies().countDocuments(), 0);

  const config = draft();
  await saveStudy(config);
  const saved = await createSetupLink({ config, savedStudyId: config.id, isDirty: false, confirm: neverAsked, fetchImpl: routeFetch });
  assert.deepEqual(saved, { ok: false, error: 'auth' }, 'a saved study needs the session for its link too');
});

test("a failed save or link reaches the page as the server's message", async () => {
  const failing = (status, error) => async (url, init) => (url === '/api/generate-link' ? Response.json({ error }, { status }) : routeFetch(url, init));
  const result = await createSetupLink({ config: draft(), savedStudyId: null, isDirty: true, confirm: neverAsked, fetchImpl: failing(500, 'Failed to save participant token to the database') });
  assert.deepEqual(result, { ok: false, error: 'Failed to save participant token to the database' });

  const offline = async () => {
    throw new TypeError('Failed to fetch');
  };
  const network = await createSetupLink({ config: draft(), savedStudyId: null, isDirty: true, confirm: neverAsked, fetchImpl: offline });
  assert.equal(network.ok, false);
  assert.match(network.error, /network/i);

  const config = draft();
  await saveStudy(config);
  const linkOffline = await createSetupLink({ config, savedStudyId: config.id, isDirty: false, confirm: neverAsked, fetchImpl: offline });
  assert.equal(linkOffline.ok, false);
  assert.match(linkOffline.error, /network/i, 'also when only the link is asked for');
});
