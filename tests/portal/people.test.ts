import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canDelete, canEditDetails, canEditPerson, cleanName, inviteChoices, inviteEmailFailed, joinDateProblem, latestJoinDate, pendingInviteFailedMessage, readAccountRole, readJoinDate, roleChoices, toDirectory, toPendingInvites, type AccountRole } from '../../src/portal/people';
import { ApiError } from '../../src/portal/api';

// GET /api/user/directory, as the local backend returns it
const asha = {
  id: '6ad8bc3dd430c9b545aa2844',
  employeeId: 'BT-0003',
  name: 'Asha Rao',
  email: 'asha.rao@example.test',
  role: 'Subadmin',
  phone: '+91 98765 00001',
  workPhone: '+91 80 4000 0001',
  stream: 'hr',
  team: 'People Ops',
  joinedOn: '2024-03-01',
  status: 'active',
};

test('the directory becomes the rows the page shows', () => {
  assert.deepEqual(toDirectory([asha]), [
    {
      id: '6ad8bc3dd430c9b545aa2844',
      employeeId: 'BT-0003',
      name: 'Asha Rao',
      email: 'asha.rao@example.test',
      accountRole: 'Subadmin',
      role: 'subadmin',
      roleLabel: 'Sub Admin',
      phone: '+91 98765 00001',
      workPhone: '+91 80 4000 0001',
      stream: 'hr',
      team: 'People Ops',
      joined: '2024-03-01',
      status: 'active',
    },
  ]);
});

test('missing details read as not set, and an inactive account stays inactive', () => {
  const [p] = toDirectory([{ id: 'u2', name: 'New Joiner', email: 'new@example.test', role: 'Intern', stream: null, team: '', status: 'inactive' }]);
  assert.deepEqual([p.employeeId, p.stream, p.team, p.phone, p.joined, p.status], [undefined, undefined, undefined, undefined, undefined, 'inactive']);
});

test('a join date is only taken when it is a real day written YYYY-MM-DD', () => {
  assert.equal(readJoinDate('2024-02-29'), '2024-02-29');
  for (const junk of ['2023-02-29', '2024-13-01', '01/03/2024', '2024-3-1', '', null, undefined, 20240301]) assert.equal(readJoinDate(junk), undefined, String(junk));
  assert.equal(toDirectory([{ ...asha, joinedOn: '2024-02-30' }])[0].joined, undefined);
});

test('a join date is checked the way the backend checks it: from 1990 to a year ahead, and empty clears it', () => {
  const today = '2026-10-23';
  assert.equal(latestJoinDate(today), '2027-10-23');
  for (const ok of ['', '1990-01-01', '2024-03-01', '2027-10-23']) assert.equal(joinDateProblem(ok, today), '', ok);
  for (const bad of ['1989-12-31', '2027-10-24', '2023-02-29']) assert.match(joinDateProblem(bad, today), /1990/, bad);
});

test('an entry without an id or email is skipped instead of breaking the list', () => {
  const rows = toDirectory([asha, { name: 'No id', email: 'x@example.test', role: 'Employee' }, { id: 'u3', name: 'No email', role: 'Employee' }, null, 'junk']);
  assert.deepEqual(rows.map((r) => r.name), ['Asha Rao']);
});

test('an answer that is not a list is an error, not an empty directory', () => {
  for (const raw of [null, { message: 'hi' }, 'oops']) {
    assert.throws(() => toDirectory(raw), (e: unknown) => e instanceof ApiError && e.kind === 'unavailable');
  }
});

test('account roles are read the ways the backend writes them, and unknown ones get the least access', () => {
  assert.equal(readAccountRole('Superadmin'), 'Superadmin');
  assert.equal(readAccountRole('super-admin'), 'Superadmin');
  assert.equal(readAccountRole('SUBADMIN'), 'Subadmin');
  assert.equal(readAccountRole('Sub Admin'), 'Subadmin');
  assert.equal(readAccountRole('Auditor'), 'Employee');
  assert.equal(readAccountRole(undefined), 'Employee');
});

// The backend's own rules (controllers/userController.js canAssignRole and canDeleteUser), written out by hand.
const ROLES: AccountRole[] = ['Superadmin', 'Admin', 'Subadmin', 'Employee', 'Intern'];

test('a superadmin can give anyone any role', () => {
  for (const target of ROLES) assert.deepEqual(roleChoices('Superadmin', target), ROLES, target);
});

test('an admin can move sub admins, employees and interns between those three only', () => {
  for (const target of ['Subadmin', 'Employee', 'Intern'] as AccountRole[]) {
    assert.deepEqual(roleChoices('Admin', target), ['Subadmin', 'Employee', 'Intern'], target);
  }
  assert.deepEqual(roleChoices('Admin', 'Admin'), []);
  assert.deepEqual(roleChoices('Admin', 'Superadmin'), []);
});

