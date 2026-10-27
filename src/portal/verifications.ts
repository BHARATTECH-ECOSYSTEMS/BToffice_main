import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, BUSY_MESSAGE, failedText } from './api';
import {
  COMPANY_CHECKS,
  EMPLOYEE_CHECKS,
  EMPLOYMENT_CHECKS,
  NA_REASON_MAX,
  VERIFICATION_FILES,
  type SkippableCheck,
  type Verification,
  type VerificationStatus,
} from './data';
import { localDay } from './eoffice';
import { isSkippable, toMyDocumentList, type MyDocument } from './myDocuments';
import { readAccountRole, roleLabel } from './people';
import { webLink } from './webLink';

/**
 * HR OPS verifications on the backend (/api/verifications; Super Admins and Admins only): companies, employees, and
 * requests from other companies sent from the website's footer form (inbox.ts). An employee request also carries the
 * employee's uploads (myDocuments.ts) and which checks are marked not applicable.
 */

/** A check marked "Not applicable": HR's reason, or the employee's own "first job". */
export interface NotApplicableMark {
  check: SkippableCheck;
  reason: string;
  by: string;
  byEmployee: boolean;
  /** When it was marked, as the backend sent it. */
  at: string;
}

export type RemoteKind = 'company' | 'employee' | 'employment';
/** Who in our records an outside request seems to be about: a lead for the "Found in our records" check, never a decision. */
export interface DirectoryLead {
  name: string;
  employeeId: string;
  roleLabel: string;
  /** "YYYY-MM-DD", or '' when an admin hasn't set it. */
  joinedOn: string;
  /** false for someone who has left (they still worked here). */
  current: boolean;
}
/** Who an employee request is about, as the backend has them now; `removed` once they've left the directory. */
export interface VerificationPerson {
  name: string;
  email: string;
  roleLabel: string;
  team: string;
  employeeId: string;
  removed: boolean;
}
export type RemoteVerification = Verification & {
  person?: VerificationPerson;
  /** Outside requests: what the requester was told (VR-0001…), whether the current decision reached them, and the lead. */
  reference?: string;
  answerEmailed?: boolean;
  lead?: DirectoryLead | null;
  /** Employee requests: the files they've uploaded (opened through the backend, never as links), and the skipped checks. */
  documents?: MyDocument[];
  notApplicable?: NotApplicableMark[];
};
export type VerificationDraft =
  | { kind: 'company'; company: string; registration: string; website: string; contactEmail: string }
  | { kind: 'employee'; personId: string };

const CHECK_IDS: Record<RemoteKind, Set<string>> = {
  company: new Set(COMPANY_CHECKS.map((c) => c.id)),
  employee: new Set(EMPLOYEE_CHECKS.map((c) => c.id)),
  employment: new Set(EMPLOYMENT_CHECKS.map((c) => c.id)),
};
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const STATUSES: VerificationStatus[] = ['pending', 'verified', 'rejected'];

const str = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object';
/** The viewer's own calendar day for a backend time, or '' when it isn't one. */
const dayOf = (value: unknown) => {
  const t = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isNaN(t) ? '' : localDay(t);
};

const readLog = (value: unknown) =>
  (Array.isArray(value) ? value : []).flatMap((e) => {
    if (!isRecord(e) || !dayOf(e.at) || !str(e.by) || !str(e.text)) return [];
    return [{ at: String(e.at), by: str(e.by), text: str(e.text) }];
  });

const readPerson = (value: unknown): (VerificationPerson & { id: string }) | null => {
  if (!isRecord(value) || !str(value.id)) return null;
  const removed = value.removed === true;
  return {
    id: str(value.id),
    name: str(value.name),
    email: str(value.email),
    roleLabel: removed ? '' : roleLabel(readAccountRole(value.role)),
    team: str(value.team),
    employeeId: str(value.employeeId),
    removed,
  };
};

const readLead = (value: unknown): DirectoryLead | null => {
  if (!isRecord(value) || !str(value.name)) return null;
  return {
    name: str(value.name),
    employeeId: str(value.employeeId),
    roleLabel: roleLabel(readAccountRole(value.role)),
    joinedOn: /^\d{4}-\d{2}-\d{2}$/.test(str(value.joinedOn)) ? str(value.joinedOn) : '',
    current: value.current === true,
  };
};

