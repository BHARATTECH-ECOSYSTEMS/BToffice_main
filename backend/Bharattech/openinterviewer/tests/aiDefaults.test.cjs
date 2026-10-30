// Groq only (owner, 2026-10-28): Gemini, Claude and Mistral were removed and every study runs on Groq. A study may
// pick one of the Groq models the setup screen offers; anything else it carries (an old AI's model, or none) runs on
// the server's GROQ_MODEL, else the default. These tests use the real AI code with fetch replaced, so no request leaves.
const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readFileSync, readdirSync, statSync } = require('node:fs');
const { serverDefaultModel, studyModel, knownGroqModel, aiChoiceToSave } = require('@/lib/aiDefaults');
const { GROQ_MODELS, DEFAULT_GROQ_MODEL } = require('@/types');

// the real provider factory (the "@/lib/providers" name is swapped for a stand-in in the other tests)
const { getInterviewProvider } = require(path.join(__dirname, '..', 'src', 'lib', 'providers', 'index.ts'));
const ROOT = path.join(__dirname, '..');

const ENV = ['GROQ_API_KEY', 'GROQ_MODEL'];
let savedEnv;
let realFetch;
let sent;
const answerWith = (content, status = 200) => {
  global.fetch = async (url, init) => {
    sent.push({ url: String(url), init, body: JSON.parse(init.body) });
    return new Response(JSON.stringify(status === 200 ? { choices: [{ message: { content } }] } : { error: { message: 'stand-in refusal' } }), { status });
  };
};
beforeEach(() => {
  savedEnv = Object.fromEntries(ENV.map((k) => [k, process.env[k]]));
  realFetch = global.fetch;
  sent = [];
  process.env.GROQ_API_KEY = 'gsk_test_key';
  delete process.env.GROQ_MODEL;
});
afterEach(() => {
  for (const [k, v] of Object.entries(savedEnv)) v === undefined ? delete process.env[k] : (process.env[k] = v);
  global.fetch = realFetch;
});

const STUDY = { id: 's1', name: 'Backend role', researchQuestion: 'Backend developer interview', coreQuestions: ['Tell me about a service you built'], topicAreas: [], profileSchema: [], aiBehavior: 'standard', consentText: '', createdAt: 1 };
const HISTORY = [{ id: 'a', role: 'ai', content: 'Ready?', timestamp: 1 }, { id: 'b', role: 'user', content: 'Yes, ready', timestamp: 2 }];
const STEP = { reaskAllowed: true, currentContext: '' };

