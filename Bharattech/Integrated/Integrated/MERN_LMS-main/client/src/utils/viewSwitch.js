// "View as educator" and "View as learner" swap in the same spot, so the second click of a double-click used to
// switch straight back. A switch is ignored for this long after the last one (owner's A, 2026-10-30).
export const SWITCH_SETTLE_MS = 1000;

/** A check that lets a view switch through, then holds the next one back until SWITCH_SETTLE_MS have passed. */
export const createSwitchGuard = (now = () => Date.now()) => {
  let last = -Infinity;
  return () => {
    const at = now();
    if (at - last < SWITCH_SETTLE_MS) return false;
    last = at;
    return true;
  };
};
