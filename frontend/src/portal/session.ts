import { useSyncExternalStore } from 'react';
import { auth } from './auth';

/**
 * The employee portal's sign-in state.
 *
 * With the real sign-in connected (`auth`, src/portal/auth.ts), the name, email and role come from the person's
 * account, and the session lasts only while their Keycloak sign-in does. Without it this is a DEMO session: signing
 * in with any well-formed email opens the portal and no password is checked. Neither is access control on its own:
 * the role here only picks which pages to show, and the backend checks every request.
 *
 * Stored: the name, email, role, and the person's own photo and notification choices. The password is never kept.
 */

export type Role = 'employee' | 'subadmin' | 'admin';

export const ROLE_NAME: Record<Role, string> = { admin: 'Admin', subadmin: 'Sub Admin', employee: 'Employee' };

/** Admins and sub admins see the managing side of each page. Only admins delete, change roles or open admin-only tools. */
export const managesPortal = (role: Role) => role === 'admin' || role === 'subadmin';

export const NOTIFICATION_KINDS = [
  { id: 'tasks', label: 'Task assigned to me', hint: 'When an admin gives you a new task.' },
  { id: 'certificates', label: 'Certificate issued', hint: 'When a certificate is issued to you.' },
  { id: 'policies', label: 'New policy to review', hint: 'When a policy you need to accept is published.' },
  { id: 'events', label: 'Calendar events', hint: 'When an event is added, changed or cancelled.' },
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number]['id'];

export interface Session {
  name: string;
  email: string;
  role: Role;
  /** A small square data: image, made in the browser from the photo the person picked. */
  photo?: string;
  /** Kinds switched off; everything else is on. */
  mutedNotifications?: NotificationKind[];
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
  // a demo session left in storage, or one whose Keycloak sign-in has ended, doesn't open the connected portal
  if (auth && !auth.signedIn()) return null;
  for (const store of stores()) {
    try {
      const raw = store.getItem(KEY);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Partial<Session>;
      if (parsed.email && parsed.name && parsed.role && parsed.role in ROLE_NAME) {
        // only an image data: address may come back as the photo, since it's used as an <img> source
        const photo = typeof parsed.photo === 'string' && parsed.photo.startsWith('data:image/') ? parsed.photo : undefined;
        const kinds = NOTIFICATION_KINDS.map((k) => k.id as NotificationKind);
        const muted = Array.isArray(parsed.mutedNotifications) ? parsed.mutedNotifications.filter((k) => kinds.includes(k)) : [];
        return { name: parsed.name, email: parsed.email, role: parsed.role, photo, mutedNotifications: muted };
      }
    } catch {
      // a malformed entry is treated as signed out
    }
  }
  return null;
}

// false while the session lives only in this page (storage refused it): reading storage again would lose it
let stored = true;

function write(session: Session | null, remember?: boolean) {
  const [tab, device] = stores();
  stored = !!tab;
  try {
    tab?.removeItem(KEY);
    device?.removeItem(KEY);
    if (session) (remember ? device : tab)?.setItem(KEY, JSON.stringify(session));
  } catch {
    // storage can be blocked (private windows); the session then lasts only while this page is open
    stored = false;
  }
  cached = session;
  listeners.forEach((l) => l());
}

/** "aanya.k.sharma@…" becomes "Aanya K Sharma": the demo sign-in's stand-in for the account's name. */
function nameFromEmail(email: string) {
  const local = email.split('@')[0] ?? '';
  const words = local.split(/[._-]+/).filter(Boolean);
  return words.length ? words.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ') : 'Team member';
}

// The dashboard's arrival plays once per sign-in; this tab-only flag remembers it has played.
const ARRIVED = 'bt-portal-arrived';
const forgetArrival = () => {
  try {
    sessionStorage.removeItem(ARRIVED);
  } catch {
    // storage blocked: the arrival just plays again, which is harmless
  }
};
export function hasArrived() {
  try {
    return sessionStorage.getItem(ARRIVED) === '1';
  } catch {
    return true;
  }
}
export function markArrived() {
  try {
    sessionStorage.setItem(ARRIVED, '1');
  } catch {
    // see forgetArrival
  }
}

/** `name` is the account's name from the real sign-in; the demo sign-in makes one from the email. */
export function startSession(email: string, role: Role, remember = false, name?: string) {
  signedOutAt = 0;
  switchedOff = false;
  forgetArrival();
  write({ name: name || nameFromEmail(email), email: email.trim().toLowerCase(), role }, remember);
}

// Keeps a "Remember me" session in the store it was saved to.
function update(change: Partial<Session>) {
  const now = getSession();
  if (!now) return;
  let remembered = false;
  try {
    remembered = !!window.localStorage.getItem(KEY);
  } catch {
    // blocked storage: the session only lives in this page
  }
  write({ ...now, ...change }, remembered);
}

/** Demo only, while the pages are being built: lets a reviewer switch between the admin, sub admin and employee versions. */
export const setRole = (role: Role) => update({ role });

/** The name shown across the portal. Only saved in this browser until the real account service is connected. */
export const setDisplayName = (name: string) => update({ name });
export const setPhoto = (photo: string | undefined) => update({ photo });
export const setMutedNotifications = (mutedNotifications: NotificationKind[]) => update({ mutedNotifications });

// Set when the person signs out on purpose, so the portal sends them to the site without reopening the login.
// It only covers the redirect right after signing out; opening a portal link later asks them to sign in again.
let signedOutAt = 0;
export const didSignOut = () => Date.now() - signedOutAt < 2000;

export function endSession() {
  signedOutAt = Date.now();
  forgetArrival();
  write(null);
  // the portal is closed already; ending the Keycloak session doesn't hold up the redirect
  void auth?.signOut();
}

/** Closes the portal like a signed-out visit, so the login opens again: after an expired sign-in or a password change. */
export function endSessionForNewSignIn() {
  forgetArrival();
  write(null);
}

// set when the sign-in ended because the account was switched off, so the sign-in box says so; a new sign-in clears it
let switchedOff = false;
export const endedSwitchedOff = () => switchedOff;
auth?.onExpire((reason) => {
  switchedOff = reason === 'switched-off';
  endSessionForNewSignIn();
});

export function getSession(): Session | null {
  if (cached === undefined) cached = read();
  return cached;
}

/**
 * Looks at the saved sign-in again: another tab may have signed in or out, or the sign-in may have run out while this
 * tab was in the background. Subscribers hear only of a real change.
 */
function recheck() {
  if (!stored) return;
  auth?.reload();
  const next = read();
  if (JSON.stringify(next) === JSON.stringify(getSession())) return;
  cached = next;
  listeners.forEach((l) => l());
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('storage', recheck);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && recheck());
}

export const subscribeSession = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

export function useSession() {
  return useSyncExternalStore(subscribeSession, getSession, () => null);
}
