// Which MongoDB the tests use (owner's 4A, 2026-10-27): TEST_MONGODB_URI, else .env.local's MONGODB_URI when the file
// is there, else the laptop's own MongoDB; always on this machine, and always its own "_unit" database next to the
// real one, which the tests empty freely.
const LOCAL_DEFAULT = 'mongodb://127.0.0.1:27017/openinterviewer';

function testDatabaseUri({ env, readEnvLocal }) {
  const fromFile = readEnvLocal()?.match(/^MONGODB_URI=(.*?)\r?$/m)?.[1]?.trim();
  const uri = new URL(env.TEST_MONGODB_URI?.trim() || fromFile || LOCAL_DEFAULT);
  if (!['127.0.0.1', 'localhost'].includes(uri.hostname)) throw new Error(`tests only run against a local MongoDB, not ${uri.hostname}`);
  const database = uri.pathname.replace(/^\//, '') || 'openinterviewer';
  uri.pathname = `/${database}_unit`;
  return uri.toString();
}

module.exports = { testDatabaseUri };
