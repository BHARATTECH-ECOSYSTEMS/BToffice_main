import { useMemo, useSyncExternalStore } from 'react';

/**
 * Checking in to the e-Office. There is no attendance backend yet, so today's check-in is kept in this browser,
 * per person, the way the session keeps the photo: it survives a reload, and a new day starts empty. When the backend
 * arrives, `join` and `leave` become its check-in and check-out calls and the rest stays as it is.
 */

/** Today's visit: when the person checked in and, once they've left, when they checked out (both epoch ms). */
export interface OfficeDay {
  date: string;
  since: number;
  left?: number;
}

const key = (email: string) => `bt-eoffice:${email}`;
const listeners = new Set<() => void>();

/** The local calendar day (not UTC), so a check-in at 1am in India still counts for that day. */
export const localDay = (t = Date.now()) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// the snapshot is the stored string, so React compares it by value and doesn't re-render for nothing
function readRaw(email: string) {
  try {
    return window.localStorage.getItem(key(email));
  } catch {
    return null;
  }
}

function parse(raw: string | null): OfficeDay | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<OfficeDay>;
    if (typeof v.since !== 'number' || v.date !== localDay()) return null;
    return { date: v.date, since: v.since, left: typeof v.left === 'number' ? v.left : undefined };
  } catch {
    // a malformed entry is treated as not checked in
    return null;
  }
}

function write(email: string, day: OfficeDay) {
  try {
    window.localStorage.setItem(key(email), JSON.stringify(day));
  } catch {
    // storage can be blocked (private windows); the check-in then lasts only while this page is open
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useOfficeDay(email: string) {
  const raw = useSyncExternalStore(subscribe, () => readRaw(email));
  const day = useMemo(() => parse(raw), [raw]);
  return {
    day,
    /** Check in now; joining again after leaving starts a new visit. */
    join: () => write(email, { date: localDay(), since: Date.now() }),
    leave: () => day && !day.left && write(email, { ...day, left: Date.now() }),
  };
}
