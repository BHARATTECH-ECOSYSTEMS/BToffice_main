const hpp = require("hpp");

// The input cleaners every request passes through, in one place so the tests run exactly what server.js runs.
//
// A database operator can only arrive as a field NAME ({ "email": { "$gt": "" } }); a typed value is never one. So
// the cleaner below drops dangerous names at any depth and leaves typed values as typed: "$" in a password or a price,
// line breaks and tabs in a note (the library used before, @exortek/express-mongo-sanitize, deleted every "$" and every
// line break from all text; owner's choice 1A, step 16). Invisible control characters are still removed from text.
//
// There is deliberately no HTML cleaner here. express-xss-sanitizer rewrote every saved text ("R&D" became
// "R&amp;D", links with & broke) while still letting tags like <b> through. Text is made safe where it is shown:
// React escapes it, and anything that builds HTML from saved text (emails) must escape it, as inviteController does.

const PROTOTYPE_NAMES = new Set(["__proto__", "constructor", "prototype"]);
// "$" starts an operator ($gt, $where…) and "." reaches into nested fields; neither belongs in a real field name
const isDangerousName = (name) => name.includes("$") || name.includes(".") || PROTOTYPE_NAMES.has(name);
// every control character except tab, line feed and carriage return
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

const isPlainObject = (value) => Object.prototype.toString.call(value) === "[object Object]";

/** A copy of `value` without dangerous names at any depth, and its text without control characters. */
const cleanValue = (value) => {
  if (typeof value === "string") return value.replace(CONTROL_CHARACTERS, "");
  if (Array.isArray(value)) return value.map(cleanValue);
  if (!isPlainObject(value)) return value;
  const clean = {};
  for (const [name, inner] of Object.entries(value)) {
    if (!isDangerousName(name)) clean[name] = cleanValue(inner);
  }
  return clean;
};

const cleanRequest = (req, _res, next) => {
  if (req.body !== undefined) req.body = cleanValue(req.body);
  // Express 5 parses req.query afresh from the address on every read (a getter), so the clean copy replaces it
  Object.defineProperty(req, "query", { value: cleanValue(req.query), writable: true, enumerable: true, configurable: true });
  next();
};

const applyRequestSanitizers = (app) => {
  app.use(cleanRequest);
  app.use(hpp());
};

module.exports = { applyRequestSanitizers, cleanValue };
