import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type createApi } from './api';
import type { PersonRole, PolicyCategory } from './data';
import { readAccountRole, roleBadge, roleLabel } from './people';
import { afterReel } from './reel';

/**
 * Policy and compliance documents from the backend (/api/policies): the list with who accepted what, uploading and
 * deleting (admins and superadmins), accepting, and opening the PDF, which the backend keeps in its database.
 */

const CATEGORY_LABEL: Record<PolicyCategory, string> = { policy: 'Policy', compliance: 'Compliance' };
// the company app files new documents as "Policies"/"Compliances"; older ones say "Policy PDF"/"Compliance PDF"
const CATEGORY_OF: Record<string, PolicyCategory> = { policies: 'policy', 'policy pdf': 'policy', policy: 'policy', compliances: 'compliance', 'compliance pdf': 'compliance', compliance: 'compliance' };

export const categoryValue = (category: PolicyCategory) => (category === 'policy' ? 'Policies' : 'Compliances');

export interface Acceptance {
  personId: string;
  name: string;
  email: string;
  role: PersonRole;
  roleLabel: string;
  /** yyyy-mm-dd */
  acceptedAt: string;
}

export interface PolicyDocument {
  id: string;
  name: string;
  /** Unset for a category the website doesn't know; `categoryLabel` then shows the backend's own word. */
  category?: PolicyCategory;
  categoryLabel: string;
  pages: number;
  fileName: string;
  /** yyyy-mm-dd */
  uploadedAt: string;
  acceptedByMe: boolean;
  /** Everyone's for admins; just the signed-in person's own for everyone else. */
  acceptances: Acceptance[];
}

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);
const record = (value: unknown) => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined);
const day = (value: unknown) => {
  const date = new Date(typeof value === 'string' ? value : NaN);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export function toPolicies(raw: unknown): PolicyDocument[] {
  if (!Array.isArray(raw)) throw new ApiError('unavailable', 'The backend’s answer isn’t a list of documents.');
  const rows: PolicyDocument[] = [];
  for (const entry of raw) {
    const p = record(entry);
    const id = text(p?._id);
    if (!p || !id) continue;
    const rawCategory = text(p.category) ?? '';
    const category = CATEGORY_OF[rawCategory.toLowerCase()];
    const acceptances: Acceptance[] = [];
    for (const a of Array.isArray(p.acceptedBy) ? p.acceptedBy : []) {
      const acceptance = record(a);
      const personId = text(acceptance?.userId);
      if (!acceptance || !personId) continue;
      const accountRole = readAccountRole(acceptance.role);
      acceptances.push({
        personId,
        name: text(acceptance.fullName) ?? text(acceptance.username) ?? text(acceptance.email) ?? 'Unknown',
        email: text(acceptance.email) ?? '',
        role: roleBadge(accountRole),
        roleLabel: roleLabel(accountRole),
        acceptedAt: day(acceptance.acceptedAt),
      });
    }
    rows.push({
      id,
      name: text(p.name) ?? 'Untitled document',
      category,
      categoryLabel: category ? CATEGORY_LABEL[category] : rawCategory || 'Other',
      pages: typeof p.pages === 'number' ? p.pages : Number(p.pages) || 0,
      fileName: text(p.pdfName) ?? 'document.pdf',
      uploadedAt: day(p.createdAt),
      acceptedByMe: p.userAccepted === true,
      acceptances,
    });
  }
  return rows;
}

export type PoliciesState = { kind: 'off' } | { kind: 'loading' } | { kind: 'ready'; documents: PolicyDocument[] } | { kind: 'error'; error: ApiError };

const asApiError = (error: unknown) => (error instanceof ApiError ? error : new ApiError('unavailable'));

// a 20 MB PDF on a slow connection needs longer than the usual limit
const UPLOAD_TIMEOUT_MS = 120_000;

export function usePolicies() {
  const [state, setState] = useState<PoliciesState>(api ? { kind: 'loading' } : { kind: 'off' });

  const load = useCallback(async (quiet = false) => {
    if (!api) return;
    if (!quiet) setState({ kind: 'loading' });
    try {
      setState({ kind: 'ready', documents: toPolicies(await api.get<unknown>('/policies')) });
    } catch (error) {
      setState({ kind: 'error', error: asApiError(error) });
    }
  }, []);

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
    upload: ({ name, pages, category, file }: { name: string; pages: number; category: PolicyCategory; file: File }) => {
      const form = new FormData();
      form.append('name', name);
      form.append('pages', String(pages));
      form.append('category', categoryValue(category));
      form.append('pdf', file, file.name);
      return act(() => api!.postForm('/policies', form, { timeoutMs: UPLOAD_TIMEOUT_MS }));
    },
    accept: (id: string) => act(() => policyCalls(api!).accept(id)),
    remove: (id: string, played?: Promise<unknown>) => act(() => afterReel(api!.del(`/policies/${id}`), played)),
    openPdf: async (id: string) => {
      try {
        return await api!.getFile(`/policies/${id}/pdf`);
      } catch (error) {
        throw asApiError(error);
      }
    },
  };
}

/** The tick the backend requires before it records an acceptance (controllers/policyController.js acceptPolicy). */
export const READ_CONFIRMATION = 'I have read and understood this policy';

export function policyCalls(client: ReturnType<typeof createApi>) {
  return {
    /** Accepts a document with the person's tick; only offered once they have ticked it. */
    accept: async (id: string) => void (await client.post(`/policies/${encodeURIComponent(id)}/accept`, { readConfirmed: true })),
  };
}
