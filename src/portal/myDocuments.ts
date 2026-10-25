import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, BUSY_MESSAGE } from './api';
import { SKIPPABLE_CHECKS, VERIFICATION_FILES, type FileKind, type SkippableCheck, type VerificationStatus } from './data';
import { localDay } from './eoffice';

/**
 * The signed-in employee's own verification (/api/verification-documents/mine): whether HR has asked, the files
 * they've uploaded (Aadhaar, PAN, education certificates, a previous employer's letter), and which checks are marked
 * not applicable. Only they and admins can open the files, so the files are fetched with the sign-in and shown in the
 * portal's PDF window, never as plain links.
 */

export interface MyDocument {
  kind: FileKind;
  fileName: string;
  size: number;
  /** The viewer's own calendar day it was uploaded. */
  uploaded: string;
}
export interface MyDocuments {
  /** Their latest employee verification: pending ones take uploads; null when HR hasn't asked. */
  request: { id: string; status: VerificationStatus } | null;
  documents: MyDocument[];
  /** `byYou`: their own "This is my first job", which only they take back; else HR marked it. */
  notApplicable: { check: SkippableCheck; byYou: boolean }[];
}

const KINDS = new Set<string>(VERIFICATION_FILES.map((d) => d.id));
const STATUSES: VerificationStatus[] = ['pending', 'verified', 'rejected'];
const str = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
export const isSkippable = (check: unknown): check is SkippableCheck => (SKIPPABLE_CHECKS as readonly unknown[]).includes(check);

/** One upload as the portal lists it; null when it's broken. Shared with the HR OPS desk (verifications.ts). */
export function toMyDocument(raw: unknown): MyDocument | null {
  if (!isRecord(raw) || !KINDS.has(String(raw.kind)) || !str(raw.fileName)) return null;
  const at = typeof raw.uploadedAt === 'string' ? Date.parse(raw.uploadedAt) : NaN;
  if (typeof raw.size !== 'number' || !Number.isFinite(raw.size) || Number.isNaN(at)) return null;
  return { kind: raw.kind as FileKind, fileName: str(raw.fileName), size: raw.size, uploaded: localDay(at) };
}
export const toMyDocumentList = (raw: unknown) => (Array.isArray(raw) ? raw.map(toMyDocument).filter((d): d is MyDocument => !!d) : []);

export function toMyDocuments(raw: unknown): MyDocuments {
  if (!isRecord(raw) || ('documents' in raw && !Array.isArray(raw.documents))) throw new ApiError('unavailable');
  const r = raw.request;
  const request = isRecord(r) && str(r.id) && STATUSES.includes(r.status as VerificationStatus) ? { id: str(r.id), status: r.status as VerificationStatus } : null;
  const notApplicable = (Array.isArray(raw.notApplicable) ? raw.notApplicable : []).flatMap((n) =>
    isRecord(n) && isSkippable(n.check) ? [{ check: n.check, byYou: n.byYou === true }] : [],
  );
  return { request, documents: toMyDocumentList(raw.documents), notApplicable };
}

/** What PUT /verification-documents/mine/:kind reads: one PDF in "file". */
export function documentForm(file: Blob & { name?: string }) {
  const form = new FormData();
  form.append('file', file, file.name ?? 'document.pdf');
  return form;
}

const FAILED: Record<ApiError['kind'], string> = {
  'signed-out': 'Your sign-in has ended. Sign out and sign in again, then try once more.',
  forbidden: 'Your role can’t do that.',
  'not-found': 'That file isn’t there any more.',
  conflict: 'Your verification changed a moment ago. The page has been refreshed.',
  'bad-request': 'That file wasn’t accepted.',
  busy: BUSY_MESSAGE,
  unavailable: 'We couldn’t reach the company system, so nothing was saved. Try again in a moment.',
};
const OWN_WORDS: ApiError['kind'][] = ['bad-request', 'conflict'];
export const myDocumentsFailedMessage = (e: ApiError) => (OWN_WORDS.includes(e.kind) && e.message !== e.kind ? e.message : FAILED[e.kind]);

export type MyDocumentsState = { kind: 'off' } | { kind: 'loading' } | { kind: 'ready'; mine: MyDocuments } | { kind: 'error'; error: ApiError };
const asApiError = (error: unknown) => (error instanceof ApiError ? error : new ApiError('unavailable'));

/** The card's data; `off` with the demo sign-in. `upload` throws an ApiError when the backend refuses. */
export function useMyDocuments() {
  const [state, setState] = useState<MyDocumentsState>(api ? { kind: 'loading' } : { kind: 'off' });
  const load = useCallback(async () => {
    if (!api) return;
    try {
      setState({ kind: 'ready', mine: toMyDocuments(await api.get<unknown>('/verification-documents/mine')) });
    } catch (error) {
      setState({ kind: 'error', error: asApiError(error) });
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  /** Sends one change; the answer is the whole card again. A clash reloads it so the page catches up. */
  const save = async (send: () => Promise<unknown>) => {
    try {
      setState({ kind: 'ready', mine: toMyDocuments(await send()) });
    } catch (error) {
      const e = asApiError(error);
      if (e.kind === 'conflict') void load();
      throw e;
    }
  };
  return {
    state,
    retry: () => void load(),
    upload: (kind: FileKind, file: File) => save(() => api!.putForm(`/verification-documents/mine/${kind}`, documentForm(file))),
    setFirstJob: (firstJob: boolean) => save(() => api!.put('/verification-documents/mine/first-job', { firstJob })),
    open: (kind: FileKind) => api!.getFile(`/verification-documents/mine/${kind}/file`),
  };
}
