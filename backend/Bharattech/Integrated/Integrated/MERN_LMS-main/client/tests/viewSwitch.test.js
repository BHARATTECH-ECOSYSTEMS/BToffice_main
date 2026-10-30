import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createSwitchGuard, SWITCH_SETTLE_MS } from "../src/utils/viewSwitch.js";

// "View as educator" and "View as learner" swap in the same spot, so the second click of a double-click switched
// straight back ("You're now seeing Learning as a learner."). Owner's A (2026-10-30): a switch is ignored for a second
// after the last one.

test("a second switch within a second of the last is ignored", () => {
  let now = 10_000;
  const allowed = createSwitchGuard(() => now);
  assert.equal(SWITCH_SETTLE_MS, 1000);
  assert.equal(allowed(), true);
  now += 170; // the second click of a double-click
  assert.equal(allowed(), false);
  now += SWITCH_SETTLE_MS - 170 - 1;
  assert.equal(allowed(), false);
  now += 1;
  assert.equal(allowed(), true, "a second after the switch, switching back works again");
});

test("ignored clicks don't push the wait further out", () => {
  let now = 0;
  const allowed = createSwitchGuard(() => now);
  assert.equal(allowed(), true);
  for (now = 100; now < SWITCH_SETTLE_MS; now += 100) assert.equal(allowed(), false);
  now = SWITCH_SETTLE_MS;
  assert.equal(allowed(), true);
});

test("the very first switch is never held back", () => {
  assert.equal(createSwitchGuard(() => 0)(), true);
});

test("the view switch uses the guard, and each bar only announces and moves on a switch that happened", () => {
  const auth = readFileSync(new URL("../src/context/AuthContext.jsx", import.meta.url), "utf8");
  assert.match(auth, /createSwitchGuard/);
  assert.match(auth, /const switchViewRole = \(role\) => switchAllowed\(\) && setViewRole\(role\);/);
  for (const [file, to] of [
    ["../src/components/students/Navbar.jsx", "educator"],
    ["../src/components/educator/Navbar.jsx", "student"],
  ]) {
    const bar = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(bar, new RegExp(`if \\(!switchViewRole\\("${to}"\\)\\) return;`), file);
  }
});
