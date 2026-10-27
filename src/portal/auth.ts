import type { Role } from './session';
import { timed, TIMEOUT_MS } from './timedFetch';

/**
 * The real sign-in, through the company backend and its Keycloak.
 *
 * It is switched on only when the site is built with VITE_API_BASE_URL, VITE_KEYCLOAK_URL, VITE_KEYCLOAK_REALM and
 * VITE_KEYCLOAK_CLIENT_ID set (.env.local, never committed). Without them `auth` is null and the portal keeps its demo
 * sign-in.
 *
 * - Sign in: the backend's POST /auth/keycloak-login swaps the email and password for Keycloak tokens. The password
 *   goes only there and is never stored.
 * - Requests: `accessToken()` hands out the access token, renewing it with Keycloak's token endpoint just before it
 *   expires (Keycloak's default lifetime is 5 minutes).
 * - Sign out: the tokens are forgotten at once, then Keycloak is asked to end the session.
 *
 * The tokens live where the portal session lives: this tab only, or this browser with "Remember me". Either way the
 * sign-in lasts no longer than the Keycloak session (its idle and maximum limits). The role kept in the browser only
 * picks which pages to show; the backend checks the token's role on every request.
 */

export interface AuthConfig {
  /** The backend's API root, e.g. http://localhost:5000/api */
  api: string;
  keycloak: string;
  realm: string;
  clientId: string;
}

export interface Account {
  name: string;
  email: string;
  role: Role;
}

export type SignInResult = { ok: true; account: Account } | { ok: false; reason: 'credentials' | 'set-password' | 'not-set-up' | 'switched-off' | 'invite-expired' | 'busy' | 'unavailable' };

export interface InviteSetup {
  /** What they signed in with: their email (or the username from the invite). */
  username: string;
  temporaryPassword: string;
  newPassword: string;
  /** The username they choose; the backend allows 3–32 letters, numbers, dots, dashes or underscores. */
  newUsername: string;
}

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; reason: 'wrong-current' | 'signed-out' | 'busy' | 'unavailable' }
  | { ok: false; reason: 'refused'; message: string };

export type InviteSetupResult =
  | { ok: true; account: Account }
  | { ok: false; reason: 'credentials' | 'username-taken' | 'invite-expired' | 'busy' | 'unavailable' }
  | { ok: false; reason: 'invalid'; message: string };

export type ResetRequestResult = { ok: true; message: string } | { ok: false; reason: 'busy' | 'unavailable' };

export type ResetPasswordResult =
  | { ok: true }
  | { ok: false; reason: 'link-gone' | 'busy' | 'unavailable' }
  | { ok: false; reason: 'refused'; message: string };

// the token in a reset email's link: <site>/#/reset-password?token=… (controllers/passwordResetController.js)
const RESET_TOKEN_SHAPE = /^[A-Za-z0-9_-]{20,200}$/;

/** The reset token when the site was opened from a reset email (its route and query), else null. */
export function resetTokenFrom(pathname: string, search: string) {
  if (!/^\/reset-password\/?$/.test(pathname)) return null;
  const token = new URLSearchParams(search).get('token');
  return token && RESET_TOKEN_SHAPE.test(token) ? token : null;
}

/** What the backend's sign-in routes answer (controllers/authController.js passwordGrantLogin). */
interface LoginReply {
  requiresPasswordChange?: boolean;
  /** Set on a refused reset link, to tell it from a refused password (both are 400s). */
  code?: string;
  message?: string;
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  user?: { fullName?: string; username?: string; email?: string; role?: string };
}

/**
 * Invite emails from the backend link to <site>/login, the address of the company's own frontend. This site's login is
 * the pop-up the portal opens for a signed-out visitor, so that address goes to the portal.
 */
export const loginRedirect = (pathname: string) => (/^\/login\/?$/i.test(pathname) ? '/#/portal' : null);

// The shapes the backend's keycloakLogin swaps for the person's email: BT-0001, bt-0001, BT0001.
const EMPLOYEE_ID_SHAPE = /^bt-?\d{4,}$/i;
export const isEmployeeId = (typed: string) => EMPLOYEE_ID_SHAPE.test(typed.trim());

