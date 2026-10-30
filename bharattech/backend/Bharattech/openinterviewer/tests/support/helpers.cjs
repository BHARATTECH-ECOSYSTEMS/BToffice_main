// Shared pieces for the route tests: an empty test database per file, a researcher session, candidate links.
const mongoose = require('mongoose');
const { useCookies } = require('./nextHeaders.cjs');

async function emptyDatabase() {
  const { connectDB } = require('@/lib/mongodb');
  try {
    await connectDB();
  } catch (error) {
    // where it looked, without the password
    const at = new URL(process.env.MONGODB_URI);
    throw new Error(`The tests need a MongoDB on this machine (tried ${at.host}${at.pathname}). Start it, or set TEST_MONGODB_URI. ${error.message}`);
  }
  if (!mongoose.connection.name.endsWith('_unit')) throw new Error('refusing to empty a database that is not a test one');
  await mongoose.connection.dropDatabase();
}

async function closeDatabase() {
  await mongoose.disconnect();
}

async function researcherCookie() {
  const { createSessionToken, SESSION_COOKIE_NAME } = require('@/lib/auth');
  return `${SESSION_COOKIE_NAME}=${await createSessionToken()}`;
}

// Route handlers read the session through next/headers (the stand-in) or the Cookie header, so set both.
async function signInResearcher() {
  const cookie = await researcherCookie();
  const [name, value] = cookie.split('=');
  useCookies({ [name]: value });
  return cookie;
}

function signOut() {
  useCookies({});
}

function jsonRequest(url, { body, headers = {}, method = 'POST' } = {}) {
  return new Request(`http://localhost:3000${url}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function saveStudy(config, extra = {}) {
  const { saveStudy: save } = require('@/lib/kv');
  const id = config.id;
  await save({ id, config, createdAt: Date.now(), updatedAt: Date.now(), interviewCount: 0, isLocked: false, ...extra });
  return id;
}

async function makeLink(token, studyConfig, ttlSeconds = 3600) {
  const { saveParticipantToken } = require('@/lib/kv');
  await saveParticipantToken(token, { studyId: studyConfig.id, studyConfig }, ttlSeconds);
  return token;
}

const studyConfig = (id, overrides = {}) => ({
  id,
  name: `Study ${id}`,
  researchQuestion: 'Backend developer interview',
  coreQuestions: [],
  topicAreas: [],
  profileSchema: [{ id: 'name', label: 'Name', extractionHint: 'name', required: true }],
  aiBehavior: 'standard',
  consentText: 'Test consent',
  ...overrides,
});

module.exports = { emptyDatabase, closeDatabase, researcherCookie, signInResearcher, signOut, jsonRequest, saveStudy, makeLink, studyConfig };
