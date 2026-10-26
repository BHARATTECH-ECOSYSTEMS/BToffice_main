// Step 14 (owner: "new studies use the server's AI_PROVIDER by default"). The setup screen used to preselect Google
// Gemini and save it into every new study, and a study's own choice beats AI_PROVIDER; with only the Mistral key the
// doc asks for, every interview turn then failed. Now the screen shows the server's AI, and a study keeps an AI only
// when the researcher picks one; otherwise the server's AI_PROVIDER decides when the interview runs.
const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { signInResearcher, signOut } = require('./support/helpers.cjs');
const { serverDefaultProvider, defaultModelFor, shownProvider, aiChoiceToSave } = require('@/lib/aiDefaults');

// the real provider factory (the "@/lib/providers" name is swapped for a stand-in in the other tests)
const { getInterviewProvider } = require(path.join(__dirname, '..', 'src', 'lib', 'providers', 'index.ts'));

let saved;
beforeEach(() => {
  saved = process.env.AI_PROVIDER;
  signOut();
});
afterEach(() => {
  if (saved === undefined) delete process.env.AI_PROVIDER;
  else process.env.AI_PROVIDER = saved;
});

test("the server's AI is AI_PROVIDER when it names one we have, else Mistral", () => {
  for (const name of ['gemini', 'claude', 'mistral']) {
    process.env.AI_PROVIDER = name;
    assert.equal(serverDefaultProvider(), name);
  }
  for (const odd of ['', 'openai', 'Gemini ', 'MISTRAL']) {
    process.env.AI_PROVIDER = odd;
    assert.equal(serverDefaultProvider(), 'mistral', JSON.stringify(odd));
  }
  delete process.env.AI_PROVIDER;
  assert.equal(serverDefaultProvider(), 'mistral');
});

test('each AI has its default model', () => {
  assert.equal(defaultModelFor('mistral'), 'mistral-large-latest');
  assert.equal(defaultModelFor('gemini'), 'gemini-2.5-flash');
  assert.equal(defaultModelFor('claude'), 'claude-sonnet-4-5');
});

test("a study that names no AI runs on the server's; one that names an AI keeps it", () => {
  process.env.AI_PROVIDER = 'mistral';
  assert.equal(getInterviewProvider({}).constructor.name, 'MistralProvider');
  // a study saved with Gemini still asks Gemini (and without its key that fails, as before)
  assert.throws(() => getInterviewProvider({ aiProvider: 'gemini' }), /GEMINI_API_KEY/);
});

test("the setup screen shows the study's own AI, else the server's", () => {
  assert.equal(shownProvider('claude', 'mistral'), 'claude');
  assert.equal(shownProvider(undefined, 'gemini'), 'gemini');
  // before the server has answered
  assert.equal(shownProvider(undefined, undefined), 'mistral');
});

test('a study keeps an AI only when the researcher picked one', () => {
  assert.deepEqual(aiChoiceToSave(false, 'mistral', 'mistral-large-latest'), {});
  assert.deepEqual(aiChoiceToSave(true, 'gemini', 'gemini-2.5-flash'), { aiProvider: 'gemini', aiModel: 'gemini-2.5-flash' });
});

test('the setup screen learns the server\'s AI from /api/config/status (researchers only)', async () => {
  const { GET: status } = require('@/app/api/config/status/route');
  assert.equal((await status()).status, 401);

  await signInResearcher();
  process.env.AI_PROVIDER = 'gemini';
  assert.equal((await (await status()).json()).defaultProvider, 'gemini');
  delete process.env.AI_PROVIDER;
  assert.equal((await (await status()).json()).defaultProvider, 'mistral');
});
