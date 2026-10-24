import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, BUSY_MESSAGE, type createApi } from './api';
import { EMAIL_SHAPE, STREAM_LABEL, STREAMS, type Referral, type Stream } from './data';
import { localDay } from './eoffice';
import { readJoinDate } from './people';

/**
 * The Bharattech Community on the backend (/api/community): the people who have left, the personal email the
 * community reaches them on, bringing someone back, and the referrals emailed to them. Marking someone as left is on
 * the People page (people.ts).
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

/** A referral as the list shows it, with how its emails went. */
export type RemoteReferral = Referral & { emailed: number; failed: number };
export type ReferralDraft = Pick<Referral, 'stream' | 'title' | 'company' | 'link' | 'note'>;

// the backend's limits (models/Referral.js)
export const REFERRAL_LIMITS = { title: 120, company: 120, note: 500, link: 2048 } as const;

/** A web address starting with http:// or https://, as the browser writes it; null when it isn't one. */
const webLink = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
};
const count = (value: unknown) => (typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0);

/** The referrals the backend sent, in its order (newest first); a broken one is left out. */
export function toReferrals(raw: unknown): RemoteReferral[] {
  if (!Array.isArray(raw)) throw new ApiError('unavailable');
  return raw.flatMap((r) => (isRecord(r) ? (toReferral(r) ?? []) : []));
}
function toReferral(r: Record<string, unknown>): RemoteReferral | null {
  const stream = STREAMS.find((s) => s.id === r.stream)?.id;
  const shared = typeof r.sharedOn === 'string' ? Date.parse(r.sharedOn) : NaN;
  if (!str(r.id) || !str(r.title) || !str(r.company) || !stream || Number.isNaN(shared)) return null;
  return {
    id: str(r.id),
    stream,
    title: str(r.title),
    company: str(r.company),
    // only ever shown as a link people click, so anything but a web address is dropped
    link: webLink(str(r.link)) ?? '',
    note: str(r.note),
    postedBy: str(r.sharedBy),
    posted: localDay(shared),
    emailed: count(r.emailed),
    failed: count(r.failed),
  };
}

/** Why the backend would refuse this referral, or '' when it's fine. */
export function referralProblem(draft: ReferralDraft) {
  const title = draft.title.trim();
  const company = draft.company.trim();
  const link = draft.link.trim();
  if (!title) return 'Enter the role, like Backend Engineer.';
  if (!company) return 'Enter the company that is hiring.';
  if (title.length > REFERRAL_LIMITS.title || company.length > REFERRAL_LIMITS.company) return `Keep the role and company to ${REFERRAL_LIMITS.title} characters each.`;
  if (link && (link.length > REFERRAL_LIMITS.link || !webLink(link))) return 'Enter the link as a full web address starting with https:// or http://';
  if (draft.note.trim().length > REFERRAL_LIMITS.note) return `Keep the note to ${REFERRAL_LIMITS.note} characters.`;
  return '';
}

/** What POST /api/community/referrals reads, and nothing else. */
export const referralBody = (draft: ReferralDraft) => {
  const link = draft.link.trim();
  return { stream: draft.stream, title: draft.title.trim(), company: draft.company.trim(), link: link ? (webLink(link) ?? link) : '', note: draft.note.trim() };
};

const members = (n: number) => `${n} ${n === 1 ? 'member' : 'members'}`;
/** Who a referral reached, by number only. */
export function emailedLine({ stream, emailed, failed }: { stream: Stream; emailed: number; failed: number }) {
  if (!emailed && !failed) return `Nobody in the ${STREAM_LABEL[stream]} community has a personal email yet, so it wasn’t emailed`;
  if (!emailed) return `Couldn’t be emailed to the ${members(failed)}; pass it on by hand`;
  if (failed) return `Emailed to ${emailed} of ${members(emailed + failed)}; ${failed} couldn’t be sent`;
  return `Emailed to ${members(emailed)}`;
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
    referrals: async () => toReferrals(await client.get<unknown>('/community/referrals')),
    /** Shares it and emails the stream's members; resolves with the referral as saved, with its email counts. */
    shareReferral: async (draft: ReferralDraft) => {
      const reply = await client.post<unknown>('/community/referrals', referralBody(draft), { timeoutMs: SHARE_TIMEOUT_MS });
      const shared = isRecord(reply) && isRecord(reply.referral) ? toReferral(reply.referral) : null;
      if (!shared) throw new ApiError('unavailable');
      return shared;
    },
    removeReferral: async (id: string) => void (await client.del(`/community/referrals/${encodeURIComponent(id)}`)),
  };
}

// sharing waits for the emails to go out (a few at a time), so it gets longer than the usual limit
const SHARE_TIMEOUT_MS = 60_000;

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

export type ReferralsState = { kind: 'off' } | { kind: 'loading' } | { kind: 'ready'; referrals: RemoteReferral[] } | { kind: 'error'; error: ApiError };

/**
 * The referrals list from the backend; `off` with the demo sign-in or when `on` is false (employees never ask).
 * Sharing and removing load the list again; they throw an ApiError when the backend refuses.
 */
export function useReferrals(on: boolean) {
  const live = !!api && on;
  const [state, setState] = useState<ReferralsState>(live ? { kind: 'loading' } : { kind: 'off' });

  const load = useCallback(async () => {
    if (!api || !on) return;
    try {
      setState({ kind: 'ready', referrals: await communityCalls(api).referrals() });
    } catch (error) {
      setState({ kind: 'error', error: asApiError(error) });
    }
  }, [on]);

  useEffect(() => {
    setState(live ? { kind: 'loading' } : { kind: 'off' });
    void load();
  }, [load, live]);

  const act = useCallback(
    async <T>(change: () => Promise<T>) => {
      try {
        return await change();
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
    share: (draft: ReferralDraft) => act(() => communityCalls(api!).shareReferral(draft)),
    remove: (id: string) => act(() => communityCalls(api!).removeReferral(id)),
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
