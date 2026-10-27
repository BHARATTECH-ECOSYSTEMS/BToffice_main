const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// Review 2026-10-26 low list, housekeeping: the daily leaver check and the hourly invite check started before the
// database had connected (their first run could time out); the company dashboard counted removed people as users;
// and one comment still said the request cleaner changes "$" and "&" in passwords, which it hasn't since step 16.

const User = require("../models/User");
const { getDashboard } = require("../controllers/adminController");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

before(connectTestDb);
beforeEach(clearTestDb);
after(disconnectTestDb);

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

test("the leaver and invite checks start once the database is connected, like the file clean-up", () => {
  for (const file of ["utils/leaverDocuments.js", "utils/inviteExpiry.js", "utils/fileSweep.js"]) {
    const src = read(file);
    assert.match(src, /mongoose\.connection\.asPromise\(\)\.then\(run, \(\) => \{\}\);/, file);
    assert.doesNotMatch(src, /^  run\(\);$/m, `${file} runs before connecting`);
  }
});

test("the dashboard's user count leaves out removed people", async () => {
  await User.create(userFields());
  await User.create(userFields());
  await User.create(userFields({ isDeleted: true, deletedAt: new Date() }));
  let body;
  await getDashboard({ user: { role: "Admin" } }, { json: (b) => (body = b), status() { return this; } });
  assert.equal(body.data.totalUsers, 2);
});

test("the temporary password's comment no longer blames the request cleaner", () => {
  const src = read("controllers/inviteController.js");
  assert.doesNotMatch(src, /mongoSanitize, xss/);
});
