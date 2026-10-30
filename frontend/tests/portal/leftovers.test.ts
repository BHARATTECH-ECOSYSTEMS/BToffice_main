import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { rejoinedPerson, STREAM_TONE, STREAMS, type Alumnus } from '../../src/portal/data';
import { emailParts } from '../../src/portal/profile';

// Roadmap step 18, Part 1 (owner's 1A–8A): the website's leftovers before release.

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? sourceFiles(join(dir, e.name)) : /\.(tsx?|css)$/.test(e.name) ? [join(dir, e.name)] : []));
const filesMatching = (pattern: RegExp) => sourceFiles('src').filter((f) => pattern.test(readFileSync(f, 'utf8')));

test('no made-up figures are left on the site', () => {
  // the Research page's "40+ researchers, 12 programmes, 3 patents" were dummies; its row shows only real ones
  assert.deepEqual(filesMatching(/PLACEHOLDER|dummy figures/), []);
});

test('the products the footer dropped are named nowhere else', () => {
  assert.deepEqual(filesMatching(/CollegeCue|Recag/i), []);
});

test('an email can break before its @ when the column is narrow', () => {
  assert.deepEqual(emailParts('test.employee@example.test'), ['test.employee', '@example.test']);
  assert.equal(emailParts('+91 80 4000 1234'), null);
  assert.equal(emailParts('@example.test'), null);
  assert.equal(emailParts(undefined), null);
});

/** The declarations inside the first CSS block whose selector list is exactly `selector`. */
const block = (css: string, selector: string) => {
  const at = css.indexOf(`\n${selector} {`);
  return at === -1 ? '' : css.slice(at, css.indexOf('}', at));
};
const portalCss = readFileSync('src/styles/portal.css', 'utf8');

test('facts wrap onto another line instead of being cut off, in Profile, the task window and the Verification file', () => {
  const values = block(portalCss, '.p-file-facts dd');
  assert.match(values, /overflow-wrap: anywhere/);
  assert.doesNotMatch(values, /nowrap|ellipsis|overflow: hidden/);
  // one rule for all three, so no page brings the "…" back with its own
  assert.doesNotMatch(portalCss, /facts[^{]* dd[^{]*\{[^}]*(nowrap|ellipsis)/);
  for (const page of ['Profile', 'TasksConnected', 'Verification']) {
    assert.match(readFileSync(`src/portal/pages/${page}.tsx`, 'utf8'), /className="p-file-facts[ "]/, page);
  }
});

test('every stream has its own colour, and the community badge uses it', () => {
  const tones = STREAMS.map((s) => STREAM_TONE[s.id]);
  assert.equal(tones.every(Boolean), true);
  assert.equal(new Set(tones).size, STREAMS.length, `shared colours: ${tones.join(', ')}`);
  assert.match(block(portalCss, '.p-comm-card .p-badge.is-soft'), /var\(--tone\)/);
});

/** WCAG contrast ratio of two #rrggbb colours. */
const contrast = (a: string, b: string) => {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** A custom property's value in the first block of `css` that sets it (the light theme comes first). */
const firstValue = (css: string, name: string) => new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css)?.[1] ?? '';

test('quiet grey text is readable on every light background (4.5:1 or more)', () => {
  const base = readFileSync('src/styles/base.css', 'utf8');
  const muted = firstValue(base, '--muted');
  const portalLight = block(portalCss, ":root:not([data-theme='dark']) .portal");
  const backgrounds = [firstValue(base, '--bg'), firstValue(base, '--bg-2'), firstValue(base, '--paper'), firstValue(portalLight, '--bg'), firstValue(portalLight, '--paper')];
  for (const bg of backgrounds) {
    assert.ok(bg, 'a background colour was not found');
    assert.ok(contrast(muted, bg) >= 4.5, `${muted} on ${bg}: ${contrast(muted, bg).toFixed(2)}:1`);
  }
});

const versionOf = (name: string) => (JSON.parse(readFileSync('package-lock.json', 'utf8')).packages[`node_modules/${name}`]?.version ?? '0.0.0').split('.').map(Number);
const atLeast = (have: number[], want: number[]) => have[0] !== want[0] ? have[0] > want[0] : have[1] !== want[1] ? have[1] > want[1] : have[2] >= want[2];

test('the packages are past their known security holes', () => {
  // react-router 7.18.0 fixed the last open-redirect and route-matching holes; vite 6.4.4 the dev server's
  assert.ok(atLeast(versionOf('react-router'), [7, 18, 0]), `react-router ${versionOf('react-router').join('.')}`);
  assert.ok(atLeast(versionOf('vite'), [6, 4, 4]), `vite ${versionOf('vite').join('.')}`);
  assert.ok(atLeast(versionOf('source-map-js'), [1, 2, 2]), `source-map-js ${versionOf('source-map-js').join('.')}`);
});

test('code nothing uses is gone', () => {
  assert.deepEqual(filesMatching(/EMPLOYEE_LOGIN_URL/), []);
  assert.equal(existsSync('src/gl/research/glassTube.ts'), false);
});

test('someone who rejoins in the demo keeps their personal email, as on the backend', () => {
  const neha: Alumnus = { id: 'EMP9', name: 'Neha Kapoor', email: 'neha.kapoor@example.com', role: 'employee', phone: '', team: 'BharatTech', stream: 'tech', status: 'inactive', left: '2026-06-30', personalEmail: 'neha.home@example.net' };
  const back = rejoinedPerson(neha, '2026-10-25');
  assert.equal(back.personalEmail, 'neha.home@example.net');
  assert.equal(back.status, 'active');
  assert.equal(back.joined, '2026-10-25');
  assert.equal('left' in back, false);
});
