import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, BUSY_MESSAGE, failedText } from './api';
import { turns } from './newestReply';
import { readPresence, setMyPresence, type Presence } from './presence';

/**
 * e-Office attendance on the backend (/api/attendance). Everyone joins and leaves the e-Office for themselves, as often
 * as they like; each visit is a record. A visit still open when its India day ends is closed at 23:59 that day and
 * marked "no check-out". Everyone sees their own days; admins and sub admins see everyone's; admins correct a finished
 * visit's times with a reason, and the backend keeps every correction. Times are India time throughout, as the backend
 * keeps its days.
 */

export interface VisitTimes {
  inAt: number;
  outAt: number | null;
}
export interface Correction {
  at: number;
  byName: string;
  reason: string;
  from: VisitTimes;
  to: VisitTimes;
}
/** A stretch of 20 seconds or more without use while in (the live dot was red), in working hours. */
export interface IdleStretch {
  from: number;
  to: number;
  seconds: number;
  /** Still going: `to` is when it was read. */
  ongoing: boolean;
}
export interface Visit extends VisitTimes {
  id: string;
  noCheckOut: boolean;
  /** The one still going reaches up to now. */
  idle: IdleStretch[];
  corrections: Correction[];
}
export interface AttendanceDay {
  /** yyyy-mm-dd, India time */
  day: string;
  minutes: number;
  /** Time in and time inactive, in whole seconds. */
  seconds: number;
  idleSeconds: number;
  noCheckOut: boolean;
  visits: Visit[];
}
export interface MyAttendance {
  today: string;
  inNow: boolean;
  /** Your live dot (presence.ts). */
  presence?: Presence;
  /** Newest day first; only days with a visit. */
  days: AttendanceDay[];
}
export interface AttendancePerson {
  id: string;
  name: string;
  employeeId: string;
  role: string;
  /** Only true when the backend says this viewer may correct their visits. */
  canCorrect: boolean;
}
export interface DayRow extends AttendancePerson {
  inNow: boolean;
  /** Their live dot; only on today's overview. */
  presence?: Presence;
  minutes: number;
  seconds: number;
  idleSeconds: number;
  firstIn: number | null;
  lastOut: number | null;
  noCheckOut: boolean;
  visits: Visit[];
}
export interface DayOverview {
  day: string;
  inNow: number;
  people: DayRow[];
}
export interface PersonHistory {
  person: AttendancePerson;
  days: AttendanceDay[];
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const record = (value: unknown) => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null);
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const count = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0);
const moment = (value: unknown) => (typeof value === 'string' ? Date.parse(value) : NaN);
const notAttendance = () => new ApiError('unavailable', 'The backend’s answer isn’t attendance.');
const list = (value: unknown) => {
  if (!Array.isArray(value)) throw notAttendance();
  return value;
};

const toTimes = (raw: unknown): VisitTimes => {
  const t = record(raw);
  const out = moment(t?.outAt);
  return { inAt: moment(t?.inAt), outAt: Number.isNaN(out) ? null : out };
};

/** A visit as the page uses it, or null when it's broken (one broken visit shouldn't take the page down). */
function toVisit(raw: unknown): Visit | null {
  const v = record(raw);
  const id = text(v?.id);
  const inAt = moment(v?.inAt);
  if (!v || !id || Number.isNaN(inAt)) return null;
  const outAt = v.outAt === null ? null : moment(v.outAt);
  if (outAt !== null && Number.isNaN(outAt)) return null;
  const corrections = (Array.isArray(v.corrections) ? v.corrections : []).flatMap((entry) => {
    const c = record(entry);
    return c ? [{ at: moment(c.at), byName: text(c.byName), reason: text(c.reason), from: toTimes(c.from), to: toTimes(c.to) }] : [];
  });
  const idle = (Array.isArray(v.idle) ? v.idle : []).flatMap((entry) => {
    const s = record(entry);
    const from = moment(s?.from);
    const to = moment(s?.to);
    return s && !Number.isNaN(from) && !Number.isNaN(to) ? [{ from, to, seconds: count(s.seconds), ongoing: s.ongoing === true }] : [];
  });
  return { id, inAt, outAt, noCheckOut: v.noCheckOut === true, idle, corrections };
}

