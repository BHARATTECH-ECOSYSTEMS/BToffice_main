const { test } = require("node:test");
const assert = require("node:assert/strict");
const { applyRequestSanitizers } = require("../middlewares/requestSanitizers");
const { generateTemporaryPassword } = require("../controllers/inviteController");

const sanitizers = [];
applyRequestSanitizers({ use: (middleware) => sanitizers.push(middleware) });

/** Runs a sign-in body through the same sanitizers server.js puts in front of every route. */
const afterServerSanitizers = async (password) => {
  const req = { body: { username: "someone@example.test", password }, query: {}, params: {}, headers: {}, method: "POST", get: () => "application/json", is: () => "json" };
  for (const middleware of sanitizers) {
    await new Promise((resolve, reject) => middleware(req, {}, (err) => (err ? reject(err) : resolve())));
  }
  return req.body.password;
};

// Until step 16 the database cleaner deleted every $, which is why temporary passwords still leave it out.
test("$ now reaches sign-in unchanged too (the cleaner only drops dangerous field names)", async () => {
  assert.equal(await afterServerSanitizers("abc$def"), "abc$def");
});

test("& now reaches sign-in unchanged (the HTML cleaner that rewrote it is gone)", async () => {
  assert.equal(await afterServerSanitizers("abc&def"), "abc&def");
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
