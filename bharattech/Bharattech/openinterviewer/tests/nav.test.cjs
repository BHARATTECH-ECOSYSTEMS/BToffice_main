// Redesign, HR screens (owner: "very old school" → new layouts like the portal): one slim top bar with pill links.
// The pill for the section you are in is lit, also on the pages inside it.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { NAV_LINKS, activeSection } = require('@/lib/nav');

test('the top bar links to the two sections, in this order', () => {
  assert.deepEqual(NAV_LINKS.map((l) => [l.label, l.href]), [['Studies', '/studies'], ['Interviews', '/dashboard']]);
});

test("the pill for the section you're in is lit, also on the pages inside it", () => {
  for (const path of ['/studies', '/studies/abc-123', '/setup', '/setup?prefill=edit']) assert.equal(activeSection(path), 'Studies', path);
  for (const path of ['/dashboard', '/dashboard/interview/xyz']) assert.equal(activeSection(path), 'Interviews', path);
  for (const path of ['/login', '/p/token', '/', '/studiesX']) assert.equal(activeSection(path), null, path);
});
