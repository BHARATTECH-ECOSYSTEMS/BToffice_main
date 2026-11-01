import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { isDaytime, msUntilThemeChange, resolveTheme } from '../../src/theme';

// Owner, 2026-11-01: "remove the dark mode button; from 6 am to 6 pm light mode, after that dark mode" (the whole
// site and the portal; Services and Research stay dark). Replaces roadmap step 20's Light / Dark / Auto switch.

const at = (h: number, m = 0) => new Date(2026, 10, 1, h, m, 0, 0);

test('light from 6:00 until 18:00 on the visitor’s own clock, dark the rest of the day', () => {
  assert.equal(isDaytime(at(5, 59)), false);
  assert.equal(isDaytime(at(6, 0)), true);
  assert.equal(isDaytime(at(12, 0)), true);
  assert.equal(isDaytime(at(17, 59)), true);
  assert.equal(isDaytime(at(18, 0)), false);
  assert.equal(isDaytime(at(0, 0)), false);
  assert.equal(resolveTheme({ day: true, pathname: '/about' }), 'light');
  assert.equal(resolveTheme({ day: false, pathname: '/about' }), 'dark');
  assert.equal(resolveTheme({ day: true, pathname: '/portal/settings' }), 'light');
});

test('the page changes over exactly at 6:00 and 18:00, even when it stays open', () => {
  assert.equal(msUntilThemeChange(at(5, 59)), 60_000);
  assert.equal(msUntilThemeChange(at(6, 0)), 12 * 3_600_000);
  assert.equal(msUntilThemeChange(at(17, 30)), 30 * 60_000);
  assert.equal(msUntilThemeChange(at(18, 0)), 12 * 3_600_000);
  assert.equal(msUntilThemeChange(at(23, 0)), 7 * 3_600_000, 'from night, the next change is 6:00 tomorrow');
});

test('Services and Research stay dark all day; their sub-pages follow the clock', () => {
  for (const pathname of ['/services', '/research', '/services/', '/research/']) assert.equal(resolveTheme({ day: true, pathname }), 'dark', pathname);
  assert.equal(resolveTheme({ day: true, pathname: '/services/deep-research' }), 'light');
});

test('the old dark links still open the dark site in the daytime: ?theme=dark, #/dark and /dark', () => {
  const noon = { day: true, pathname: '/' };
  assert.equal(resolveTheme({ ...noon, search: '?theme=dark' }), 'dark');
  assert.equal(resolveTheme({ ...noon, hash: '#/?theme=dark' }), 'dark');
  assert.equal(resolveTheme({ ...noon, pathname: '/dark' }), 'dark');
  assert.equal(resolveTheme({ ...noon, path: '/dark' }), 'dark');
  assert.equal(resolveTheme({ ...noon, search: '?theme=darkish' }), 'light');
  assert.equal(resolveTheme({ ...noon, path: '/' }), 'light');
});

// The page's head sets the theme before the first paint, before any script of ours loads. It must reach the same
// answer as resolveTheme, or the page would flash one theme and then switch.
test('the first-paint script in index.html agrees with resolveTheme at every hour', () => {
  const html = readFileSync('index.html', 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, 'no inline script in index.html');
  assert.doesNotMatch(script, /bt-theme/, 'an old saved choice must not decide the theme any more');
  const addresses = [['/', '', ''], ['/', '', '#/services'], ['/', '', '#/research'], ['/', '', '#/services/deep-research'], ['/', '', '#/services/'], ['/', '', '#/research/'], ['/dark', '', '#/'], ['/', '?theme=dark', '#/about'], ['/', '', '#/?theme=dark'], ['/', '', '#/portal/settings?tab=profile'], ['/dark', '', '']];
  for (let hour = 0; hour < 24; hour++)
    for (const minute of [0, 59])
      for (const [pathname, search, hash] of addresses) {
        const attrs = new Map<string, string>();
        const documentElement = { setAttribute: (k: string, v: string) => attrs.set(k, v), removeAttribute: (k: string) => attrs.delete(k), classList: { add: () => {}, remove: () => {} } };
        const window = { location: { search, hash, pathname }, matchMedia: () => ({ matches: false }) };
        const FixedDate = class extends Date {
          constructor() {
            super(2026, 10, 1, hour, minute);
          }
        };
        runInNewContext(script, {
          window,
          location: window.location,
          matchMedia: window.matchMedia,
          URLSearchParams,
          Date: FixedDate,
          document: { documentElement, createElement: () => ({ getContext: () => null }) },
          navigator: { hardwareConcurrency: 8, deviceMemory: 8 },
          localStorage: { getItem: () => '0', setItem: () => {} },
        });
        const route = hash.replace(/^#/, '').split('?')[0] || pathname;
        const expected = resolveTheme({ day: isDaytime(at(hour, minute)), pathname: route, search, hash, path: pathname });
        assert.equal(attrs.get('data-theme') === 'dark' ? 'dark' : 'light', expected, JSON.stringify({ hour, minute, pathname, search, hash }));
      }
});

// Wiring: what the tests above can't reach without a browser. Each piece is checked in the real browser too.
const src = (f: string) => readFileSync(f, 'utf8');
test('both shells (site and portal) apply the clock rule, and the phone browser bar follows the theme', () => {
  const hook = src('src/useApplyTheme.ts');
  assert.match(hook, /resolveTheme\(\{ day, pathname, \.\.\.pageAddress\(\) \}\)/);
  assert.match(hook, /useDaytime\(\)/);
  assert.match(hook, /theme-color/);
  for (const f of ['src/App.tsx', 'src/portal/PortalLayout.tsx']) assert.match(src(f), /useApplyTheme\(\)/, `${f} doesn't apply the theme`);
});

test('there is no theme button or theme choice anywhere any more', () => {
  assert.equal(existsSync('src/components/ThemeSwitch.tsx'), false);
  for (const f of ['src/components/Nav.tsx', 'src/portal/PortalLayout.tsx', 'src/portal/pages/Settings.tsx']) {
    const code = src(f);
    assert.doesNotMatch(code, /ThemeButton|ThemeChoices|ThemeSwitch/, f);
  }
  assert.doesNotMatch(src('src/portal/pages/Settings.tsx'), /id: 'appearance'/);
});

test('the 3D scenes that read the theme once are rebuilt when it changes', () => {
  for (const f of ['src/sections/Story.tsx', 'src/components/LogoGlass.tsx', 'src/components/OfficeMap.tsx']) {
    const code = src(f);
    assert.match(code, /useDocumentTheme\(\)/, `${f} doesn't follow the theme`);
    // the theme is in the dependencies of the effect that builds the scene
    assert.match(code, /\}, \[[^\]]*\btheme\b[^\]]*\]\);/, `${f}: the scene's effect doesn't depend on the theme`);
  }
});
