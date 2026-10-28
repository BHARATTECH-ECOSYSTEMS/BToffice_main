import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Spacing and alignment pass, 2026-10-28 (owner: all A). Measured on the signed-in portal at 1440 and 1100 px.

const css = readFileSync('src/styles/portal.css', 'utf8');
const rule = (selector: string) => {
  const start = css.indexOf(`${selector} {`);
  assert.ok(start >= 0, selector);
  return css.slice(start, css.indexOf('}', start));
};

test('Community: an empty "Joining when they leave" is the same empty card as the other lists', () => {
  const src = readFileSync('src/portal/pages/Community.tsx', 'utf8');
  assert.match(src, /<Empty icon="clock" title=\{stream \? `Nobody in the \$\{label\} has joined ahead of leaving yet` : 'Nobody has joined ahead of leaving yet'\} \/>/);
  assert.doesNotMatch(src, /<p className="p-muted">\{stream \? `Nobody in the/);
});

test('Community: internal jobs sit the same 32px below the wall as its sections sit apart', () => {
  assert.match(rule('.p-comm-wall-layout'), /gap: 32px var\(--p-gap\);/);
  // the page's own 18px gap plus this margin
  assert.match(rule('.p-comm-jobs'), /margin-top: 14px;/);
});

test('Community: the stream badge on a card stays on one line', () => {
  assert.match(rule('.p-comm-card-top .p-badge'), /white-space: nowrap;/);
});

test('People: IDs, phone numbers and role badges never break across lines', () => {
  assert.match(css, /\.p-table \.is-mono,\s*\.p-table \.is-nowrap,\s*\.p-table \.p-badge \{\s*white-space: nowrap;/);
  assert.match(readFileSync('src/portal/pages/PeopleConnected.tsx', 'utf8'), /<td className="is-nowrap">\s*\{p\.phone \|\| \(/);
});

test('Dashboard: the e-Office title lines up with its row, and an empty task board centres its line', () => {
  assert.match(rule('.p-eoffice-head'), /margin-top: 4px;/);
  assert.match(rule('.p-board-empty'), /text-align: center;/);
});

test('Profile: field hints keep a readable line length', () => {
  assert.match(rule('.p-field-hint'), /max-width: 75ch;/);
});
