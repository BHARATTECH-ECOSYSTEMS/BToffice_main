const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { applyRequestSanitizers } = require("../middlewares/requestSanitizers");

let server;
let base;

// The same order as server.js: JSON parsing, then the input cleaners, then a route that echoes what it received.
before(async () => {
  const app = express();
  app.use(express.json());
  applyRequestSanitizers(app);
  app.post("/echo", (req, res) => res.json(req.body));
  app.get("/echo", (req, res) => res.json(req.query));
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  base = `http://127.0.0.1:${server.address().port}/echo`;
});
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

const echo = async (body) => {
  const res = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.json();
};

test("text people type reaches the routes exactly as typed", async () => {
  const typed = {
    name: "R&D Team",
    title: "Terms & Conditions",
    note: "Price < 500 and > 100",
    quote: 'He said "hi"',
    apostrophe: "Asha's notes",
    link: "https://example.test/search?q=react&page=2",
    email: "a.b+tag@example.test",
  };
  assert.deepEqual(await echo(typed), typed);
});

test("text inside lists and nested records is left alone too", async () => {
  const typed = { tags: ["Q&A", "a < b"], person: { fullName: "Lal & Sons", address: { city: "Delhi & NCR" } } };
  assert.deepEqual(await echo(typed), typed);
});

// Safety comes from showing text as text: React escapes it, and HTML emails escape every value (inviteController).
test("markup is stored as plain text, not rewritten", async () => {
  const typed = { title: "<b>Hello</b> <script>alert(1)</script>" };
  assert.deepEqual(await echo(typed), typed);
});

/** Every field name in a received value, at any depth (inside lists too). */
const namesIn = (value) =>
  Array.isArray(value) ? value.flatMap(namesIn) : value && typeof value === "object" ? Object.entries(value).flatMap(([k, v]) => [k, ...namesIn(v)]) : [];

test("a database operator smuggled into a field is removed, name and all", async () => {
  const received = await echo({ email: { $gt: "" }, password: { $ne: null } });
  assert.deepEqual(received, { email: {}, password: {} });
});

test("operator names are removed at any depth and inside lists", async () => {
  const received = await echo({ person: { address: { city: { $regex: ".*" } } }, tags: [{ $where: "sleep(1000)" }, "ok"], $or: [{ a: 1 }] });
  assert.deepEqual(received, { person: { address: { city: {} } }, tags: [{}, "ok"] });
  assert.equal(namesIn(received).some((n) => n.includes("$")), false);
});

test("dotted names and prototype names are removed", async () => {
  const received = await echo(JSON.parse('{"a.b": 1, "__proto__": {"admin": true}, "constructor": {"prototype": {"x": 1}}, "fine": 2}'));
  assert.deepEqual(received, { fine: 2 });
  assert.equal({}.admin, undefined);
});

test("operator names in the address are removed too", async () => {
  const res = await fetch(`${base}?email[$ne]=x&role=Employee&a.b=1`);
  assert.deepEqual(await res.json(), { role: "Employee" });
});

// Owner's choice 1A (step 16): only field names can carry an operator, so typed values arrive exactly as typed.
test("a $ in ordinary text arrives as typed, passwords included", async () => {
  const typed = { password: "Pa$$word1", price: "Costs $500", email: "a$b@example.test", list: ["x$y"] };
  assert.deepEqual(await echo(typed), typed);
});

test("line breaks and tabs arrive as typed", async () => {
  const typed = { note: "Line one\nLine two\r\n\tIndented", lines: ["a\nb"] };
  assert.deepEqual(await echo(typed), typed);
});

test("invisible control characters are still removed from text", async () => {
  assert.deepEqual(await echo({ name: "Asha\u0000 Rao\u0007\u001b\u007f\u0085" }), { name: "Asha Rao" });
  const res = await fetch(`${base}?q=a%00b`);
  assert.deepEqual(await res.json(), { q: "ab" });
});

test("numbers, true/false and empty values pass through unchanged", async () => {
  const typed = { n: 3, ok: false, nothing: null, empty: "", list: [] };
  assert.deepEqual(await echo(typed), typed);
});

test("a query parameter sent twice is read once (parameter pollution)", async () => {
  const res = await fetch(`${base}?role=Employee&role=Superadmin`);
  assert.equal(typeof (await res.json()).role, "string");
});
