// ─────────────────────────────────────────────────────────────────────────────
// BharatTech SSO Service — single file for all cross-app session management.
//
// HOW TO ADD MORE CONNECTED APPLICATIONS
// ═══════════════════════════════════════
// 1. Add an entry to CONNECTED_APPS (around line 25) with name, baseUrl, and
//    the path to that app's dashboard (used by the Navbar "Go to Dashboard" button).
// 2. Make sure the new app:
//    a) Serves /silent-check-sso.html (copy from this project's public/ folder).
//    b) Has its origin added to the Keycloak client's "Valid Redirect URIs" and
//       "Web Origins" — run POST /api/admin/setup-realm from the LMS to do this.
//    c) Initialises the same Keycloak realm + client via its own SSO service.
// ─────────────────────────────────────────────────────────────────────────────

import Keycloak from 'keycloak-js';

// ══════════════════════════════════════════════════════════════════════════════
// CONNECTED APPS — ADD NEW ENTRIES HERE (line 25 onwards).
// Each entry will be shown in the profile dropdown as a quick-access link.
// ══════════════════════════════════════════════════════════════════════════════
const CONNECTED_APPS: Array<{ name: string; url: string; dashboardPath: string }> = [
  {
    name: 'LMS Dashboard',
    url: import.meta.env.VITE_LMS_URL || 'http://localhost:5173',
    dashboardPath: '/dashboard',
  },
  {
    name: 'OpenInterviewer',
    url: import.meta.env.VITE_INTERVIEW_URL || 'http://localhost:3000',
    dashboardPath: '/dashboard',
  },
  // ── Add more apps below this line ──────────────────────────────────────────
  // { name: 'HRM Portal',  url: 'http://localhost:3001', dashboardPath: '/' },
  // { name: 'Analytics',   url: 'http://localhost:4000', dashboardPath: '/app' },
  // ───────────────────────────────────────────────────────────────────────────
];

