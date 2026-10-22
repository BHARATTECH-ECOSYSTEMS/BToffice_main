const { test } = require("node:test");
const assert = require("node:assert/strict");
const mongoSanitize = require("@exortek/express-mongo-sanitize");
const { xss } = require("express-xss-sanitizer");
const { generateTemporaryPassword } = require("../controllers/inviteController");

/** Runs a sign-in body through the same sanitizers server.js puts in front of every route. */
const afterServerSanitizers = async (password) => {
  const req = { body: { username: "someone@example.test", password }, query: {}, params: {}, headers: {} };
  for (const middleware of [mongoSanitize(), xss()]) {
    await new Promise((resolve, reject) => middleware(req, {}, (err) => (err ? reject(err) : resolve())));
  }
  return req.body.password;
};

test("the sanitizers really do change $ and &, which is why temporary passwords must avoid them", async () => {
  assert.notEqual(await afterServerSanitizers("abc$def"), "abc$def");
  assert.notEqual(await afterServerSanitizers("abc&def"), "abc&def");
});

test("a temporary password reaches Keycloak at sign-in exactly as it was emailed", async () => {
  for (let i = 0; i < 2000; i += 1) {
    const password = generateTemporaryPassword();
    assert.equal(await afterServerSanitizers(password), password, `changed on the way in: a password with ${[...password].filter((c) => !/[a-z0-9]/i.test(c)).join(" ")}`);
  }
});

test("temporary passwords stay long and varied", () => {
  const seen = new Set();
  for (let i = 0; i < 500; i += 1) {
    const password = generateTemporaryPassword();
    assert.equal(password.length, 16);
    seen.add(password);
  }
  assert.equal(seen.size, 500);
});
