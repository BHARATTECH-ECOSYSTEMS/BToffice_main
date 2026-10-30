/**
 * Hands each load a turn. A turn stays current until the next one starts, so a slow reply to an older load (the
 * previous day, say) can tell it is stale and isn't shown over the newer one's.
 */
export function turns() {
  let latest = 0;
  return () => {
    const mine = ++latest;
    return () => mine === latest;
  };
}
