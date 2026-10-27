import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { studioBusy } from '../../src/gl/idlePace';
import { createAuth, type AuthConfig } from '../../src/portal/auth';

// Low list, public site (2026-10-27): the 3D scenes and the top bar's sign-in state.

const read = (path: string) => readFileSync(new URL(`../../src/${path}`, import.meta.url), 'utf8');

test('the Studio hero rests once formed; with reduced motion too, whose clock stands still', () => {
  const formed = { revealing: false, settling: false };
  assert.equal(studioBusy({ ...formed, sinceFormed: 0.5, reduced: false }), true, 'the first hop should draw every frame');
  assert.equal(studioBusy({ ...formed, sinceFormed: 2.5, reduced: false }), false);
  // reduced motion: no hop, and the scene's clock never moves past the moment it formed
  assert.equal(studioBusy({ ...formed, sinceFormed: 0, reduced: true }), false);
  assert.equal(studioBusy({ revealing: true, settling: false, sinceFormed: null, reduced: true }), true);
  assert.equal(studioBusy({ revealing: false, settling: true, sinceFormed: 0, reduced: true }), true);
  assert.match(read('gl/Studio.ts'), /const busy = studioBusy\(\{/);
});

test('a launch scene that fails half-built gives its WebGL context back and leaves no canvas behind', async () => {
  const { createLaunchScene } = await import('../../src/components/launch/launchScene');
  const done: string[] = [];
  const renderer = {
    domElement: { className: '', style: {}, setAttribute() {}, remove: () => done.push('canvas removed') },
    setClearColor() {},
    dispose: () => done.push('disposed'),
    forceContextLoss: () => done.push('context lost'),
  };
  // Node has no page to build in, so the build fails part way, as a real one can (a lost context, a shader error)
  await assert.rejects(createLaunchScene(() => renderer as never));
  assert.deepEqual(done.sort(), ['canvas removed', 'context lost', 'disposed']);
});

test('after a theme change the office card shows the flat map until the new 3D map has drawn', () => {
  const map = read('components/OfficeMap.tsx');
  assert.match(map, /const \[readyFor, setReadyFor\] = useState<string \| null>\(null\);/);
  assert.match(map, /onReady: \(\) => setReadyFor\(theme\),/);
  assert.match(map, /data-ready=\{readyFor === theme \|\| undefined\}/);
});

test('the Research closer keeps its buttons in its centred group, not pinned low like the hero\'s (owner\'s 2A)', () => {
  const css = readFileSync(new URL('../../src/styles/research.css', import.meta.url), 'utf8');
  assert.match(css, /\.ra-closer \.ra-actions \{ position: static; \}/);
});

const CONFIG: AuthConfig = { api: 'http://api.test/api', keycloak: 'http://kc.test', realm: 'bharattech', clientId: 'lms-client' };
const memory = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) };
};
const token = (seconds: number) => {
  const part = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${part({ alg: 'none' })}.${part({ exp: Math.floor(Date.now() / 1000) + seconds })}.sig`;
};

test('the sign-in can be read again from storage: another tab signed in or out', () => {
  const device = memory();
  const g = globalThis as { window?: unknown };
  const before = g.window;
  g.window = { sessionStorage: memory(), localStorage: device };
  try {
    const auth = createAuth(CONFIG, (async () => new Response(null, { status: 500 })) as unknown as typeof fetch);
    assert.equal(auth.signedIn(), false);
    device.setItem('bt-portal-auth', JSON.stringify({ access: token(300), refresh: token(1800) }));
    assert.equal(auth.signedIn(), false, 'read before reload');
    auth.reload();
    assert.equal(auth.signedIn(), true);
    device.removeItem('bt-portal-auth');
    auth.reload();
    assert.equal(auth.signedIn(), false);
  } finally {
    g.window = before;
  }
});

test('a sign-in the browser refused to save stays signed in when read again', async () => {
  const refusing = { ...memory(), setItem: () => { throw new Error('blocked'); } };
  const g = globalThis as { window?: unknown };
  const before = g.window;
  g.window = { sessionStorage: refusing, localStorage: refusing };
  try {
    const reply = { access_token: token(300), refresh_token: token(1800), user: { fullName: 'Asha Rao', email: 'asha@example.test', role: 'employee' } };
    const auth = createAuth(CONFIG, (async () => new Response(JSON.stringify(reply), { status: 200 })) as unknown as typeof fetch);
    assert.equal((await auth.signIn('asha@example.test', 'right-password', false)).ok, true);
    auth.reload();
    assert.equal(auth.signedIn(), true);
  } finally {
    g.window = before;
  }
});

test('the top bar follows a sign-in or sign-out made in another tab, and when this tab comes back into view', async () => {
  const listeners = new Map<string, () => void>();
  const device = memory();
  const g = globalThis as { window?: unknown; document?: unknown };
  const before = { window: g.window, document: g.document };
  g.window = { sessionStorage: memory(), localStorage: device, addEventListener: (type: string, fn: () => void) => listeners.set(`window:${type}`, fn) };
  const page = { visibilityState: 'visible', addEventListener: (type: string, fn: () => void) => listeners.set(`document:${type}`, fn) };
  g.document = page;
  try {
    const session = await import('../../src/portal/session');
    assert.equal(session.getSession(), null);
    let told = 0;
    // the hook's subscription, without React
    const stop = session.subscribeSession(() => told++);
    device.setItem('bt-portal-session', JSON.stringify({ name: 'Asha Rao', email: 'asha@example.test', role: 'employee' }));
    listeners.get('window:storage')!();
    assert.equal(session.getSession()?.email, 'asha@example.test');
    assert.equal(told, 1);
    const same = session.getSession();
    listeners.get('document:visibilitychange')!();
    assert.equal(session.getSession(), same, 'nothing changed, so the same snapshot (React re-renders on a new one)');
    assert.equal(told, 1);
    device.removeItem('bt-portal-session');
    page.visibilityState = 'hidden';
    listeners.get('document:visibilitychange')!();
    assert.equal(told, 1, 'a hidden tab has no top bar to update');
    page.visibilityState = 'visible';
    listeners.get('document:visibilitychange')!();
    assert.equal(session.getSession(), null);
    assert.equal(told, 2);

    // a browser that refuses to save: the session lives only in this page, and coming back to the tab keeps it
    const refusing = { ...memory(), setItem: () => { throw new Error('blocked'); } };
    Object.assign(g.window as object, { sessionStorage: refusing, localStorage: refusing });
    session.startSession('asha@example.test', 'employee');
    listeners.get('document:visibilitychange')!();
    listeners.get('window:storage')!();
    assert.equal(session.getSession()?.email, 'asha@example.test');
    stop();
  } finally {
    g.window = before.window;
    g.document = before.document;
  }
});
