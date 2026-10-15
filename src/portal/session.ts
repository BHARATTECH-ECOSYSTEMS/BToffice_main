import { useSyncExternalStore } from 'react';

/**
 * The employee portal's sign-in state.
 *
 * There is no login backend yet, so this is a DEMO session: signing in with any well-formed email opens the
 * portal, and no password is checked. It is not access control: anyone can open #/portal by setting the same
 * storage key. When the real sign-in (the company Keycloak) is connected, replace `startSession` with the token
 * exchange and keep the rest of the portal as it is.
 *
 * Only the name, email and role are stored. The password is never kept.
 */

export type Role = 'employee' | 'admin';

export interface Session {
  name: string;
  email: string;
  role: Role;
}

const KEY = 'bt-portal-session';
const listeners = new Set<() => void>();
let cached: Session | null | undefined;

// "Remember me" keeps the session in localStorage; otherwise it ends when the tab closes.
const stores = (): Storage[] => {
  try {
    return [window.sessionStorage, window.localStorage];
  } catch {
    return [];
  }
};

function read(): Session | null {
  for (const store of stores()) {
    try {
      const raw = store.getItem(KEY);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Partial<Session>;
      if (parsed.email && parsed.name && (parsed.role === 'employee' || parsed.role === 'admin')) {
        return { name: parsed.name, email: parsed.email, role: parsed.role };
      }
    } catch {
      // a malformed entry is treated as signed out
    }
  }
  return null;
}

function write(session: Session | null, remember?: boolean) {
  const [tab, device] = stores();
  try {
    tab?.removeItem(KEY);
    device?.removeItem(KEY);
    if (session) (remember ? device : tab)?.setItem(KEY, JSON.stringify(session));
  } catch {
    // storage can be blocked (private windows); the session then lasts only while this page is open
  }
  cached = session;
  listeners.forEach((l) => l());
}

/** "aanya.k.sharma@…" becomes "Aanya K Sharma": a readable name until the real profile comes from the backend. */
export function nameFromEmail(email: string) {
  const local = email.split('@')[0] ?? '';
  const words = local.split(/[._-]+/).filter(Boolean);
  return words.length ? words.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ') : 'Team member';
}

export function startSession(email: string, remember = false) {
  signedOutAt = 0;
  write({ name: nameFromEmail(email), email: email.trim().toLowerCase(), role: 'employee' }, remember);
}

/** Demo only: lets a reviewer see the admin and employee versions of each page. */
export function setRole(role: Role) {
  const now = getSession();
  if (!now) return;
  const remembered = (() => {
    try {
      return !!window.localStorage.getItem(KEY);
    } catch {
      return false;
    }
  })();
  write({ ...now, role }, remembered);
}

// Set when the person signs out on purpose, so the portal sends them to the site without reopening the login.
// It only covers the redirect right after signing out; opening a portal link later asks them to sign in again.
let signedOutAt = 0;
export const didSignOut = () => Date.now() - signedOutAt < 2000;

export function endSession() {
  signedOutAt = Date.now();
  write(null);
}

export function getSession(): Session | null {
  if (cached === undefined) cached = read();
  return cached;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useSession() {
  return useSyncExternalStore(subscribe, getSession, () => null);
}
