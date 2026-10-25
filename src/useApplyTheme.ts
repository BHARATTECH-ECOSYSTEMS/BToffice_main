import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router';
import { resolveTheme, useThemeState } from './theme';

// the phone browser's own bar takes the page's colour (light: the value index.html starts with)
const BROWSER_BAR = { light: '#FBF6EF', dark: '#0A0910' };

/**
 * Puts the page in the theme its route and the person's choice call for (src/theme.ts). The site's shell and the
 * portal's shell both run it, so the portal no longer keeps whatever theme the last site page left behind.
 */
export function useApplyTheme() {
  const { pathname } = useLocation();
  const { choice, systemDark } = useThemeState();
  // A layout effect, so the theme is right before any page's effects run: the hero's 3D scene reads it when built.
  useLayoutEffect(() => {
    const theme = resolveTheme({ choice, systemDark, pathname, search: window.location.search, hash: window.location.hash });
    const dark = theme === 'dark';
    const root = document.documentElement;
    if (dark) root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    // index.html's first-paint script also marks <html>; some code reads that class, so it follows too
    root.classList.toggle('dark', dark);
    document.body.classList.toggle('dark', dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BROWSER_BAR[theme]);
  }, [pathname, choice, systemDark]);
}
