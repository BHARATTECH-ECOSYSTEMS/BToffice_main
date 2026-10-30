import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toDirectory } from '../../src/portal/people';
import { phoneProblem, toAccountProfile } from '../../src/portal/profile';

// Owner's 1A 2A (2026-10-25): Settings → Profile edits your own phone and work phone and whether colleagues see
// them. The page checks the same rule as the backend (userController readPhone) before anything is sent.

const me = { email: 'test.intern@example.test', fullName: 'Test Intern', role: 'Intern' };

test('a 10-digit Indian number passes, typed with spaces, hyphens, +91 or a leading 0', () => {
  for (const phone of ['9876543210', '+91 98765 43210', '+91-98765-43210', '09876543210', '080-4000-1234', '  98765 43210  ']) {
    assert.equal(phoneProblem(phone), null, phone);
  }
});

test('an empty box is fine: it clears the number', () => {
  assert.equal(phoneProblem(''), null);
  assert.equal(phoneProblem('   '), null);
});

test('anything else gets a plain explanation', () => {
  for (const phone of ['+91 1', '12345', '98765432101', '+44 20 7946 0958', 'abc', '98765x43210', '9'.repeat(25), '+91 98765 43210 ext 5', '+91  -  98765  -  43210']) {
    assert.match(phoneProblem(phone) ?? '', /10-digit Indian number/, phone);
  }
});

test('the profile says whether colleagues see the numbers, yes unless the person said no', () => {
  assert.equal(toAccountProfile(me).showPhone, true);
  assert.equal(toAccountProfile({ ...me, privacySettings: { showPhone: true } }).showPhone, true);
  assert.equal(toAccountProfile({ ...me, privacySettings: { showPhone: false } }).showPhone, false);
  assert.equal(toAccountProfile({ ...me, privacySettings: 'odd' }).showPhone, true);
});

// 2026-10-26, owner's 1-1A 1-2A: Super Admins and Admins still get numbers someone hid, marked as hidden, and People
// says so, so they don't pass them on.
const hider = { id: 'u1', name: 'Asha Rao', email: 'asha@example.test', role: 'Employee', phone: '+91 98765 00002', status: 'active' };

test('the directory keeps the backend’s "hidden from colleagues" mark, and only a real true', () => {
  assert.equal(toDirectory([{ ...hider, phoneHidden: true }])[0].phoneHidden, true);
  for (const phoneHidden of [undefined, false, 'true', 1]) assert.equal('phoneHidden' in toDirectory([{ ...hider, phoneHidden }])[0], false, String(phoneHidden));
});

test('People marks a hidden number for the admin, and Settings says admins still see it', () => {
  const people = readFileSync('src/portal/pages/PeopleConnected.tsx', 'utf8');
  assert.match(people, /p\.phoneHidden && <span className="p-phone-hidden">Hidden from colleagues<\/span>/);
  assert.match(readFileSync('src/portal/pages/Settings.tsx', 'utf8'), /Off hides both numbers from colleagues; admins still see them\./);
});
