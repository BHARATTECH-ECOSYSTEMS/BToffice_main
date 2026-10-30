// Delete and Mark as left play their reel on the row's button while the backend works (owner's 1A 2A 4A, 2026-10-27).
// The stores reload the list as soon as a change is done, which would take the row, button and all, away mid-reel, so
// a change that went through also waits for the reel; a refusal comes back at once, so the button resets and says why.

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Resolves once a reel of `ms` has played; at once with reduced motion, which plays none. */
export const reelPlayed = (ms: number, reduced = prefersReducedMotion()) => new Promise<void>((done) => setTimeout(done, reduced ? 0 : ms));

/** The call's answer, once the reel has played too; a refusal is passed on straight away. */
export async function afterReel<T>(call: Promise<T>, played?: Promise<unknown>): Promise<T> {
  const answer = await call;
  await played;
  return answer;
}
