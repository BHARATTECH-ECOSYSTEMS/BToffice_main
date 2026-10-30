// Toasts sit at the bottom right (owner, 2026-10-30). An open window (the video window, the educator windows) keeps
// its buttons at its foot, often in that corner, so while one is open the toasts rise above the buttons there.
export const TOAST_GAP = 16;
// the corner toasts use: their 320 px column with its margins, and the height a few stacked toasts take
const CORNER_WIDTH = 352;
const CORNER_HEIGHT = 300;

/**
 * How far above the screen's bottom edge toasts sit, given an open window's buttons ({ top, left, right }, px from the
 * top and left edges; none when no window is open). Only buttons in the toasts' corner count.
 */
export const toastLift = (viewportWidth, viewportHeight, buttons) => {
  const inCorner = buttons.filter(
    (b) => b.right > viewportWidth - CORNER_WIDTH && b.top > viewportHeight - CORNER_HEIGHT && b.top < viewportHeight
  );
  return inCorner.length ? Math.max(TOAST_GAP, viewportHeight - Math.min(...inCorner.map((b) => b.top)) + 12) : TOAST_GAP;
};
