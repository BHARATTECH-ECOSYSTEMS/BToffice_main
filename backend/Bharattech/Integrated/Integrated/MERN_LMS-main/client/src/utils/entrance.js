// Course cards and course rows come in one after another the first time a list shows in this tab (owner's 1A 3A,
// 2026-10-27). Coming back to a list, a search narrowing it, or the 15-second refresh shows it at once.

const STEP_MS = 40;
// past the eighth card the wait stops growing, so a long list is never slow to finish coming in
const LAST_STEP = 7;

export function staggerDelay(index) {
  if (!Number.isFinite(index) || index < 0) return 0;
  return Math.min(index, LAST_STEP) * STEP_MS;
}

const shown = new Set();

export const isFirstShow = (key) => !shown.has(key);
export const markShown = (key) => {
  shown.add(key);
};
