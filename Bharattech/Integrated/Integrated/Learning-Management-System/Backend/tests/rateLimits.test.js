const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { createRateLimits, PER_PERSON, PER_ADDRESS, SIGN_IN, SIGN_IN_PATHS } = require("../middlewares/rateLimits");

let server;
let base;

// Small limits so the tests can reach them, each a different size so a refusal shows which limit made it. Addresses come from X-Forwarded-For, as on Render (trust proxy).
before(async () => {
  const app = express();
  app.set("trust proxy", 1);
  const limits = createRateLimits({ perPerson: 3, perAddress: 4, signIn: 2, windowMs: 60_000 });
  app.use("/api", limits.api);
  app.post("/api/auth/keycloak-login", limits.signIn, (_req, res) => res.json({ ok: true }));
  app.get("/api/thing", (_req, res) => res.json({ ok: true }));
  await new Promise((resolve) => (server = app.listen(0, "127.0.0.1", resolve)));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
});

/** A sign-in token as Keycloak shapes one: only its middle part (who it is) matters for counting. */
const tokenFor = (sub) => `${Buffer.from('{"alg":"RS256"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub })).toString("base64url")}.signature`;
let addresses = 0;
const newAddress = () => `203.0.113.${++addresses}`;

const get = (address, token) =>
  fetch(`${base}/thing`, { headers: { "X-Forwarded-For": address, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
const signIn = (address, username = "someone@example.test") =>
  fetch(`${base}/auth/keycloak-login`, { method: "POST", headers: { "X-Forwarded-For": address, "Content-Type": "application/json" }, body: JSON.stringify({ username, password: "x" }) });
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
  const part = (claims) => `x.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.y`;
  const junk = ["junk", "a.b.c", part([1]), part({}), part({ sub: 5 })];
  assert.deepEqual(await statuses(junk.map((token) => () => get(visitor, token))), [200, 200, 200, 200, 429]);
});

test("sign-in tries are limited per address whoever is named, without touching the rest of the API", async () => {
  // the third try is under the address's general count of 4, so only the sign-in limit can refuse it
  const office = newAddress();
  assert.deepEqual(await statuses([["a@x.test"], ["b@x.test"], ["c@x.test"]].map(([u]) => () => signIn(office, u))), [200, 200, 429]);
  const refused = await signIn(office);
  assert.match((await refused.json()).message, /wait a minute/i);
  // the same address can still use the portal, and another address can still sign in
  assert.equal((await get(office, tokenFor("kc-after-signin"))).status, 200);
  assert.equal((await signIn(newAddress())).status, 200);
});

test("the real limits: generous per person and per address, strict on every route that takes or sets a password", () => {
  assert.equal(PER_PERSON, 1000);
  assert.equal(PER_ADDRESS, 300);
  assert.equal(SIGN_IN, 20);
  for (const path of ["/auth/keycloak-login", "/auth/login", "/auth/accept-invite", "/auth/forgot-password", "/auth/reset-password", "/auth/change-password", "/auth/keycloak-change-password", "/auth/register", "/auth/signup"]) {
    assert.ok(SIGN_IN_PATHS.includes(path), path);
  }
});
