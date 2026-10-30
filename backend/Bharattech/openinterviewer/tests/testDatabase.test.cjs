// Low item (owner's 4A, 2026-10-27): `npm test` stopped with "no such file" on a copy without .env.local. The tests
// now take TEST_MONGODB_URI, else .env.local's MONGODB_URI when the file is there, else the laptop's own MongoDB, and
// always their own "_unit" database on this machine.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { testDatabaseUri } = require('./support/testDatabase.cjs');

const noFile = () => null;

test('TEST_MONGODB_URI comes first', () => {
  const uri = testDatabaseUri({ env: { TEST_MONGODB_URI: 'mongodb://localhost:27018/ci' }, readEnvLocal: () => 'MONGODB_URI=mongodb://127.0.0.1:27017/laptop' });
  assert.equal(uri, 'mongodb://localhost:27018/ci_unit');
});

test(".env.local's MONGODB_URI is used when the file is there", () => {
  const uri = testDatabaseUri({ env: {}, readEnvLocal: () => 'OTHER=1\nMONGODB_URI=mongodb://u:p@127.0.0.1:27017/openinterviewer?authSource=admin\r\n' });
  assert.equal(uri, 'mongodb://u:p@127.0.0.1:27017/openinterviewer_unit?authSource=admin');
});

test('without .env.local or TEST_MONGODB_URI the local MongoDB is used', () => {
  assert.equal(testDatabaseUri({ env: {}, readEnvLocal: noFile }), 'mongodb://127.0.0.1:27017/openinterviewer_unit');
});

test('a database on another machine is refused, whichever way it came', () => {
  assert.throws(() => testDatabaseUri({ env: { TEST_MONGODB_URI: 'mongodb+srv://cluster.example.net/prod' }, readEnvLocal: noFile }), /local MongoDB/);
  assert.throws(() => testDatabaseUri({ env: {}, readEnvLocal: () => 'MONGODB_URI=mongodb://db.example.net:27017/x' }), /local MongoDB/);
});

test('the setup reads .env.local only through this, and copes without it', () => {
  const setup = require('node:fs').readFileSync(require('node:path').join(__dirname, 'support', 'setup.cjs'), 'utf8');
  assert.doesNotMatch(setup, /readFileSync\(path\.join\(ROOT, '\.env\.local'\)/);
  assert.match(setup, /testDatabaseUri\(\{ env: process\.env, readEnvLocal \}\)/);
});
