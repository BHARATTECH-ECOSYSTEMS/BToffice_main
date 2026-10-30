import { api, type ApiError } from '../api';
import { ID_DOCS, ROLE_LABEL, type FileKind, type IdDocument, type SkippableCheck, type Verification, type VerificationKind, type VerificationStatus } from '../data';
import { usePeopleById, usePortal } from '../store';
import { canDeleteRequest, checkReady, useRemoteVerifications, type DirectoryLead, type NotApplicableMark, type RemoteVerification, type VerificationDraft } from '../verifications';

/**
 * Where the HR OPS desk gets one kind of request and sends what admins do: the demo's in-browser samples, or the
 * backend (verifications.ts) once the portal is connected. Connected, an employee request also has education
 * certificates, a previous employer's letter and "Not applicable"; the demo keeps Aadhaar and PAN only.
 */

/** One uploaded file as the desk lists it (the demo's own carry an in-tab `url`). */
export type Upload = Omit<IdDocument, 'kind'> & { kind: FileKind };
export interface VerificationSource {
  connected: boolean;
  status: { kind: 'ready' } | { kind: 'loading' } | { kind: 'error'; error: ApiError };
  retry: () => void;
  requests: Verification[];
  subjectOf: (v: Verification) => string;
  sublineOf: (v: Verification) => string;
  /** An employee request's person as they are now; undefined once they've gone. */
  personOf: (v: Verification) => { email: string; roleLabel: string; team: string } | undefined;
  /** Whether employees can upload their IDs (connected, and in the demo within this tab). */
  uploadsConnected: boolean;
  uploadsOf: (v: Verification) => Upload[];
  /** Connected: fetches an upload with the sign-in, for the PDF window (the backend logs the opening). The demo links straight to its in-tab file. */
  openUpload: ((v: Verification, kind: FileKind) => Promise<Blob>) | null;
  /** Connected: the checks marked not applicable (the demo has none). */
  notApplicableOf: (v: Verification) => NotApplicableMark[];
  /** Whether an employee check may be ticked: what it waits for is there, or it's marked not applicable. */
  checkReady: (v: Verification, check: string) => boolean;
  /** Connected only: marks Previous employment not applicable, with a reason. */
  markNotApplicable: ((id: string, check: SkippableCheck, reason: string) => Promise<void>) | null;
  /** The demo's 60-day rule: when the person left, and when their files were deleted. */
  leftOn: (v: Verification) => string | undefined;
  deletedOn: (v: Verification) => string | undefined;
  /** Connected, a decided request is the record and stays; the demo deletes any. */
  canDelete: (v: Verification) => boolean;
  /** An outside request: who in our directory it seems to be about (a lead, not a decision); null for no match. */
  leadOf: (v: Verification) => DirectoryLead | null;
  /** An outside request's answer: emailed to the requester (true), failed (false), or no email in the demo (undefined). */
  answerEmailed: (v: Verification) => boolean | undefined;
  /** These resolve when saved, and reject with an ApiError when the backend refuses. */
  open: (draft: VerificationDraft) => Promise<string>;
  setCheck: (id: string, check: string, done: boolean) => Promise<void>;
  /** Resolves with the request as it now is, when the backend sent it back. */
  decide: (id: string, status: VerificationStatus, note: string) => Promise<RemoteVerification | void>;
  remove: (id: string) => Promise<void>;
}

const READY = { kind: 'ready' } as const;

