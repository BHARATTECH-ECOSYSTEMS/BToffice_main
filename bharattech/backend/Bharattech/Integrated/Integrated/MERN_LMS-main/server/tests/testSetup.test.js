import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Review 2026-10-26, tests area (owner's 3A): every test file runs on a UTC clock (tests/setup.js, loaded by
// package.json's test script).

test("tests run on a UTC clock, so a slip back to the device's clock fails even on a laptop in India", () => {
  assert.equal(process.env.TZ, "UTC");
  assert.equal(new Date(Date.UTC(2026, 9, 31, 20, 0)).getHours(), 20);
});

test("the test script loads the setup for every file", () => {
  const { scripts } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(scripts.test, /--import \.\/tests\/setup\.js/);
});
