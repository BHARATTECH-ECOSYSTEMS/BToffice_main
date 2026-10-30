import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Review 2026-10-26 low list, portal (owner's 4A and 5A): the Details window (People) and the Manage window (the
// dashboard) closed the moment Save was pressed, so a refusal lost everything typed; and removing a photo or sending
// an invite again (which replaces the temporary password) happened on one click.

const people = readFileSync('src/portal/pages/PeopleConnected.tsx', 'utf8');
const dashboard = readFileSync('src/portal/pages/DashboardConnected.tsx', 'utf8');
const settings = readFileSync('src/portal/pages/Settings.tsx', 'utf8');
const details = people.slice(people.indexOf('function DetailsModal'), people.indexOf('function DetailsModal') + 6000);
const manage = dashboard.slice(dashboard.indexOf('function ManageAccountModal'));

test('Details stays open while it saves, and a refusal shows inside it with the typing kept', () => {
  assert.match(details, /onSave: \(details: \{[^}]+\}\) => Promise<void>;/);
  assert.match(details, /await onSave\(\{/);
  assert.match(details, /setFailure\(saveFailedMessage\(e as ApiError\)\)/);
  assert.match(details, /\{failure && \(\s*<p className="p-error" role="alert">\s*\{failure\}/);
  assert.match(details, /disabled=\{saving\}>\s*<BtnLabel>\{saving \? 'Saving…' : 'Save'\}<\/BtnLabel>/);
  // it closes only once the save went through
  assert.match(details, /\}\);\s*onClose\(\);\s*\} catch/);
});

test('Manage does the same', () => {
  assert.match(manage, /onSave: \(role: AccountRole\) => Promise<void>;/);
  assert.match(manage, /if \(role !== person\.accountRole\) await onSave\(role\);\s*onClose\(\);\s*\} catch/);
  assert.match(manage, /setFailure\(saveFailedMessage\(e as ApiError\)\)/);
});

test('the pages hand the windows a save that reports a refusal back to them', () => {
  assert.match(people, /onSave=\{\(details\) => saveHere\(editing, \(\) => directory\.saveDetails\(editing\.id, details\)/);
  assert.match(dashboard, /onSave=\{\(role\) => saveHere\(managing, \(\) => directory\.changeRole\(managing\.id, role\)/);
});

test('sending an invite again asks first: the old temporary password stops working', () => {
  assert.match(people, /onClick=\{\(\) => setResending\(p\)\}/);
  assert.match(people, /title=\{`Send \$\{resending\.name\} a new invite\?`\}/);
  assert.match(people, /their old temporary password stops working/);
});

test('removing a photo asks first, in Settings and in Details', () => {
  assert.match(settings, /onClick=\{\(\) => setConfirmingRemove\(true\)\}/);
  assert.match(settings, /title="Remove your photo\?"/);
  // Details: the photo field asks the Details window, which draws the confirm (confirmOutsideForms.test.ts)
  assert.match(people, /onClick=\{\(\) => onAskRemove\(remove\)\}/);
  assert.match(people, /title=\{`Remove \$\{person\.name\}’s photo\?`\}/);
});
