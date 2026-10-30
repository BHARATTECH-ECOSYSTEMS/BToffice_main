// Low item (owner's 3A, 2026-10-27): with no database, the app keeps its data in one local file, and every save read
// the file, changed it and wrote it back. Two saves at the same moment could both read the old file: a launch pass
// could open two sessions, and one of two saves was lost. Saves now wait their turn, and the file is written whole
// (a temporary file swapped in), so a crash mid-write can't leave half a file.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { studyConfig } = require('./support/helpers.cjs');

// this file runs in its own process: no database, local file storage in a throwaway folder
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oi-local-'));
const file = path.join(dir, 'local-store.json');
process.env.LOCAL_FILE_STORAGE = 'true';
process.env.LOCAL_STORAGE_PATH = file;
delete process.env.MONGODB_URI;

const kv = require('@/lib/kv');

before(() => fs.rmSync(file, { force: true }));
after(() => fs.rmSync(dir, { recursive: true, force: true }));

const inAMinute = () => new Date(Date.now() + 60_000);

test('a launch pass claimed many times at once opens exactly one session', async () => {
  const pass = randomUUID();
  const answers = await Promise.all(Array.from({ length: 20 }, () => kv.claimLaunchPass(pass, inAMinute())));
  assert.equal(answers.filter(Boolean).length, 1);
  assert.equal(await kv.claimLaunchPass(pass, inAMinute()), false, 'and it stays used');
});

test('different passes claimed at the same moment all work', async () => {
  const answers = await Promise.all(Array.from({ length: 10 }, () => kv.claimLaunchPass(randomUUID(), inAMinute())));
  assert.deepEqual(answers, Array(10).fill(true));
});

test('saves made at the same moment are all kept', async () => {
  const ids = Array.from({ length: 15 }, (_, i) => `local-study-${i}`);
  const saved = await Promise.all(ids.map((id) => kv.saveStudy({ id, config: studyConfig(id), createdAt: Date.now(), updatedAt: Date.now(), interviewCount: 0, isLocked: false })));
  assert.deepEqual(saved, Array(ids.length).fill(true));
  const stored = JSON.parse(fs.readFileSync(file, 'utf8')).studies;
  for (const id of ids) assert.ok(stored[id], `${id} kept`);
});

test('the file is written whole and no temporary file is left behind', async () => {
  await Promise.all(Array.from({ length: 10 }, (_, i) => kv.claimLaunchPass(`whole-${i}`, inAMinute())));
  assert.doesNotThrow(() => JSON.parse(fs.readFileSync(file, 'utf8')));
  assert.deepEqual(fs.readdirSync(dir), ['local-store.json']);
});

test('a write that fails leaves the old file as it was and no temporary file behind', async () => {
  const before = fs.readFileSync(file, 'utf8');
  const realRename = fs.promises.rename;
  fs.promises.rename = async () => {
    throw Object.assign(new Error('cross-device'), { code: 'EXDEV' });
  };
  try {
    assert.equal(await kv.claimLaunchPass('rename-fails', inAMinute()), false);
  } finally {
    fs.promises.rename = realRename;
  }
  assert.equal(fs.readFileSync(file, 'utf8'), before);
  assert.deepEqual(fs.readdirSync(dir), ['local-store.json']);
});

test('one save failing does not stop the saves queued after it', async () => {
  const realRead = fs.promises.readFile;
  let failOnce = true;
  fs.promises.readFile = async (...args) => {
    if (failOnce && args[0] === file) {
      failOnce = false;
      throw new Error('disk hiccup');
    }
    return realRead.apply(fs.promises, args);
  };
  try {
    const [first, second] = await Promise.all([kv.claimLaunchPass('hiccup-a', inAMinute()), kv.claimLaunchPass('hiccup-b', inAMinute())]);
    assert.equal(first, false, 'the failed one says no');
    assert.equal(second, true, 'the next one still goes through');
  } finally {
    fs.promises.readFile = realRead;
  }
});