// the backend's rule for the username people choose when they finish their invite (controllers/authController.js
// acceptInvite); Keycloak takes it at sign-in like an email
export const USERNAME_SHAPE = /^[a-zA-Z0-9._-]{3,32}$/;
export const isUsername = (typed: string) => USERNAME_SHAPE.test(typed.trim());

interface Tokens {
  access: string;
  refresh: string;
  id?: string;
}

/** The backend's account roles (SUPERADMIN, ADMIN, SUBADMIN, EMPLOYEE, INTERN) shown as the portal's three views. */
export function portalRole(accountRole: string): Role {
  switch (accountRole) {
    case 'SUPERADMIN':
    case 'ADMIN':
      return 'admin';
    case 'SUBADMIN':
      return 'subadmin';
    default:
      // interns, and any role added later, get the view with the least access
      return 'employee';
  }
}

/** When a token stops working, in ms since 1970; 0 if it can't be read, so a broken token counts as expired. */
function expiresAt(jwt: string) {
  try {
    const payload = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const exp = (JSON.parse(atob(payload)) as { exp?: unknown }).exp;
    return typeof exp === 'number' ? exp * 1000 : 0;
  } catch {
    return 0;
  }
}

// renew a little early, so a token never expires while a request is on its way
const RENEW_EARLY_MS = 30_000;
const KEY = 'bt-portal-auth';

const stores = (): Storage[] => {
  try {
    return [window.sessionStorage, window.localStorage];
  } catch {
    return [];
  }
};

function loadTokens(): { tokens: Tokens | null; remember: boolean } {
  for (const [i, store] of stores().entries()) {
    try {
      const saved = JSON.parse(store.getItem(KEY) ?? 'null') as Partial<Tokens> | null;
      if (typeof saved?.access === 'string' && typeof saved.refresh === 'string') {
        return { tokens: { access: saved.access, refresh: saved.refresh, id: saved.id }, remember: i === 1 };
      }
    } catch {
      // a malformed entry is treated as signed out
    }
  }
  return { tokens: null, remember: false };
}

/** False when the browser refused to save them. */
function saveTokens(tokens: Tokens | null, remember: boolean) {
  const [tab, device] = stores();
  if (!tab) return false;
  try {
    tab.removeItem(KEY);
    device?.removeItem(KEY);
    if (tokens) (remember ? device : tab)?.setItem(KEY, JSON.stringify(tokens));
    return true;
  } catch {
    // storage can be blocked (private windows); the sign-in then lasts only while this page is open
    return false;
  }
}

const FORM = { 'Content-Type': 'application/x-www-form-urlencoded' };