test('sub admins, employees and interns change no roles', () => {
  for (const actor of ['Subadmin', 'Employee', 'Intern'] as AccountRole[]) {
    for (const target of ROLES) assert.deepEqual(roleChoices(actor, target), [], `${actor} → ${target}`);
  }
});

test('who can delete whom', () => {
  const allowed = (actor: AccountRole) => ROLES.filter((target) => canDelete(actor, target));
  assert.deepEqual(allowed('Superadmin'), ['Admin', 'Subadmin', 'Employee', 'Intern']);
  assert.deepEqual(allowed('Admin'), ['Subadmin', 'Employee', 'Intern']);
  assert.deepEqual(allowed('Subadmin'), []);
  assert.deepEqual(allowed('Employee'), []);
  assert.deepEqual(allowed('Intern'), []);
});

// The backend's canInviteRole (controllers/inviteController.js), written out by hand.
test('who can invite which roles', () => {
  assert.deepEqual(inviteChoices('Superadmin'), ROLES);
  assert.deepEqual(inviteChoices('Admin'), ['Employee', 'Intern']);
  for (const actor of ['Subadmin', 'Employee', 'Intern'] as AccountRole[]) assert.deepEqual(inviteChoices(actor), [], actor);
});

test('an invite whose login was made but whose email failed is told apart from other failures', () => {
  // the backend's answer when the mail server refuses (controllers/inviteController.js sendInvite)
  const emailFailed = new ApiError('unavailable', 'Invite email could not be sent.', { success: false, inviteEmailSent: false, resent: false, keycloakSynced: true });
  assert.equal(inviteEmailFailed(emailFailed), true);
  assert.equal(inviteEmailFailed(new ApiError('unavailable', 'Failed to send invite', { success: false, message: 'Failed to send invite' })), false);
  assert.equal(inviteEmailFailed(new ApiError('unavailable')), false);
});

test('only admins and superadmins edit stream and team', () => {
  assert.deepEqual(ROLES.filter((r) => canEditDetails(r)), ['Superadmin', 'Admin']);
});

test("whose details (name, stream, team) each role may change, as the backend's canEditUser allows", () => {
  const allowed = (actor: AccountRole) => ROLES.filter((target) => canEditPerson(actor, target));
  assert.deepEqual(allowed('Superadmin'), ROLES);
  assert.deepEqual(allowed('Admin'), ['Subadmin', 'Employee', 'Intern']);
  for (const actor of ['Subadmin', 'Employee', 'Intern'] as AccountRole[]) assert.deepEqual(allowed(actor), [], actor);
});

test('a name is checked the way the backend checks it', () => {
  assert.equal(cleanName('  Asha   Rao '), 'Asha Rao');
  assert.equal(cleanName('आशा राव'), 'आशा राव');
  assert.equal(cleanName('A'), null);
  assert.equal(cleanName('x'.repeat(60)), 'x'.repeat(60));
  assert.equal(cleanName('x'.repeat(61)), null);
  assert.equal(cleanName('Bad\u0007Name'), null);
});

// --- pending invites (GET /api/invite/pending, DELETE /api/invite/pending/:id; step 17 Part 2) ---

test('pending invites become rows with the role read safely and the date as a number', () => {
  const rows = toPendingInvites([
    { id: 'kc-1', name: 'New Hire', email: 'new.hire@example.test', role: 'Employee', invitedAt: '2026-10-20T10:00:00.000Z' },
    { id: 'kc-2', name: '', email: 'boss@example.test', role: 'Admin', invitedAt: null },
    { id: 'kc-3', name: 'Odd', email: 'odd@example.test', role: 'Wizard', invitedAt: 'soon' },
    { id: '', email: 'no.id@example.test' },
    { id: 'kc-5', name: 'No Email' },
    null,
  ]);
  assert.deepEqual(rows, [
    { id: 'kc-1', name: 'New Hire', email: 'new.hire@example.test', role: 'Employee', invitedAt: Date.parse('2026-10-20T10:00:00.000Z'), expired: false },
    { id: 'kc-2', name: 'boss@example.test', email: 'boss@example.test', role: 'Admin', invitedAt: null, expired: false },
    { id: 'kc-3', name: 'Odd', email: 'odd@example.test', role: 'Employee', invitedAt: null, expired: false },
  ]);
  assert.throws(() => toPendingInvites({ message: 'nope' }), (e: unknown) => e instanceof ApiError && e.kind === 'unavailable');
});

test("a refused cancel shows the backend's own words; other failures a plain explanation", () => {
  assert.equal(pendingInviteFailedMessage(new ApiError('conflict', "They've already accepted the invite, so it can't be cancelled. Remove them from People instead.")), "They've already accepted the invite, so it can't be cancelled. Remove them from People instead.");
  assert.equal(pendingInviteFailedMessage(new ApiError('forbidden', 'Your role can’t cancel this invite.')), 'Your role can’t cancel this invite.');
  assert.match(pendingInviteFailedMessage(new ApiError('unavailable')), /nothing was changed/i);
});
