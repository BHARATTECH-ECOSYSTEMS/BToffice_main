import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Re-check of steps 1–9 (2026-10-27, owner's fix A): "Remove photo" did nothing and reloaded the page, in Settings and
// in People → Details. Its confirm window (a Modal with onSubmit, so a <form>) was drawn inside another form; Chrome
// never let that inner submit reach React, so the browser submitted it natively. The confirm windows now sit outside
// the outer forms.

const settings = readFileSync('src/portal/pages/Settings.tsx', 'utf8');
const people = readFileSync('src/portal/pages/PeopleConnected.tsx', 'utf8');

const between = (src: string, from: string, to: string) => {
  const start = src.indexOf(from);
  assert.ok(start >= 0, `${from} not found`);
  const end = src.indexOf(to, start);
  assert.ok(end > start, `${to} not found after ${from}`);
  return src.slice(start, end);
};

test('Settings: the "Remove your photo?" window is drawn after the Profile card, not inside its form', () => {
  const panel = between(settings, 'function ProfilePanel', '\n}\n');
  const card = between(panel, '<SettingsCard', '</SettingsCard>');
  assert.doesNotMatch(card, /<Modal/, 'no window inside the Profile card (it is a <form>)');
  const after = panel.slice(panel.indexOf('</SettingsCard>'));
  assert.match(after, /\{confirmingRemove && \(\s*<Modal\s+title="Remove your photo\?"/);
  assert.match(panel, /onClick=\{\(\) => setConfirmingRemove\(true\)\}/, 'Remove still asks first');
});

test('People → Details: the photo field asks the Details window, which draws the confirm after its own form', () => {
  const field = between(people, 'function PhotoField', '\n}\n');
  assert.doesNotMatch(field, /<Modal/, 'no window inside the photo field (it sits in the Details <form>)');
  assert.match(field, /onClick=\{\(\) => onAskRemove\(remove\)\}/, 'Remove asks first');
  const details = between(people, 'function DetailsModal', '\nfunction ');
  assert.match(details, /<PhotoField person=\{person\} problem=\{photoProblem\} onAskRemove=\{\(remove\) => setRemovingPhoto\(\(\) => remove\)\} \/>/);
  // the Details window's own Modal closes first, then the confirm follows as its sibling
  const confirmAt = details.indexOf('{removingPhoto && (');
  assert.ok(confirmAt > details.lastIndexOf('</Modal>', confirmAt) && details.lastIndexOf('</Modal>', confirmAt) > 0, 'the confirm comes after the Details window');
  assert.match(details.slice(confirmAt), /title=\{`Remove \$\{person\.name\}’s photo\?`\}/);
});

test('no other window in these two files is drawn inside a Settings card form', () => {
  for (const card of settings.split('<SettingsCard').slice(1)) {
    assert.doesNotMatch(card.slice(0, card.indexOf('</SettingsCard>')), /<Modal/);
  }
});
