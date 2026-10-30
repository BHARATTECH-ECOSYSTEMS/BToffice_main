const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createKeyKeeper, REFRESH_GAP_MS, RETRY_GAP_MS, RECHECK_MS } = require("../utils/keycloakKeys");

// Review 2026-10-26, found while fixing M6: the key library remembered Keycloak's signing key for 10 minutes and
// allowed 5 fetches a minute for everyone, and never remembered a failed lookup. A made-up token with a random key id
// used up a fetch each time, so a steady flood kept the allowance used up, and when the real key's 10 minutes ended
// it couldn't be fetched again: every real sign-in failed until the flood stopped. Now known keys are served from
// memory with no timer, an unknown key id asks Keycloak at most once a minute (one shared fetch), and a background
// re-check lets a key Keycloak dropped stop working.

/** A stand-in for Keycloak's key list and a clock the test moves by hand. */
const setup = (kids = ["real"]) => {
  const state = { kids, fetches: 0, fail: false, t: 1_000_000, gate: null };
  const fetchKeys = async () => {
    state.fetches += 1;
    if (state.gate) await state.gate;
    if (state.fail) throw new Error("connect ECONNREFUSED");
    return state.kids.map((kid) => ({ kid, getPublicKey: () => `key-of-${kid}` }));
  };
  const logged = [];
  const keyFor = createKeyKeeper({ fetchKeys, now: () => state.t, log: (...args) => logged.push(args.join(" ")) });
  return { state, keyFor, logged };
};
const refused = (promise) => assert.rejects(promise);
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("a known key is served from memory: Keycloak is asked once", async () => {
  const { state, keyFor } = setup();
  for (let i = 0; i < 50; i++) assert.equal(await keyFor("real"), "key-of-real");
  assert.equal(state.fetches, 1);
});

test("a flood of made-up key ids asks Keycloak at most once a minute, and the real key keeps working", async () => {
  const { state, keyFor } = setup();
  await keyFor("real");
  state.t += 1000;
  for (let i = 0; i < 200; i++) await refused(keyFor(`made-up-${i}`));
  assert.equal(state.fetches, 1, "Keycloak was just asked, so the flood within that minute asks nothing");
  for (let minute = 1; minute <= 30; minute++) {
    state.t += REFRESH_GAP_MS;
    for (let i = 0; i < 20; i++) await refused(keyFor(`made-up-${minute}-${i}`));
    assert.equal(await keyFor("real"), "key-of-real", `minute ${minute}`);
  }
  assert.ok(state.fetches <= 1 + 30, `at most one fetch a minute, was ${state.fetches}`);
});

test("the real key never runs out on a timer, even while Keycloak can't be reached", async () => {
  const { state, keyFor } = setup();
  await keyFor("real");
  state.fail = true;
  state.t += 24 * 60 * 60 * 1000;
  assert.equal(await keyFor("real"), "key-of-real");
  await settle();
  assert.equal(await keyFor("real"), "key-of-real", "a failed re-check keeps the keys it has");
});

test("known keys are re-checked in the background, without making anyone wait", async () => {
  const { state, keyFor } = setup();
  await keyFor("real");
  state.t += RECHECK_MS;
  let release;
  state.gate = new Promise((resolve) => (release = resolve));
  // the re-check is held open, yet the key is served at once
  assert.equal(await keyFor("real"), "key-of-real");
  assert.equal(state.fetches, 2);
  release();
});

test("a key Keycloak dropped stops working once the re-check has seen it gone", async () => {
  const { state, keyFor } = setup(["old"]);
  await keyFor("old");
  state.kids = ["new"];
  state.t += RECHECK_MS;
  await keyFor("old");
  await settle();
  await refused(keyFor("old"));
  assert.equal(await keyFor("new"), "key-of-new");
});

test("a new key from Keycloak (a key change) is fetched the first time a token names it", async () => {
  const { state, keyFor } = setup(["old"]);
  await keyFor("old");
  state.kids = ["old", "new"];
  state.t += REFRESH_GAP_MS;
  assert.equal(await keyFor("new"), "key-of-new");
});

test("when Keycloak is down at the start, it is asked again after a few seconds, not a minute", async () => {
  const { state, keyFor, logged } = setup();
  state.fail = true;
  await refused(keyFor("real"));
  assert.match(logged.join("\n"), /signing keys/i);
  state.fail = false;
  state.t += RETRY_GAP_MS - 1;
  await refused(keyFor("real"));
  assert.equal(state.fetches, 1, "not before the few seconds are up");
  state.t += 1;
  assert.equal(await keyFor("real"), "key-of-real");
});

test("requests arriving together share one fetch", async () => {
  const { state, keyFor } = setup();
  const all = await Promise.all(Array.from({ length: 10 }, () => keyFor("real")));
  assert.ok(all.every((k) => k === "key-of-real"));
  assert.equal(state.fetches, 1);
});

test("a token naming no key is refused without asking Keycloak", async () => {
  const { state, keyFor } = setup();
  for (const kid of [undefined, null, "", 5]) await refused(keyFor(kid));
  assert.equal(state.fetches, 0);
});

test("the gaps: one fetch a minute for unknown keys, a retry after 5 s, a re-check every 10 minutes", () => {
  assert.equal(REFRESH_GAP_MS, 60 * 1000);
  assert.equal(RETRY_GAP_MS, 5 * 1000);
  assert.equal(RECHECK_MS, 10 * 60 * 1000);
});

test("sign-in's token check takes its keys from the keeper, the library only fetching the list", () => {
  const auth = fs.readFileSync(path.join(__dirname, "..", "middlewares", "keycloakAuth.js"), "utf8");
  assert.match(auth, /createKeyKeeper\(\{ fetchKeys: \(\) => jwks\.getSigningKeys\(\) \}\)/);
  assert.match(auth, /cache: false,\s*rateLimit: false,/);
  assert.doesNotMatch(auth, /getSigningKey\(header\.kid/);
});
