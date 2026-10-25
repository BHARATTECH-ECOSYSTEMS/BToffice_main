import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAuth, type AuthConfig } from '../../src/portal/auth';
import { BUSY_MESSAGE } from '../../src/portal/api';
import { toPendingInvites } from '../../src/portal/people';
import { TOOLS } from '../../src/portal/data';

// 2026-10-25 gap audit, group A, Part 4 (owner's 5A 6A): an invite really expires after 12 hours, waits are
// described honestly, and the Learning help and Coder card say what is true.

const CONFIG: AuthConfig = { api: 'http://api.test/api', keycloak: 'http://kc.test', realm: 'bharattech', clientId: 'lms-client' };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const answering = (reply: Response) => (async () => reply) as unknown as typeof fetch;
const EXPIRED = { code: 'invite-expired', message: 'This invite has expired. Ask an admin to send it again.' };

test('signing in with an expired invite says so, instead of "details don’t match"', async () => {
  const auth = createAuth(CONFIG, answering(json(410, EXPIRED)));
  assert.deepEqual(await auth.signIn('new.hire@example.test', 'temp', false), { ok: false, reason: 'invite-expired' });
});

test('finishing an expired invite says so too', async () => {
  const auth = createAuth(CONFIG, answering(json(410, EXPIRED)));
  const result = await auth.acceptInvite({ username: 'new.hire@example.test', temporaryPassword: 'temp', newPassword: 'Brand-New-Pass-1', newUsername: 'new.hire' }, false);
  assert.deepEqual(result, { ok: false, reason: 'invite-expired' });
});

test('pending invites carry whether they have expired', () => {
  const [late, fresh, odd] = toPendingInvites([
    { id: 'kc-1', email: 'late@example.test', role: 'Employee', invitedAt: '2026-10-20T10:00:00.000Z', expired: true },
    { id: 'kc-2', email: 'fresh@example.test', role: 'Employee', invitedAt: '2026-10-25T10:00:00.000Z', expired: false },
    { id: 'kc-3', email: 'odd@example.test', role: 'Employee', expired: 'yes' },
  ]);
  assert.equal(late.expired, true);
  assert.equal(fresh.expired, false);
  assert.equal(odd.expired, false);
});

test('waits are not promised as "a minute": the limits last up to 15 minutes', () => {
  assert.doesNotMatch(BUSY_MESSAGE, /a minute/);
  for (const file of ['src/components/Login.tsx', 'src/portal/pages/Settings.tsx']) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /[Ww]ait a minute/, file);
  }
});

test('the Learning help no longer tells people to sign in there themselves', () => {
  const help = readFileSync('src/portal/helpTopics.ts', 'utf8');
  assert.doesNotMatch(help, /Sign in there with your work email/);
});

test('the Coder card says Windows only and that it needs an AI key', () => {
  const coder = TOOLS.find((t) => t.id === 'coder')!;
  assert.deepEqual(coder.tags, ['Windows']);
  assert.match(coder.body, /AI key/);
});
