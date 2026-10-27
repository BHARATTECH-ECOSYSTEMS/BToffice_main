import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, BUSY_MESSAGE, type createApi } from './api';
import { EMAIL_SHAPE, STREAM_LABEL, STREAMS, WORK_MODE_LABEL, type ApplicationStage, type InternalJob, type Referral, type Stream, type WorkMode } from './data';
import { localDay } from './eoffice';
import { readJoinDate } from './people';
import { webLink } from './webLink';

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

/** Someone still at Bharattech who gave a personal email ahead of leaving; the stream is null until one is set. */
export interface CommunityJoiner {
  id: string;
  name: string;
  stream: Stream | null;
  /** Only Super Admins and Admins are sent these. */
  employeeId?: string;
  personalEmail?: string;
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

/** The early joiners the backend sent, in its order (by name); a broken one is left out. */
export function toJoiners(raw: unknown): CommunityJoiner[] {
  if (!Array.isArray(raw)) throw new ApiError('unavailable');
  return raw.flatMap((j) => {
    if (!isRecord(j) || !str(j.id) || !str(j.name)) return [];
    const stream = STREAMS.find((s) => s.id === j.stream)?.id ?? null;
    return [{ id: str(j.id), name: str(j.name), stream, employeeId: str(j.employeeId) || undefined, personalEmail: str(j.personalEmail) || undefined }];
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

/** Someone who applied to an internal job, as Super Admins and Admins see them. */
export interface RemoteApplicant {
  id: string;
  personId: string;
  name: string;
  stage: ApplicationStage;
  /** The day the stage last changed, in the viewer's own calendar. */
  updated: string;
  hasPersonalEmail: boolean;
}
/** A job as the page shows it; `applicants` only for Super Admins and Admins. */
export type RemoteJob = InternalJob & { emailed: number; failed: number; applicants?: RemoteApplicant[] };
export type JobDraft = Omit<InternalJob, 'id' | 'postedBy' | 'posted' | 'open' | 'closes'> & { closes: string };

// the backend's limits (models/InternalJob.js)
export const JOB_LIMITS = { title: 120, about: 1000, location: 80, experience: 40, check: 500, criteria: 10, criterion: 200, openings: 50, email: 120 } as const;
const STAGES: ApplicationStage[] = ['applied', 'eligible', 'checking', 'rejoined', 'declined'];
const NEXT: Record<ApplicationStage, ApplicationStage[]> = { applied: ['eligible', 'declined'], eligible: ['checking'], checking: ['rejoined', 'declined'], rejoined: [], declined: [] };
/** Where an application may go from `stage` (the backend's own road). */
export const nextStages = (stage: ApplicationStage) => NEXT[stage];

const dayOf = (value: unknown) => {
  const t = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isNaN(t) ? '' : localDay(t);
};
const toApplicant = (a: unknown): RemoteApplicant | null => {
  if (!isRecord(a) || !str(a.id) || !str(a.personId) || !STAGES.includes(a.stage as ApplicationStage)) return null;
  return { id: str(a.id), personId: str(a.personId), name: str(a.name) || 'Removed user', stage: a.stage as ApplicationStage, updated: dayOf(a.updatedAt), hasPersonalEmail: a.hasPersonalEmail === true };
};
function toJob(j: Record<string, unknown>): RemoteJob | null {
  const stream = STREAMS.find((s) => s.id === j.stream)?.id;
  const mode = j.mode as WorkMode;
  const posted = dayOf(j.postedOn);
  const openings = j.openings;
  if (!str(j.id) || !str(j.title) || !stream || !(mode in WORK_MODE_LABEL) || !posted || !Number.isInteger(openings) || (openings as number) < 1) return null;
  return {
    id: str(j.id),
    stream,
    title: str(j.title),
    about: str(j.about),
    location: str(j.location),
    mode,
    experience: str(j.experience),
    openings: openings as number,
    closes: readJoinDate(j.closes),
    criteria: (Array.isArray(j.criteria) ? j.criteria : []).map(str).filter(Boolean),
    check: str(j.check),
    applyEmail: str(j.applyEmail),
    postedBy: str(j.postedBy),
    posted,
    open: j.open === true,
    emailed: count(j.emailed),
    failed: count(j.failed),
    ...(Array.isArray(j.applicants) ? { applicants: j.applicants.map(toApplicant).filter((a): a is RemoteApplicant => !!a) } : {}),
  };
}
/** The jobs the backend sent, in its order (newest first); a broken one is left out. */
export function toJobs(raw: unknown): RemoteJob[] {
  if (!Array.isArray(raw)) throw new ApiError('unavailable');
  return raw.flatMap((j) => (isRecord(j) ? (toJob(j) ?? []) : []));
}

const lines = (criteria: string[]) => criteria.map((c) => c.trim()).filter(Boolean);
/** Why the backend would refuse this posting on `today` ("YYYY-MM-DD"), or '' when it's fine. */
export function jobProblem(draft: JobDraft, today: string) {
  const L = JOB_LIMITS;
  if (!draft.title.trim()) return 'Enter the role, like Frontend Engineer.';
  if (!draft.about.trim()) return 'Say in a line or two what the role involves.';
  if (!draft.location.trim()) return 'Enter where the role is based, like Kanpur.';
  if (!draft.experience.trim()) return 'Enter the experience it needs, like 2+ years.';
  for (const [value, max] of [[draft.title, L.title], [draft.about, L.about], [draft.location, L.location], [draft.experience, L.experience], [draft.check, L.check]] as const) {
    if (value.trim().length > max) return `Keep each field within its limit (${max} characters here).`;
  }
  if (!Number.isInteger(draft.openings) || draft.openings < 1 || draft.openings > L.openings) return `Openings must be a whole number from 1 to ${L.openings}.`;
  if (draft.closes && draft.closes < today) return 'The apply-by date has passed. Pick today or later.';
  const criteria = lines(draft.criteria);
  if (!criteria.length) return 'Add at least one line under "Who can apply".';
  if (criteria.length > L.criteria) return `Keep "Who can apply" to ${L.criteria} lines.`;
  if (criteria.some((c) => c.length > L.criterion)) return `Keep each "Who can apply" line to ${L.criterion} characters.`;
  if (!draft.check.trim()) return 'Describe the knowledge check, so people know what to expect.';
  const email = draft.applyEmail.trim();
  if (!EMAIL_SHAPE.test(email) || email.length > L.email) return 'Enter the email applications go to, like hr@bharattechorigin.com.';
  return '';
}

/** What POST /api/community/jobs reads, and nothing else. */
export const jobBody = (d: JobDraft) => ({
  stream: d.stream,
  title: d.title.trim(),
  about: d.about.trim(),
  location: d.location.trim(),
  mode: d.mode,
  experience: d.experience.trim(),
  openings: d.openings,
  closes: d.closes,
  criteria: lines(d.criteria),
  check: d.check.trim(),
  applyEmail: d.applyEmail.trim().toLowerCase(),
});

/** What a stage change answered: whether its email went (when it sends one) and whether they need an invite. */
export interface MoveResult {
  job: RemoteJob;
  emailed?: boolean;
  needsInvite?: boolean;
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
    joiners: async () => toJoiners(await client.get<unknown>('/community/joiners')),
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
    jobs: async () => toJobs(await client.get<unknown>('/community/jobs')),
    /** Posts it and emails the stream's members; resolves with the job as saved, with its email counts. */
    postJob: async (draft: JobDraft) => jobOf(await client.post<unknown>('/community/jobs', jobBody(draft), { timeoutMs: SHARE_TIMEOUT_MS })),
    setJobOpen: async (id: string, open: boolean) => jobOf(await client.patch<unknown>(job(id), { open })),
    removeJob: async (id: string) => void (await client.del(job(id))),
    addApplicant: async (jobId: string, personId: string) => jobOf(await client.post<unknown>(`${job(jobId)}/applicants`, { personId })),
    /** Moves an application from the stage the page saw (`from`) to `to`; the check needs its link or instructions. */
    moveApplicant: async (jobId: string, appId: string, from: ApplicationStage, to: ApplicationStage, instructions?: string): Promise<MoveResult> => {
      const body = to === 'checking' ? { from, to, instructions: (instructions ?? '').trim() } : { from, to };
      const reply = await client.post<unknown>(`${job(jobId)}/applicants/${encodeURIComponent(appId)}/stage`, body, { timeoutMs: SHARE_TIMEOUT_MS });
      const moved = jobOf(reply);
      const r = reply as Record<string, unknown>;
      return { job: moved, ...(typeof r.emailed === 'boolean' ? { emailed: r.emailed } : {}), ...(typeof r.needsInvite === 'boolean' ? { needsInvite: r.needsInvite } : {}) };
    },
  };
}

const job = (id: string) => `/community/jobs/${encodeURIComponent(id)}`;
/** The job in a reply ({ job }); an odd answer counts as no answer. */
const jobOf = (reply: unknown) => {
  const found = isRecord(reply) && isRecord(reply.job) ? toJob(reply.job) : null;
  if (!found) throw new ApiError('unavailable');
  return found;
};

// sharing waits for the emails to go out (a few at a time), so it gets longer than the usual limit
const SHARE_TIMEOUT_MS = 60_000;

const asApiError = (error: unknown) => (error instanceof ApiError ? error : new ApiError('unavailable'));

export type MembersState = { kind: 'off' } | { kind: 'loading' } | { kind: 'ready'; members: CommunityMember[]; joiners: CommunityJoiner[] } | { kind: 'error'; error: ApiError };

/**
 * The members wall and the staff who joined early, from the backend; `off` with the demo sign-in. Both load together,
 * so someone who leaves moves from one list to the other at once. Each change loads them again, so the page shows what
 * the backend stored. Changes throw an ApiError when the backend refuses.
 */
export function useCommunityMembers() {
  const [state, setState] = useState<MembersState>(api ? { kind: 'loading' } : { kind: 'off' });

  // `quiet` keeps the wall on screen while it reloads after a change
  const load = useCallback(async (quiet = false) => {
    if (!api) return;
    if (!quiet) setState({ kind: 'loading' });
    try {
      const calls = communityCalls(api);
      const [members, joiners] = await Promise.all([calls.members(), calls.joiners()]);
      setState({ kind: 'ready', members, joiners });
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
    /** Loads the wall again behind the scenes (someone rejoined elsewhere), keeping the current one on screen. */
    refresh: () => void load(true),
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

export type JobsState = { kind: 'off' } | { kind: 'loading' } | { kind: 'ready'; jobs: RemoteJob[] } | { kind: 'error'; error: ApiError };

/**
 * Internal jobs from the backend; `off` with the demo sign-in or when `on` is false (employees never ask). Every
 * change loads the list again, so the page shows what the backend stored; changes throw an ApiError when refused.
 */
export function useJobs(on: boolean) {
  const live = !!api && on;
  const [state, setState] = useState<JobsState>(live ? { kind: 'loading' } : { kind: 'off' });

  const load = useCallback(async () => {
    if (!api || !on) return;
    try {
      setState({ kind: 'ready', jobs: await communityCalls(api).jobs() });
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
    post: (draft: JobDraft) => act(() => communityCalls(api!).postJob(draft)),
    setOpen: (id: string, open: boolean) => act(() => communityCalls(api!).setJobOpen(id, open)),
    remove: (id: string) => act(() => communityCalls(api!).removeJob(id)),
    addApplicant: (jobId: string, personId: string) => act(() => communityCalls(api!).addApplicant(jobId, personId)),
    move: (jobId: string, appId: string, from: ApplicationStage, to: ApplicationStage, instructions?: string) =>
      act(() => communityCalls(api!).moveApplicant(jobId, appId, from, to, instructions)),
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
