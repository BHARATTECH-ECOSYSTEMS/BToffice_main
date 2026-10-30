import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Owner, 2026-10-30: "when we click on sign in it takes more time to load". Measured: the sign-in request takes ~5 ms
// and the portal draws ~0.15 s after it opens, but the welcome (logo roll, then dot burst) held the portal back 2.3 s.
// Owner's choice: the same welcome, played faster (~1.1 s), then "it can be delayed by 1 sec" (~2.1 s). The window's opening ran at ~30 fps over the home page
// because the hero kept drawing behind it (pageCover.test.ts); with that paused, the 2x logo opens smoothly too, so it
// keeps its full sharpness (logoGlassSharp.test.ts).

const login = readFileSync('src/components/Login.tsx', 'utf8');
const css = readFileSync('src/styles/login.css', 'utf8');
const ms = (name: string) => Number(login.match(new RegExp(`const ${name} = (\\d+);`))?.[1]);
const rule = (selector: string) => {
  const at = css.indexOf(`${selector} {`);
  assert.notEqual(at, -1, `${selector} not found`);
  return css.slice(at, css.indexOf('}', at));
};

test('the welcome lets the portal open ~2.1 s after sign-in', () => {
  assert.equal(ms('ROLL_MS'), 1100);
  assert.equal(ms('BURST_MS'), 1000);
});

test('the roll, ring and comet end exactly when the code moves on to the burst', () => {
  for (const sel of [
    ".login-submit[data-phase='entering'] .login-orb-ball svg",
    ".login-submit[data-phase='entering'] .login-orb-ring",
    ".login-submit[data-phase='entering'] .login-orb-comet",
  ]) {
    const m = rule(sel).match(/animation: login-(?:roll|ring) (\d+)ms var\(--ease-io\) (\d+)ms both;/);
    assert.ok(m, `${sel} has no timed animation`);
    assert.equal(Number(m[1]) + Number(m[2]), ms('ROLL_MS'), `${sel} ends off the roll`);
  }
});

test('the orb has popped in before it starts to roll', () => {
  const pop = Number(rule('.login-orb-ball').match(/opacity (\d+)ms var\(--ease\)/)?.[1]);
  const delay = Number(rule(".login-submit[data-phase='entering'] .login-orb-ball svg").match(/var\(--ease-io\) (\d+)ms/)?.[1]);
  assert.ok(pop > 0 && pop <= delay + 40, `pop ${pop}ms, roll starts at ${delay}ms`);
});

test('"Welcome back" has fully risen before the portal opens', () => {
  const m = rule('.login-submit-done').match(/opacity (\d+)ms var\(--ease\) (\d+)ms/);
  assert.ok(m);
  assert.ok(Number(m[1]) + Number(m[2]) <= ms('BURST_MS'), 'still rising when the portal opens');
});
