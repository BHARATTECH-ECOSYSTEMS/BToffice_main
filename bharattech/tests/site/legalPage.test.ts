import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { legalParts } from '../../src/pages/legalText.ts';
import { PRIVACY, TERMS } from '../../src/content.ts';

// Owner, 2026-11-01: refine the Privacy and Terms pages (chose: contents shows where you are, clearer rhythm, working
// links, an ending that links across; headings left as written).

const joined = (parts: { text: string }[]) => parts.map((p) => p.text).join('');

test('every section reads exactly as written once split into links', () => {
  for (const [, body] of [...PRIVACY, ...TERMS]) assert.equal(joined(legalParts(body, 'Privacy Policy')), body);
});

test('each email address becomes its own part, without the full stop after it', () => {
  const parts = legalParts('Write to legal@bharattechorigin.com.');
  assert.deepEqual(parts, [
    { kind: 'text', text: 'Write to ' },
    { kind: 'email', text: 'legal@bharattechorigin.com' },
    { kind: 'text', text: '.' },
  ]);
  const rights = PRIVACY.find(([h]) => h === 'Your rights')![1];
  assert.equal(legalParts(rights).filter((p) => p.kind === 'email').length, 1);
});

test('the phrase links only its first mention', () => {
  const privacy = TERMS.find(([h]) => h === 'Privacy')![1];
  const parts = legalParts(privacy, 'Privacy Policy');
  assert.equal(parts.filter((p) => p.kind === 'phrase').length, 1);
  assert.ok(privacy.split('Privacy Policy').length > 2, 'the Terms text mentions the policy twice');
  // an email address between two mentions must not restart the count
  const across = legalParts('See the Privacy Policy, write to a@b.com, then the Privacy Policy again.', 'Privacy Policy');
  assert.equal(across.filter((p) => p.kind === 'phrase').length, 1);
});

test('without a phrase nothing but emails is linked', () => {
  for (const [, body] of PRIVACY) assert.ok(legalParts(body).every((p) => p.kind !== 'phrase'));
});

test('each page ends by pointing at the other one', () => {
  const src = readFileSync('src/pages/Legal.tsx', 'utf8');
  assert.match(src, /items=\{PRIVACY\} other=\{\{ to: '\/terms'/);
  assert.match(src, /other=\{\{ to: '\/privacy', label: 'Privacy policy' \}\}/);
});