// an answer from before seconds were sent still adds up, from its minutes
const secondsIn = (r: Record<string, unknown>) => (typeof r.seconds === 'number' ? count(r.seconds) : count(r.minutes) * 60);

const toVisits = (raw: unknown) => (Array.isArray(raw) ? raw.map(toVisit).filter((v): v is Visit => v !== null) : []);

const toDays = (raw: unknown): AttendanceDay[] =>
  list(raw).flatMap((entry) => {
    const d = record(entry);
    return d && typeof d.day === 'string' && DAY.test(d.day)
      ? [{ day: d.day, minutes: count(d.minutes), seconds: secondsIn(d), idleSeconds: count(d.idleSeconds), noCheckOut: d.noCheckOut === true, visits: toVisits(d.visits) }]
      : [];
  });

const toPerson = (raw: unknown): AttendancePerson | null => {
  const p = record(raw);
  const id = text(p?.id);
  if (!p || !id) return null;
  return { id, name: text(p.name) || 'Unnamed', employeeId: text(p.employeeId), role: text(p.role), canCorrect: p.canCorrect === true };
};

export function toMyAttendance(raw: unknown): MyAttendance {
  const r = record(raw);
  if (!r || typeof r.today !== 'string' || !DAY.test(r.today)) throw notAttendance();
  return { today: r.today, inNow: r.inNow === true, presence: readPresence(r.presence), days: toDays(r.days) };
}

export function toDayOverview(raw: unknown): DayOverview {
  const r = record(raw);
  if (!r || typeof r.day !== 'string' || !DAY.test(r.day)) throw notAttendance();
  const people = list(r.people).flatMap((entry): DayRow[] => {
    const person = toPerson(entry);
    const p = record(entry)!;
    if (!person) return [];
    const first = moment(p.firstIn);
    const last = moment(p.lastOut);
    return [
      {
        ...person,
        inNow: p.inNow === true,
        presence: readPresence(p.presence),
        minutes: count(p.minutes),
        seconds: secondsIn(p),
        idleSeconds: count(p.idleSeconds),
        firstIn: Number.isNaN(first) ? null : first,
        lastOut: Number.isNaN(last) ? null : last,
        noCheckOut: p.noCheckOut === true,
        visits: toVisits(p.visits),
      },
    ];
  });
  return { day: r.day, inNow: count(r.inNow), people };
}

export function toPersonHistory(raw: unknown): PersonHistory {
  const r = record(raw);
  const person = toPerson(r?.person);
  if (!r || !person) throw notAttendance();
  return { person, days: toDays(r.days) };
}

export const formatMinutes = (minutes: number) => (minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`);

/** A length with its seconds: "45s", "5m 3s", "1h 31m 20s". */
export function formatDuration(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h}h ${m}m ${s % 60}s`;
  return m ? `${m}m ${s % 60}s` : `${s % 60}s`;
}

/** Time spent in over these visits, the one still going counted up to `now`. */
export const spentMs = (visits: Visit[], now: number) => visits.reduce((sum, v) => sum + Math.max(0, (v.outAt ?? now) - v.inAt), 0);

export type OfficeNow = { inside: false; visited: false } | { inside: true; visited: true; since: number } | { inside: false; visited: true; leftAt: number };

/** Where the person stands today: in (since when), left (when), or not been in. */
export function officeNow(mine: MyAttendance): OfficeNow {
  const visits = mine.days.find((d) => d.day === mine.today)?.visits ?? [];
  if (!visits.length) return { inside: false, visited: false };
  const open = visits.find((v) => v.outAt === null);
  if (open) return { inside: true, visited: true, since: open.inAt };
  return { inside: false, visited: true, leftAt: Math.max(...visits.map((v) => v.outAt!)) };
}

