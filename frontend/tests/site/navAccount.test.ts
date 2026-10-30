import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { navAccount } from '../../src/components/navAccount';
import { initials } from '../../src/portal/names';

// Gap audit group D, Part 3 (owner's 9A, 2026-10-26): someone signed in sees their initials and "Open portal" in the
// public top bar, with a small "Sign out" beside it; everyone else still sees "Employee login".

const read = (path: string) => readFileSync(new URL(`../../src/${path}`, import.meta.url), 'utf8');

test('nobody signed in: no account in the top bar', () => {
  assert.equal(navAccount(null), null);
});

test('signed in: their initials, and a label that says whose portal opens', () => {
  assert.deepEqual(navAccount({ name: 'Asha Rao', email: 'asha@example.test' }), { initials: 'AR', label: 'Open portal (signed in as Asha Rao)' });
  assert.deepEqual(navAccount({ name: 'Neha', email: 'neha@example.test' }), { initials: 'N', label: 'Open portal (signed in as Neha)' });
  // an account without a name falls back to its email
  assert.deepEqual(navAccount({ name: '  ', email: 'test.intern@example.test' }), { initials: 'T', label: 'Open portal (signed in as test.intern@example.test)' });
});

test('initials are the first letters of the first two words', () => {
  assert.equal(initials('devesh RR Rayte'), 'DR');
  assert.equal(initials('  Test   Admin '), 'TA');
  assert.equal(initials(''), '');
});

test('the top bar switches on the session: Open portal and Sign out when signed in, Employee login otherwise', () => {
  const nav = read('components/Nav.tsx');
  assert.match(nav, /const account = navAccount\(useSession\(\)\);/);
  assert.match(nav, /\{account \? \(/);
  assert.match(nav, /<Link to="\/portal" className="nav-cta" aria-label=\{account\.label\}>\s*<BtnText>Open portal<\/BtnText>/);
  assert.match(nav, /\{account\.initials\}/);
  // a round key like the theme key, named for screen readers and on hover
  assert.match(nav, /className="nav-theme nav-signout" onClick=\{\(\) => endSession\(\)\} aria-label="Sign out" title="Sign out">/);
  assert.match(nav, /<BtnText>Employee login<\/BtnText>/);
});

test('signed in, the links sit closer up to 1219px, so they never run into the wider end of the bar', () => {
  assert.match(read('components/Nav.tsx'), /data-account=\{account \? '' : undefined\}/);
  assert.match(read('styles/base.css'), /@media \(min-width: 1180px\) and \(max-width: 1219px\) \{\s*\.nav\[data-account\] \.nav-links \{/);
});

test('the Sign out key hides on phones with the rest of the top-bar login', () => {
  assert.match(read('styles/base.css'), /\.nav-cta,\s*\.nav-signout \{ display: none; \}/);
});
