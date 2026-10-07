import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';
const listeners = new Set<(t: Theme) => void>();

const getForcedTheme = (): Theme | null => {
  if (typeof window === 'undefined') return null;
  const requested = new URLSearchParams(window.location.search).get('theme');
  return requested === 'light' || requested === 'dark' ? requested : null;
};

/**
 * Resolves the theme based on the user's local time:
 * - 6:00 AM (06:00) to 6:00 PM (18:00): Light Mode
 * - 6:00 PM (18:00) to 6:00 AM (06:00): Dark Mode
 */
export function getScheduledTheme(): Theme {
  const forced = getForcedTheme();
  if (forced) return forced;
  const hours = new Date().getHours();
  return hours >= 6 && hours < 18 ? 'light' : 'dark';
}
let current: Theme = typeof window === 'undefined' ? 'light' : getScheduledTheme();

if (typeof document !== 'undefined') {
  document.documentElement.dataset.theme = current;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', current === 'dark' ? '#0C0B10' : '#F7F2EA');
}

export const getTheme = () => current;

export function setTheme(t: Theme) {
  if (current === t && document.documentElement.dataset.theme === t) return;
  current = t;
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = t;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#0C0B10' : '#F7F2EA');
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

// Automatically sync theme according to the 6 AM / 6 PM schedule
if (typeof window !== 'undefined') {
  const syncTheme = () => {
    if (getForcedTheme()) return;
    const scheduled = getScheduledTheme();
    if (scheduled !== current) {
      setTheme(scheduled);
    }
  };
  // Check every 30 seconds
  setInterval(syncTheme, 30000);
  window.addEventListener('focus', syncTheme);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) syncTheme();
  });
}
