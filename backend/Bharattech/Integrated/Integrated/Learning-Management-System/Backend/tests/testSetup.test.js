const { test } = require("node:test");
const assert = require("node:assert/strict");

// Review 2026-10-26, tests area (owner's 3A and 5A): every test file runs on a UTC clock and can't send real mail
// (tests/helpers/setup.js, loaded by package.json's test script).

test("tests run on a UTC clock, so a slip back to the device's clock fails even on a laptop in India", () => {
  assert.equal(process.env.TZ, "UTC");
  assert.equal(new Date(Date.UTC(2026, 9, 31, 20, 0)).getHours(), 20);
});

test("a test that doesn't stand in for the mail sends none, even with a mail server configured", async () => {
  // nothing listens on port 1: a real transport would fail to connect
  process.env.SMTP_HOST = "127.0.0.1";
  process.env.SMTP_PORT = "1";
  const { createMailTransporter } = require("../utils/mailer");
  assert.deepEqual(await createMailTransporter().sendMail({ to: "someone@example.test", subject: "Hello", text: "Hi" }), { messageId: "test" });
});

test("the test script loads the setup for every file", () => {
  const { scripts } = require("../package.json");
  assert.match(scripts.test, /--require \.\/tests\/helpers\/setup\.js/);
});
