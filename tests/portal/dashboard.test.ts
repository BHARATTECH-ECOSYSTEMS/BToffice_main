import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardRoleLine, certificatesByType, contactCard, issuedInLastDays, managerFigures, ownEvents, peopleByRole, toCardPerson } from '../../src/portal/dashboard';
import { SEED_EVENTS, type CalendarEvent } from '../../src/portal/data';
import type { AccountProfile } from '../../src/portal/profile';
import type { DirectoryPerson } from '../../src/portal/people';
import type { IssuedCertificate } from '../../src/portal/certificates';

const intern: AccountProfile = {
  name: 'Test Intern',
  email: 'test.intern@example.test',
  employeeId: 'BT-0002',
  role: 'intern',
  roleLabel: 'Intern',
  stream: 'operations',
  team: 'Field Ops',
  status: 'active',
  phone: '+91 90000 00002',
};

test('the ID card carries the real Employee ID, role, stream and status, and no made-up join date', () => {
  assert.deepEqual(toCardPerson(intern), {
    id: 'BT-0002',
    name: 'Test Intern',
    email: 'test.intern@example.test',
    role: 'intern',
    roleLabel: 'Intern',
    stream: 'operations',
    team: 'Field Ops',
    status: 'active',
    phone: '+91 90000 00002',
  });
});

test('a superadmin wears the admin badge but the card reads "Super Admin"', () => {
  const card = toCardPerson({ ...intern, role: 'admin', roleLabel: 'Super Admin' });
  assert.equal(card.role, 'admin');
  assert.equal(cardRoleLine(card), 'Super Admin, Operations stream');
});

test('a blocked account shows as inactive on the card', () => {
  assert.equal(toCardPerson({ ...intern, status: 'inactive' }).status, 'inactive');
});

test('the role line leaves the stream out when none is set, instead of printing "undefined stream"', () => {
  const { stream: _, ...noStream } = intern;
  assert.equal(cardRoleLine(toCardPerson(noStream)), 'Intern');
});

test("the QR contact card's note carries the real Employee ID", () => {
  const qr = contactCard(toCardPerson(intern));
  assert.match(qr, /;NOTE:Employee ID BT-0002;/);
  assert.match(qr, /;TITLE:Intern;/);
});

test('the QR contact card has no note when the account has no Employee ID yet', () => {
  const { employeeId: _, ...noId } = intern;
  assert.doesNotMatch(contactCard(toCardPerson(noId)), /NOTE:/);
});

test("the QR contact card escapes MECARD's reserved characters in names", () => {
  assert.match(contactCard(toCardPerson({ ...intern, name: 'Rao; Asha' })), /N:Rao\\; Asha;/);
});

const cert = (issuedAt: string, title = 'Course Completion'): IssuedCertificate => ({ id: issuedAt + title, number: '1', title, issuedAt });
const TODAY = new Date(2026, 9, 23, 15, 0);

test('"Last 30 days" counts certificates issued today and up to 29 days before', () => {
  const list = [cert('2026-10-23'), cert('2026-09-24'), cert('2026-09-23'), cert('')];
  assert.equal(issuedInLastDays(list, 30, TODAY), 2);
});

const person = (role: DirectoryPerson['accountRole'], status: DirectoryPerson['status'] = 'active'): DirectoryPerson => ({
  id: `${role}-${status}`,
  name: role,
  email: `${role}@example.test`,
  accountRole: role,
  role: role === 'Superadmin' || role === 'Admin' ? 'admin' : role === 'Subadmin' ? 'subadmin' : role === 'Employee' ? 'employee' : 'intern',
  roleLabel: role,
  status,
});
const people = [person('Superadmin'), person('Admin'), person('Employee'), person('Employee', 'inactive'), person('Intern', 'inactive')];

test('admin figures: users, certificates, last 30 days, and inactive accounts in place of reset links', () => {
  const figures = managerFigures({ people, certificates: [cert('2026-10-20'), cert('2026-01-02')], showCertificates: true }, TODAY);
  assert.deepEqual(
    figures.map((f) => [f.label, f.value]),
    [
      ['Users', 5],
      ['Certificates', 2],
      ['Last 30 days', 1],
      ['Inactive accounts', 2],
    ],
  );
});

test('sub admin figures leave out the certificates they are not allowed to list', () => {
  const figures = managerFigures({ people, showCertificates: false }, TODAY);
  assert.deepEqual(
    figures.map((f) => f.label),
    ['Users', 'Inactive accounts'],
  );
});

test('figures still loading have no value, rather than a made-up 0', () => {
  const figures = managerFigures({ showCertificates: true }, TODAY);
  assert.ok(figures.every((f) => f.value === undefined));
});

test('people by role counts each account role, superadmins on their own row', () => {
  assert.deepEqual(peopleByRole(people), [
    { label: 'Super Admin', value: 1 },
    { label: 'Admin', value: 1 },
    { label: 'Sub Admin', value: 0 },
    { label: 'Employee', value: 2 },
    { label: 'Intern', value: 1 },
  ]);
});

test('certificates by type count by the title the backend stores', () => {
  const rows = certificatesByType([cert('2026-10-01'), cert('2026-10-02'), cert('2026-10-03', 'Something else')]);
  assert.deepEqual(
    rows.find((r) => r.label === 'Course Completion'),
    { label: 'Course Completion', value: 2 },
  );
  assert.equal(
    rows.reduce((n, r) => n + r.value, 0),
    2,
  );
});

test("the connected calendar leaves out the demo's sample events but keeps ones added in this browser", () => {
  const added: CalendarEvent = { id: 'E101', title: 'Team sync', kind: 'meeting', date: '2026-10-28', time: '10:00', addedBy: 'Test Admin' };
  assert.deepEqual(ownEvents([...SEED_EVENTS, added]), [added]);
});
