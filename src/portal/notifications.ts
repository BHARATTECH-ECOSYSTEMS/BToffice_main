import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from './api';
import type { PortalIconName } from './data';
import { NOTIFICATION_KINDS, type NotificationKind } from './session';

/**
 * The notification bell on the backend's records (GET /api/notifications): the person's own notes, read state kept
 * on the backend so it follows them, and their email switches (/api/notifications/prefs). The bell asks again every
 * minute while the tab is in view, and whenever it comes back into view.
 */

export interface BellNote {
  id: string;
  icon: PortalIconName;
  title: string;
  detail: string;
  /** A page of the portal; notes pointing anywhere else are never shown. */
  to: string;
  read: boolean;
  /** When it happened (ISO), for "3 h ago". */
  at?: string;
}

// a kind missing here is never shown, so each new kind of note needs its icon
const ICON: Record<string, PortalIconName> = {
  task: 'clipboard',
  'task-update': 'edit',
  'work-handed-in': 'upload',
  certificate: 'award',
  policy: 'file',
  event: 'calendar',
  course: 'cap',
  verification: 'shield',
};
const PORTAL_PATH = /^\/portal(\/|$)/;

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);
const record = (value: unknown) => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined);

export function toBellNotes(raw: unknown): { notes: BellNote[]; unread: number } {
  const list = record(raw)?.notes;
  if (!Array.isArray(list)) throw new ApiError('unavailable', 'The backend’s answer isn’t the notification bell.');
  const notes: BellNote[] = [];
  for (const entry of list) {
    const n = record(entry);
    const id = text(n?.id);
    const title = text(n?.title);
    const link = text(n?.link);
    const icon = ICON[String(n?.kind)];
    // a broken note, a kind this site doesn't know, or a link leading out of the portal is left out
    if (!n || !id || !title || !icon || !link || !PORTAL_PATH.test(link)) continue;
    notes.push({ id, icon, title, detail: text(n.detail) ?? '', to: link, read: n.read === true, ...(text(n.at) ? { at: text(n.at) } : {}) });
  }
  const told = record(raw)?.unread;
  const unread = typeof told === 'number' && Number.isInteger(told) && told >= 0 ? told : notes.filter((n) => !n.read).length;
  return { notes, unread };
}

const DATE = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** "just now", "5 min ago", "3 h ago", "yesterday", "4 days ago", then the date. */
export function timeAgo(iso: string, now = Date.now()) {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return '';
  const minutes = Math.floor((now - at) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return DATE.format(at);
}

/** The email switches offered when connected: all of them, except course emails while courses live in the LMS Platform. */
export const emailKinds = (platform: boolean) => (platform ? NOTIFICATION_KINDS.filter((k) => k.id !== 'courses') : NOTIFICATION_KINDS);
export const EMAIL_KINDS = emailKinds(false);

const POLL_MS = 60_000;

/** The bell's notes; `failed` when the last check didn't work (it tries again on the next one). */
export function useNotifications() {
  const [data, setData] = useState<{ notes: BellNote[]; unread: number }>({ notes: [], unread: 0 });
  const [failed, setFailed] = useState(false);
  const latest = useRef(data);
  latest.current = data;

  const load = useCallback(async () => {
    if (!api) return;
    try {
      setData(toBellNotes(await api.get<unknown>('/notifications')));
      setFailed(false);
    } catch (error) {
      // the bell keeps what it showed; the next check tries again
      console.warn('Notifications didn’t load:', error instanceof ApiError ? error.kind : error);
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
    const check = () => {
      if (document.visibilityState === 'visible') void load();
    };
    const timer = window.setInterval(check, POLL_MS);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, [load]);

  /** Shows them read at once, then tells the backend; if that fails, the bell is loaded again to match it. */
  const markRead = useCallback(
    (ids: string[]) => {
      const fresh = latest.current.notes.filter((n) => ids.includes(n.id) && !n.read).map((n) => n.id);
      if (!fresh.length || !api) return;
      setData((d) => ({ notes: d.notes.map((n) => (fresh.includes(n.id) ? { ...n, read: true } : n)), unread: Math.max(0, d.unread - fresh.length) }));
      void Promise.all(fresh.map((id) => api!.post(`/notifications/${id}/read`, {}))).catch(() => void load());
    },
    [load],
  );

  const markAllRead = useCallback(() => {
    if (!api || !latest.current.unread) return;
    setData((d) => ({ notes: d.notes.map((n) => ({ ...n, read: true })), unread: 0 }));
    void api.post('/notifications/read-all', {}).catch(() => void load());
  }, [load]);

  return { ...data, failed, markRead, markAllRead };
}

const KNOWN = NOTIFICATION_KINDS.map((k) => k.id as NotificationKind);
const readMuted = (value: unknown) => (Array.isArray(value) ? value.filter((k): k is NotificationKind => KNOWN.includes(k)) : []);

/** The email switches saved on the account. A change shows at once and is undone, with a message, if it didn't save. */
export function useEmailSwitches() {
  const [muted, setMuted] = useState<NotificationKind[]>([]);
  const [problem, setProblem] = useState('');

  useEffect(() => {
    if (!api) return;
    let live = true;
    api.get<{ muted?: unknown }>('/notifications/prefs').then(
      (r) => live && setMuted(readMuted(r.muted)),
      () => live && setProblem('Your email settings didn’t load. Reopen this to try again.'),
    );
    return () => {
      live = false;
    };
  }, []);

  const toggle = (kind: NotificationKind, on: boolean) => {
    if (!api) return;
    const before = muted;
    const next = on ? muted.filter((k) => k !== kind) : [...muted, kind];
    setMuted(next);
    setProblem('');
    api.patch('/notifications/prefs', { muted: next }).catch(() => {
      setMuted(before);
      setProblem('That change wasn’t saved. Try again.');
    });
  };

  return { muted, toggle, problem };
}
