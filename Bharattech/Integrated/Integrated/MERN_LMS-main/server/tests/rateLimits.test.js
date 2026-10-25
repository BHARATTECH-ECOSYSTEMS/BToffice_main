import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import { createRateLimits, PER_PERSON, PER_ADDRESS } from "../middlewares/rateLimits.js";
import { startApp, stopApp, tokenFor, baseUrl } from "./helpers.js";

// Group C Part 2 (2026-10-26, owner's 1A): on the live site the old limits (100 per 15 minutes per address, educator
// pages 15 per HOUR) locked an educator out within minutes, since their pages refresh every 15 seconds, and a whole
// office behind one address shared the count. Now, as in the main backend: signed in, counted per person, generously;
// not signed in, per address. The same numbers everywhere, so what is tested here is what runs live.

before(startApp);
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
