import { useSyncExternalStore } from 'react';

/**
 * Light or dark. People pick Light, Dark or Auto (follow the device) with the switch in the top bars or in portal
 * Settings; the pick is remembered in this browser only. Services and Research are always dark: a night journey
 * and a glowing swarm. The first-paint script in index.html applies the same rule before any of this loads, and
 * tests/site/theme.test.ts keeps the two in step.
 */
export type ThemeChoice = 'light' | 'dark' | 'auto';
export type Theme = 'light' | 'dark';

export const THEME_KEY = 'bt-theme';
export const THEME_CHOICES: ThemeChoice[] = ['auto', 'light', 'dark'];
export const THEME_LABEL: Record<ThemeChoice, string> = { auto: 'Auto', light: 'Light', dark: 'Dark' };
// the device's own setting, which Auto follows
const DEVICE_DARK = '(prefers-color-scheme: dark)';

const ALWAYS_DARK = new Set(['/services', '/research']);

export function readThemeChoice(storage: Pick<Storage, 'getItem'> | null): ThemeChoice {
  try {
    const saved = storage?.getItem(THEME_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'auto';
  } catch {
    // storage can be blocked (private windows, site data off): the device decides
    return 'auto';
  }
}

export function resolveTheme({ choice, systemDark, pathname, search = '', hash = '' }: { choice: ThemeChoice; systemDark: boolean; pathname: string; search?: string; hash?: string }): Theme {
  // ?theme=dark, #/?theme=dark and /dark are older links that still open the dark site
  const linkedDark = new URLSearchParams(search).get('theme') === 'dark' || hash.includes('theme=dark') || hash.includes('/dark') || pathname.startsWith('/dark');
  if (ALWAYS_DARK.has(pathname) || linkedDark) return 'dark';
  if (choice === 'auto') return systemDark ? 'dark' : 'light';
  return choice;
}

/** The top-bar button's next step: Auto → Light → Dark → Auto. */
export const nextThemeChoice = (choice: ThemeChoice) => THEME_CHOICES[(THEME_CHOICES.indexOf(choice) + 1) % THEME_CHOICES.length];

type DeviceSetting = { matches: boolean; addEventListener(type: 'change', fn: () => void): void };
export type ThemeState = { choice: ThemeChoice; systemDark: boolean };

/** The current choice plus the device's setting, shared by everything that shows or changes the theme. */
export function createThemeStore({ storage, media }: { storage: Pick<Storage, 'getItem' | 'setItem'> | null; media: DeviceSetting | null }) {
  let state: ThemeState = { choice: readThemeChoice(storage), systemDark: !!media?.matches };
  const listeners = new Set<() => void>();
  const update = (next: ThemeState) => {
    if (next.choice === state.choice && next.systemDark === state.systemDark) return;
    // a new object only on a real change: React re-renders whenever the snapshot is a different object
    state = next;
    listeners.forEach((fn) => fn());
  };
  media?.addEventListener('change', () => update({ ...state, systemDark: media.matches }));
  return {
    get: () => state,
    set(choice: ThemeChoice) {
      try {
        storage?.setItem(THEME_KEY, choice);
      } catch {
        // not saved, but this visit still changes
      }
      update({ ...state, choice });
    },
    /** Re-reads the saved choice, after another tab changed it. */
    refresh: () => update({ ...state, choice: readThemeChoice(storage) }),
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
  };
}

const browser = typeof window !== 'undefined';
const store = createThemeStore({
  storage: browser ? (() => { try { return window.localStorage; } catch { return null; } })() : null,
  media: browser && typeof window.matchMedia === 'function' ? window.matchMedia(DEVICE_DARK) : null,
});
if (browser) window.addEventListener('storage', (e) => e.key === THEME_KEY && store.refresh());

export const setThemeChoice = store.set;
/** The choice and the device's setting, for whatever decides the page's theme. */
export const useThemeState = () => useSyncExternalStore(store.subscribe, store.get, store.get);

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
