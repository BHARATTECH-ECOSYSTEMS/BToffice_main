import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, BUSY_MESSAGE, type createApi } from './api';
import { EMAIL_SHAPE, STREAMS, type Stream } from './data';
import { readJoinDate } from './people';

/**
 * The Bharattech Community on the backend (/api/community): the people who have left, the personal email the
 * community reaches them on, and bringing someone back. Marking someone as left is on the People page (people.ts).
 */

export interface CommunityMember {
  id: string;
  name: string;
  stream: Stream;
  /** Their leaving day, "YYYY-MM-DD". */
  left: string;
  /** Only Super Admins and Admins are sent these. */
  employeeId?: string;
  personalEmail?: string;
  /** Whether the viewer may bring them back (the backend's own rule). */
  canBringBack: boolean;
}

const str = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object';

/** The members the backend sent, in its order (newest leaver first); a broken one is left out. */
export function toMembers(raw: unknown): CommunityMember[] {
  if (!Array.isArray(raw)) throw new ApiError('unavailable');
  return raw.flatMap((m) => {
    if (!isRecord(m)) return [];
    const stream = STREAMS.find((s) => s.id === m.stream)?.id;
    const left = readJoinDate(m.leftOn);
    if (!str(m.id) || !str(m.name) || !stream || !left) return [];
    return [{ id: str(m.id), name: str(m.name), stream, left, employeeId: str(m.employeeId) || undefined, personalEmail: str(m.personalEmail) || undefined, canBringBack: m.canBringBack === true }];
  });
}

export const PERSONAL_EMAIL_MAX = 120;

/** Why the backend would refuse this personal email, or '' when it's fine. Empty takes the email away. */
export function personalEmailProblem(value: string, workEmail: string) {
  const email = value.trim().toLowerCase();
  if (!email) return '';
  if (email.length > PERSONAL_EMAIL_MAX) return `That email is too long (${PERSONAL_EMAIL_MAX} characters at most).`;
  if (!EMAIL_SHAPE.test(email)) return 'Enter an email like name@gmail.com.';
  if (workEmail && email === workEmail.trim().toLowerCase()) return 'A work email stops working when someone leaves. Use a personal one.';
  return '';
}

const FAILED: Record<ApiError['kind'], string> = {
  'signed-out': 'Your sign-in has ended. Sign out and sign in again, then try once more.',
  forbidden: 'Your role can’t do that.',
  'not-found': 'They aren’t in the community any more. The list has been refreshed.',
  conflict: 'Someone else already uses this email.',
  'bad-request': 'That wasn’t accepted.',
  busy: BUSY_MESSAGE,
  unavailable: 'We couldn’t reach the company system, so nothing was changed. Try again in a moment.',
};
// the backend says what to fix, who may do it, and (for a 502) that Keycloak didn't answer and nothing changed
const OWN_WORDS: ApiError['kind'][] = ['bad-request', 'forbidden', 'conflict', 'unavailable'];
export const communityFailedMessage = (e: ApiError) => (OWN_WORDS.includes(e.kind) && e.message !== e.kind ? e.message : FAILED[e.kind]);

type Client = ReturnType<typeof createApi>;
const personalEmailOf = (raw: unknown) => {
  if (!isRecord(raw) || typeof raw.personalEmail !== 'string') throw new ApiError('unavailable');
  return raw.personalEmail;
};
const member = (id: string) => `/community/members/${encodeURIComponent(id)}`;

/** Every community request, on any API client (the hooks below use the signed-in one). */
export function communityCalls(client: Client) {
  return {
    members: async () => toMembers(await client.get<unknown>('/community/members')),
    leave: async (id: string) => void (await client.post(`/community/leave/${encodeURIComponent(id)}`, {})),
    /** needsInvite: their sign-in account is gone, so they need an invite from People to sign in again. */
    bringBack: async (id: string) => {
      const reply = await client.post<unknown>(`${member(id)}/back`, {});
      return { needsInvite: isRecord(reply) && reply.needsInvite === true };
    },
    myPersonalEmail: async () => personalEmailOf(await client.get<unknown>('/community/me/personal-email')),
    saveMyPersonalEmail: async (email: string) => personalEmailOf(await client.put<unknown>('/community/me/personal-email', { personalEmail: email.trim().toLowerCase() })),
    saveMemberPersonalEmail: async (id: string, email: string) =>
      personalEmailOf(await client.put<unknown>(`${member(id)}/personal-email`, { personalEmail: email.trim().toLowerCase() })),
  };
}

const asApiError = (error: unknown) => (error instanceof ApiError ? error : new ApiError('unavailable'));

export type MembersState = { kind: 'off' } | { kind: 'loading' } | { kind: 'ready'; members: CommunityMember[] } | { kind: 'error'; error: ApiError };

/**
 * The members wall from the backend; `off` with the demo sign-in. Each change loads the list again, so the wall shows
 * what the backend stored. Changes throw an ApiError when the backend refuses.
 */
export function useCommunityMembers() {
  const [state, setState] = useState<MembersState>(api ? { kind: 'loading' } : { kind: 'off' });

  // `quiet` keeps the wall on screen while it reloads after a change
  const load = useCallback(async (quiet = false) => {
    if (!api) return;
    if (!quiet) setState({ kind: 'loading' });
    try {
      setState({ kind: 'ready', members: await communityCalls(api).members() });
    } catch (error) {
      setState({ kind: 'error', error: asApiError(error) });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = useCallback(
    async <T>(change: () => Promise<T>) => {
      try {
        return await change();
      } catch (error) {
        throw asApiError(error);
      } finally {
        await load(true);
      }
    },
    [load],
  );

  return {
    state,
    retry: () => void load(),
    bringBack: (id: string) => act(() => communityCalls(api!).bringBack(id)),
    setPersonalEmail: (id: string, email: string) => act(() => communityCalls(api!).saveMemberPersonalEmail(id, email)),
  };
}

/** The signed-in person's own personal email; undefined while loading (or with the demo sign-in), '' for none. */
export function useMyPersonalEmail(on: boolean) {
  const live = !!api && on;
  const [email, setEmail] = useState<string | undefined>(undefined);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    if (!live) return;
    let current = true;
    communityCalls(api!)
      .myPersonalEmail()
      .then((value) => current && setEmail(value))
      .catch((e: unknown) => current && setError(asApiError(e)));
    return () => {
      current = false;
    };
  }, [live]);

  return {
    email,
    error,
    /** Saves it (empty takes it away) and resolves with what the backend stored. */
    save: async (value: string) => {
      try {
        const saved = await communityCalls(api!).saveMyPersonalEmail(value);
        setEmail(saved);
        setError(null);
        return saved;
      } catch (e) {
        throw asApiError(e);
      }
    },
  };
}
