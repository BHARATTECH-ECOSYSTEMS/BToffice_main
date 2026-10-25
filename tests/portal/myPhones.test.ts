import { test } from 'node:test';
import assert from 'node:assert/strict';
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
