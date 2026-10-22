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

test("a database operator smuggled into a field is still removed", async () => {
  const received = await echo({ email: { $gt: "" }, password: { $ne: null } });
  assert.equal(JSON.stringify(received).includes("$"), false, JSON.stringify(received));
});

// Known and reported: mongoSanitize also drops $ from ordinary text. Left as it is for now (owner's choice 3A).
test("a $ inside ordinary text is still removed by the database cleaner", async () => {
  assert.notEqual((await echo({ password: "Pa$$word" })).password, "Pa$$word");
});

test("a query parameter sent twice is read once (parameter pollution)", async () => {
  const res = await fetch(`${base}?role=Employee&role=Superadmin`);
  assert.equal(typeof (await res.json()).role, "string");
});
