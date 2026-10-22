// Reuses one Keycloak admin login until shortly before its token expires. Logging in again before every admin call
// added about 200 ms to each request that reads users from Keycloak (GET /api/user/me among them).

// log in again a little early, so a token never runs out in the middle of a request
const RENEW_EARLY_MS = 10_000;

const expiresAt = (jwt) => {
  try {
    const payload = JSON.parse(Buffer.from(String(jwt).split(".")[1], "base64url").toString("utf8"));
    return typeof payload.exp === "number" ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
};

/**
 * Returns `ensureLoggedIn()`: logs `client` (a keycloak-admin client) in when it has no usable token, and does
 * nothing while the last login is still good. A token whose expiry can't be read is never reused.
 */
const createKeycloakAdminSession = (client, credentials, now = Date.now) => {
  let validUntil = 0;
  let pending = null;

  return async function ensureLoggedIn() {
    if (now() < validUntil) return;
    // requests arriving together share one login instead of each starting their own
    pending ??= client
      .auth(credentials)
      .then(() => {
        validUntil = expiresAt(client.accessToken) - RENEW_EARLY_MS;
      })
      .finally(() => {
        pending = null;
      });
    return pending;
  };
};

module.exports = { createKeycloakAdminSession };