/** One request as the desk shows it; null when it's broken (the desk leaves it out). */
export function toVerification(raw: unknown): RemoteVerification | null {
  if (!isRecord(raw)) return null;
  const kind = raw.kind;
  const id = str(raw.id);
  const status = raw.status as VerificationStatus;
  const requested = dayOf(raw.openedAt);
  if ((kind !== 'company' && kind !== 'employee' && kind !== 'employment') || !id || !STATUSES.includes(status) || !requested) return null;
  const decided = raw.decidedAt ? dayOf(raw.decidedAt) : '';
  const base = {
    id,
    status,
    done: (Array.isArray(raw.done) ? raw.done : []).filter((c): c is string => typeof c === 'string' && CHECK_IDS[kind].has(c)),
    note: str(raw.note),
    requestedBy: str(raw.openedBy),
    requested,
    ...(decided ? { decidedBy: str(raw.decidedBy), decided } : {}),
    log: readLog(raw.log),
  };
  if (kind === 'company') {
    const company = str(raw.company);
    if (!company) return null;
    return { kind, ...base, company, registration: str(raw.registration), contactEmail: str(raw.contactEmail), website: webLink(str(raw.website)) ?? '' };
  }
  if (kind === 'employment') {
    const fields = {
      reference: str(raw.reference),
      requesterCompany: str(raw.requesterCompany),
      requesterName: str(raw.requesterName),
      requesterEmail: str(raw.requesterEmail),
      candidate: str(raw.candidate),
      designation: str(raw.designation),
      employeeId: str(raw.employeeId),
      from: str(raw.from),
      to: str(raw.to),
    };
    if (!fields.reference || !fields.requesterEmail || !fields.candidate || !MONTH.test(fields.from) || (fields.to && !MONTH.test(fields.to))) return null;
    return { kind, ...base, ...fields, answerEmailed: raw.answerEmailed === true, lead: readLead(raw.directoryMatch) };
  }
  const person = readPerson(raw.person);
  if (!person) return null;
  const { id: personId, ...shown } = person;
  const notApplicable = (Array.isArray(raw.notApplicable) ? raw.notApplicable : []).flatMap((n): NotApplicableMark[] =>
    isRecord(n) && isSkippable(n.check) && str(n.reason) && str(n.by) && dayOf(n.at)
      ? [{ check: n.check, reason: str(n.reason), by: str(n.by), byEmployee: n.byEmployee === true, at: String(n.at) }]
      : [],
  );
  return { kind, ...base, personId, person: shown, documents: toMyDocumentList(raw.documents), notApplicable };
}

const checkOfFile = new Map<string, string>(VERIFICATION_FILES.map((f) => [f.id, f.check]));
const fileChecks = new Set(checkOfFile.values());
/**
 * Whether an employee check may be ticked (the backend's rule): a check proved by a file waits for one, unless it's
 * marked not applicable; any other check (References) is a plain tick.
 */
export function checkReady(v: RemoteVerification, check: string) {
  if (!fileChecks.has(check) || v.notApplicable?.some((n) => n.check === check)) return true;
  return (v.documents ?? []).some((d) => checkOfFile.get(d.kind) === check);
}

/** What's wrong with a not-applicable reason, or '' when it can be sent. */
export const notApplicableProblem = (reason: string) => {
  const r = reason.trim();
  if (!r) return 'Say why it doesn’t apply.';
  return r.length > NA_REASON_MAX ? `Keep the reason under ${NA_REASON_MAX} characters.` : '';
};

/** The list the backend sent, broken entries left out; an answer that isn't a list is an error. */
export function toVerifications(raw: unknown): RemoteVerification[] {
  if (!Array.isArray(raw)) throw new ApiError('unavailable');
  return raw.map(toVerification).filter((v): v is RemoteVerification => !!v);
}

/** What POST /api/verifications reads, and nothing else. */
export const verificationBody = (draft: VerificationDraft) =>
  draft.kind === 'company'
    ? { kind: draft.kind, company: draft.company, registration: draft.registration, website: draft.website, contactEmail: draft.contactEmail }
    : { kind: draft.kind, personId: draft.personId };

