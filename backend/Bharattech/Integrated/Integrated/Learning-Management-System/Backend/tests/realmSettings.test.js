const { test } = require("node:test");
const assert = require("node:assert/strict");

// Security report 2026-10-28 (owner's F4A, F7A): the realm script is how the company sets up its live realm, so the
// settings that keep it safe live there, not only on the laptop.
const { REALM_SETTINGS, adminOnlyIdentity } = require("../scripts/setupKeycloakRealm");

test("nobody signs themselves up, and wrong passwords lock an account for a while, never for good", () => {
  assert.equal(REALM_SETTINGS.registrationAllowed, false);
  // lead 4: 5 wrong tries, then 1 minute doubling up to 15, as on the laptop's test realm
  assert.equal(REALM_SETTINGS.bruteForceProtected, true);
  assert.equal(REALM_SETTINGS.permanentLockout, false, "a permanent lock would let anyone lock someone out");
  assert.equal(REALM_SETTINGS.failureFactor, 5);
  assert.equal(REALM_SETTINGS.waitIncrementSeconds, 60);
  assert.equal(REALM_SETTINGS.maxFailureWaitSeconds, 900);
});

test("names, email and username are changed by admins only; every other field is left as the realm has it", () => {
  // lead 5: people could rename themselves in Keycloak's account page, and the portal took it as the admin's word
  const profile = {
    unmanagedAttributePolicy: "ENABLED",
    attributes: [
      { name: "username", permissions: { view: ["admin", "user"], edit: ["admin", "user"] } },
      { name: "email", permissions: { view: ["admin", "user"], edit: ["admin", "user"] }, validations: { email: {} } },
      { name: "firstName", permissions: { view: ["admin", "user"], edit: ["admin", "user"] } },
      { name: "lastName" },
      { name: "phone", permissions: { view: ["admin", "user"], edit: ["admin", "user"] } },
    ],
  };

  const locked = adminOnlyIdentity(profile);

  for (const name of ["username", "email", "firstName", "lastName"]) {
    assert.deepEqual(locked.attributes.find((a) => a.name === name).permissions.edit, ["admin"], name);
  }
  assert.deepEqual(locked.attributes.find((a) => a.name === "email").permissions.view, ["admin", "user"], "people still see their own details");
  assert.deepEqual(locked.attributes.find((a) => a.name === "email").validations, { email: {} });
  assert.deepEqual(locked.attributes.find((a) => a.name === "phone").permissions.edit, ["admin", "user"]);
  assert.equal(locked.unmanagedAttributePolicy, "ENABLED");
  assert.deepEqual(profile.attributes[0].permissions.edit, ["admin", "user"], "the realm's own copy isn't changed in place");
});

test("username editing stays on: Keycloak 24 refuses even the admin's rename when an invitee picks a username without it", () => {
  assert.equal(REALM_SETTINGS.editUsernameAllowed, true);
});
