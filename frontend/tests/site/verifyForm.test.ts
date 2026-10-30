import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { thisMonth } from '../../src/components/verifyForm';

// Low list, public site (owner's 1A, 2026-10-27): the footer's verification form.

const form = readFileSync(new URL('../../src/components/VerifyRequest.tsx', import.meta.url), 'utf8');

test('"this month" is on India\'s clock, like the backend: just after midnight on the 1st it is already the new month', () => {
  // 00:30 on 1 November in India is still 31 October in UTC
  assert.equal(thisMonth(Date.parse('2026-10-31T19:00:00Z')), '2026-11');
  assert.equal(thisMonth(Date.parse('2026-10-31T18:29:00Z')), '2026-10');
  assert.match(form, /draft\.from > thisMonth\(\) \|\| \(draft\.to && draft\.to > thisMonth\(\)\)/);
  assert.doesNotMatch(form, /toISOString\(\)\.slice\(0, 7\)/);
});

test('the form closes on a click on the backdrop only when the press started there too (dragging text out keeps it open)', () => {
  assert.match(form, /onPointerDown=\{\(e\) => \(pressedBackdrop\.current = e\.target === e\.currentTarget\)\}/);
  assert.match(form, /onClick=\{\(e\) => e\.target === e\.currentTarget && pressedBackdrop\.current && onClose\(\)\}/);
});

test('the bot trap has a name browsers don\'t autofill, and is still sent to the backend as `website`', () => {
  assert.doesNotMatch(form, /name="website"/);
  assert.match(form, /<input name="leave_empty" tabIndex=\{-1\} autoComplete="off" \/>/);
  assert.match(form, /sendEmploymentRequest\(draft, get\('leave_empty'\)\)/);
});
