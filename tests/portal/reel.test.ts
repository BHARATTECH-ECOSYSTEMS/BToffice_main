import { test } from 'node:test';
import assert from 'node:assert/strict';
import { afterReel, reelPlayed } from '../../src/portal/reel';

// Delete and Mark as left play their reel while the backend works (owner's 1A 4A, 2026-10-27): the list reloads, and
// the row goes, only once the reel has played; a refusal comes back at once, so the button can reset and say why.

const later = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

test("a change that went through waits for the reel before it's done", async () => {
  const order: string[] = [];
  const played = later(40).then(() => order.push('reel played'));
  const result = await afterReel(
    later(5).then(() => (order.push('server answered'), 'ok')),
    played,
  );
  order.push('done');
  assert.equal(result, 'ok', "the call's own answer is handed on");
  assert.deepEqual(order, ['server answered', 'reel played', 'done']);
});

test("a refusal comes back at once, without waiting for the reel", async () => {
  let reelOver = false;
  const played = later(200).then(() => (reelOver = true));
  const started = Date.now();
  await assert.rejects(afterReel(Promise.reject(new Error('refused')), played), /refused/);
  assert.equal(reelOver, false);
  assert.ok(Date.now() - started < 150, 'did not wait for the reel');
});

test('without a reel the change is done when the server answers', async () => {
  assert.equal(await afterReel(Promise.resolve(7)), 7);
});

test('the reel lasts its length, and no time at all with reduced motion', async () => {
  let t = Date.now();
  await reelPlayed(60, false);
  assert.ok(Date.now() - t >= 55, 'waited for the reel');
  t = Date.now();
  await reelPlayed(5000, true);
  assert.ok(Date.now() - t < 50, 'reduced motion: nothing to wait for');
});
