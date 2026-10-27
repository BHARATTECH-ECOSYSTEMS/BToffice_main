import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, BUSY_MESSAGE } from './api';
import { turns } from './newestReply';
import { EVENT_KINDS, type EventKind } from './data';

/**
 * The calendar's events on the backend (GET/POST /api/events, PATCH/DELETE /api/events/:id). Everyone signed in sees
 * them; the backend says, per event, whether this person may change it (admins any, a sub admin their own), and it
 * tells everyone else in their bell and by email when one is added, changed or cancelled.
 */

export interface PortalEvent {
  id: string;
  title: string;
  kind: EventKind;
  /** yyyy-mm-dd */
  date: string;
  /** "HH:MM", or '' for all day */
  time: string;
  addedBy: string;
  canChange: boolean;
}

export interface EventDraft {
  title: string;
  kind: EventKind;
  date: string;
  time: string;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^(|([01]\d|2[0-3]):[0-5]\d)$/;
const KINDS = new Set<string>(EVENT_KINDS.map((k) => k.id));
const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);

export function toEvents(raw: unknown): PortalEvent[] {
  if (!Array.isArray(raw)) throw new ApiError('unavailable', 'The backend’s answer isn’t a list of events.');
  const events: PortalEvent[] = [];
  for (const entry of raw) {
    const e = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
    const id = text(e.id);
    const title = text(e.title);
    const time = typeof e.time === 'string' ? e.time : '';
    // one broken event shouldn't take the whole calendar down
    if (!id || !title || !KINDS.has(String(e.kind)) || typeof e.date !== 'string' || !DAY.test(e.date) || !TIME.test(time)) continue;
    events.push({ id, title, kind: e.kind as EventKind, date: e.date, time, addedBy: text(e.addedBy) ?? '', canChange: e.canChange === true });
  }
  return events;
}

const FAILED: Record<ApiError['kind'], string> = {
  'signed-out': 'Your sign-in has ended. Sign out and sign in again, then try once more.',
  forbidden: 'Your role can’t change that event.',
  'not-found': 'That event isn’t on the calendar any more. The calendar has been refreshed.',
  conflict: 'That change clashes with another one. The calendar has been refreshed.',
  'bad-request': 'That event wasn’t accepted.',
  busy: BUSY_MESSAGE,
  unavailable: 'We couldn’t reach the calendar, so nothing was changed. Try again in a moment.',
};
/** What to say when a change was refused; the backend's own words are clearest for refused input and roles. */
export const eventFailedMessage = (e: ApiError) => ((e.kind === 'bad-request' || e.kind === 'forbidden') && e.message !== e.kind ? e.message : FAILED[e.kind]);

export type EventsState = { kind: 'off' } | { kind: 'loading' } | { kind: 'ready'; events: PortalEvent[] } | { kind: 'error'; error: ApiError };

const asApiError = (error: unknown) => (error instanceof ApiError ? error : new ApiError('unavailable'));

/**
 * The events between two days (yyyy-mm-dd); `off` with the demo sign-in. A new range keeps the old events on screen
 * until the new ones arrive, so moving between months doesn't flash empty. The actions save to the backend, then
 * load again; they throw an ApiError when the backend refuses.
 */
export function useEvents(from: string, to: string) {
  const [state, setState] = useState<EventsState>(api ? { kind: 'loading' } : { kind: 'off' });
  // after a quick change of month, the older month's reply can arrive last: only the newest load's answer is shown
  const [nextTurn] = useState(turns);

  const load = useCallback(async () => {
    if (!api) return;
    const current = nextTurn();
    try {
      const events = toEvents(await api.get<unknown>(`/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`));
      if (current()) setState({ kind: 'ready', events });
    } catch (error) {
      if (current()) setState({ kind: 'error', error: asApiError(error) });
    }
  }, [from, to, nextTurn]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = useCallback(
    async (change: () => Promise<unknown>) => {
      try {
        await change();
      } catch (error) {
        throw asApiError(error);
      } finally {
        await load();
      }
    },
    [load],
  );

  return {
    state,
    retry: () => void load(),
    add: (draft: EventDraft) => act(() => api!.post('/events', draft)),
    change: (id: string, draft: EventDraft) => act(() => api!.patch(`/events/${encodeURIComponent(id)}`, draft)),
    cancel: (id: string) => act(() => api!.del(`/events/${encodeURIComponent(id)}`)),
  };
}
