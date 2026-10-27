import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from './api';
import type { LinkResource } from './data';
import { afterReel } from './reel';

/**
 * Shared links from the backend (/api/resources). Admins and superadmins see and manage every link; everyone else sees
 * the links assigned to them plus the ones assigned to nobody. The tool cards are not part of this: they live in data.ts.
 */

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);
const record = (value: unknown) => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined);

/** Reads GET /api/resources. `assignedTo` holds ids, or person records when the backend fills them in. */
export function toResources(raw: unknown): LinkResource[] {
  if (!Array.isArray(raw)) throw new ApiError('unavailable', 'The backend’s answer isn’t a list of resources.');
  const rows: LinkResource[] = [];
  for (const entry of raw) {
    const r = record(entry);
    const id = text(r?._id);
    const url = text(r?.link);
    // one broken record shouldn't take the whole page down
    if (!r || !id || !url) continue;
    const assigned = Array.isArray(r.assignedTo) ? r.assignedTo : [];
    rows.push({
      id,
      name: text(r.title) ?? url,
      url,
      assignedTo: assigned.map((a) => text(a) ?? text(record(a)?._id)).filter((a): a is string => !!a),
    });
  }
  return rows;
}

/**
 * Links saved before the backend checked them can hold any address; a javascript: or data: one would run code when
 * opened, so the page only offers Open for http and https.
 */
export function isWebLink(url: string) {
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

/** Who can see a link, for admins: the backend shows a link assigned to nobody to everyone. */
export function audience(assignedTo: string[], nameOf: (id: string) => string | undefined) {
  if (!assignedTo.length) return 'Everyone can see this';
  const names = assignedTo.map((id) => nameOf(id) ?? 'a removed account');
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `Only ${list} can see this`;
}

export type ResourcesState = { kind: 'off' } | { kind: 'loading' } | { kind: 'ready'; links: LinkResource[] } | { kind: 'error'; error: ApiError };

const asApiError = (error: unknown) => (error instanceof ApiError ? error : new ApiError('unavailable'));

/**
 * Loads the links; `off` with the demo sign-in. Each action saves to the backend, then loads the list again so the page
 * shows what the backend actually stored. They throw an ApiError when the backend refuses.
 */
export function useResources() {
  const [state, setState] = useState<ResourcesState>(api ? { kind: 'loading' } : { kind: 'off' });

  // `quiet` keeps the current list on screen while it reloads after a change
  const load = useCallback(async (quiet = false) => {
    if (!api) return;
    if (!quiet) setState({ kind: 'loading' });
    try {
      setState({ kind: 'ready', links: toResources(await api.get<unknown>('/resources')) });
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
    add: (name: string, url: string) => act(() => api!.post('/resources', { title: name, link: url })),
    assign: (id: string, personId: string) => act(() => api!.post(`/resources/${id}/assign`, { userId: personId })),
    unassign: (id: string, personId: string) => act(() => api!.del(`/resources/${id}/assign/${personId}`)),
    remove: (id: string, played?: Promise<unknown>) => act(() => afterReel(api!.del(`/resources/delete/${id}`), played)),
  };
}
