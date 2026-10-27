import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Review 2026-10-26 W5 (owner's 3A): the email switches loaded once, when the page opened. If that failed, or someone
// clicked before it finished, the page took "nothing switched off" for the saved state, and one click saved that
// over every switch they had. "Reopen this to try again" never loaded them again. Now the switches are locked until
// they've loaded, and a failed load is tried again on opening them and by a Try again button.

const hook = readFileSync('src/portal/notifications.ts', 'utf8');
const layout = readFileSync('src/portal/PortalLayout.tsx', 'utf8');
const switches = hook.slice(hook.indexOf('export function useEmailSwitches'));

test('until the saved switches have loaded, a click changes and saves nothing', () => {
  assert.match(switches, /useState<NotificationKind\[\] \| null>\(null\)/);
  assert.match(switches, /if \(!api \|\| muted === null\) return;/);
  assert.match(switches, /ready: muted !== null/);
});

test('a failed load can be tried again, and is no longer told to reopen', () => {
  assert.doesNotMatch(hook, /Reopen this to try again/);
  assert.match(switches, /const load = useCallback\(/);
  assert.match(switches, /retry: \(\) => failed && load\(\)/);
});

test('the bell locks the switches until ready, retries on opening them, and offers Try again', () => {
  assert.match(layout, /disabled=\{!switches\.ready\}/);
  // a locked switch looks locked: until loaded, its position isn't the saved one
  assert.match(readFileSync('src/styles/portal.css', 'utf8'), /\.p-switch:disabled \{\s*cursor: default;\s*opacity: 0\.5;/);
  assert.match(layout, /onClick=\{\(\) => \(show\('email'\), switches\.retry\(\)\)\}/);
  assert.match(layout, /\{switches\.failed && \(\s*<button type="button" className="p-text-btn" onClick=\{switches\.retry\}>\s*Try again/);
});
