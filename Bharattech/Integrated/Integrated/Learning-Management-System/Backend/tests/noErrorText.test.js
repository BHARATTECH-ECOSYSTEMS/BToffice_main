const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// Step 17 Part 1 (owner's 4A): no reply tells the caller what went wrong inside (error text, stack traces, upstream
// messages); the details go to the server log. Messages meant for people (a Refusal, an upload that's too big) stay.

test("the last-resort error handler answers a plain message and never a stack", () => {
  const { errorHandler } = require("../middlewares/errorHandler");
  const run = (err, env = "development") => {
    const saved = process.env.NODE_ENV;
    process.env.NODE_ENV = env;
    const real = console.error;
    console.error = () => {};
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
      process.env.NODE_ENV = saved;
    }
    return reply;
  };
  const crash = run(new Error("ECONNREFUSED mongodb://10.0.0.7 (internal detail)"));
  assert.deepEqual(crash, { status: 500, body: { message: "Internal Server Error" } });
  // a 4xx meant for the caller (e.g. a body that isn't JSON) keeps its own words; one that isn't says "Bad request"
  assert.deepEqual(run(Object.assign(new Error("Unexpected end of JSON input"), { status: 400, expose: true })), { status: 400, body: { message: "Unexpected end of JSON input" } });
  assert.deepEqual(run(Object.assign(new Error("internal detail"), { status: 400 })), { status: 400, body: { message: "Bad request" } });
});

// Every file the running server loads (the ones nothing loaded any more were removed in Part 3).
const BACKEND = path.resolve(__dirname, "..");
const liveFiles = () =>
  ["server.js", ...["routes", "controllers", "middlewares", "utils"].flatMap((dir) => fs.readdirSync(path.join(BACKEND, dir)).filter((f) => f.endsWith(".js")).map((f) => `${dir}/${f}`))];

/** The text of every `.json(...)` call in a file (to its matching bracket), with its line number. */
const jsonReplies = (text) => {
  const found = [];
  for (let at = text.indexOf(".json("); at !== -1; at = text.indexOf(".json(", at + 1)) {
    let depth = 0;
    let end = at + 5;
    for (; end < text.length; end++) {
      if (text[end] === "(") depth++;
      else if (text[end] === ")" && --depth === 0) break;
    }
    found.push({ line: text.slice(0, at).split("\n").length, body: text.slice(at, end + 1) });
  }
  return found;
};

// what carries internal text into a reply: an error's message or upstream answer, or a variable built from one
const ERROR_TEXT = /\b(err|error|e|emailError|syncError|fallbackError)\??\.(message|response|stack)\b|\bdetails:|\b(upstreamMessage|emailMessage)\b|getErrorMessage\(/;
// the messages that are meant for people: a Refusal, an upload that's too big or the wrong kind, a field that fails
// the model's checks
const MEANT_FOR_PEOPLE = [
  /^\.json\(\{ message: error\.message \}\)$/,
  /^\.json\(\{ message: err\.message \|\| "The upload didn't work\." \}\)$/,
  /^\.json\(\{ message: Object\.values\(error\.errors\)\.map\(\(e\) => e\.message\)\.join\(" "\) \}\)$/,
];

test("no reply sends internal error text", () => {
  const leaks = [];
  for (const file of liveFiles()) {
    for (const reply of jsonReplies(fs.readFileSync(path.join(BACKEND, file), "utf8"))) {
      if (ERROR_TEXT.test(reply.body) && !MEANT_FOR_PEOPLE.some((ok) => ok.test(reply.body))) leaks.push(`${file}:${reply.line}: ${reply.body.replace(/\s+/g, " ")}`);
    }
  }
  assert.deepEqual(leaks, []);
});
