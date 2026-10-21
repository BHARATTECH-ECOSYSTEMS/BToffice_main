/**
 * Keycloak realm bootstrap for the bharattech LMS.
 *
 * Run once to create the realm, roles, and lock down self-registration:
 *   node scripts/setupKeycloakRealm.js
 *
 * Can also be invoked via POST /api/admin/setup-realm (SuperAdmin only).
 */

const KcAdminClient = require("keycloak-admin").default;

const KEYCLOAK_BASE_URL =
  process.env.KEYCLOAK_BASE_URL ||
  process.env.KEYCLOAK_URL ||
  "http://localhost:8080";
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "bharattech";
const KEYCLOAK_ADMIN_REALM = process.env.KEYCLOAK_ADMIN_REALM || "master";
const KEYCLOAK_ADMIN_USERNAME = process.env.KEYCLOAK_ADMIN_USERNAME || "admin";
const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || "admin";

// App role name → Keycloak realm role name
const REALM_ROLES = [
  { name: "Super-admin", description: "Top-level administrator. Can manage all users and invite Admins." },
  { name: "admin",       description: "Administrator. Can manage Employee and Intern users." },
  { name: "Subadmin",    description: "Sub-administrator role." },
  { name: "Employee",    description: "Standard employee." },
  { name: "Intern",      description: "Intern / trainee." },
];

// Composite role members: these roles are "contained" inside Super-admin
// so any user with Super-admin implicitly has the permissions of the listed roles.
const SUPER_ADMIN_COMPOSITE_MEMBERS = ["admin", "Subadmin", "Employee", "Intern"];

const kcAdmin = new KcAdminClient({
  baseUrl: KEYCLOAK_BASE_URL,
  realmName: KEYCLOAK_ADMIN_REALM,
});

async function authAdmin() {
  await kcAdmin.auth({
    username: KEYCLOAK_ADMIN_USERNAME,
    password: KEYCLOAK_ADMIN_PASSWORD,
    grantType: "password",
    clientId: "admin-cli",
  });
}

async function getOrCreateRealm() {
  const existing = await kcAdmin.realms.findOne({ realm: KEYCLOAK_REALM }).catch(() => null);

  if (existing) {
    console.log(`Realm "${KEYCLOAK_REALM}" already exists — updating settings.`);
    await kcAdmin.realms.update(
      { realm: KEYCLOAK_REALM },
      {
        registrationAllowed: false,         // no self-registration
        registrationEmailAsUsername: false, // usernames are name-based, not email-based
        loginWithEmailAllowed: true,
        duplicateEmailsAllowed: false,
        resetPasswordAllowed: true,
        editUsernameAllowed: true,           // invitees choose their own username when accepting
      }
    );
    return existing;
  }

  console.log(`Creating realm "${KEYCLOAK_REALM}"...`);
  await kcAdmin.realms.create({
    realm: KEYCLOAK_REALM,
    enabled: true,
    displayName: "BharatTech LMS",
    registrationAllowed: false,             // invitation-only
    registrationEmailAsUsername: false,     // usernames are name-based, not email-based
    loginWithEmailAllowed: true,
    duplicateEmailsAllowed: false,
    resetPasswordAllowed: true,
    editUsernameAllowed: true,               // invitees choose their own username when accepting
    sslRequired: "external",
  });

  return kcAdmin.realms.findOne({ realm: KEYCLOAK_REALM });
}

async function upsertRealmRoles() {
  const createdRoles = {};

  for (const roleDef of REALM_ROLES) {
    let role = await kcAdmin.roles
      .findOneByName({ realm: KEYCLOAK_REALM, name: roleDef.name })
      .catch(() => null);

    if (role?.id) {
      console.log(`  Role "${roleDef.name}" already exists.`);
    } else {
      console.log(`  Creating role "${roleDef.name}"...`);
      await kcAdmin.roles.create({
        realm: KEYCLOAK_REALM,
        name: roleDef.name,
        description: roleDef.description,
        composite: false,
      });
      role = await kcAdmin.roles.findOneByName({ realm: KEYCLOAK_REALM, name: roleDef.name });
    }

    createdRoles[roleDef.name] = role;
  }

  return createdRoles;
}

