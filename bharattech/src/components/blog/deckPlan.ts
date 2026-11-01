/**
 * The Blog's deck of post cards: where the deck stands at a given scroll progress (0…1 through the pinned stretch).
 * The deck's position runs from 0 (the first card in front) to `count - 1` (the last); between two whole numbers one
 * card is lifting away and the next is coming forward. Each card rests around its own stop, so it can be read while
 * the scroll moves a little.
 */

/** The share of each step between two cards, at either end, where nothing moves. */
const REST = 0.2;

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const easeInOut = (t: number) => t * t * (3 - 2 * t);

/** The scroll progress at which card `k` is in front. */
export function stopOf(k: number, count: number) {
  return count > 1 ? k / (count - 1) : 0;
}

/** The deck's position: the index of the card in front, with the fraction of the swap to the next one. */
export function deckAt(progress: number, count: number) {
  if (count < 2) return 0;
  const steps = clamp01(progress) * (count - 1);
  const whole = Math.floor(steps);
  return whole + easeInOut(clamp01((steps - whole - REST) / (1 - 2 * REST)));
}

/** The card the reader is on: the one that is more than halfway in front. */
export function pageAt(progress: number, count: number) {
  if (count < 2) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(progress * (count - 1))));
}
