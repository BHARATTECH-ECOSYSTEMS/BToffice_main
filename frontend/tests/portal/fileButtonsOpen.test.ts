import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Review 2026-10-26 W1 and W2 (owner's 4A): the uploaded files' Open buttons sat inside a box (fieldset) that was
// switched off once a request was decided, or while something saved, and switching off a box switches off every
// button in it: admins couldn't open a decided request's files, and employees couldn't open their own on Profile
// though the page said they could. Now only the controls that change something are switched off.

const verification = readFileSync('src/portal/pages/Verification.tsx', 'utf8');
const profile = readFileSync('src/portal/pages/Profile.tsx', 'utf8');

test("the Verification page's documents box is never switched off as a whole", () => {
  assert.match(verification, /<fieldset className="p-file-docs" data-decided=\{!pending \|\| undefined\}>/);
  assert.doesNotMatch(verification, /<fieldset className="p-file-docs"[^>]*disabled/);
  // a decided request keeps its look (a plain pointer, no hover) through the marker instead
  const css = readFileSync('src/styles/portal.css', 'utf8');
  assert.match(css, /\.p-file-docs\[data-decided\] \.p-doc \{\s*cursor: default;/);
  assert.doesNotMatch(css, /\.p-file-docs:(not\()?disabled/);
});

test('on it, the ticks and "Not applicable" are what stop once decided or while saving', () => {
  assert.match(verification, /disabled=\{waitingFor\(c\.id\) \|\| !pending \|\| saving\}/);
  assert.match(verification, /className=\{`\$\{btnClass\('ghost', \{ small: true \}\)\} p-skip`\}\s+disabled=\{saving\}/);
});

test("Profile's document boxes are never switched off: what changes a file only shows while uploads are open", () => {
  assert.equal((profile.match(/<fieldset className="p-docs">/g) || []).length, 3);
  assert.doesNotMatch(profile, /<fieldset className="p-docs" disabled/);
  // the controls that change a file are still only there while uploads are open
  assert.match(profile, /\{canUpload && \(\s*<>\s*<button/);
  assert.match(profile, /\{canEdit && \(\s*<button/);
  assert.match(profile, /\{canEdit && !hasLetter && \(/);
});
