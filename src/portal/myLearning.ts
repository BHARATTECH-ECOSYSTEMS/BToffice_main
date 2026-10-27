import { useCallback, useEffect, useState } from 'react';
import { auth } from './auth';
import { LMS_API } from './lmsPlatform';
import { timed, TIMEOUT_MS } from './timedFetch';

/**
 * "My learning" on the dashboard (owner's 6A, 2026-10-26): the courses someone is enrolled in on the LMS Platform, with
 * how far they are, from its GET /api/user/learning. The portal's own sign-in is accepted there (both are the same
 * Keycloak client), so nothing is signed in twice.
 */
export interface LearningCourse {
  id: string;
  title: string;
  educator?: string;
  done: number;
  total: number;
  completed: boolean;
  /** 0–100, for the bar. */
  percent: number;
}

export type MyLearningState = { kind: 'off' } | { kind: 'loading' } | { kind: 'ready'; courses: LearningCourse[] } | { kind: 'error'; reason: 'signed-out' | 'unavailable' };

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);
const count = (value: unknown) => (typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0);

export function toMyLearning(raw: unknown): LearningCourse[] {
  const list = (raw as { data?: { courses?: unknown } } | null)?.data?.courses;
  if (!Array.isArray(list)) return [];
  return list.flatMap((entry) => {
    const c = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
    const id = text(c.courseId);
    if (!id) return [];
    const total = count(c.total);
    const done = Math.min(count(c.done), total);
    const completed = c.completed === true && total > 0;
    return [{ id, title: text(c.courseTitle) ?? 'Untitled course', educator: text(c.educatorName), done, total, completed, percent: completed ? 100 : total ? Math.round((done / total) * 100) : 0 }];
  });
}

/** A course's player on the LMS Platform. */
export const learningLink = (platform: string, courseId: string) => new URL(`player/${encodeURIComponent(courseId)}`, platform.endsWith('/') ? platform : `${platform}/`).href;

/** Asks the LMS Platform's server for the list with the portal's sign-in; never throws. */
export async function fetchMyLearning(apiBase: string, token: () => Promise<string | null>, send: typeof fetch = fetch, timeoutMs = TIMEOUT_MS): Promise<MyLearningState> {
  const access = await token().catch(() => null);
  if (!access) return { kind: 'error', reason: 'signed-out' };
  try {
    const res = await timed(send, timeoutMs)(new URL('api/user/learning', apiBase.endsWith('/') ? apiBase : `${apiBase}/`).href, { headers: { Authorization: `Bearer ${access}` } });
    if (res.status === 401 || res.status === 403) return { kind: 'error', reason: 'signed-out' };
    if (!res.ok) return { kind: 'error', reason: 'unavailable' };
    return { kind: 'ready', courses: toMyLearning(await res.json()) };
  } catch {
    return { kind: 'error', reason: 'unavailable' };
  }
}

/** The signed-in person's courses on the LMS Platform; `off` without the platform (or in the demo). */
export function useMyLearning() {
  const on = !!LMS_API && !!auth;
  const [state, setState] = useState<MyLearningState>(on ? { kind: 'loading' } : { kind: 'off' });
  const load = useCallback(async () => {
    if (!LMS_API || !auth) return;
    const signIn = auth;
    setState({ kind: 'loading' });
    setState(await fetchMyLearning(LMS_API, () => signIn.accessToken()));
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return { state, retry: () => void load() };
}
