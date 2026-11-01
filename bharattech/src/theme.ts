import { useSyncExternalStore } from 'react';

/**
 * Light or dark, by the clock: light from 6:00 until 18:00 on the visitor's own clock, dark the rest of the day, for
 * the site and the portal alike. There is no switch. Services and Research are always dark: a night journey and a
 * glowing swarm. The first-paint script in index.html applies the same rule before any of this loads, and
 * tests/site/theme.test.ts keeps the two in step.
 */
export type Theme = 'light' | 'dark';

/** The hours the day runs from and until, on a 24-hour clock. */
const DAY_FROM = 6;
const DAY_UNTIL = 18;

const ALWAYS_DARK = new Set(['/services', '/research']);

export const isDaytime = (now: Date) => now.getHours() >= DAY_FROM && now.getHours() < DAY_UNTIL;

/** How long until the next 6:00 or 18:00, so an open page changes over on time. */
export function msUntilThemeChange(now: Date) {
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  const hour = now.getHours();
  if (hour < DAY_FROM) next.setHours(DAY_FROM);
  else if (hour < DAY_UNTIL) next.setHours(DAY_UNTIL);
  else next.setHours(24 + DAY_FROM);
  return next.getTime() - now.getTime();
}

/**
 * `pathname` is the page's route (after the #); `path`, `search` and `hash` are the whole address, which only the
 * old dark links use.
 */
export function resolveTheme({ day, pathname, search = '', hash = '', path = '' }: { day: boolean; pathname: string; search?: string; hash?: string; path?: string }): Theme {
  // ?theme=dark, #/?theme=dark and /dark are older links that still open the dark site
  const linkedDark = new URLSearchParams(search).get('theme') === 'dark' || hash.includes('theme=dark') || hash.includes('/dark') || pathname.startsWith('/dark') || path.startsWith('/dark');
  if (ALWAYS_DARK.has(pathname.replace(/\/+$/, '')) || linkedDark) return 'dark';
  return day ? 'light' : 'dark';
}

/** The parts of the address resolveTheme reads besides the route. */
export const pageAddress = () => ({ search: window.location.search, hash: window.location.hash, path: window.location.pathname });

/**
 * Whether it is day now, re-checked at the next 6:00 or 18:00 and whenever the tab comes back into view (a laptop
 * that slept through the change has timers that never fired).
 */
function watchDaytime(fn: () => void) {
  let timer = 0;
  const arm = () => {
    window.clearTimeout(timer);
    // a second late, so the clock has certainly passed the hour when the page looks again
    timer = window.setTimeout(() => (fn(), arm()), msUntilThemeChange(new Date()) + 1000);
  };
  const onVisible = () => {
    if (document.visibilityState !== 'visible') return;
    fn();
    arm();
  };
  arm();
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    window.clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
const readDaytime = () => isDaytime(new Date());
/** Whether it is day (light) or night (dark) right now, kept current while the page is open. */
export const useDaytime = () => useSyncExternalStore(watchDaytime, readDaytime, () => true);

const readDocumentTheme = (): Theme => (document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
function watchDocumentTheme(fn: () => void) {
  const mo = new MutationObserver(fn);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => mo.disconnect();
}
/**
 * The theme the page shows right now. For 3D scenes that read the theme once when built: put this in the effect's
 * dependencies and the scene is rebuilt in the new theme.
 */
export const useDocumentTheme = () => useSyncExternalStore(watchDocumentTheme, readDocumentTheme, () => 'light' as Theme);