const FAILED: Record<ApiError['kind'], string> = {
  'signed-out': 'Your sign-in has ended. Sign out and sign in again, then try once more.',
  forbidden: 'Your role can’t do that.',
  'not-found': 'That request isn’t there any more. The list has been refreshed.',
  conflict: 'Someone changed this request a moment ago. The list has been refreshed.',
  'bad-request': 'That wasn’t accepted.',
  busy: BUSY_MESSAGE,
  unavailable: 'We couldn’t reach the company system, so nothing was saved. Try again in a moment.',
};
const OWN_WORDS: ApiError['kind'][] = ['bad-request', 'forbidden', 'conflict'];
/** The backend's own words where they say what to fix (refused input, roles, a clash); else a plain explanation. */
export const verificationFailedMessage = (e: ApiError) => (OWN_WORDS.includes(e.kind) && e.message !== e.kind ? e.message : failedText(e, FAILED));

export type VerificationsState = { kind: 'off' } | { kind: 'loading' } | { kind: 'ready'; requests: RemoteVerification[] } | { kind: 'error'; error: ApiError };

const asApiError = (error: unknown) => (error instanceof ApiError ? error : new ApiError('unavailable'));

/**
 * One kind of request from the backend; `off` with the demo sign-in or when `on` is false. Each change answers with
 * the request as it now is, which replaces the one on screen. A request that has gone, or that someone else changed
 * in between, loads the list again so the desk catches up. They throw an ApiError when the backend refuses.
 */
export function useRemoteVerifications(kind: RemoteKind, on = true) {
  const live = !!api && on;
  const [state, setState] = useState<VerificationsState>(live ? { kind: 'loading' } : { kind: 'off' });

  const load = useCallback(async () => {
    if (!api || !on) return;
    try {
      setState({ kind: 'ready', requests: toVerifications(await api.get<unknown>(`/verifications?kind=${kind}`)) });
    } catch (error) {
      setState({ kind: 'error', error: asApiError(error) });
    }
  }, [kind, on]);

  useEffect(() => {
    setState(live ? { kind: 'loading' } : { kind: 'off' });
    void load();
  }, [load, live]);

  const replace = (request: RemoteVerification | null) => {
    if (request) setState((s) => (s.kind === 'ready' ? { kind: 'ready', requests: s.requests.map((r) => (r.id === request.id ? request : r)) } : s));
  };
  const act = useCallback(
    async <T>(change: () => Promise<T>) => {
      try {
        return await change();
      } catch (error) {
        const e = asApiError(error);
        if (e.kind === 'not-found' || e.kind === 'conflict') void load();
        throw e;
      }
    },
    [load],
  );

  const path = (id: string) => `/verifications/${encodeURIComponent(id)}`;
  return {
    state,
    retry: () => void load(),
    /** Resolves with the new request's id; it goes to the top of the list. */
    open: (draft: VerificationDraft) =>
      act(async () => {
        const made = toVerification(await api!.post('/verifications', verificationBody(draft)));
        if (!made) throw new ApiError('unavailable');
        setState((s) => (s.kind === 'ready' ? { kind: 'ready', requests: [made, ...s.requests] } : s));
        return made.id;
      }),
    setCheck: (id: string, check: string, done: boolean) => act(async () => replace(toVerification(await api!.patch(`${path(id)}/checks`, { check, done })))),
    markNotApplicable: (id: string, check: SkippableCheck, reason: string) =>
      act(async () => replace(toVerification(await api!.post(`${path(id)}/not-applicable`, { check, reason: reason.trim() })))),
    /** Resolves with the request as it now is (for an outside request: whether the answer email went). */
    decide: (id: string, status: VerificationStatus, note: string) =>
      act(async () => {
        const decided = toVerification(await api!.post(`${path(id)}/decision`, { status, note }));
        replace(decided);
        return decided ?? undefined;
      }),
    remove: (id: string) =>
      act(async () => {
        await api!.del(path(id));
        setState((s) => (s.kind === 'ready' ? { kind: 'ready', requests: s.requests.filter((r) => r.id !== id) } : s));
      }),
  };
}
