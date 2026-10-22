import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toAccountProfile } from '../../src/portal/profile';
import { ApiError } from '../../src/portal/api';

const API = 'http://localhost:5000/api';

// GET /api/user/me for test.intern, as the local backend returns it
const intern = {
  privacySettings: { showEmail: true, showPhone: true, showProfession: true },
  _id: '6ad8bc3dd430c9b545aa2845',
  fullName: 'Test Intern',
  username: 'test.intern',
  email: 'test.intern@example.test',
  keycloakId: 'b1d2c3e4-0000-4000-8000-000000000002',
  role: 'Intern',
  profilePicture: '',
  authProvider: 'keycloak',
  qualificationStatus: 'Pursuing',
  enrolledCourses: [],
  enrolledExams: [],
  canEnrollCourses: false,
  accessLevel: 'Full Admin',
  isBanned: false,
  isDeleted: false,
  tokens: [],
  __v: 0,
  employeeId: 'BT-0002',
  stream: 'operations',
  team: 'Field Ops',
};

test("the backend's profile becomes what the page shows", () => {
  assert.deepEqual(toAccountProfile(intern, API), {
    name: 'Test Intern',
    email: 'test.intern@example.test',
    employeeId: 'BT-0002',
    role: 'intern',
    roleLabel: 'Intern',
    stream: 'operations',
    team: 'Field Ops',
    status: 'active',
    phone: undefined,
    workPhone: undefined,
    photo: undefined,
  });
});

test('each account role gets its label, and a superadmin wears the admin badge', () => {
  const roles: [string, string, string][] = [
    ['Superadmin', 'admin', 'Super Admin'],
    ['Admin', 'admin', 'Admin'],
    ['Subadmin', 'subadmin', 'Sub Admin'],
    ['Employee', 'employee', 'Employee'],
    ['Intern', 'intern', 'Intern'],
    ['super-admin', 'admin', 'Super Admin'],
  ];
  for (const [accountRole, role, roleLabel] of roles) {
    const p = toAccountProfile({ ...intern, role: accountRole }, API);
    assert.deepEqual([p.role, p.roleLabel], [role, roleLabel], accountRole);
  }
});

test('an unknown role shows the least-privileged badge', () => {
  const p = toAccountProfile({ ...intern, role: 'Auditor' }, API);
  assert.deepEqual([p.role, p.roleLabel], ['employee', 'Employee']);
});

test('a banned account shows as inactive', () => {
  assert.equal(toAccountProfile({ ...intern, isBanned: true }, API).status, 'inactive');
});

test('stream, team and IDs that are missing, empty or unknown read as not set', () => {
  const p = toAccountProfile({ ...intern, employeeId: '', stream: 'sales', team: '   ' }, API);
  assert.equal(p.employeeId, undefined);
  assert.equal(p.stream, undefined);
  assert.equal(p.team, undefined);
  const q = toAccountProfile({ ...intern, employeeId: undefined, stream: undefined, team: undefined }, API);
  assert.deepEqual([q.employeeId, q.stream, q.team], [undefined, undefined, undefined]);
});

test("phone numbers come from phone and workPhone, falling back to Keycloak's phoneNumber", () => {
  assert.deepEqual(
    [toAccountProfile({ ...intern, phone: '+91 98765 43210', workPhone: '080 1234 5678' }, API).phone, toAccountProfile({ ...intern, phone: '+91 98765 43210', workPhone: '080 1234 5678' }, API).workPhone],
    ['+91 98765 43210', '080 1234 5678'],
  );
  assert.equal(toAccountProfile({ ...intern, phoneNumber: '+91 90000 00000' }, API).phone, '+91 90000 00000');
});

test("a photo uploaded to the backend is loaded from the backend's address", () => {
  assert.equal(toAccountProfile({ ...intern, profilePicture: '/uploads/abc.png' }, API).photo, 'http://localhost:5000/uploads/abc.png');
  assert.equal(toAccountProfile({ ...intern, profilePicture: 'https://res.cloudinary.com/x/y.png' }, API).photo, 'https://res.cloudinary.com/x/y.png');
});

test('a photo address that is not a web address is ignored', () => {
  for (const profilePicture of ['javascript:alert(1)', 'data:text/html,hi', '../../etc/passwd', 'uploads/x.png']) {
    assert.equal(toAccountProfile({ ...intern, profilePicture }, API).photo, undefined, profilePicture);
  }
});

test('a name falls back to the username, then the email', () => {
  assert.equal(toAccountProfile({ ...intern, fullName: '' }, API).name, 'test.intern');
  assert.equal(toAccountProfile({ ...intern, fullName: '', username: '' }, API).name, 'test.intern@example.test');
});

test('an answer that is not a profile is an error, not an empty page', () => {
  for (const raw of [null, 'oops', [], { message: 'hi' }]) {
    assert.throws(() => toAccountProfile(raw, API), (e: unknown) => e instanceof ApiError && e.kind === 'unavailable');
  }
});
