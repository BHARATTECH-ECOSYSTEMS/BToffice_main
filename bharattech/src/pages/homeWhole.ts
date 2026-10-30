import { useSyncExternalStore } from 'react';

/**
 * Whether the home page has built all its sections. On desktop it builds the ones below the opening story after its
 * first paint (Home.tsx), so code that looks those sections up by id waits for this before it does.
 */
export function createHomeWholeStore() {
  let whole = false;
  const listeners = new Set<() => void>();
  return {
    get: () => whole,
    set(next: boolean) {
      if (next === whole) return;
      whole = next;
      listeners.forEach((fn) => fn());
    },
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
  };
}

const store = createHomeWholeStore();

export const setHomeWhole = store.set;
export const useHomeWhole = () => useSyncExternalStore(store.subscribe, store.get, store.get);
