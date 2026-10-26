import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { generateKeyPairSync } from "node:crypto";
import fs from "node:fs";
import express from "express";
import jwt from "jsonwebtoken";
import { startApp, stopApp, tokenFor, baseUrl } from "./helpers.js";

// Group C Part 2 (2026-10-26, owner's 1A): on the live site the old limits (100 per 15 minutes per address, educator
// pages 15 per HOUR) locked an educator out within minutes, since their pages refresh every 15 seconds, and a whole
// office behind one address shared the count. Now, as in the main backend: signed in, counted per person, generously;
// not signed in, per address. The same numbers everywhere, so what is tested here is what runs live.

// loaded once the test Keycloak is up: the signature check reads its address when it loads
let createRateLimits, PER_PERSON, PER_ADDRESS;
before(async () => {
  await startApp();
  ({ createRateLimits, PER_PERSON, PER_ADDRESS } = await import("../middlewares/rateLimits.js"));
});
after(stopApp);

/** A small app behind the limits, for counting. */
async function limitedApp(options) {
  const app = express();
  app.use(createRateLimits(options).api);
  app.get("/", (req, res) => res.json({ ok: true }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const get = (token) => fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then((r) => r.status);
  return { get, close: () => new Promise((resolve) => server.close(resolve)) };
}

test("signed in, each person has their own count, even from the same address", async () => {
  const app = await limitedApp({ perPerson: 3, perAddress: 2 });
  const asha = tokenFor({ sub: "asha" });
  const kabir = tokenFor({ sub: "kabir" });
  const ashaTries = [await app.get(asha), await app.get(asha), await app.get(asha), await app.get(asha)];
  assert.deepEqual(ashaTries, [200, 200, 200, 429]);
  assert.deepEqual([await app.get(kabir), await app.get(kabir), await app.get(kabir)], [200, 200, 200]);
  await app.close();
});

test("not signed in, requests are counted per address with the smaller limit", async () => {
  const app = await limitedApp({ perPerson: 3, perAddress: 2 });
  assert.deepEqual([await app.get(), await app.get(), await app.get()], [200, 200, 429]);
  await app.close();
});

// Review 2026-10-26 M6 (owner's 3A): counting read the token without checking it, so a script sending a new made-up
// token each time got a fresh count every time and never met the address's limit.
test("made-up tokens count against their address, however many different ones are sent", async () => {
  const app = await limitedApp({ perPerson: 3, perAddress: 2 });
  const { privateKey: notKeycloaks } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const signedByAnyone = (sub) => jwt.sign({ sub, azp: "lms-client" }, notKeycloaks, { algorithm: "RS256", keyid: "test-key", expiresIn: "5m" });
  const unsigned = (sub) => `${Buffer.from('{"alg":"RS256"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub })).toString("base64url")}.x`;
  const tries = [await app.get(signedByAnyone("a")), await app.get(unsigned("b")), await app.get(signedByAnyone("c"))];
  assert.deepEqual(tries, [200, 200, 429]);
  // a real sign-in still has its own count
  assert.equal(await app.get(tokenFor({ sub: "real" })), 200);
  await app.close();
});

test("the counting uses sign-in's own check (authMiddleware's verifyToken), and protect() does too", () => {
  const limits = fs.readFileSync(new URL("../middlewares/rateLimits.js", import.meta.url), "utf8");
  assert.match(limits, /import \{ verifyToken \} from "\.\/authMiddleware\.js";/);
  assert.match(limits, /verify = verifyToken/);
  const auth = fs.readFileSync(new URL("../middlewares/authMiddleware.js", import.meta.url), "utf8");
  assert.match(auth, /verifyToken\(token\)\.then\(/);
});

test("the limits are generous and don't depend on the environment", async () => {
  assert.equal(PER_PERSON, 1000);
  assert.equal(PER_ADDRESS, 300);
});

test("educator pages have no stricter limit of their own", async () => {
  const token = tokenFor({ sub: "educator-1", roles: ["Admin"] });
  const statuses = [];
  for (let i = 0; i < 30; i += 1) {
    const res = await fetch(`${baseUrl}/api/educator/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
    statuses.push(res.status);
    if (i === 0) assert.match(res.headers.get("ratelimit-policy") ?? "", /q=1000/);
  }
  assert.ok(statuses.every((s) => s === 200), statuses.join(","));
});
