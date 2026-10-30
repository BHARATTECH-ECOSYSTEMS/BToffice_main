// long enough for a slow connection, short enough that a hung server shows an error instead of loading forever
export const TIMEOUT_MS = 20_000;

/**
 * `request` with a time limit on waiting for the answer: past it the request is stopped and fails the way an
 * unreachable server does, so every caller's "couldn't reach it" handling covers a hung one too.
 */
export function timed(request: typeof fetch, limitMs = TIMEOUT_MS): typeof fetch {
  return async (input, init = {}) => {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), limitMs);
    try {
      return await request(input, { ...init, signal: abort.signal });
    } finally {
      clearTimeout(timer);
    }
  };
}
