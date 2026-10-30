import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { HANDOFF, askPortal, isSignInReturn, originOf } from "../src/auth/handoff.js";

// The LMS asks the portal tab that opened it for its sign-in (owner's fix A, 1A 2A, 2026-10-25), so someone signed in
// to the portal with an Employee ID is not sent to Keycloak's page, which only takes a work email or username.

const PORTAL = "http://localhost:4182";
const TOKENS = { access: "a.b.c", refresh: "d.e.f", id: "g.h.i" };
// a hand-over that never settles must fail, not hang
const LIMIT = { timeout: 2000 };

function fake() {
  const asked = [];
  const opener = { postMessage: (data, target) => asked.push({ data, target }) };
  let listener = null;
  const timers = [];
  const env = {
    listen: (cb) => {
      listener = cb;
      return () => (listener = null);
    },
    later: (fn) => timers.push(fn),
  };
  return { opener, asked, env, say: (e) => listener?.(e), timeout: () => timers.forEach((fn) => fn()), listening: () => !!listener };
}

test("asks only the portal's exact address, and takes tokens only from that tab at that address", LIMIT, async () => {
  const f = fake();
  const result = askPortal({ opener: f.opener, portalOrigin: PORTAL, ...f.env });
  assert.deepEqual(f.asked, [{ data: { type: HANDOFF.ready }, target: PORTAL }]);
  f.say({ origin: "https://evil.example", source: f.opener, data: { type: HANDOFF.tokens, ...TOKENS } });
  f.say({ origin: PORTAL, source: {}, data: { type: HANDOFF.tokens, ...TOKENS } });
  f.say({ origin: PORTAL, source: f.opener, data: { type: "other", ...TOKENS } });
  assert.equal(f.listening(), true, "strangers are ignored");
  f.say({ origin: PORTAL, source: f.opener, data: { type: HANDOFF.tokens, ...TOKENS } });
  assert.deepEqual(await result, TOKENS);
  assert.equal(f.listening(), false);
});

test("a portal that is signed out, or answers with something that isn't a sign-in, gives no sign-in", LIMIT, async () => {
  for (const data of [{ type: HANDOFF.tokens, none: true }, { type: HANDOFF.tokens, access: 1, refresh: "x" }, { type: HANDOFF.tokens, access: "x" }]) {
    const f = fake();
    const result = askPortal({ opener: f.opener, portalOrigin: PORTAL, ...f.env });
    f.say({ origin: PORTAL, source: f.opener, data });
    assert.equal(await result, null, JSON.stringify(data));
  }
});

test("opened directly (no opener), with no portal address set, or with no answer in time: no sign-in", LIMIT, async () => {
  assert.equal(await askPortal({ opener: null, portalOrigin: PORTAL, ...fake().env }), null);
  const f = fake();
  assert.equal(await askPortal({ opener: f.opener, portalOrigin: null, ...f.env }), null);
  assert.equal(f.asked.length, 0, "nothing is sent without a portal address");
  const g = fake();
  const result = askPortal({ opener: g.opener, portalOrigin: PORTAL, ...g.env });
  g.timeout();
  assert.equal(await result, null);
  assert.equal(g.listening(), false);
});

test("the return from Keycloak's page is recognised, so the portal isn't asked twice", LIMIT, () => {
  assert.equal(isSignInReturn("http://localhost:5175/#state=1&session_state=2&code=3"), true);
  assert.equal(isSignInReturn("http://localhost:5175/#error=login_required&state=1"), true);
  assert.equal(isSignInReturn("http://localhost:5175/course-list"), false);
});

test("addresses are reduced to their origin; anything else is no address", LIMIT, () => {
  assert.equal(originOf("http://localhost:4182/#/portal"), PORTAL);
  assert.equal(originOf(""), null);
  assert.equal(originOf("not a url"), null);
});

// Review 2026-10-26 low list: the portal renews its sign-in before handing it over when it's near expiry, which can
// take up to its 20-second limit on a slow network; waiting only 1.5 s, this tab often gave up and showed its own
// sign-in screen, which Employee IDs can't use.
test("waits longer than the portal's own 20-second limit on renewing the sign-in", LIMIT, async () => {
  let waited = 0;
  const opener = { postMessage() {} };
  void askPortal({ opener, portalOrigin: PORTAL, listen: () => () => {}, later: (_fn, ms) => (waited = ms) });
  assert.ok(waited > 20000, `waits ${waited} ms`);
});

test("while it waits, the page says it's signing you in instead of staying blank", LIMIT, () => {
  const main = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
  assert.match(main, /renderSigningIn\(\);\nsignIn\(\)/);
  assert.match(main, /Signing you in…/);
});
