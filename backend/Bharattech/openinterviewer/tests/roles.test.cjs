// Step 14 Part 2: Keycloak role names come as "Superadmin", "super-admin", "Super Admin" and so on. The company's
// realm script names it "Super-admin" (which the candidate page's old check matched); the launch check and the
// candidate page now share one helper that accepts every spelling, so a realm set up differently still works.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isAdminRole } = require('@/lib/roles');

test('Admin and Super Admin are recognised however Keycloak spells them', () => {
  for (const role of ['Admin', 'admin', 'Superadmin', 'SuperAdmin', 'super-admin', 'Super Admin', 'super_admin', 'ROLE_ADMIN']) {
    assert.equal(isAdminRole(role), true, role);
  }
});

test('other roles are not admins', () => {
  for (const role of ['Subadmin', 'Employee', 'Intern', 'offline_access', 'default-roles-bharattech', '']) {
    assert.equal(isAdminRole(role), false, role);
  }
});
