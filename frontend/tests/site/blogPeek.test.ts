import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Owner, 2026-10-30: hovering Blog in the nav showed no dropdown (it was the one link without a glance). Owner's
// choices: the latest posts with the topics beside them, opening with a page turn of its own.

const nav = readFileSync('src/components/Nav.tsx', 'utf8');
const peek = readFileSync('src/components/NavPeek.tsx', 'utf8');
// story.css is CRLF in the working copy
const css = readFileSync('src/styles/story.css', 'utf8').replace(/\r\n/g, '\n');

test('Blog in the nav opens a glance', () => {
  assert.match(nav, /\{ label: 'Blog', to: '\/blog', tone: 'tangerine', peek: 'blog', fx: 'sweep' \}/);
});

test('the glance knows Blog and keeps the nav order', () => {
  assert.match(peek, /export type PeekId = [^;]*'blog'/);
  assert.match(peek, /const PEEK_ORDER: PeekId\[\] = \['research', 'services', 'capabilities', 'careers', 'blog', 'about', 'contact'\];/);
  assert.match(peek, /\{id === 'blog' && <BlogPeek go=\{go\} \/>\}/);
});

test('it lists the four newest posts, each opening its own page, and the topics beside them', () => {
  const blog = peek.slice(peek.indexOf('function BlogPeek'));
  assert.match(blog, /POSTS\.slice\(0, 4\)\.map/);
  assert.match(blog, /go\(`\/blog\/\$\{p\.slug\}`\)/);
  assert.match(blog, /p\.date\} · \{p\.read\}/);
  assert.match(blog, /new Set\(POSTS\.map\(\(p\) => p\.category\)\)/);
  assert.match(blog, /go\('\/blog'\)/);
  assert.match(blog, /Read the blog/);
});

test('it opens with a page turn: the panel swings in from its left edge, then each row turns in after it', () => {
  assert.match(css, /\.nav-peek\[data-open='blog'\] \.nav-peek-body \{[^}]*transform-origin: 0 50%;[^}]*animation: peekTurn /);
  assert.match(css, /@keyframes peekTurn \{\s*from \{[^}]*rotateY\(-/);
  assert.match(css, /\.nav-peek\[data-open='blog'\] \.nav-peek-pane\[data-on\] \.peek-list > \[style\*='--k'\] \{[^}]*animation: peekLeaf /);
  assert.match(css, /@keyframes peekLeaf \{\s*from \{[^}]*rotateY\(-/);
});

test('with reduced motion it only fades in', () => {
  const at = css.indexOf("@media (prefers-reduced-motion: reduce) {\n  .nav-peek[data-open='blog']");
  assert.notEqual(at, -1, 'no reduced-motion rule for the Blog glance');
  const end = css.indexOf('}\n}', at);
  assert.notEqual(end, -1);
  const block = css.slice(at, end + 3);
  assert.match(block, /animation: peekFade /);
});
