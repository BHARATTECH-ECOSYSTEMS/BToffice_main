import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CONTACT_NEEDS, ROLES } from '../../src/content';

// Gap audit group D, Part 2 (owner's 5A 6A 7A, 2026-10-26): Careers says each role is full-time (the company's own
// roles list does), Contact offers "General enquiry" and "Partnership", the 404 page leads somewhere useful, and
// search engines get a robots.txt like the company's.

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('every role says it is full-time, wherever roles are shown', () => {
  assert.ok(ROLES.length > 0);
  for (const role of ROLES) assert.equal(role.type, 'Full-time', role.title);
  assert.match(read('src/pages/Careers.tsx'), /<span>\{r\.type\}<\/span>/);
  const spiral = read('src/components/careers/RoleSpiral.tsx');
  assert.match(spiral, /<span>\{roles\[i\]\.type\}<\/span>/);
  assert.match(spiral, /\[role\.focus, role\.team, role\.location, role\.type\]/);
});

test('Contact offers a general enquiry first, and partnerships, each with a tone', () => {
  assert.equal(CONTACT_NEEDS[0], 'General enquiry');
  assert.ok(CONTACT_NEEDS.includes('Partnership'));
  assert.equal(new Set(CONTACT_NEEDS).size, CONTACT_NEEDS.length);
  const tones = /const NEED_TONES: HueName\[\] = \[([^\]]*)\]/.exec(read('src/pages/Contact.tsx'))?.[1] ?? '';
  assert.equal(tones.split(',').filter((t) => t.trim()).length, CONTACT_NEEDS.length);
});

test('the 404 page leads home, to Research and to Contact', () => {
  const page = read('src/pages/NotFound.tsx');
  for (const [to, words] of [['/', 'Back to the start'], ['/research', 'Explore research'], ['/contact', 'Contact us']]) {
    assert.match(page, new RegExp(`<Link to="${to}"[^>]*>\\s*<BtnText>${words}</BtnText>`), to);
  }
});

test('robots.txt lets every search engine read the site', () => {
  const robots = read('public/robots.txt');
  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Allow: \/$/m);
  assert.doesNotMatch(robots, /^Disallow: \/\S*$/m);
});