/** `enabled` is false for people who can't use HR OPS, so the page never asks the backend on their behalf. */
export function useVerificationSource(kind: VerificationKind, enabled: boolean): VerificationSource {
  const portal = usePortal();
  const byId = usePeopleById();
  const onBackend = !!api;
  const remote = useRemoteVerifications(kind, onBackend && enabled);

  if (onBackend) {
    const { state } = remote;
    const person = (v: Verification) => (v as RemoteVerification).person;
    return {
      connected: true,
      status: state.kind === 'ready' || state.kind === 'off' ? READY : state,
      retry: remote.retry,
      requests: state.kind === 'ready' ? state.requests : [],
      subjectOf: (v) => (v.kind === 'company' ? v.company : v.kind === 'employment' ? v.candidate : person(v)?.removed ? 'Removed user' : person(v)?.name || 'Removed user'),
      sublineOf: (v) => (v.kind === 'company' ? v.contactEmail : v.kind === 'employment' ? `For ${v.requesterCompany}` : person(v)?.removed ? '' : (person(v)?.email ?? '')),
      personOf: (v) => {
        const p = person(v);
        return p && !p.removed ? { email: p.email, roleLabel: p.roleLabel, team: p.team } : undefined;
      },
      uploadsConnected: true,
      uploadsOf: (v) =>
        v.kind === 'employee'
          ? ((v as RemoteVerification).documents ?? []).map((d) => ({ personId: v.personId, kind: d.kind, fileName: d.fileName, size: d.size, url: '', uploaded: d.uploaded }))
          : [],
      openUpload: (v, kind) => api!.getFile(`/verification-documents/${encodeURIComponent(v.id)}/${kind}/file`),
      notApplicableOf: (v) => (v as RemoteVerification).notApplicable ?? [],
      checkReady: (v, check) => v.kind !== 'employee' || checkReady(v as RemoteVerification, check),
      markNotApplicable: remote.markNotApplicable,
      leftOn: () => undefined,
      deletedOn: () => undefined,
      canDelete: canDeleteRequest,
      leadOf: (v) => (v as RemoteVerification).lead ?? null,
      answerEmailed: (v) => (v as RemoteVerification).answerEmailed === true,
      open: remote.open,
      setCheck: remote.setCheck,
      decide: remote.decide,
      remove: remote.remove,
    };
  }

  const { verifications, documents, deleted, alumni, requestVerification, setVerificationCheck, decideVerification, removeVerification } = portal;
  const personId = (v: Verification) => (v.kind === 'employee' ? v.personId : '');
  return {
    connected: false,
    status: READY,
    retry: () => {},
    requests: verifications.filter((v) => v.kind === kind),
    subjectOf: (v) => (v.kind === 'company' ? v.company : v.kind === 'employment' ? v.candidate : (byId.get(v.personId)?.name ?? 'Removed user')),
    sublineOf: (v) => (v.kind === 'company' ? v.contactEmail : v.kind === 'employment' ? `For ${v.requesterCompany}` : (byId.get(v.personId)?.email ?? '')),
    personOf: (v) => {
      const p = v.kind === 'employee' ? byId.get(v.personId) : undefined;
      return p ? { email: p.email, roleLabel: ROLE_LABEL[p.role], team: p.team } : undefined;
    },
    uploadsConnected: true,
    uploadsOf: (v) => (v.kind === 'employee' ? documents.filter((d) => d.personId === v.personId) : []),
    openUpload: null,
    notApplicableOf: () => [],
    // the demo's only rule: an ID waits for its upload
    checkReady: (v, check) => !ID_DOCS.some((d) => d.id === check) || documents.some((d) => d.personId === personId(v) && d.kind === check),
    markNotApplicable: null,
    leftOn: (v) => alumni.find((a) => a.id === personId(v))?.left,
    deletedOn: (v) => deleted[personId(v)],
    canDelete: () => true,
    // the demo's lead: the Employee ID they gave, else the same name, among the sample people
    leadOf: (v) => {
      if (v.kind !== 'employment') return null;
      const match = [...byId.values()].find((p) => (v.employeeId && p.id === v.employeeId.toUpperCase()) || p.name.toLowerCase() === v.candidate.toLowerCase());
      return match ? { name: match.name, employeeId: match.id, roleLabel: ROLE_LABEL[match.role], joinedOn: '', current: !alumni.some((a) => a.id === match.id) } : null;
    },
    answerEmailed: () => undefined,
    open: async (draft) => requestVerification(draft),
    setCheck: async (id, check, done) => setVerificationCheck(id, check, done),
    decide: async (id, status, note) => decideVerification(id, status, note),
    remove: async (id) => removeVerification(id),
  };
}
