import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { deckAt, pageAt, stopOf } from '../../src/components/blog/deckPlan.ts';

// Owner, 2026-11-01: the book was "not looking great at all, redesign from 0" (the book idea, too busy, the article
// page too); picked "One post at a time": one large post card, and the scroll lifts it away for the next.

test('at each post’s stop the deck rests exactly on that post', () => {
  const n = 6;
  for (let k = 0; k < n; k++) {
    assert.equal(deckAt(stopOf(k, n), n), k);
    assert.equal(pageAt(stopOf(k, n), n), k);
  }
});

test('a card rests for a while around its stop before it lifts away', () => {
  const n = 6;
  const gap = stopOf(1, n) - stopOf(0, n);
  for (const k of [1, 3]) {
    for (const d of [-0.12, 0.12]) {
      const p = stopOf(k, n) + d * gap;
      assert.equal(deckAt(p, n), k);
      assert.equal(pageAt(p, n), k, 'the progress marks keep pointing at the card being read');
    }
  }
});

test('halfway between two posts the deck is halfway through the swap', () => {
  const n = 6;
  assert.ok(Math.abs(deckAt((stopOf(2, n) + stopOf(3, n)) / 2, n) - 2.5) < 1e-9);
});

test('a swap starts gently and settles gently, rather than at a constant speed', () => {
  const n = 6;
  const gap = stopOf(1, n) - stopOf(0, n);
  assert.ok(deckAt(stopOf(2, n) + 0.3 * gap, n) - 2 < 0.1, 'just past the rest, the card has barely moved');
  assert.ok(deckAt(stopOf(2, n) + 0.7 * gap, n) - 2 > 0.9, 'just before the next rest, it is nearly home');
});

test('the deck only ever moves forward as the page scrolls down', () => {
  const n = 6;
  let last = 0;
  for (let i = 0; i <= 600; i++) {
    const at = deckAt(i / 600, n);
    assert.ok(at >= last - 1e-12 && at >= 0 && at <= n - 1);
    last = at;
  }
});

test('a single post is one card with nothing to swap', () => {
  assert.equal(stopOf(0, 1), 0);
  assert.equal(deckAt(0.7, 1), 0);
  assert.equal(pageAt(0.7, 0), 0);
});

test('phones and reduced motion keep the plain posts grid', () => {
  const src = readFileSync('src/pages/Blog.tsx', 'utf8');
  assert.match(src, /prefers-reduced-motion: reduce\)'\)\.matches \|\| isCompact\(\)/);
  assert.match(src, /flat \? \(?\s*<PostsGrid/);
  assert.match(src, /<BlogDeck /);
});

test('a post ends with the posts either side of it in the Blog’s order, in their own colours', () => {
  const src = readFileSync('src/pages/Article.tsx', 'utf8');
  assert.match(src, /const prev = POSTS\[at - 1\];/);
  assert.match(src, /const next = POSTS\[at \+ 1\];/);
  assert.match(src, /CATEGORY_TONE\[p\.category\]/);
  assert.doesNotMatch(src, /toneStyle\('violet'\)/, 'no post is painted violet whatever its category');
  assert.match(readFileSync('src/pages/Blog.tsx', 'utf8'), /CAT_TONE: Record<string, HueName> = CATEGORY_TONE/);
});

test('opening a post from the deck flies its cover into the article’s header', () => {
  assert.match(readFileSync('src/pages/Article.tsx', 'utf8'), /data-morph-target=""/);
  assert.match(readFileSync('src/components/blog/BlogDeck.tsx', 'utf8'), /data-morph=""/);
  // the route sweep must leave those links to the flight, or it swallows the click first
  assert.match(readFileSync('src/components/RouteSweep.tsx', 'utf8'), /link\.hasAttribute\('data-morph'\)\)\) return;/);
});
