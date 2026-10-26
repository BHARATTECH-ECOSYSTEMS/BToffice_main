const { test } = require("node:test");
const assert = require("node:assert/strict");
const util = require("node:util");
const { errorHandler } = require("../middlewares/errorHandler");

// Review 2026-10-26 M1 (owner's 1A): a request body that isn't JSON reached the last-resort handler with the whole
// body on the error (`err.body`), and the handler logged the error as it was, so a broken sign-in or reset request
// put the plain password in the server log. Now the log never shows what was sent.

const SECRET = "FAKE-SECRET-4711";

/** Runs the handler and returns what it logged, as the console would print it, plus the reply. */
const run = (err) => {
  const logged = [];
  const real = console.error;
  console.error = (...args) => logged.push(args.map((a) => (typeof a === "string" ? a : util.inspect(a, { depth: 5 }))).join(" "));
  const reply = {};
  const res = {
    status(code) {
      reply.status = code;
      return res;
    },
    json(body) {
      reply.body = body;
      return res;
    },
  };
  try {
    errorHandler(err, {}, res, () => {});
  } finally {
    console.error = real;
  }
  return { log: logged.join("\n"), reply };
};

/** An error as body-parser makes it for a body that isn't JSON. */
const notJson = (body, message) =>
  Object.assign(new SyntaxError(message), { body, type: "entity.parse.failed", status: 400, statusCode: 400, expose: true });

test("a body that isn't JSON is never written to the log, password and all", () => {
  const { log, reply } = run(notJson(`{"username":"asha","password":"${SECRET}",}`, "Expected double-quoted property name in JSON at position 54"));
  assert.equal(log.includes(SECRET), false, log);
  assert.match(log, /entity\.parse\.failed/);
  assert.match(log, /400/);
  assert.equal(reply.status, 400);
});

test("nor the slice of it a JSON error message quotes", () => {
  const { log } = run(notJson(`{"password":${SECRET}}`, `Unexpected token 'F', "{"password":${SECRET}}" is not valid JSON`));
  assert.equal(log.includes(SECRET), false, log);
});

test("whatever else a library hangs on an error isn't logged either", () => {
  const err = Object.assign(new Error("Request failed with status code 400"), { config: { data: JSON.stringify({ value: SECRET }) }, response: { data: { echo: SECRET } } });
  const { log, reply } = run(err);
  assert.equal(log.includes(SECRET), false, log);
  assert.equal(reply.status, 500);
});

test("an ordinary crash still logs its message and where it happened", () => {
  const { log } = run(new TypeError("Cannot read properties of undefined (reading 'role')"));
  assert.match(log, /TypeError/);
  assert.match(log, /reading 'role'/);
  assert.match(log, /at /, "the stack is there");
});