// India is +05:30 all year (no daylight saving), so its clock is a fixed shift from UTC
const INDIA_OFFSET_MS = 330 * 60000;
/** "HH:MM" on India's clock: for the correction form and anywhere a time must match the backend's day. */
export const indiaClock = (t: number) => new Date(t + INDIA_OFFSET_MS).toISOString().slice(11, 16);
/** A time to read, on India's clock: "9:05 am". */
export const indiaTime = (t: number) => new Date(t).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' });
/** The same with seconds: "9:05:12 am". */
export const indiaTimeSec = (t: number) => new Date(t).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', second: '2-digit' });
/** Today in India, yyyy-mm-dd. */
export const indiaToday = (now = Date.now()) => new Date(now + INDIA_OFFSET_MS).toISOString().slice(0, 10);
/** The hour on India's clock, 0–23: for anything that greets or counts by the time of day there. */
export const indiaHour = (now = Date.now()) => new Date(now + INDIA_OFFSET_MS).getUTCHours();

export interface CorrectionDraft {
  /** The visit's day, yyyy-mm-dd */
  day: string;
  /** "HH:MM", India time */
  inTime: string;
  outTime: string;
  reason: string;
}
export const REASON_MAX = 300;
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
const indiaMoment = (day: string, hhmm: string) => Date.parse(`${day}T${hhmm}:00+05:30`);

/** What's wrong with a correction before it's sent (the backend checks the same and more), or null. */
export function correctionProblem(draft: CorrectionDraft, now: number): string | null {
  const reason = draft.reason.trim();
  if (!reason) return 'Say why you’re correcting it.';
  if (reason.length > REASON_MAX) return `Keep the reason under ${REASON_MAX} characters.`;
  if (!CLOCK.test(draft.inTime) || !CLOCK.test(draft.outTime)) return 'Give both times, like 09:30.';
  const inAt = indiaMoment(draft.day, draft.inTime);
  const outAt = indiaMoment(draft.day, draft.outTime);
  if (outAt <= inAt) return 'The time they left must be after the time they came in.';
  if (outAt > now) return 'The time they left can’t be in the future.';
  return null;
}

export const correctionBody = (draft: CorrectionDraft) => ({
  inAt: new Date(indiaMoment(draft.day, draft.inTime)).toISOString(),
  outAt: new Date(indiaMoment(draft.day, draft.outTime)).toISOString(),
  reason: draft.reason.trim(),
});

const FAILED: Record<ApiError['kind'], string> = {
  'signed-out': 'Your sign-in has ended. Sign out and sign in again, then try once more.',
  forbidden: 'Your role can’t do that.',
  'not-found': 'That isn’t on record any more. The list has been refreshed.',
  conflict: 'That clashes with a change made just now. The list has been refreshed.',
  'bad-request': 'That wasn’t accepted.',
  busy: BUSY_MESSAGE,
  unavailable: 'We couldn’t reach the company system, so nothing was saved. Try again in a moment.',
};
/** What to say when something failed; the backend's own words are clearest for refusals. */
export const attendanceFailedMessage = (e: ApiError) =>
  (e.kind === 'bad-request' || e.kind === 'forbidden' || e.kind === 'conflict' || e.kind === 'not-found') && e.message !== e.kind ? e.message : failedText(e, FAILED);

export type Loaded<T> = { kind: 'off' } | { kind: 'loading' } | { kind: 'ready'; value: T } | { kind: 'error'; error: ApiError };
const asApiError = (error: unknown) => (error instanceof ApiError ? error : new ApiError('unavailable'));

