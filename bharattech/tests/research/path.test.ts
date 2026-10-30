import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FORMS, LAST, pairAt } from '../../src/gl/research/path';

test('the story has ten stops: hero, our research, six domains, where we work, closer', () => {
  assert.equal(FORMS.length, 10);
  assert.equal(LAST, 9);
});

test('pairAt gives the two forms on screen and how far between them', () => {
  assert.deepEqual(pairAt(0), { from: 'word', to: 'field', index: 0, t: 0 });
  assert.deepEqual(pairAt(4.25), { from: 'arm', to: 'globe', index: 4, t: 0.25 });
  assert.deepEqual(pairAt(LAST), { from: 'wide', to: 'wide', index: LAST - 1, t: 1 });
});

test('pairAt clamps scroll outside the story', () => {
  assert.deepEqual(pairAt(-1), { from: 'word', to: 'field', index: 0, t: 0 });
  assert.deepEqual(pairAt(99), { from: 'wide', to: 'wide', index: LAST - 1, t: 1 });
});

test('pairAt depends only on s, so a jump across several stops lands on the right pair', () => {
  pairAt(1.5);
  assert.deepEqual(pairAt(6.5), { from: 'dome', to: 'phone', index: 6, t: 0.5 });
});

test('pairAt follows a shorter sequence when given one', () => {
  assert.deepEqual(pairAt(0.5, ['word', 'globe']), { from: 'word', to: 'globe', index: 0, t: 0.5 });
  assert.deepEqual(pairAt(3, ['word', 'globe']), { from: 'word', to: 'globe', index: 0, t: 1 });
});
