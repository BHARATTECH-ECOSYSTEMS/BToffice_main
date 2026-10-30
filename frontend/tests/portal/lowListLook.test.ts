import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Review 2026-10-26 low list, portal (owner's 7A): three CSS rules waited for classes nothing sets, and every portal
// text box was at least 140 px tall whatever its own rows said. Now each box is as tall as its rows; the two meant for
// long text (a task's description, a job's "About") keep about the old height with five rows.

const css = readFileSync('src/styles/portal.css', 'utf8');

test('the three rules nothing used are gone', () => {
  for (const rule of ['.p-checks.is-plain', '.p-field-hint.is-bad', '.p-badge.is-text']) assert.ok(!css.includes(rule), rule);
});

test('text boxes are as tall as their own rows', () => {
  const box = css.slice(css.indexOf('.p-field textarea {'), css.indexOf('}', css.indexOf('.p-field textarea {')));
  assert.doesNotMatch(box, /min-height/);
});

test('the long-text boxes keep about the old height', () => {
  assert.match(readFileSync('src/portal/pages/TasksConnected.tsx', 'utf8'), /<textarea value=\{description\} rows=\{5\}/);
  assert.match(readFileSync('src/portal/pages/CommunityJobs.tsx', 'utf8'), /<textarea value=\{about\} onChange=\{change\(setAbout\)\} rows=\{5\}/);
});
