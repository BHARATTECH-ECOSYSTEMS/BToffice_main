import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canDeleteRequest } from '../../src/portal/verifications';
import type { Verification } from '../../src/portal/data';

// Small fixes, 2026-10-28 (owner: all A).

const css = readFileSync('src/styles/portal.css', 'utf8');

test('Community: an early joiner shows the Employee ID and the personal email on lines of their own', () => {
  const src = readFileSync('src/portal/pages/Community.tsx', 'utf8');
  assert.doesNotMatch(src, /\[j\.employeeId, j\.personalEmail\]\.filter\(Boolean\)\.join\(', '\)/);
  assert.match(src, /\{j\.employeeId && <span className="p-comm-email-text">\{j\.employeeId\}<\/span>\}/);
  assert.match(src, /\{j\.personalEmail && \(\s*<span className="p-comm-email-text" title=\{j\.personalEmail\}>/);
});

test('People: between 900 and 1365 px the row buttons keep their icons and drop their words', () => {
  const people = readFileSync('src/portal/pages/PeopleConnected.tsx', 'utf8');
  assert.match(people, /<td className="is-end p-row-actions p-people-actions">/);
  assert.match(css, /@media \(min-width: 900px\) and \(max-width: 1365px\) \{\s*\.p-people-actions \.btn-text,\s*\.p-people-actions \.p-del-word \{\s*display: none;/);
});

test('People: an email may wrap only after its "@", and the hidden-phone note under a number may wrap', () => {
  const people = readFileSync('src/portal/pages/PeopleConnected.tsx', 'utf8');
  assert.match(people, /<td>\{emailWithBreak\(p\.email\)\}<\/td>/);
  assert.match(people, /\{email\.slice\(0, at \+ 1\)\}\s*<wbr \/>\s*\{email\.slice\(at \+ 1\)\}/);
  assert.match(css, /\.p-phone-hidden \{\s*display: block;[^}]*white-space: normal;/);
});

test('People: each row button names itself on hover, as the words are gone at those widths', () => {
  const people = readFileSync('src/portal/pages/PeopleConnected.tsx', 'utf8');
  assert.match(people, /title=\{editable \? `Details for \$\{p\.name\}` :/);
  assert.match(people, /title=\{cantLeave \|\| `Mark \$\{p\.name\} as left`\}/);
  assert.match(people, /title=\{deletable \? `Delete \$\{p\.name\}` :/);
});

const request = (status: Verification['status'], log: string[]) => ({ status, log: log.map((text) => ({ at: '2026-10-28T10:00', by: 'Test Admin', text })) }) as Verification;

test('Verification: only a pending request that was never decided offers Delete, as the backend allows', () => {
  assert.equal(canDeleteRequest(request('pending', ['Opened the request'])), true);
  assert.equal(canDeleteRequest(request('pending', ['Opened the request', 'Marked verified', 'Reopened'])), false);
  assert.equal(canDeleteRequest(request('pending', ['Opened the request', 'Reopened. The note was: wrong PAN'])), false);
  assert.equal(canDeleteRequest(request('verified', ['Opened the request', 'Marked verified'])), false);
});

test('Verification: the connected desk uses that rule', () => {
  assert.match(readFileSync('src/portal/pages/verificationSource.ts', 'utf8'), /canDelete: canDeleteRequest,/);
});