test('the setup screen offers the three Groq models, the strongest first', () => {
  assert.deepEqual(GROQ_MODELS.map((m) => m.id), ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b']);
  assert.equal(DEFAULT_GROQ_MODEL, 'openai/gpt-oss-120b');
});

test("a study's model is its own Groq pick, else the server's GROQ_MODEL, else the default", () => {
  assert.equal(studyModel({ aiModel: 'openai/gpt-oss-20b' }), 'openai/gpt-oss-20b');
  assert.equal(studyModel({}), 'openai/gpt-oss-120b');
  // a study saved with one of the removed AIs runs on Groq
  assert.equal(studyModel({ aiProvider: 'mistral', aiModel: 'mistral-large-latest' }), 'openai/gpt-oss-120b');
  process.env.GROQ_MODEL = 'qwen/qwen3.8-27b';
  assert.equal(serverDefaultModel(), 'qwen/qwen3.8-27b');
  assert.equal(studyModel({ aiModel: 'claude-sonnet-4-5' }), 'qwen/qwen3.8-27b');
  process.env.GROQ_MODEL = '  ';
  assert.equal(serverDefaultModel(), 'openai/gpt-oss-120b');
});

test('the screen keeps a saved model only when it is one of ours, and saves one only when the researcher picked it', () => {
  assert.equal(knownGroqModel('openai/gpt-oss-20b'), 'openai/gpt-oss-20b');
  assert.equal(knownGroqModel('gemini-2.5-flash'), undefined);
  assert.equal(knownGroqModel(undefined), undefined);
  assert.deepEqual(aiChoiceToSave(false, 'openai/gpt-oss-20b'), {});
  assert.deepEqual(aiChoiceToSave(true, 'openai/gpt-oss-20b'), { aiModel: 'openai/gpt-oss-20b' });
});

test('every study gets the Groq AI, whatever old AI it names', () => {
  for (const config of [{}, { aiProvider: 'gemini' }, { aiProvider: 'claude' }, { aiProvider: 'mistral' }]) {
    assert.equal(getInterviewProvider(config).constructor.name, 'GroqProvider');
  }
});

test('an interview turn goes to Groq with the key, the model, and JSON answers asked for', async () => {
  answerWith(JSON.stringify({ message: 'What did you build?', answered: true, profileUpdates: [] }));
  const reply = await getInterviewProvider(STUDY).generateInterviewResponse(HISTORY, { ...STUDY, aiModel: 'openai/gpt-oss-20b' }, null, 'project', STEP);
  assert.equal(reply.message, 'What did you build?');
  assert.equal(reply.answered, true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(sent[0].init.method, 'POST');
  assert.equal(sent[0].init.headers.Authorization, 'Bearer gsk_test_key');
  assert.equal(sent[0].body.model, 'openai/gpt-oss-20b');
  assert.deepEqual(sent[0].body.response_format, { type: 'json_object' });
  assert.equal(sent[0].body.messages[0].role, 'system');
  assert.ok(sent[0].init.signal, 'a request that hangs is given up');
});

test('the summary goes to Groq too, and falls back to the transcript summary when Groq refuses', async () => {
  answerWith(JSON.stringify({ statedPreferences: ['Go'], revealedPreferences: [], themes: [{ theme: 'APIs', evidence: 'built one', frequency: 2 }], contradictions: [], keyInsights: ['Strong on APIs'], bottomLine: 'Good backend fit' }));
  const good = await getInterviewProvider(STUDY).synthesizeInterview(HISTORY, STUDY, {}, null);
  assert.equal(good.bottomLine, 'Good backend fit');
  assert.equal(sent[0].body.model, 'openai/gpt-oss-120b');

  answerWith('', 429);
  const fallback = await getInterviewProvider(STUDY).synthesizeInterview(HISTORY, STUDY, {}, null);
  assert.notEqual(fallback.bottomLine, 'Good backend fit');
  assert.ok(fallback.bottomLine.length > 0);
});

// Groq's free tier allows 8,000 tokens a minute; past it Groq says how long to wait (seen 2026-10-28)
const rateLimitedOnce = (wait, content) => {
  let first = true;
  global.fetch = async (url, init) => {
    sent.push({ url: String(url), init, body: JSON.parse(init.body) });
    if (first) {
      first = false;
      return new Response(JSON.stringify({ error: { message: `Rate limit reached for model on tokens per minute (TPM). Please try again in ${wait}.` } }), { status: 429 });
    }
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
  };
};

test('a short rate-limit wait is waited out and the request sent once more', async () => {
  rateLimitedOnce('120ms', JSON.stringify({ message: 'What did you build?', answered: true, profileUpdates: [] }));
  const reply = await getInterviewProvider(STUDY).generateInterviewResponse(HISTORY, STUDY, null, 'project', STEP);
  assert.equal(reply.message, 'What did you build?');
  assert.equal(sent.length, 2);
});

test('a long rate-limit wait is not waited out: the turn fails at once', async () => {
  rateLimitedOnce('45s', '{}');
  const started = Date.now();
  const reply = await getInterviewProvider(STUDY).generateInterviewResponse(HISTORY, STUDY, null, 'project', STEP);
  assert.equal(reply.failed, true);
  assert.equal(sent.length, 1);
  assert.ok(Date.now() - started < 2000);
});

test('without GROQ_API_KEY nothing is sent and the turn is marked failed', async () => {
  delete process.env.GROQ_API_KEY;
  answerWith('{}');
  const reply = await getInterviewProvider(STUDY).generateInterviewResponse(HISTORY, STUDY, null, 'project', STEP);
  assert.equal(sent.length, 0);
  assert.equal(reply.failed, true, 'the route then asks the candidate to send the answer again');
});

test('nothing of the three removed AIs is left: no files, packages, settings or choices', () => {
  assert.deepEqual(readdirSync(path.join(ROOT, 'src', 'lib', 'providers')).sort(), ['groq.ts', 'index.ts']);
  const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  for (const name of ['@mistralai/mistralai', '@google/genai', '@anthropic-ai/sdk']) assert.ok(!pkg.dependencies?.[name] && !pkg.devDependencies?.[name], name);
  const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(path.join(dir, f)).isDirectory() ? walk(path.join(dir, f)) : [path.join(dir, f)]));
  const offenders = walk(path.join(ROOT, 'src')).filter((f) => /@mistralai|@google\/genai|@anthropic-ai|MISTRAL_|GEMINI_|ANTHROPIC_|AI_PROVIDER|aiProvider|AIProviderType|mistralService/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(offenders.map((f) => path.relative(ROOT, f)), []);
});