export function createAuth(config: AuthConfig, send: typeof fetch = (input, init) => fetch(input, init), timeoutMs = TIMEOUT_MS) {
  const request = timed(send, timeoutMs);
  const oidc = `${config.keycloak}/realms/${config.realm}/protocol/openid-connect`;
  let { tokens, remember } = loadTokens();
  let renewing: Promise<string | null> | null = null;
  // `reason`: 'switched-off' when the backend said the account is blocked or removed
  const expireListeners = new Set<(reason?: 'switched-off') => void>();

  // false while the sign-in lives only in this page (storage refused it): reading storage again would lose it
  let stored = true;

  const keep = (next: Tokens | null) => {
    tokens = next;
    stored = saveTokens(next, remember);
  };

  const expire = (reason?: 'switched-off') => {
    keep(null);
    expireListeners.forEach((l) => l(reason));
  };

  const signedIn = () => !!tokens && expiresAt(tokens.refresh) > Date.now();
  /** Reads the saved sign-in again: another tab may have signed in, renewed or signed out ("Remember me" is shared). */
  const reload = () => {
    if (stored) ({ tokens, remember } = loadTokens());
  };

  /** POSTs to one of the backend's sign-in routes; null when it can't be reached. */
  async function post(path: string, payload: object): Promise<{ status: number; ok: boolean; body: LoginReply | null } | null> {
    try {
      const res = await request(`${config.api}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      return { status: res.status, ok: res.ok, body: (await res.json().catch(() => null)) as LoginReply | null };
    } catch {
      return null;
    }
  }

  /** Keeps the tokens of a successful sign-in; null when the answer doesn't carry them. */
  function begin(body: LoginReply | null, rememberMe: boolean, typed: string): Account | null {
    if (!body?.access_token || !body.refresh_token || !body.user) return null;
    remember = rememberMe;
    keep({ access: body.access_token, refresh: body.refresh_token, id: body.id_token });
    const { fullName, username: accountName, email, role } = body.user;
    return { name: fullName || accountName || typed, email: (email || typed).toLowerCase(), role: portalRole(role ?? '') };
  }

  async function signIn(username: string, password: string, rememberMe: boolean): Promise<SignInResult> {
    const reply = await post('/auth/keycloak-login', { username, password });
    if (!reply) return { ok: false, reason: 'unavailable' };
    // the backend limits sign-in tries per address (429): that's a wait, not an outage or a wrong password
    if (reply.status === 429) return { ok: false, reason: 'busy' };
    if (reply.status === 403 && reply.body?.requiresPasswordChange) return { ok: false, reason: 'set-password' };
    // the right password on a blocked account, or someone who left (the backend only says so then)
    if (reply.status === 403 && reply.body?.code === 'switched-off') return { ok: false, reason: 'switched-off' };
    // a right password on an account with another unfinished step (a missing last name, say): an admin's to finish
    if (reply.status === 403) return { ok: false, reason: 'not-set-up' };
    // an invite past its 12 hours (owner's 5A): an admin sends it again
    if (reply.status === 410) return { ok: false, reason: 'invite-expired' };
    if (reply.status === 400 || reply.status === 401) return { ok: false, reason: 'credentials' };
    const account = reply.ok ? begin(reply.body, rememberMe, username) : null;
    return account ? { ok: true, account } : { ok: false, reason: 'unavailable' };
  }

  /**
   * An invited person's first sign-in: their temporary password, the password they choose, and the username the
   * backend asks them to pick. On success they are signed in, as with signIn.
   */
  async function acceptInvite(setup: InviteSetup, rememberMe: boolean): Promise<InviteSetupResult> {
    const reply = await post('/auth/accept-invite', setup);
    if (!reply) return { ok: false, reason: 'unavailable' };
    if (reply.status === 429) return { ok: false, reason: 'busy' };
    if (reply.status === 401) return { ok: false, reason: 'credentials' };
    // finished already (elsewhere, say): the backend's own words, not "that username is taken"
    if (reply.status === 409 && reply.body?.code === 'already-set-up') return { ok: false, reason: 'invalid', message: reply.body?.message ?? '' };
    if (reply.status === 409) return { ok: false, reason: 'username-taken' };
    if (reply.status === 410) return { ok: false, reason: 'invite-expired' };
    if (reply.status === 400) return { ok: false, reason: 'invalid', message: reply.body?.message ?? '' };
    const account = reply.ok ? begin(reply.body, rememberMe, setup.username) : null;
    return account ? { ok: true, account } : { ok: false, reason: 'unavailable' };
  }

  async function renew(current: Tokens): Promise<string | null> {
    let res: Response;
    try {
      res = await request(`${oidc}/token`, {
        method: 'POST',
        headers: FORM,
        body: new URLSearchParams({ grant_type: 'refresh_token', client_id: config.clientId, refresh_token: current.refresh }),
      });
    } catch {
      // offline or Keycloak down: stay signed in, the next request tries again
      return null;
    }
    const body = (await res.json().catch(() => null)) as { access_token?: string; refresh_token?: string; id_token?: string } | null;
    // signed out while this was on its way: don't bring the tokens back
    if (tokens !== current) return null;
    if (!res.ok || !body?.access_token) {
      // Keycloak answered but refused (the session ended or was revoked): this sign-in is over
      if (res.status >= 400 && res.status < 500) expire();
      return null;
    }
    keep({ access: body.access_token, refresh: body.refresh_token ?? current.refresh, id: body.id_token ?? current.id });
    return body.access_token;
  }

  /** The token to send as `Authorization: Bearer …`, or null when signed out or Keycloak can't be reached. */
  async function accessToken(): Promise<string | null> {
    if (!tokens) return null;
    if (!signedIn()) {
      expire();
      return null;
    }
    if (expiresAt(tokens.access) - Date.now() > RENEW_EARLY_MS) return tokens.access;
    // several requests at once share one renewal, so Keycloak sees each refresh token only once
    renewing ??= renew(tokens).finally(() => (renewing = null));
    return renewing;
  }

  /** The sign-in to hand to the LMS Platform tab (lmsHandoff.ts), renewed first if it is near expiry; null when
   *  signed out. */
  async function handoverTokens(): Promise<{ access: string; refresh: string; id?: string } | null> {
    if (!(await accessToken()) || !tokens) return null;
    return { access: tokens.access, refresh: tokens.refresh, id: tokens.id };
  }

  async function signOut() {
    const current = tokens;
    keep(null);
    if (!current) return;
    try {
      await request(`${oidc}/logout`, {
        method: 'POST',
        headers: FORM,
        body: new URLSearchParams({ client_id: config.clientId, refresh_token: current.refresh }),
      });
    } catch {
      // the tokens are already gone here; Keycloak ends its side at the session's idle limit
    }
  }

  /**
   * Changes the signed-in person's password. On success the backend has ended all their sessions, so the sign-in here
   * ends too and they sign in again with the new password.
   */
  async function changePassword(currentPassword: string, newPassword: string): Promise<ChangePasswordResult> {
    const token = await accessToken();
    if (!token) return { ok: false, reason: 'signed-out' };
    let res: Response;
    try {
      res = await request(`${config.api}/auth/keycloak-change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
    } catch {
      return { ok: false, reason: 'unavailable' };
    }
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    if (res.ok) {
      keep(null);
      return { ok: true };
    }
    // the backend answers a wrong current password with 401 too; only its message tells it from an ended sign-in
    if (res.status === 401) return { ok: false, reason: body?.message === 'Current password is incorrect' ? 'wrong-current' : 'signed-out' };
    if (res.status === 400) return { ok: false, reason: 'refused', message: body?.message ?? '' };
    if (res.status === 429) return { ok: false, reason: 'busy' };
    return { ok: false, reason: 'unavailable' };
  }

  /**
   * "Forgot password?": asks the backend to email a reset link to the account behind an email or Employee ID. The
   * backend gives the same answer whether or not the account exists, so this can't tell either.
   */
  async function requestPasswordReset(login: string): Promise<ResetRequestResult> {
    const reply = await post('/auth/forgot-password', { login });
    if (reply?.status === 429) return { ok: false, reason: 'busy' };
    return reply?.ok && reply.body?.message ? { ok: true, message: reply.body.message } : { ok: false, reason: 'unavailable' };
  }

  /** Sets a new password with the token from a reset email. Every sign-in the person had is ended by the backend. */
  async function resetPassword(token: string, newPassword: string): Promise<ResetPasswordResult> {
    const reply = await post('/auth/reset-password', { token, newPassword });
    if (reply?.ok) return { ok: true };
    if (reply?.status === 429) return { ok: false, reason: 'busy' };
    if (reply?.status === 400) return reply.body?.code === 'link-gone' ? { ok: false, reason: 'link-gone' } : { ok: false, reason: 'refused', message: reply.body?.message ?? '' };
    return { ok: false, reason: 'unavailable' };
  }

  /** Called when the sign-in ends by itself (an expired or revoked session), not when the person signs out. */
  /** The backend said this account is blocked or removed: the sign-in is over, and the portal says why. */
  const switchedOff = () => expire('switched-off');

  const onExpire = (listener: (reason?: 'switched-off') => void) => {
    expireListeners.add(listener);
    return () => expireListeners.delete(listener);
  };

  return { signIn, acceptInvite, changePassword, requestPasswordReset, resetPassword, signOut, accessToken, handoverTokens, signedIn, reload, onExpire, switchedOff };
}

function configFromEnv(): AuthConfig | null {
  const env = import.meta.env as Record<string, string | undefined> | undefined;
  const values = {
    api: env?.VITE_API_BASE_URL,
    keycloak: env?.VITE_KEYCLOAK_URL,
    realm: env?.VITE_KEYCLOAK_REALM,
    clientId: env?.VITE_KEYCLOAK_CLIENT_ID,
  };
  const set = Object.values(values).filter(Boolean).length;
  if (set === 0) return null;
  if (set < 4) {
    console.warn('Portal sign-in: some VITE_API_BASE_URL / VITE_KEYCLOAK_* settings are missing, so the demo sign-in is used.');
    return null;
  }
  return values as AuthConfig;
}

/** The backend and Keycloak addresses, or null while the site runs with the demo sign-in. */
export const authConfig = configFromEnv();

/** The real sign-in, or null while the site runs with the demo sign-in. */
export const auth = authConfig ? createAuth(authConfig) : null;
