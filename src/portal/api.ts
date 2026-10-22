import { auth, authConfig } from './auth';

/**
 * Requests to the company backend, signed with the person's Keycloak token (src/portal/auth.ts). Every failure
 * becomes an ApiError whose `kind` tells a page what to show, so pages never deal with HTTP status codes.
 * `api` is null while the site runs with the demo sign-in.
 */

export type ApiErrorKind = 'signed-out' | 'forbidden' | 'not-found' | 'conflict' | 'bad-request' | 'unavailable';

export class ApiError extends Error {
  kind: ApiErrorKind;
  /** The backend's whole answer, when it sent one, for pages that need more than the kind. */
  details?: unknown;
  constructor(kind: ApiErrorKind, message?: string, details?: unknown) {
    super(message ?? kind);
    this.name = 'ApiError';
    this.kind = kind;
    this.details = details;
  }
}

const STATUS_KIND: Partial<Record<number, ApiErrorKind>> = { 400: 'bad-request', 401: 'signed-out', 403: 'forbidden', 404: 'not-found', 409: 'conflict' };

// long enough for a slow connection, short enough that a hung backend shows an error instead of loading forever
const TIMEOUT_MS = 20_000;

interface ApiOptions {
  /** The API root, e.g. http://localhost:5000/api */
  base: string;
  token: () => Promise<string | null>;
  signedIn: () => boolean;
  request?: typeof fetch;
  timeoutMs?: number;
}

export function createApi({ base, token, signedIn, request = (input, init) => fetch(input, init), timeoutMs = TIMEOUT_MS }: ApiOptions) {
  async function send<T>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, payload?: unknown, limitMs = timeoutMs): Promise<T> {
    const access = await token();
    // still signed in but no token means Keycloak couldn't renew it just now
    if (!access) throw new ApiError(signedIn() ? 'unavailable' : 'signed-out');
    const headers: Record<string, string> = { Authorization: `Bearer ${access}`, Accept: 'application/json' };
    if (payload !== undefined) headers['Content-Type'] = 'application/json';
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), limitMs);
    let res: Response;
    let body: { message?: unknown } | undefined;
    try {
      res = await request(`${base}${path}`, {
        method,
        headers,
        body: payload === undefined ? undefined : JSON.stringify(payload),
        signal: abort.signal,
      });
      body = await res.json().catch(() => undefined);
    } catch {
      throw new ApiError('unavailable');
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw new ApiError(STATUS_KIND[res.status] ?? 'unavailable', typeof body?.message === 'string' ? body.message : undefined, body);
    // a 200 that isn't JSON (a proxy's error page, say) is as good as no answer
    if (body === undefined) throw new ApiError('unavailable');
    return body as T;
  }

  return {
    get: <T>(path: string) => send<T>('GET', path),
    /** `timeoutMs` gives a slow request (one that sends an email, say) longer than the usual limit. */
    post: <T>(path: string, record: object, { timeoutMs: limitMs }: { timeoutMs?: number } = {}) => send<T>('POST', path, record, limitMs),
    patch: <T>(path: string, changes: object) => send<T>('PATCH', path, changes),
    del: <T>(path: string) => send<T>('DELETE', path),
  };
}

export const api = auth && authConfig ? createApi({ base: authConfig.api, token: auth.accessToken, signedIn: auth.signedIn }) : null;

/** The API root that relative backend addresses (uploaded photos) are resolved against. */
export const apiBase = authConfig?.api;
