import { officeNow, spentMs, useMyAttendance, type OfficeNow } from '../attendance';
import { api, type ApiError } from '../api';
import { useOfficeDay } from '../eoffice';

/**
 * Where the e-Office card keeps today's visits: in this browser for the demo (eoffice.ts, one visit a day), or on the
 * backend once the portal is connected (attendance.ts, every visit, in India time).
 */
export interface OfficeSource {
  connected: boolean;
  status: { kind: 'ready' } | { kind: 'loading' } | { kind: 'error'; error: ApiError };
  retry: () => void;
  now: OfficeNow;
  /** Time in today, the visit still going counted up to `at`. */
  spent: (at: number) => number;
  /** These resolve when saved, and reject with an ApiError when the backend refuses. */
  join: () => Promise<void>;
  leave: () => Promise<void>;
}

const READY = { kind: 'ready' } as const;
const OUT: OfficeNow = { inside: false, visited: false };

export function useOfficeSource(email: string): OfficeSource {
  const local = useOfficeDay(email);
  const remote = useMyAttendance();

  if (api) {
    const { state } = remote;
    const mine = state.kind === 'ready' ? state.value : null;
    const today = mine?.days.find((d) => d.day === mine.today)?.visits ?? [];
    return {
      connected: true,
      status: state.kind === 'ready' || state.kind === 'off' ? READY : state,
      retry: remote.retry,
      now: mine ? officeNow(mine) : OUT,
      spent: (at) => spentMs(today, at),
      join: remote.join,
      leave: remote.leave,
    };
  }

  const { day } = local;
  return {
    connected: false,
    status: READY,
    retry: () => {},
    now: !day ? OUT : day.left ? { inside: false, visited: true, leftAt: day.left } : { inside: true, visited: true, since: day.since },
    spent: (at) => (day ? (day.left ?? at) - day.since : 0),
    join: async () => local.join(),
    leave: async () => void local.leave(),
  };
}
