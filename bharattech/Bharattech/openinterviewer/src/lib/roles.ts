// Keycloak role names arrive spelled many ways ("Superadmin", "super-admin", "Super Admin", "ROLE_ADMIN"), so they
// are compared squashed: lower case, no "role" prefix, no spaces, dashes or underscores.
export function normalizeRole(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^role[\s:_-]+/, '')
    .replace(/[\s_-]+/g, '');
}

export function isAdminRole(value: string) {
  const normalized = normalizeRole(value);
  return normalized === 'admin' || normalized === 'superadmin';
}
