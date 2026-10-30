import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createThemeStore, nextThemeChoice, readThemeChoice, resolveTheme, THEME_KEY, type ThemeChoice } from '../../src/theme';

// Roadmap step 20, Part 1 (owner's 1A 2A): a Light / Dark / Auto switch. Auto follows the device, the choice is
// remembered on this device, and Services and Research stay dark whatever is chosen.

const memory = (start: Record<string, string> = {}) => {
  const data = { ...start };
  return { data, getItem: (k: string) => (k in data ? data[k] : null), setItem: (k: string, v: string) => void (data[k] = v) };
};
const media = (matches: boolean) => {
  const listeners = new Set<() => void>();
  return {
    matches,
    addEventListener: (_: 'change', fn: () => void) => void listeners.add(fn),
    removeEventListener: (_: 'change', fn: () => void) => void listeners.delete(fn),
    flip(to: boolean) {
      this.matches = to;
      listeners.forEach((fn) => fn());
    },
  };
};

test('Auto follows the device; Light and Dark override it', () => {
  const at = (choice: ThemeChoice, systemDark: boolean) => resolveTheme({ choice, systemDark, pathname: '/about' });
  assert.equal(at('auto', true), 'dark');
  assert.equal(at('auto', false), 'light');
  assert.equal(at('light', true), 'light');
  assert.equal(at('dark', false), 'dark');
});

test('Services and Research stay dark whatever is chosen; their sub-pages follow the choice', () => {
  for (const pathname of ['/services', '/research']) assert.equal(resolveTheme({ choice: 'light', systemDark: false, pathname }), 'dark', pathname);
  assert.equal(resolveTheme({ choice: 'light', systemDark: false, pathname: '/services/deep-research' }), 'light');
  assert.equal(resolveTheme({ choice: 'light', systemDark: false, pathname: '/portal/settings' }), 'light');
});

test('the old dark links still work: ?theme=dark, #/dark and /dark', () => {
  const light = { choice: 'light' as const, systemDark: false, pathname: '/' };
  assert.equal(resolveTheme({ ...light, search: '?theme=dark' }), 'dark');
  assert.equal(resolveTheme({ ...light, hash: '#/?theme=dark' }), 'dark');
  assert.equal(resolveTheme({ ...light, pathname: '/dark' }), 'dark');
  assert.equal(resolveTheme({ ...light, search: '?theme=darkish' }), 'light');
});

// Low list, public site (2026-10-27): a trailing slash, and the real /dark address under the hash route "/"
test('Services and Research stay dark with a trailing slash too', () => {
  for (const pathname of ['/services/', '/research/']) assert.equal(resolveTheme({ choice: 'light', systemDark: false, pathname }), 'dark', pathname);
});

test('the real /dark address stays dark once the hash route is "/" (no dark first paint, then light)', () => {
  const light = { choice: 'light' as const, systemDark: false, pathname: '/' };
  assert.equal(resolveTheme({ ...light, path: '/dark' }), 'dark');
  assert.equal(resolveTheme({ ...light, path: '/' }), 'light');
});

test('a missing, unknown or unreadable saved choice means Auto', () => {
  assert.equal(readThemeChoice(memory()), 'auto');
  assert.equal(readThemeChoice(memory({ [THEME_KEY]: 'purple' })), 'auto');
  assert.equal(readThemeChoice(memory({ [THEME_KEY]: 'dark' })), 'dark');
  assert.equal(readThemeChoice(memory({ [THEME_KEY]: 'light' })), 'light');
  assert.equal(readThemeChoice(null), 'auto');
  assert.equal(readThemeChoice({ getItem: () => { throw new Error('blocked'); } }), 'auto');
});

test('the top-bar button steps Auto → Light → Dark → Auto', () => {
  assert.equal(nextThemeChoice('auto'), 'light');
  assert.equal(nextThemeChoice('light'), 'dark');
  assert.equal(nextThemeChoice('dark'), 'auto');
});

test('choosing saves on this device and tells every subscriber', () => {
  const storage = memory();
  const store = createThemeStore({ storage, media: media(false) });
  let told = 0;
  const off = store.subscribe(() => told++);
  store.set('dark');
  assert.equal(store.get().choice, 'dark');
  assert.equal(storage.data[THEME_KEY], 'dark');
  assert.equal(told, 1);
  off();
  store.set('light');
  assert.equal(told, 1, 'an unsubscribed listener was still told');
});

test('a choice still applies for this visit when the browser refuses to save it', () => {
  const store = createThemeStore({ storage: { getItem: () => null, setItem: () => { throw new Error('quota'); } }, media: media(false) });
  store.set('dark');
  assert.equal(store.get().choice, 'dark');
});

test('Auto changes with the device: a flip of the device setting reaches subscribers', () => {
  const device = media(false);
  const store = createThemeStore({ storage: memory(), media: device });
  let told = 0;
  store.subscribe(() => told++);
  device.flip(true);
  assert.equal(store.get().systemDark, true);
  assert.equal(told, 1);
});

