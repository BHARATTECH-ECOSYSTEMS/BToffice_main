import Keycloak from "keycloak-js";
import { askPortal, isSignInReturn, originOf } from "./handoff.js";

// No built-in address: a build without VITE_KEYCLOAK_URL must fail to sign in, not quietly use another server.
const normalizeKeycloakUrl = (url) =>
  (url || "")
    .replace(/^https?:\/\/https?:\/\//, "https://")
    .replace(/\/$/, "");

const keycloak = new Keycloak({
  url: normalizeKeycloakUrl(import.meta.env.VITE_KEYCLOAK_URL),
  realm: import.meta.env.VITE_KEYCLOAK_REALM || "bharattech",
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "lms2-client",
});

// Earlier versions kept sign-in tokens in browser storage, where any script on the page could read them.
const OLD_STORED_KEYS = ["token", "accessToken", "refresh_token", "bharattechLmsToken", "bharattechLmsUser"];

// Launch links from older portals carry tokens in the address; they must not stay in the history or reach Keycloak.
const ADDRESS_TOKEN_KEYS = ["token", "accessToken", "refresh_token", "role", "userRole", "userId", "email", "name", "username"];

export const forgetOldSignIns = () => {
  for (const key of OLD_STORED_KEYS) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
  const params = new URLSearchParams(window.location.search);
  const found = ADDRESS_TOKEN_KEYS.filter((key) => params.has(key));
  if (found.length) {
    found.forEach((key) => params.delete(key));
    const query = params.toString() ? `?${params}` : "";
    window.history.replaceState({}, document.title, `${window.location.pathname}${query}${window.location.hash}`);
  }
};

// The portal whose Learning button may hand its sign-in over (VITE_PORTAL_URL); none set, nothing is ever asked.
const PORTAL_ORIGIN = originOf(normalizeKeycloakUrl(import.meta.env.VITE_PORTAL_URL));

/**
 * Signs in without a page of its own when it can: with the sign-in the portal hands over (opened from its Learning
 * button), or with a Keycloak session this browser already has. Resolves false when neither is there; main.jsx then
 * shows the sign-in screen.
 */
export async function signIn() {
  const handed = isSignInReturn(window.location.href)
    ? null
    : await askPortal({
        opener: window.opener,
        portalOrigin: PORTAL_ORIGIN,
        listen: (callback) => {
          window.addEventListener("message", callback);
          return () => window.removeEventListener("message", callback);
        },
        later: (fn, ms) => window.setTimeout(fn, ms),
      });
  // answered or not, this tab no longer needs its way back to the portal
  try {
    window.opener = null;
  } catch {
    // a browser that won't let it be set has already cut it
  }
  const options = { pkceMethod: "S256", checkLoginIframe: false };
  if (!handed) return keycloak.init({ ...options, onLoad: "check-sso" });
  try {
    // keycloak-js renews the handed sign-in at once, so this tab runs on tokens of its own
    return await keycloak.init({ ...options, token: handed.access, refreshToken: handed.refresh, idToken: handed.id });
  } catch {
    // ended or expired on the way: the sign-in screen, as for a signed-out portal
    return false;
  }
}

/** Keycloak's own sign-in page, from the sign-in screen's Continue button. */
export const goToSignIn = () => keycloak.login();

export default keycloak;
