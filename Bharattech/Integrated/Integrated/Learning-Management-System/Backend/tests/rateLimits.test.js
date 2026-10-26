const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const { createRateLimits, PER_PERSON, PER_ADDRESS, SIGN_IN, SIGN_IN_PATHS, PASSWORD_PATHS, PUBLIC_FORM, PUBLIC_FORM_WINDOW_MS } = require("../middlewares/rateLimits");

let server;
let base;

// Small limits so the tests can reach them, each a different size so a refusal shows which limit made it. Addresses come from X-Forwarded-For, as on Render (trust proxy).
before(async () => {
  const app = express();
  app.set("trust proxy", 1);
  const limits = createRateLimits({ perPerson: 3, perAddress: 4, signIn: 2, publicForm: 1, windowMs: 60_000, publicFormWindowMs: 60_000 });
  app.use("/api", limits.api);
  app.post("/api/auth/keycloak-login", limits.signIn, express.json(), (req, res) => (req.body.password === "right" ? res.json({ ok: true }) : res.status(401).json({ message: "Invalid username or password" })));
  app.post("/api/auth/forgot-password", limits.passwords, (_req, res) => res.json({ ok: true }));
  app.post("/api/verification-requests", limits.publicForm, (_req, res) => res.status(201).json({ ok: true }));
  app.get("/api/thing", (_req, res) => res.json({ ok: true }));
  await new Promise((resolve) => (server = app.listen(0, "127.0.0.1", resolve)));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
});

const part = (claims) => Buffer.from(JSON.stringify(claims)).toString("base64url");
/** A sign-in token as Keycloak shapes one: only its middle part (who it is) matters for counting. */
const tokenFor = (sub) => `${part({ alg: "RS256" })}.${part({ sub })}.signed`;
let addresses = 0;
const newAddress = () => `203.0.113.${++addresses}`;

