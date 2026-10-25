import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from './api';
import { CERTIFICATE_TYPES, type CertificateType } from './data';

/**
 * Certificates from the backend (/api/certificates): everyone's for admins and superadmins, or the signed-in person's
 * own, plus issuing, deleting and opening the PDF. The backend builds the PDF fresh each time it's opened.
 */

/** The backend stores a certificate's type as its title; the website's names are the same words. */
export const certificateTitle = (type: CertificateType) => CERTIFICATE_TYPES.find((t) => t.id === type)!.name;
const typeOfTitle = (title: string) => CERTIFICATE_TYPES.find((t) => t.name === title)?.id;

export interface IssuedCertificate {
  id: string;
  number: string;
  title: string;
  /** Unset for a title the website doesn't know. */
  type?: CertificateType;
  /** Unset when the person was removed. */
  recipient?: { id: string; name: string; email: string };
  issuedBy?: string;
  /** The day it was issued, yyyy-mm-dd in this browser's time zone. */
  issuedAt: string;
}

/** Whether a search (any case) finds this certificate: its title, person, their email, issuer or number. */
export function matchesCertificate(c: IssuedCertificate, search: string) {
  const query = search.trim().toLowerCase();
  return !query || [c.title, c.recipient?.name ?? '', c.recipient?.email ?? '', c.issuedBy ?? '', c.number].some((v) => v.toLowerCase().includes(query));
}

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);
const record = (value: unknown) => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined);
const day = (value: unknown) => {
  const date = new Date(typeof value === 'string' ? value : NaN);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/** Reads GET /api/certificates (a list) or GET /api/certificates/my ({ count, certificates }). */
export function toCertificates(raw: unknown): IssuedCertificate[] {
  const list = Array.isArray(raw) ? raw : record(raw)?.certificates;
  if (!Array.isArray(list)) throw new ApiError('unavailable', 'The backend’s answer isn’t a list of certificates.');
  const rows: IssuedCertificate[] = [];
  for (const entry of list) {
    const c = record(entry);
    const id = text(c?._id);
    if (!c || !id) continue;
    const title = text(c.title) ?? 'Certificate';
    const person = record(c.userId);
    const personId = text(person?._id);
    rows.push({
      id,
      number: text(c.certificateNumber) ?? '',
      title,
      type: typeOfTitle(title),
      recipient: person && personId ? { id: personId, name: text(person.fullName) ?? text(person.email) ?? 'Unknown', email: text(person.email) ?? '' } : undefined,
      issuedBy: text(record(c.issuedBy)?.fullName) ?? text(record(c.issuedBy)?.email),
      issuedAt: day(c.issuedAt ?? c.createdAt),
    });
  }
  return rows;
}

export type CertificatesState = { kind: 'off' } | { kind: 'loading' } | { kind: 'ready'; certificates: IssuedCertificate[] } | { kind: 'error'; error: ApiError };

const asApiError = (error: unknown) => (error instanceof ApiError ? error : new ApiError('unavailable'));

// making the PDF and saving the record can take a moment on a slow server
const ISSUE_TIMEOUT_MS = 60_000;

/** `all`: every certificate (admins and superadmins); `mine`: the signed-in person's own. */
export function useCertificates(scope: 'all' | 'mine') {
  const [state, setState] = useState<CertificatesState>(api ? { kind: 'loading' } : { kind: 'off' });

  const load = useCallback(
    async (quiet = false) => {
      if (!api) return;
      if (!quiet) setState({ kind: 'loading' });
      try {
        setState({ kind: 'ready', certificates: toCertificates(await api.get<unknown>(scope === 'all' ? '/certificates' : '/certificates/my')) });
      } catch (error) {
        setState({ kind: 'error', error: asApiError(error) });
      }
    },
    [scope],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const act = useCallback(
    async (change: () => Promise<unknown>) => {
      try {
        await change();
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
    issue: (personId: string, type: CertificateType) =>
      act(() => api!.post('/certificates/generate', { userId: personId, title: certificateTitle(type) }, { timeoutMs: ISSUE_TIMEOUT_MS })),
    remove: (id: string) => act(() => api!.del(`/certificates/${id}`)),
    openPdf: async (id: string) => {
      try {
        return await api!.getFile(`/certificates/${id}/pdf`);
      } catch (error) {
        throw asApiError(error);
      }
    },
  };
}
