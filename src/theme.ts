import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';
const KEY = 'origin-theme';
const listeners = new Set<(t: Theme) => void>();

function read(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    /* storage unavailable */
  }
  return 'light';
}

let current: Theme = typeof window === 'undefined' ? 'light' : read();
if (typeof document !== 'undefined') document.documentElement.dataset.theme = current;

export const getTheme = () => current;

export function setTheme(t: Theme) {
  current = t;
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#07070C' : '#F6F6F9');
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* not persisted; still applied for this visit */
  }
  listeners.forEach((fn) => fn(t));
}

export function onTheme(fn: (t: Theme) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useTheme() {
  const [t, setT] = useState<Theme>(current);
  useEffect(() => onTheme(setT), []);
  return [t, () => setTheme(t === 'dark' ? 'light' : 'dark')] as const;
}
