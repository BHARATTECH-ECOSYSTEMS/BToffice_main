import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HANDOFF, handOver, isReady, isPlainClick, type HandoffEnv } from '../../src/portal/lmsHandoff';

// Learning option A, fix A (owner 1A 2A, 2026-10-25): the portal hands its sign-in to the LMS tab it opens, so an
// Employee ID sign-in never meets Keycloak's own page. Tokens only ever go, by postMessage, to the exact LMS address,
// to the tab the portal itself opened, after that tab asked.

const LMS = 'http://localhost:5175';
const TOKENS = { access: 'a.b.c', refresh: 'd.e.f', id: 'g.h.i' };

function fakeEnv() {
  const sent: { data: unknown; target: string }[] = [];
  const tab = { postMessage: (data: unknown, target: string) => sent.push({ data, target }) };
  let listener: ((e: { origin: string; source: unknown; data: unknown }) => void) | null = null;
  const timers: (() => void)[] = [];
  const opened: string[] = [];
  const env: HandoffEnv = {
    open: (url) => (opened.push(url), tab),
    listen: (cb) => {
      listener = cb;
      return () => (listener = null);
    },
    later: (fn) => timers.push(fn),
  };
  const say = async (e: { origin: string; source: unknown; data: unknown }) => {
    listener?.(e);
    await new Promise((r) => setTimeout(r, 0));
  };
  return { env, tab, sent, opened, say, timers, listening: () => !!listener };
}

test('only an ordinary click is handed over; a ctrl/cmd/shift/alt or middle click keeps the browser’s own tab', () => {
  const click = { button: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false };
  assert.equal(isPlainClick(click), true);
  for (const k of ['ctrlKey', 'metaKey', 'shiftKey', 'altKey'] as const) assert.equal(isPlainClick({ ...click, [k]: true }), false);
  assert.equal(isPlainClick({ ...click, button: 1 }), false);
});

test('a ready message counts only from the exact LMS address and the tab the portal opened', () => {
  const tab = {};
  const ready = { type: HANDOFF.ready };
  assert.equal(isReady({ origin: LMS, source: tab, data: ready }, tab, LMS), true);
  assert.equal(isReady({ origin: 'http://localhost:5176', source: tab, data: ready }, tab, LMS), false, 'another port');
  assert.equal(isReady({ origin: 'https://evil.example', source: tab, data: ready }, tab, LMS), false, 'another site');
  assert.equal(isReady({ origin: LMS, source: {}, data: ready }, tab, LMS), false, 'another tab');
  assert.equal(isReady({ origin: LMS, source: tab, data: { type: 'other' } }, tab, LMS), false, 'another message');
  assert.equal(isReady({ origin: LMS, source: tab, data: null }, tab, LMS), false);
});

test('the portal opens the LMS without tokens in the address, and hands them over only to the LMS address when asked', async () => {
  const f = fakeEnv();
  assert.equal(handOver(`${LMS}/`, async () => TOKENS, f.env), 'opened');
  assert.deepEqual(f.opened, [`${LMS}/`]);
  assert.doesNotMatch(f.opened[0], /token|refresh|a\.b\.c/);
  await f.say({ origin: 'https://evil.example', source: f.tab, data: { type: HANDOFF.ready } });
  await f.say({ origin: LMS, source: {}, data: { type: HANDOFF.ready } });
  assert.equal(f.sent.length, 0, 'nothing to a stranger');
  await f.say({ origin: LMS, source: f.tab, data: { type: HANDOFF.ready } });
  assert.deepEqual(f.sent, [{ data: { type: HANDOFF.tokens, ...TOKENS }, target: LMS }]);
  assert.equal(f.listening(), false, 'one hand-over per click, then the portal stops listening');
});

test('signed out (2A): the portal answers with no sign-in, so the LMS shows its own sign-in screen at once', async () => {
  const f = fakeEnv();
  handOver(`${LMS}/`, async () => null, f.env);
  await f.say({ origin: LMS, source: f.tab, data: { type: HANDOFF.ready } });
  assert.deepEqual(f.sent, [{ data: { type: HANDOFF.tokens, none: true }, target: LMS }]);
});

test('the portal stops listening after a short while even if the tab never asks', () => {
  const f = fakeEnv();
  handOver(`${LMS}/`, async () => TOKENS, f.env);
  assert.equal(f.listening(), true);
  f.timers.forEach((fn) => fn());
  assert.equal(f.listening(), false);
});

test('a blocked tab or an address that is not a web address is left to the plain link', () => {
  const f = fakeEnv();
  assert.equal(handOver(`${LMS}/`, async () => TOKENS, { ...f.env, open: () => null }), 'blocked');
  assert.equal(handOver('not a url', async () => TOKENS, f.env), 'skipped');
  assert.equal(f.listening(), false);
});

test('every link to the LMS in the portal goes through the hand-over, and the tokens come fresh from the sign-in', () => {
  const layout = readFileSync('src/portal/PortalLayout.tsx', 'utf8');
  assert.match(layout, /useLmsHandoff\(\)/);
  const hook = readFileSync('src/portal/lmsHandoff.ts', 'utf8');
  assert.match(hook, /handoverTokens\(\)/);
  const auth = readFileSync('src/portal/auth.ts', 'utf8');
  assert.match(auth, /async function handoverTokens\(\)[\s\S]*?await accessToken\(\)/, 'renewed before it is handed over');
});