const get = (address, token) =>
  fetch(`${base}/thing`, { headers: { "X-Forwarded-For": address, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
const signIn = (address, username = "someone@example.test", password = "wrong") =>
  fetch(`${base}/auth/keycloak-login`, { method: "POST", headers: { "X-Forwarded-For": address, "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
const forgot = (address) => fetch(`${base}/auth/forgot-password`, { method: "POST", headers: { "X-Forwarded-For": address } });
const statuses = async (requests) => {
  const out = [];
  for (const request of requests) out.push((await request()).status);
  return out;
};

test("each signed-in person has their own count, so coworkers on one address don't block each other", async () => {
  const office = newAddress();
  const asha = tokenFor("kc-asha");
  const kabir = tokenFor("kc-kabir");

  assert.deepEqual(await statuses([1, 2, 3, 4].map(() => () => get(office, asha))), [200, 200, 200, 429]);
  assert.equal((await get(office, kabir)).status, 200);
  // and Asha's count follows her, not the address
  assert.equal((await get(newAddress(), asha)).status, 429);
});

test("a refusal says to wait, as JSON, and how long", async () => {
  const office = newAddress();
  const token = tokenFor("kc-busy");
  for (let i = 0; i < 3; i++) await get(office, token);

  const res = await get(office, token);
  assert.equal(res.status, 429);
  assert.match((await res.json()).message, /wait a minute/i);
  assert.ok(Number(res.headers.get("retry-after")) > 0);
});

test("requests without a sign-in are counted per address", async () => {
  const visitor = newAddress();
  assert.deepEqual(await statuses([1, 2, 3, 4, 5].map(() => () => get(visitor))), [200, 200, 200, 200, 429]);
  assert.equal((await get(newAddress())).status, 200);
});

test("a token that can't be read counts as no sign-in, so it can't dodge the address count", async () => {
  const visitor = newAddress();
  // five unreadable tokens from one address share its count of 4: no dots, a middle that isn't JSON, a list, no
  // "sub", a "sub" that isn't text
  const signedLooking = (claims) => `x.${part(claims)}.signed`;
  const junk = ["junk", "a.b.c", signedLooking([1]), signedLooking({}), signedLooking({ sub: 5 })];
  assert.deepEqual(await statuses(junk.map((token) => () => get(visitor, token))), [200, 200, 200, 200, 429]);
});

// Review 2026-10-26 M5 (owner's 2A): every sign-in counted, successful ones too, so an office behind one address was
// locked out after 20 morning sign-ins. Now only failed sign-ins count; the other password routes count every try.
test("successful sign-ins don't count, so a whole office can sign in from one address", async () => {
  const office = newAddress();
  // more than the sign-in limit of 2, all from one address (each also counts toward the address's general 4, so 3)
  assert.deepEqual(await statuses([1, 2, 3].map(() => () => signIn(office, "someone@x.test", "right"))), [200, 200, 200]);
});

test("failed sign-ins are limited per address whoever is named, without touching the rest of the API", async () => {
  // the third try is under the address's general count of 4, so only the sign-in limit can refuse it
  const office = newAddress();
  assert.deepEqual(await statuses([["a@x.test"], ["b@x.test"], ["c@x.test"]].map(([u]) => () => signIn(office, u))), [401, 401, 429]);
  const refused = await signIn(office, "a@x.test", "right");
  assert.equal(refused.status, 429, "once refused, even the right password waits");
  assert.match((await refused.json()).message, /wait a minute/i);
  // the same address can still use the portal, and another address can still sign in
  assert.equal((await get(office, tokenFor("kc-after-signin"))).status, 200);
  assert.equal((await signIn(newAddress(), "someone@x.test", "right")).status, 200);
});

test("the other password routes count every request, answered or not (forgot password always answers the same)", async () => {
  const visitor = newAddress();
  assert.deepEqual(await statuses([1, 2, 3].map(() => () => forgot(visitor))), [200, 200, 429]);
});

test("the real limits: generous per person and per address, strict on every route that takes or sets a password", () => {
  assert.equal(PER_PERSON, 1000);
  assert.equal(PER_ADDRESS, 300);
  assert.equal(SIGN_IN, 20);
  assert.deepEqual(SIGN_IN_PATHS, ["/auth/keycloak-login"]);
  for (const p of ["/auth/login", "/auth/accept-invite", "/auth/forgot-password", "/auth/reset-password", "/auth/change-password", "/auth/keycloak-change-password", "/auth/register", "/auth/signup"]) {
    assert.ok(PASSWORD_PATHS.includes(p), p);
  }
  const serverFile = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  assert.match(serverFile, /app\.use\(SIGN_IN_PATHS\.map\(\(p\) => `\/api\$\{p\}`\), rateLimits\.signIn\);/);
  assert.match(serverFile, /app\.use\(PASSWORD_PATHS\.map\(\(p\) => `\/api\$\{p\}`\), rateLimits\.passwords\);/);
});

const sendForm = (address) => fetch(`${base}/verification-requests`, { method: "POST", headers: { "X-Forwarded-For": address, "Content-Type": "application/json" }, body: "{}" });

test("the website's verification form is limited per address on its own count, apart from sign-in and the rest", async () => {
  // its limit (1 here) is under every other count, so only the form's own limit can refuse the second send
  const visitor = newAddress();
  // every request also counts toward the address's general 4, so this stays at 4: two sends, a sign-in, a page
  assert.equal((await sendForm(visitor)).status, 201);
  const refused = await sendForm(visitor);
  assert.equal(refused.status, 429);
  // the form's window is an hour, so it doesn't promise a minute
  assert.match((await refused.json()).message, /^Too many requests from here\. Try again in an hour/);
  assert.equal((await sendForm(newAddress())).status, 201, "another address can still send one");
  assert.equal((await signIn(visitor, "someone@x.test", "right")).status, 200, "the same address can still sign in");
  assert.equal((await get(visitor)).status, 200, "and use the rest of the API");
});

test("the real form limit: 5 an hour per address", () => {
  assert.equal(PUBLIC_FORM, 5);
  assert.equal(PUBLIC_FORM_WINDOW_MS, 60 * 60 * 1000);
});