// ─────────────────────────────────────────────────────────────────────────────
// Keycloak config — mirrors the LMS dashboard settings so both apps share the
// same realm session cookie.
// ─────────────────────────────────────────────────────────────────────────────
const KEYCLOAK_URL      = import.meta.env.VITE_KEYCLOAK_URL      || 'http://localhost:8080';
const KEYCLOAK_REALM    = import.meta.env.VITE_KEYCLOAK_REALM    || 'bharattech';
const KEYCLOAK_CLIENT   = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'lms-client';
const BHARAT_URL        = import.meta.env.VITE_BHARAT_URL         || 'http://localhost:8081';
const INTERVIEW_URL     = import.meta.env.VITE_INTERVIEW_URL      || 'http://localhost:3000';

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────
export interface SSOUser {
  firstName: string;
  lastName:  string;
  fullName:  string;
  email:     string;
  username:  string;
  role:      string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal state
// ─────────────────────────────────────────────────────────────────────────────
const kc = new Keycloak({ url: KEYCLOAK_URL, realm: KEYCLOAK_REALM, clientId: KEYCLOAK_CLIENT });

let _user:  SSOUser | null = null;
let _ready  = false;
const _listeners: Array<(user: SSOUser | null) => void> = [];

function notify(user: SSOUser | null) {
  _user = user;
  _listeners.forEach((fn) => fn(user));
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/** Subscribe to SSO user changes. Returns an unsubscribe function. */
export function onSSOChange(fn: (user: SSOUser | null) => void): () => void {
  _listeners.push(fn);
  if (_ready) fn(_user);  // fire immediately with current value
  return () => { const i = _listeners.indexOf(fn); if (i !== -1) _listeners.splice(i, 1); };
}

/** Get the current SSO user synchronously (null if not logged in). */
export function getSSOUser(): SSOUser | null { return _user; }

/**
 * Connected apps visible to the current user.
 * OpenInterviewer is hidden from the profile dropdown for all roles.
 */
export function getConnectedApps() {
  return CONNECTED_APPS.filter((app) => app.name !== 'OpenInterviewer');
}

/**
 * Initialise SSO on page load.
 * Uses Keycloak's silent check-sso: no redirect, no popup — a hidden iframe
 * checks the Keycloak session cookie and returns the token if the user is
 * already logged in to any app in the bharattech realm.
 */
export async function initSSO(): Promise<SSOUser | null> {
  if (_ready) return _user;
  _ready = true;

  // First, check if this page was opened after a cross-app logout cascade
  const params = new URLSearchParams(window.location.search);
  if (params.get('sso_logout') === '1') {
    localStorage.removeItem('bharat_sso_user');
    localStorage.removeItem('bharat_access_token');
    // Also clear the OpenInterviewer session cookie (fire-and-forget)
    fetch(`${INTERVIEW_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});
    // Remove the param from the URL without reload
    params.delete('sso_logout');
    const clean = window.location.pathname + (params.toString() ? `?${params}` : '');
    window.history.replaceState({}, '', clean);
    return null;
  }

  // Try Keycloak silent check-sso — with a 3-second timeout so a slow/offline
  // Keycloak doesn't block the localStorage fallback below.
  try {
    const authenticated = await Promise.race<boolean>([
      kc.init({
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: `${BHARAT_URL}/silent-check-sso.html`,
        checkLoginIframe: false,
      }),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3000)),
    ]);

    if (authenticated && kc.tokenParsed) {
      let token = kc.tokenParsed as Record<string, unknown>;
      // Merge userinfo claims (has given_name/family_name) over token claims
      try {
        const userInfo = await kc.loadUserInfo() as Record<string, unknown>;
        token = { ...token, ...userInfo };
      } catch {
        // Keycloak userinfo unreachable — fall back to token claims only
      }
      const u = buildUser(token);
      notify(u);
      return u;
    }
  } catch {
    // Keycloak not reachable or no session — try localStorage fallback
  }

  // Fallback: user logged in via Bharat's Direct Access Grant form
  try {
    const raw = localStorage.getItem('bharat_sso_user');
    if (raw) {
      const u = JSON.parse(raw) as SSOUser;
      notify(u);
      return u;
    }
  } catch { /* malformed */ }

  notify(null);
  return null;
}

/**
 * Re-check the Keycloak session whenever this tab regains focus, so a logout
 * that happened in another tab (LMS, OpenInterviewer, or another Bharat tab)
 * reloads this tab too.
 *
 * Uses minValidity -1 to force an unconditional refresh-token request to
 * Keycloak — a plain updateToken(5) only refreshes when the *locally cached*
 * access token is close to expiry, so it never actually asks the server and
 * silently "succeeds" even after the SSO session was revoked elsewhere.
 */
function watchForRemoteLogout() {
  const recheck = async () => {
    if (!kc.authenticated) return;
    try {
      await kc.updateToken(-1);
    } catch {
      window.location.reload();
    }
  };

  window.addEventListener('focus', recheck);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') recheck();
  });
}

if (typeof window !== 'undefined') {
  watchForRemoteLogout();
}

/**
 * Called after a successful Direct Access Grant login on the Bharat form.
 * Stores user and the access token so the LMS link can include the token
 * to bypass the Keycloak login page (direct grant doesn't create a browser session).
 */
export function setSSOUserFromDirectGrant(user: SSOUser, accessToken?: string): void {
  localStorage.setItem('bharat_sso_user', JSON.stringify(user));
  if (accessToken) {
    localStorage.setItem('bharat_access_token', accessToken);
  } else {
    localStorage.removeItem('bharat_access_token');
  }
  notify(user);
}

/** Get the stored access token for passing to connected apps. */
export function getSSOAccessToken(): string | null {
  return localStorage.getItem('bharat_access_token');
}

/**
 * Sign out of all connected apps.
 *
 * Flow:
 *   1. Clear Bharat's local session.
 *   2. Tell Keycloak to invalidate the server-side session.
 *   3. After Keycloak logout, Keycloak redirects here (?sso_logout=1).
 *      The next initSSO() call sees the param and suppresses the stale user.
 *
 * Apps that use Keycloak JS (like the LMS) will automatically detect the
 * invalidated session the next time their token refresh runs (≈ every 30 s)
 * or when the user switches focus back to them.
 */
export async function ssoLogout(): Promise<void> {
  const accessToken = localStorage.getItem('bharat_access_token');
  localStorage.removeItem('bharat_sso_user');
  localStorage.removeItem('bharat_access_token');
  notify(null);

  // Clear OpenInterviewer cookie before navigating away
  try {
    await fetch(`${INTERVIEW_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // OpenInterviewer may not be running — continue with logout
  }

  // Back-channel: revoke the access token in Keycloak without a browser redirect.
  // DAG logins have no browser session, so this is fire-and-forget.
  if (accessToken) {
    try {
      await fetch(`${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: KEYCLOAK_CLIENT,
          token: accessToken,
          token_type_hint: 'access_token',
        }),
      });
    } catch {
      // Keycloak unreachable — token expires on its own
    }
  }

  // Redirect directly to Bharat homepage — no Keycloak logout UI
  window.location.href = `${BHARAT_URL}/`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────
function buildUser(token: Record<string, unknown>): SSOUser {
  const firstName = String(token.given_name  || '');
  const lastName  = String(token.family_name || '');
  const displayName = String(token.name || '');
  const fullName  =
    [firstName, lastName].filter(Boolean).join(' ') ||
    (displayName && displayName !== String(token.preferred_username || '') ? displayName : '') ||
    displayName ||
    'User';

  const realmRoles  = (token.realm_access  as { roles?: string[] })?.roles ?? [];
  const clientRoles = ((token.resource_access as Record<string, { roles?: string[] }>)?.[KEYCLOAK_CLIENT])?.roles ?? [];
  const all = [...realmRoles, ...clientRoles].map((r) => r.toUpperCase());

  let role = 'INTERN';
  if      (all.includes('SUPERADMIN') || all.includes('SUPER-ADMIN')) role = 'SUPERADMIN';
  else if (all.includes('ADMIN'))    role = 'ADMIN';
  else if (all.includes('SUBADMIN')) role = 'SUBADMIN';
  else if (all.includes('EMPLOYEE')) role = 'EMPLOYEE';

  return {
    firstName,
    lastName,
    fullName,
    email:    String(token.email    || ''),
    username: String(token.preferred_username || ''),
    role,
  };
}
