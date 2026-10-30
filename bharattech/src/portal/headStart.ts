/**
 * Starts loading something before it is asked for (a pointer resting on View) and hands that same load over when it
 * is, so the click doesn't start a second request. A head start is used once and only while it is fresh; a failed one
 * is dropped, so asking again tries again.
 */
export function headStart<T>(load: (key: string) => Promise<T>, keepMs = 30_000, now = Date.now) {
  const started = new Map<string, { at: number; promise: Promise<T> }>();
  const fresh = (key: string) => {
    const found = started.get(key);
    return found && now() - found.at < keepMs ? found : undefined;
  };
  return {
    warm(key: string) {
      if (fresh(key)) return;
      const promise = load(key);
      started.set(key, { at: now(), promise });
      promise.catch(() => started.get(key)?.promise === promise && started.delete(key));
    },
    take(key: string): Promise<T> {
      const found = fresh(key);
      started.delete(key);
      return found ? found.promise : load(key);
    },
  };
}
