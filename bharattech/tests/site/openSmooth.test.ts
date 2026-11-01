import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Owner, 2026-11-01: "the whole site is lagging … when we click on sign in it takes time to load the pop-up".
// Measured in headless Chrome (D3D11): the sign-in click froze the page 166 ms building the window's glass logo, then
// its first frame froze 309 ms more, all inside the window's 0.6 s grow; opening Careers froze 641 ms creating its
// two WebGL scenes in the same moment as the page change. Reading each shader's log back made every first draw wait
// on the GPU (83 ms for one log).

const read = (path: string) => readFileSync(path, 'utf8');

test('the glass studio reads shader logs back only in development, like every other scene', () => {
  assert.match(read('src/gl/Studio.ts'), /this\.renderer\.debug\.checkShaderErrors = import\.meta\.env\.DEV;/);
});

test("the sign-in window's glass logo is built once the window has finished growing", () => {
  const grow = read('src/styles/login.css').match(/animation: login-grow ([\d.]+)s /);
  assert.ok(grow, 'login-grow animation not found');
  const after = read('src/components/Login.tsx').match(/<LogoGlass [^>]*buildAfter=\{(\d+)\}/);
  assert.ok(after, 'the login LogoGlass has no buildAfter');
  assert.equal(Number(after[1]), Math.round(Number(grow[1]) * 1000));
});

test('LogoGlass waits buildAfter ms before it creates its WebGL studio', () => {
  const src = read('src/components/LogoGlass.tsx');
  assert.match(src, /buildAfter = 0/);
  assert.match(src, /window\.setTimeout\(build, buildAfter\)/);
});

test("Careers' two WebGL scenes are built at a quiet moment or as they near the screen, not with the page", () => {
  for (const file of ['src/components/careers/ValueTunnel.tsx', 'src/components/careers/RoleSpiral.tsx']) {
    const src = read(file);
    assert.match(src, /buildWhenQuietOrNear\(/, `${file} mounts its scene at once`);
  }
});

test("a scene near the screen still waits out the new page's entrance before it is built", () => {
  const settle = Number(read('src/components/warmQueue.ts').match(/const SETTLE_MS = (\d+);/)?.[1]);
  const pageIn = Number(read('src/components/RouteSweep.tsx').match(/translate3d\(0,0,0\)' \}\], \{ duration: (\d+),/)?.[1]);
  assert.ok(pageIn > 0, 'page-in duration not found');
  assert.ok(settle >= pageIn, `settle ${settle} ms < page-in ${pageIn} ms`);
  assert.match(read('src/components/warmQueue.ts'), /window\.setTimeout\(\(\) => near\.observe\(el\), SETTLE_MS\)/);
});