/** Loads `path` into `read` while `on`; a reload keeps what's on screen until the new answer arrives. */
function useLoaded<T>(path: string | null, read: (raw: unknown) => T) {
  const on = !!api && path !== null;
  const [state, setState] = useState<Loaded<T>>(on ? { kind: 'loading' } : { kind: 'off' });
  // after a quick change of day, the older day's reply can arrive last: only the newest load's answer is shown
  const [nextTurn] = useState(turns);
  const load = useCallback(async () => {
    const current = nextTurn();
    if (!api || path === null) return setState({ kind: 'off' });
    try {
      const value = read(await api.get<unknown>(path));
      if (current()) setState({ kind: 'ready', value });
    } catch (error) {
      if (current()) setState({ kind: 'error', error: asApiError(error) });
    }
    // `read` is a module-level parser, the same on every call
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, nextTurn]);
  useEffect(() => {
    void load();
  }, [load]);
  return { state, setState, reload: load };
}

export type DayRange = { from: string; to: string };

// the backend's limit (attendanceController RANGE_MAX_DAYS)
const RANGE_MAX_DAYS = 400;
const isDay = (value: string) => {
  const at = /^\d{4}-\d{2}-\d{2}$/.test(value) ? Date.parse(`${value}T00:00:00Z`) : NaN;
  // a made-up day (2026-02-31) rolls over into the next month, so it must come back as itself
  return !Number.isNaN(at) && new Date(at).toISOString().startsWith(value);
};

/** Why these dates can't be shown, or null when they can (both real days, in order, not after today, ≤ 400 days). */
export function rangeProblem(range: DayRange, today: string): string | null {
  if (!isDay(range.from) || !isDay(range.to)) return 'Pick both dates.';
  if (range.to < range.from) return 'Pick a start date before the end date.';
  if (range.to > today) return 'Pick an end date up to today.';
  if ((Date.parse(range.to) - Date.parse(range.from)) / 864e5 > RANGE_MAX_DAYS) return `Pick at most ${RANGE_MAX_DAYS} days at a time.`;
  return null;
}

/** An attendance address with the dates asked for. */
export const withRange = (path: string, range?: DayRange) => (range ? `${path}?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}` : path);

/** Your own attendance: today (no range) or the days between `from` and `to`. `off` with the demo sign-in. */
export function useMyAttendance(range?: DayRange) {
  const path = withRange('/attendance/me', range);
  const { state, setState, reload } = useLoaded(path, toMyAttendance);
  // joining, leaving and every load also tell the portal's own dot (presence.ts), even when it says the same again
  useEffect(() => {
    if (state.kind === 'ready' && state.value.presence) setMyPresence(state.value.presence);
  }, [state]);
  // join and leave answer with today's attendance; they throw an ApiError when refused, after reloading
  const act = async (path: string) => {
    try {
      setState({ kind: 'ready', value: toMyAttendance(await api!.post<unknown>(path, {})) });
    } catch (error) {
      await reload();
      throw asApiError(error);
    }
  };
  return { state, retry: () => void reload(), reload, join: () => act('/attendance/check-in'), leave: () => act('/attendance/check-out') };
}

/** Everyone's attendance on one day (managers); `on` false never asks. */
export function useAttendanceDay(day: string, on: boolean) {
  const { state, reload } = useLoaded(on ? `/attendance/day?day=${encodeURIComponent(day)}` : null, toDayOverview);
  return { state, retry: () => void reload(), reload };
}

/** One person's days between `from` and `to` (managers); null asks for nobody. */
export function usePersonHistory(personId: string | null, range?: DayRange) {
  const { state, reload } = useLoaded(personId ? withRange(`/attendance/people/${encodeURIComponent(personId)}`, range) : null, toPersonHistory);
  return { state, retry: () => void reload(), reload };
}

/** Saves a correction; throws an ApiError when the backend refuses. */
export const correctVisit = (visitId: string, draft: CorrectionDraft) => api!.patch<unknown>(`/attendance/visits/${encodeURIComponent(visitId)}`, correctionBody(draft));
