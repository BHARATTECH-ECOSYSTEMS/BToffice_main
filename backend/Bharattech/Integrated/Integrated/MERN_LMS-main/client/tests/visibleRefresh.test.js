import { test } from "node:test";
import assert from "node:assert/strict";
import { refreshWhileVisible } from "../src/utils/visibleRefresh.js";

// Group C Part 2 (2026-10-26, owner's 1A): the educator pages refresh every 15 seconds only while their tab is in
// view, and once as soon as it comes back, instead of asking the server all day from a tab nobody looks at.

function fakePage({ hidden = false } = {}) {
  const listeners = new Map();
  const timers = new Map();
  let nextTimer = 1;
  const doc = {
    hidden,
    addEventListener: (type, fn) => listeners.set(type, fn),
    removeEventListener: (type) => listeners.delete(type),
  };
  const win = {
    setInterval: (fn, ms) => (timers.set(nextTimer, { fn, ms }), nextTimer++),
    clearInterval: (id) => timers.delete(id),
  };
  return {
    doc,
    win,
    tick: () => [...timers.values()].forEach((t) => t.fn()),
    show: (visible) => ((doc.hidden = !visible), listeners.get("visibilitychange")?.()),
    timers,
    listeners,
  };
}

test("refreshes on the timer while visible, every 15 seconds", () => {
  const page = fakePage();
  let refreshed = 0;
  refreshWhileVisible(() => refreshed++, page);
  assert.equal([...page.timers.values()][0].ms, 15000);
  page.tick();
  page.tick();
  assert.equal(refreshed, 2);
});

test("a hidden tab doesn't refresh; it refreshes once when it is looked at again", () => {
  const page = fakePage({ hidden: true });
  let refreshed = 0;
  refreshWhileVisible(() => refreshed++, page);
  page.tick();
  page.tick();
  assert.equal(refreshed, 0);
  page.show(true);
  assert.equal(refreshed, 1);
  page.show(false);
  assert.equal(refreshed, 1);
});

test("stopping removes the timer and the listener", () => {
  const page = fakePage();
  const stop = refreshWhileVisible(() => {}, page);
  stop();
  assert.equal(page.timers.size, 0);
  assert.equal(page.listeners.size, 0);
});