async function configureCompositeRoles(createdRoles) {
  const superAdminRole = createdRoles["Super-admin"];
  if (!superAdminRole?.id) {
    console.warn('  Super-admin role not found — skipping composite setup.');
    return;
  }

  const membersToAdd = SUPER_ADMIN_COMPOSITE_MEMBERS
    .map((name) => createdRoles[name])
    .filter((r) => r?.id);

  if (!membersToAdd.length) {
    console.log('  No composite role members to add.');
    return;
  }

  // Fetch existing composites to avoid duplicates
  let existingComposites = [];
  try {
    existingComposites = await kcAdmin.roles.getCompositeRolesForRealm({
      realm: KEYCLOAK_REALM,
      id: superAdminRole.id,
    }) || [];
  } catch {
    existingComposites = [];
  }

  const existingNames = new Set(existingComposites.map((r) => r.name));
  const toAdd = membersToAdd.filter((r) => !existingNames.has(r.name));

  if (!toAdd.length) {
    console.log('  Super-admin composite roles already configured.');
    return;
  }

  console.log(`  Adding composite members to Super-admin: ${toAdd.map((r) => r.name).join(', ')}`);
  await kcAdmin.roles.createComposite(
    { realm: KEYCLOAK_REALM, roleId: superAdminRole.id },
    toAdd.map((r) => ({ id: r.id, name: r.name }))
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Connected app origins — THESE MUST BE ADDED to the Keycloak client so that
// check-sso iframes and OAuth redirects are accepted.
//
// LINE 167 — Add new app origins here:
// ─────────────────────────────────────────────────────────────────────────────
const CONNECTED_APP_ORIGINS = [
  process.env.FRONTEND_URL        || 'http://localhost:5173',  // LMS Dashboard
  process.env.VITE_BHARAT_URL     || 'http://localhost:8081',  // Bharat website
  process.env.OPEN_INTERVIEWER_URL || 'http://localhost:3000', // OpenInterviewer
];

const KEYCLOAK_CLIENT_ID_APP = process.env.KEYCLOAK_CLIENT_ID || 'lms-client';
// Browser-facing Keycloak client used by OpenInterviewer's authorization-code flow
const KEYCLOAK_OPENINTERVIEWER_CLIENT_ID = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'openinterviewer-client';

// Protocol mappers that embed firstName/lastName into the JWT as
// given_name, family_name, and name claims.
// Without these, only preferred_username appears in the token.
const NAME_PROTOCOL_MAPPERS = [
  {
    name: 'given name',
    protocol: 'openid-connect',
    protocolMapper: 'oidc-usermodel-property-mapper',
    consentRequired: false,
    config: {
      'userinfo.token.claim': 'true',
      'user.attribute': 'firstName',
      'id.token.claim': 'true',
      'access.token.claim': 'true',
      'claim.name': 'given_name',
      'jsonType.label': 'String',
    },
  },
  {
    name: 'family name',
    protocol: 'openid-connect',
    protocolMapper: 'oidc-usermodel-property-mapper',
    consentRequired: false,
    config: {
      'userinfo.token.claim': 'true',
      'user.attribute': 'lastName',
      'id.token.claim': 'true',
      'access.token.claim': 'true',
      'claim.name': 'family_name',
      'jsonType.label': 'String',
    },
  },
  {
    name: 'full name',
    protocol: 'openid-connect',
    protocolMapper: 'oidc-full-name-mapper',
    consentRequired: false,
    config: {
      'id.token.claim': 'true',
      'access.token.claim': 'true',
      'userinfo.token.claim': 'true',
    },
  },
  {
    name: 'email',
    protocol: 'openid-connect',
    protocolMapper: 'oidc-usermodel-property-mapper',
    consentRequired: false,
    config: {
      'userinfo.token.claim': 'true',
      'user.attribute': 'email',
      'id.token.claim': 'true',
      'access.token.claim': 'true',
      'claim.name': 'email',
      'jsonType.label': 'String',
    },
  },
];

async function getOrCreateClientInRealm() {
  await authAdmin();
  const clients = await kcAdmin.clients.find({ realm: KEYCLOAK_REALM, clientId: KEYCLOAK_CLIENT_ID_APP });
  return clients?.[0] || null;
}

async function configureNameProtocolMappers() {
  const client = await getOrCreateClientInRealm();
  if (!client?.id) {
    console.warn(`  Client "${KEYCLOAK_CLIENT_ID_APP}" not found — skipping protocol mapper setup.`);
    return;
  }

  const existing = await kcAdmin.clients.listProtocolMappers({
    realm: KEYCLOAK_REALM,
    id: client.id,
  });
  const existingNames = new Set((existing || []).map((m) => m.name));

  let added = 0;
  for (const mapper of NAME_PROTOCOL_MAPPERS) {
    if (existingNames.has(mapper.name)) {
      console.log(`  Mapper "${mapper.name}" already exists.`);
      continue;
    }
    await kcAdmin.clients.addProtocolMapper({ realm: KEYCLOAK_REALM, id: client.id }, mapper);
    console.log(`  Added mapper: "${mapper.name}" → claim "${mapper.config['claim.name'] || mapper.name}"`);
    added++;
  }

  if (!added) {
    console.log('  All name protocol mappers already configured.');
  }
}

async function configureClientRedirectUris(clientId = KEYCLOAK_CLIENT_ID_APP) {
  await authAdmin();
  const clients = await kcAdmin.clients.find({ realm: KEYCLOAK_REALM, clientId });
  const client = clients?.[0] || null;
  if (!client?.id) {
    console.warn(`  Client "${clientId}" not found — skipping redirect URI setup.`);
    return;
  }

  const existing = client.redirectUris || [];
  const existingOrigins = client.webOrigins || [];

  const newUris = [];
  const newOrigins = [];
  for (const origin of CONNECTED_APP_ORIGINS) {
    const wildcard = `${origin}/*`;
    if (!existing.includes(wildcard)) newUris.push(wildcard);
    if (!existingOrigins.includes(origin)) newOrigins.push(origin);
    const ssoPath = `${origin}/silent-check-sso.html`;
    if (!existing.includes(ssoPath)) newUris.push(ssoPath);
  }

  if (!newUris.length && !newOrigins.length) {
    console.log(`  "${clientId}" redirect URIs already configured for all connected apps.`);
    return;
  }

  console.log(`  Adding to "${clientId}" client:`);
  if (newUris.length)    console.log(`    Redirect URIs: ${newUris.join(', ')}`);
  if (newOrigins.length) console.log(`    Web Origins:   ${newOrigins.join(', ')}`);

  await kcAdmin.clients.update(
    { realm: KEYCLOAK_REALM, id: client.id },
    {
      ...client,
      redirectUris: [...existing, ...newUris],
      webOrigins:   [...existingOrigins, ...newOrigins],
    }
  );
}

async function setupKeycloakRealm() {
  console.log(`\n=== BharatTech Keycloak Realm Setup ===`);
  console.log(`  Keycloak: ${KEYCLOAK_BASE_URL}`);
  console.log(`  Realm:    ${KEYCLOAK_REALM}\n`);

  await authAdmin();
  console.log('Authenticated as Keycloak admin.');

  await getOrCreateRealm();
  console.log(`Realm "${KEYCLOAK_REALM}" configured (self-registration disabled).`);

  console.log('Upserting realm roles...');
  const createdRoles = await upsertRealmRoles();

  console.log('Configuring Super-admin composite roles (hierarchy)...');
  await configureCompositeRoles(createdRoles);

  console.log(`Adding given_name / family_name / full name protocol mappers to ${KEYCLOAK_CLIENT_ID_APP}...`);
  await configureNameProtocolMappers();

  console.log('Configuring client redirect URIs for connected apps...');
  await configureClientRedirectUris(KEYCLOAK_CLIENT_ID_APP);
  await configureClientRedirectUris(KEYCLOAK_OPENINTERVIEWER_CLIENT_ID);

  console.log('\n=== Setup complete ===');
  console.log('Role hierarchy:');
  console.log('  Super-admin  ─┬─ admin');
  console.log('               ├─ Subadmin');
  console.log('               ├─ Employee');
  console.log('               └─ Intern');
  console.log('');
  console.log('Permissions:');
  console.log('  Super-admin → can invite/delete Admin, Subadmin, Employee, Intern');
  console.log('  admin       → can invite/delete Subadmin, Employee, Intern only');
  console.log('  Employee/Intern → no user management permissions');
  console.log('');
  console.log('Self-registration is DISABLED — Admins must be invited by a SuperAdmin.');

  return { success: true, realm: KEYCLOAK_REALM };
}

module.exports = { setupKeycloakRealm };

// Run directly: node scripts/setupKeycloakRealm.js
if (require.main === module) {
  require("dotenv").config();
  setupKeycloakRealm()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\nSetup failed:', err?.response?.data || err.message || err);
      process.exit(1);
    });
}
