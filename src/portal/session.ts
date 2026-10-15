import { useSyncExternalStore } from 'react';

/**
 * The employee portal's sign-in state.
 *
 * There is no login backend yet, so this is a DEMO session: signing in with any well-formed email opens the
 * portal, and no password is checked. It is not access control: anyone can open #/portal by setting the same
 * storage key. When the real sign-in (the company Keycloak) is connected, replace `startSession` with the token
 * exchange and keep the rest of the portal as it is.
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
  { id: 'courses', label: 'Course updates', hint: 'New lectures in courses you are enrolled in.' },
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

/** The role is picked on the login form for now; the real sign-in will take it from the account instead. */
export function startSession(email: string, role: Role, remember = false) {
  signedOutAt = 0;
  write({ name: nameFromEmail(email), email: email.trim().toLowerCase(), role }, remember);
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
