// How often a scene that never stops moving draws while nobody is using the page. The home hero's glass costs about
// 10 ms of GPU and 6 ms of main thread per frame on an integrated GPU (measured, step 18): at rest it draws its slow
// bounce at 30 frames a second, and at the full rate again the moment there's input.

/** After this long without pointer, wheel, scroll, key or touch input, the scene counts as idle. */
export const IDLE_AFTER_MS = 2000;
/** Frames a second while idle. */
export const IDLE_FPS = 30;

/**
 * Whether to draw the frame at `now`. Always while there was input in the last IDLE_AFTER_MS or the scene is `busy`
 * (a transition or entrance that should stay fluid); otherwise at most IDLE_FPS a second. The interval allows 4 ms
 * of slack, so on a 60 Hz screen every second frame draws instead of every third.
 */
/**
 * Whether the Studio hero is mid-move: its entrance, a scroll between beats, or the first 2 s after the mark forms
 * (its big hop). With reduced motion there is no hop, and the scene's clock stands still, so the hop never counts.
 */
export const studioBusy = ({ revealing, settling, sinceFormed, reduced }: { revealing: boolean; settling: boolean; sinceFormed: number | null; reduced: boolean }) =>
  revealing || settling || (!reduced && sinceFormed !== null && sinceFormed < 2);

export function shouldDraw(now: number, lastInput: number, lastDraw: number, busy: boolean): boolean {
  if (busy || now - lastInput < IDLE_AFTER_MS) return true;
  return now - lastDraw >= 1000 / IDLE_FPS - 4;
}
