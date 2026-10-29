import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { headStart } from '../../src/portal/headStart';

// Owner, 2026-10-29 (A): View took 2–3 s. The certificate now starts downloading when the pointer rests on View (or
// focus reaches it), and the click picks up that same download instead of starting a second one.

const counting = () => {
  const calls: string[] = [];
  return { calls, load: (key: string) => (calls.push(key), Promise.resolve(`pdf ${key}`)) };
};

test('a head start is handed over on click: one download, not two', async () => {
  const { calls, load } = counting();
  const pdfs = headStart(load);
  pdfs.warm('a');
  pdfs.warm('a');
  assert.equal(await pdfs.take('a'), 'pdf a');
  assert.deepEqual(calls, ['a']);
});

test('a click without a head start downloads as before', async () => {
  const { calls, load } = counting();
  assert.equal(await headStart(load).take('b'), 'pdf b');
  assert.deepEqual(calls, ['b']);
});

test('a head start is used once, so opening the same one again (or Try again) downloads afresh', async () => {
  const { calls, load } = counting();
  const pdfs = headStart(load);
  pdfs.warm('a');
  await pdfs.take('a');
  await pdfs.take('a');
  assert.deepEqual(calls, ['a', 'a']);
});

test('an old head start is not used', async () => {
  const { calls, load } = counting();
  let now = 0;
  const pdfs = headStart(load, 30_000, () => now);
  pdfs.warm('a');
  now = 31_000;
  await pdfs.take('a');
  assert.deepEqual(calls, ['a', 'a']);
});

test('a failed head start is dropped, so the click tries again', async () => {
  let fail = true;
  const calls: string[] = [];
  const pdfs = headStart((key: string) => (calls.push(key), fail ? Promise.reject(new Error('offline')) : Promise.resolve('pdf')));
  pdfs.warm('a');
  await new Promise((r) => setTimeout(r, 0));
  fail = false;
  assert.equal(await pdfs.take('a'), 'pdf');
  assert.deepEqual(calls, ['a', 'a']);
});

test('View warms the certificate on pointer and focus, and the window takes it', () => {
  const page = readFileSync('src/portal/pages/CertificatesConnected.tsx', 'utf8');
  const view = page.slice(page.indexOf('onClick={() => setViewing(c)}') - 300, page.indexOf('onClick={() => setViewing(c)}') + 200);
  assert.match(view, /onPointerEnter=\{\(\) => pdfs\.warm\(c\.id\)\}/);
  assert.match(view, /onFocus=\{\(\) => pdfs\.warm\(c\.id\)\}/);
  assert.match(page, /load=\{\(\) => pdfs\.take\(viewing\.id\)\}/);
});
