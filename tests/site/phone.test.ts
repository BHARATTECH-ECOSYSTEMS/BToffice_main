import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Roadmap step 20, Part 3: the public site on phones and tablets. Its rules live in one stylesheet, phone.css,
// loaded after every page's own styles and one step more specific (:root), so it can lift them; desktop has no rule
// in it. The phone check (headless Chrome
// at 360/390/768px, light and dark, every page scrolled through) is what shows the result.

const src = (f: string) => readFileSync(f, 'utf8');
const css = src('src/styles/phone.css').replace(/\/\*[\s\S]*?\*\//g, '');
/** Every top-level block of the file: [prelude, body]. */
const blocks = (() => {
  const out: [string, string][] = [];
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open === -1) break;
    let depth = 1;
    let j = open + 1;
    while (depth && j < css.length) depth += css[j] === '{' ? 1 : css[j] === '}' ? -1 : 0, j++;
    out.push([css.slice(i, open).trim(), css.slice(open + 1, j - 1)]);
    i = j;
  }
  return out;
})();
const SMALL_SCREENS = ['@media (max-width: 1024px)', '@media (max-width: 760px)'];
const phone = blocks.filter(([p]) => SMALL_SCREENS.includes(p)).map(([, b]) => b).join('\n');
/** The declarations of the rule whose selector list names `sel`. */
const ruleFor = (sel: string) => [...phone.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, s]) => s.split(',').some((x) => x.trim() === sel || x.trim().endsWith(` ${sel}`) || x.includes(sel))).map(([, , d]) => d).join(';');

test('phone.css is loaded after every other stylesheet, so its rules win over the pages\' own', () => {
  const app = src('src/App.tsx');
  const imports = [...app.matchAll(/^import '\.\/styles\/([\w-]+\.css)';/gm)].map((m) => m[1]);
  assert.equal(imports.at(-1), 'phone.css', `last style import is ${imports.at(-1)}`);
  // main.tsx's imports come before App's
  assert.doesNotMatch(src('src/main.tsx'), /phone\.css/);
});

test('every rule in phone.css is inside a phone or tablet block: desktop gets none of it', () => {
  assert.ok(blocks.length > 0, 'phone.css is empty');
  for (const [prelude] of blocks) assert.ok(SMALL_SCREENS.includes(prelude), `"${prelude}" applies on desktop`);
});

// some pages' rules name the element inside its parent (more than one class); :root lifts phone.css past them
test("every selector in phone.css starts with :root, one step more specific than the pages' own rules", () => {
  const selectors = [...phone.matchAll(/([^{}]+)\{[^{}]*\}/g)].flatMap(([, s]) => s.split(',').map((x) => x.trim()));
  assert.ok(selectors.length > 20);
  assert.deepEqual(selectors.filter((x) => !x.startsWith(':root ')), []);
});

test('the Services closing section is one column on phones (its button stuck out of a half-width column)', () => {
  assert.match(ruleFor('.svc-cta-inner'), /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});

test('small links and buttons are at least 24px tall on phones and tablets', () => {
  for (const sel of ['.footer-col a', '.footer-col button', '.footer-lead a', '.about-detail-text a', '.faq-mail', '.link-arrow', '.svc-list__item']) {
    const d = ruleFor(sel);
    const h = Number(d.match(/min-height:\s*(\d+)px/)?.[1] ?? 0);
    assert.ok(h >= 24, `${sel}: min-height ${h}px`);
  }
});

test('labels, dates and tags are at least 12px on phones and tablets', () => {
  for (const sel of ['.post-meta', '.cell-label', '.cover-tag', '.chip-soft', '.fan-meta', '.role-dept', '.cr-team__dept', '.finale-meta', '.acc-tag', '.svc-card__kind', '.svc-index__stop', '.how-paper-num', '.wheel-fam', '.careers-role small', '.careers-count em']) {
    const size = ruleFor(sel).match(/font-size:\s*([\d.]+)px/)?.[1];
    assert.ok(size && Number(size) >= 12, `${sel}: ${size ?? 'no'} font-size on phones`);
  }
});
