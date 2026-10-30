import { useEffect, useSyncExternalStore } from 'react';
import { api } from './api';

/**
 * The live dot beside each person (the team's request, 2026-10-29). While someone is in the e-Office, the portal sends
 * the backend a small "still active" signal every 10 seconds while they use the laptop (POST /api/attendance/active).
 * The backend keeps the time and decides the colour (utils/presence.js): green after use in the last 20 seconds, red
 * after 20 seconds without, grey when they aren't in or outside working hours (10:00 am–8:30 pm India time, Monday to
 * Friday). Colleagues only ever get the colour, never the times.
 *
 * Use is any mouse, keyboard, scroll or touch in the portal. In Chrome and Edge, once the person allows it when they
 * join, the browser's idle detection also counts use anywhere on the laptop, and a locked screen as none. Either way
 * the portal tab has to stay open (minimised is fine).
 */
export type Presence = 'active' | 'inactive' | 'out' | 'off';

export const PRESENCE_LABEL: Record<Presence, string> = { active: 'Active', inactive: 'Inactive', out: 'Not in e-Office', off: 'Off hours' };
const PRESENCES = Object.keys(PRESENCE_LABEL);

/** A dot the backend sent, or undefined for anything else. */
export const readPresence = (value: unknown): Presence | undefined => (typeof value === 'string' && PRESENCES.includes(value) ? (value as Presence) : undefined);

// the backend turns the dot red after 20 seconds without a signal, so one goes every 10 while in use
export const SIGNAL_EVERY_MS = 10_000;
/** How long one sign of use inside the portal keeps counting: the stretch one signal covers. */
export const USE_COUNTS_MS = 10_000;
/** Someone not in the e-Office is only asked about this often (they may have joined in another tab). */
export const OUT_RECHECK_MS = 60_000;
const CHECK_EVERY_MS = 2_000;

/** What the browser's idle detection says about the whole laptop. */
export interface IdleState {
  userState: 'active' | 'idle' | null;
  screenState: 'locked' | 'unlocked' | null;
}
export interface SignalState {
  now: number;
  lastSent: number;
  /** The last sign of use inside the portal. */
  lastUse: number;
  /** null when the browser can't (or wasn't allowed to) watch the whole laptop. */
  idle: IdleState | null;
  /** The dot the backend last gave this person; undefined until it has said. */
  mine: Presence | undefined;
}

/** Whether to send the "still active" signal now. */
export function shouldSignal({ now, lastSent, lastUse, idle, mine }: SignalState) {
  if (mine === 'out') return now - lastSent >= OUT_RECHECK_MS;
  const usedHere = now - lastUse < USE_COUNTS_MS;
  const usedAnywhere = idle?.userState === 'active' && idle.screenState === 'unlocked';
  return (usedHere || usedAnywhere) && now - lastSent >= SIGNAL_EVERY_MS;
}

// the signed-in person's own dot, shared by the signal and the pages that show it
let mine: Presence | undefined;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};
export function setMyPresence(presence: Presence | undefined) {
  if (presence === mine) return;
  mine = presence;
  for (const listener of listeners) listener();
}
export const useMyPresence = () => useSyncExternalStore(subscribe, () => mine);

interface IdleDetectorLike extends EventTarget, IdleState {
  start(options: { threshold: number; signal: AbortSignal }): Promise<void>;
}
interface IdleDetectorClass {
  new (): IdleDetectorLike;
  requestPermission(): Promise<'granted' | 'denied'>;
}
// Chrome and Edge only, so not in TypeScript's own list of browser features
const idleDetector = () => (globalThis as { IdleDetector?: IdleDetectorClass }).IdleDetector;
// the browser's shortest allowed threshold: away from the portal, the dot turns red about a minute after the last use
const IDLE_THRESHOLD_MS = 60_000;

const allowed = new Set<() => void>();
/**
 * Asks the browser to let the portal see use anywhere on the laptop. Call it straight from a click, before anything
 * waits, or the browser won't ask. A "no", or a browser without the feature, leaves use inside the portal counting.
 */
export function askToWatchActivity() {
  const Idle = idleDetector();
  if (!Idle || !api) return;
  Idle.requestPermission().then(
    (answer) => {
      if (answer === 'granted') for (const start of allowed) start();
    },
    // refused without asking (not from a click, or switched off by policy): use inside the portal still counts
    () => {},
  );
}

const USE_EVENTS = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;

/** Sends the "still active" signal while the person uses the laptop; the portal layout runs it on every page. */
export function useActivitySignal() {
  useEffect(() => {
    if (!api) return;
    const client = api;
    let lastSent = 0;
    let lastUse = Date.now();
    let sending = false;
    let idle: IdleDetectorLike | null = null;
    const stopIdle = new AbortController();

    const check = () => {
      const now = Date.now();
      if (sending || !shouldSignal({ now, lastSent, lastUse, idle, mine })) return;
      sending = true;
      lastSent = now;
      client
        .post<{ presence?: unknown }>('/attendance/active', {})
        .then(
          (reply) => setMyPresence(readPresence(reply?.presence) ?? mine),
          // a missed signal only lets the dot turn red sooner; the next one tries again, and sign-in trouble shows on the page
          () => {},
        )
        .finally(() => {
          sending = false;
        });
    };
    const used = () => {
      lastUse = Date.now();
      check();
    };

    const watchLaptop = async () => {
      const Idle = idleDetector();
      if (!Idle || idle || stopIdle.signal.aborted) return;
      const granted = await navigator.permissions?.query({ name: 'idle-detection' as PermissionName }).then(
        (status) => status.state === 'granted',
        () => false,
      );
      if (!granted) return;
      const detector = new Idle();
      detector.addEventListener('change', check);
      try {
        await detector.start({ threshold: IDLE_THRESHOLD_MS, signal: stopIdle.signal });
        idle = detector;
      } catch {
        // the browser can still refuse (a policy, or the page closing): use inside the portal still counts
      }
    };

    for (const name of USE_EVENTS) window.addEventListener(name, used, { passive: true, capture: true });
    const timer = window.setInterval(check, CHECK_EVERY_MS);
    allowed.add(watchLaptop);
    void watchLaptop();
    check();
    return () => {
      for (const name of USE_EVENTS) window.removeEventListener(name, used, { capture: true });
      window.clearInterval(timer);
      allowed.delete(watchLaptop);
      stopIdle.abort();
      setMyPresence(undefined);
    };
  }, []);
}
