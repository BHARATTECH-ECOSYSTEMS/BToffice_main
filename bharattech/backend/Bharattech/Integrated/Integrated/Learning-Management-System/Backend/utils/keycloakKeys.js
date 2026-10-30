/*
 * Keycloak's signing keys, kept in memory for checking sign-in tokens (keycloakAuth's verifyToken).
 *
 * The key library on its own remembered a key for 10 minutes, allowed 5 fetches a minute for everyone, and never
 * remembered a failed lookup: a flood of made-up tokens with random key ids used up the fetches, and once the real
 * key's 10 minutes ended it couldn't be fetched again, so every real sign-in failed until the flood stopped. Here:
 * - a known key is served from memory, with no timer;
 * - a key id we don't know asks Keycloak at most once a minute (requests arriving together share one fetch), and
 *   after a failed fetch (Keycloak down) again after a few seconds;
 * - every 10 minutes the list is re-checked in the background, so a key Keycloak dropped stops working, without
 *   making anyone wait; a failed re-check keeps the keys it has.
 */

const REFRESH_GAP_MS = 60 * 1000;
const RETRY_GAP_MS = 5 * 1000;
const RECHECK_MS = 10 * 60 * 1000;

/**
 * Returns keyFor(kid): the public key for a key id Keycloak lists, or a rejection. `fetchKeys` gets Keycloak's
 * current list as [{ kid, getPublicKey() }] (jwks-rsa's getSigningKeys).
 */
function createKeyKeeper({ fetchKeys, now = Date.now, log = console.error }) {
  let keys = new Map();
  let lastTry = -Infinity;
  let lastLoaded = -Infinity;
  let lastFailed = false;
  let loading = null;

  const load = () => {
    if (!loading) {
      lastTry = now();
      loading = (async () => {
        try {
          const listed = await fetchKeys();
          keys = new Map(listed.map((k) => [k.kid, k.getPublicKey()]));
          lastLoaded = now();
          lastFailed = false;
        } catch (err) {
          lastFailed = true;
          log("Couldn't fetch Keycloak's signing keys:", err.message);
        } finally {
          loading = null;
        }
      })();
    }
    return loading;
  };
  const mayAsk = () => now() - lastTry >= (lastFailed ? RETRY_GAP_MS : REFRESH_GAP_MS);

  return async (kid) => {
    if (typeof kid !== "string" || !kid) throw new Error("The token names no signing key.");
    if (keys.has(kid)) {
      if (now() - lastLoaded >= RECHECK_MS && mayAsk()) void load();
      return keys.get(kid);
    }
    if (loading || mayAsk()) {
      await load();
      if (keys.has(kid)) return keys.get(kid);
    }
    throw new Error("The token's signing key isn't one Keycloak lists.");
  };
}

module.exports = { createKeyKeeper, REFRESH_GAP_MS, RETRY_GAP_MS, RECHECK_MS };