test('a choice made in another tab is picked up', () => {
  const storage = memory();
  const store = createThemeStore({ storage, media: media(false) });
  let told = 0;
  store.subscribe(() => told++);
  storage.data[THEME_KEY] = 'dark';
  store.refresh();
  assert.equal(store.get().choice, 'dark');
  assert.equal(told, 1);
  store.refresh();
  assert.equal(told, 1, 'told about a change that did not happen');
});

test('the same snapshot object is returned until something changes (React re-renders on a new one)', () => {
  const store = createThemeStore({ storage: memory(), media: media(false) });
  assert.equal(store.get(), store.get());
  const before = store.get();
  store.set('dark');
  assert.notEqual(store.get(), before);
});

// The page's head sets the theme before the first paint, before any script of ours loads. It must reach the same
// answer as resolveTheme, or the page would flash one theme and then switch.
test('the first-paint script in index.html agrees with resolveTheme', () => {
  const html = readFileSync('index.html', 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, 'no inline script in index.html');
  const cases: { saved: string | null; systemDark: boolean; pathname: string; search: string; hash: string }[] = [];
  for (const saved of [null, 'light', 'dark', 'auto', 'purple'])
    for (const systemDark of [false, true])
      for (const [pathname, search, hash] of [['/', '', ''], ['/', '', '#/services'], ['/', '', '#/research'], ['/', '', '#/services/deep-research'], ['/', '', '#/services/'], ['/', '', '#/research/'], ['/dark', '', '#/'], ['/', '?theme=dark', '#/about'], ['/', '', '#/?theme=dark'], ['/', '', '#/portal/settings?tab=appearance'], ['/dark', '', '']])
        cases.push({ saved, systemDark, pathname, search, hash });
  for (const c of cases) {
    const attrs = new Map<string, string>();
    const classes = new Set<string>();
    const documentElement = { setAttribute: (k: string, v: string) => attrs.set(k, v), removeAttribute: (k: string) => attrs.delete(k), classList: { add: (k: string) => classes.add(k), remove: (k: string) => classes.delete(k) } };
    const window = { location: { search: c.search, hash: c.hash, pathname: c.pathname }, matchMedia: (q: string) => ({ matches: q.includes('dark') ? c.systemDark : false }) };
    runInNewContext(script, {
      window,
      location: window.location,
      matchMedia: window.matchMedia,
      URLSearchParams,
      document: { documentElement, createElement: () => ({ getContext: () => null }) },
      navigator: { hardwareConcurrency: 8, deviceMemory: 8 },
      localStorage: { getItem: (k: string) => (k === THEME_KEY ? c.saved : '0'), setItem: () => {} },
    });
    const route = c.hash.replace(/^#/, '').split('?')[0] || c.pathname;
    const expected = resolveTheme({ choice: readThemeChoice({ getItem: () => c.saved }), systemDark: c.systemDark, pathname: route, search: c.search, hash: c.hash, path: c.pathname });
    assert.equal(attrs.get('data-theme') === 'dark' ? 'dark' : 'light', expected, JSON.stringify(c));
  }
});

// Wiring: what the tests above can't reach without a browser. Each piece is checked in the real browser too.
const src = (f: string) => readFileSync(f, 'utf8');
test('both shells (site and portal) apply resolveTheme, and the phone browser bar follows the theme', () => {
  const hook = src('src/useApplyTheme.ts');
  assert.match(hook, /resolveTheme\(/);
  assert.match(hook, /theme-color/);
  for (const f of ['src/App.tsx', 'src/portal/PortalLayout.tsx']) assert.match(src(f), /useApplyTheme\(\)/, `${f} doesn't apply the theme`);
  // the old route-only rule is gone from App
  assert.doesNotMatch(src('src/App.tsx'), /pathname === '\/services' \|\| pathname === '\/research'/);
});

test('the page and the theme key both read the whole address: ?theme=dark and /dark, not only the route', () => {
  assert.match(src('src/useApplyTheme.ts'), /resolveTheme\(\{ choice, systemDark, pathname, \.\.\.pageAddress\(\) \}\)/);
  assert.match(src('src/components/ThemeSwitch.tsx'), /resolveTheme\(\{ choice: 'light', systemDark: false, pathname, \.\.\.pageAddress\(\) \}\)/);
});

test('the switch is in the site nav, the portal top bar and portal Settings', () => {
  assert.match(src('src/components/Nav.tsx'), /<ThemeButton\b/);
  assert.match(src('src/portal/PortalLayout.tsx'), /<ThemeButton\b/);
  const settings = src('src/portal/pages/Settings.tsx');
  assert.match(settings, /id: 'appearance'/);
  assert.match(settings, /<ThemeChoices\b/);
});

test('the 3D scenes that read the theme once are rebuilt when it changes', () => {
  for (const f of ['src/sections/Story.tsx', 'src/components/LogoGlass.tsx', 'src/components/OfficeMap.tsx']) {
    const code = src(f);
    assert.match(code, /useDocumentTheme\(\)/, `${f} doesn't follow the theme`);
    // the theme is in the dependencies of the effect that builds the scene
    assert.match(code, /\}, \[[^\]]*\btheme\b[^\]]*\]\);/, `${f}: the scene's effect doesn't depend on the theme`);
  }
});
