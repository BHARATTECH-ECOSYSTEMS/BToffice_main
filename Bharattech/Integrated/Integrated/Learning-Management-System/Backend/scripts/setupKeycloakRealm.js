/**
 * Keycloak realm bootstrap for the bharattech LMS.
 */
const KcAdminClient = require("keycloak-admin").default;
const {
  REALM_ROLES,
  SUPER_ADMIN_COMPOSITE_MEMBERS,
  CONNECTED_APP_ORIGINS,
  NAME_PROTOCOL_MAPPERS,
} = require("./realmConfig");

const KEYCLOAK_BASE_URL =
  process.env.KEYCLOAK_BASE_URL ||
  process.env.KEYCLOAK_URL ||
  "http://localhost:8080";
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "bharattech";
const KEYCLOAK_ADMIN_REALM = process.env.KEYCLOAK_ADMIN_REALM || "master";
const KEYCLOAK_ADMIN_USERNAME = process.env.KEYCLOAK_ADMIN_USERNAME || "admin";
const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || "admin";
const KEYCLOAK_CLIENT_ID_APP = process.env.KEYCLOAK_CLIENT_ID || "lms-client";
const KEYCLOAK_OPENINTERVIEWER_CLIENT_ID =
  process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || "openinterviewer-client";
const KEYCLOAK_CHATWOOT_CLIENT_ID =
  process.env.KEYCLOAK_CHATWOOT_CLIENT_ID || "chatwoot-client";
const KEYCLOAK_LOBEHUB_CLIENT_ID =
  process.env.KEYCLOAK_LOBEHUB_CLIENT_ID || "lobehub-client";

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
  const realmConfig = {
    registrationAllowed: false,
    registrationEmailAsUsername: false,
    loginWithEmailAllowed: true,
    duplicateEmailsAllowed: false,
    resetPasswordAllowed: true,
    editUsernameAllowed: true,
  };

  if (existing) {
    await kcAdmin.realms.update({ realm: KEYCLOAK_REALM }, realmConfig);
    return existing;
  }

  await kcAdmin.realms.create({
    realm: KEYCLOAK_REALM,
    enabled: true,
    displayName: "BharatTech LMS",
    sslRequired: "external",
    ...realmConfig,
  });

  return kcAdmin.realms.findOne({ realm: KEYCLOAK_REALM });
}

async function upsertRealmRoles() {
  const createdRoles = {};
  for (const roleDef of REALM_ROLES) {
    let role = await kcAdmin.roles.findOneByName({ realm: KEYCLOAK_REALM, name: roleDef.name }).catch(() => null);
    if (!role?.id) {
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
  if (!superAdminRole?.id) return;

  const membersToAdd = SUPER_ADMIN_COMPOSITE_MEMBERS.map((name) => createdRoles[name]).filter((r) => r?.id);
  if (!membersToAdd.length) return;

  let existingComposites = [];
  try {
    existingComposites = (await kcAdmin.roles.getCompositeRolesForRealm({
      realm: KEYCLOAK_REALM,
      id: superAdminRole.id,
    })) || [];
  } catch {
    existingComposites = [];
  }

  const existingNames = new Set(existingComposites.map((r) => r.name));
  const toAdd = membersToAdd.filter((r) => !existingNames.has(r.name));
  if (!toAdd.length) return;

  await kcAdmin.roles.createComposite(
    { realm: KEYCLOAK_REALM, roleId: superAdminRole.id },
    toAdd.map((r) => ({ id: r.id, name: r.name }))
  );
}

async function configureNameProtocolMappers() {
  await authAdmin();
  const clients = await kcAdmin.clients.find({ realm: KEYCLOAK_REALM, clientId: KEYCLOAK_CLIENT_ID_APP });
  const client = clients?.[0];
  if (!client?.id) return;

  const existing = await kcAdmin.clients.listProtocolMappers({
    realm: KEYCLOAK_REALM,
    id: client.id,
  });
  const existingNames = new Set((existing || []).map((m) => m.name));

  for (const mapper of NAME_PROTOCOL_MAPPERS) {
    if (!existingNames.has(mapper.name)) {
      await kcAdmin.clients.addProtocolMapper({ realm: KEYCLOAK_REALM, id: client.id }, mapper);
    }
  }
}

async function configureClientRedirectUris(clientId = KEYCLOAK_CLIENT_ID_APP) {
  await authAdmin();
  const clients = await kcAdmin.clients.find({ realm: KEYCLOAK_REALM, clientId });
  const client = clients?.[0];
  if (!client?.id) return;

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

  if (!newUris.length && !newOrigins.length) return;

  await kcAdmin.clients.update(
    { realm: KEYCLOAK_REALM, id: client.id },
    {
      ...client,
      redirectUris: [...existing, ...newUris],
      webOrigins: [...existingOrigins, ...newOrigins],
    }
  );
}

async function ensureLobeHubClient() {
  await authAdmin();
  const clientId = KEYCLOAK_LOBEHUB_CLIENT_ID;
  const secret =
    process.env.LOBEHUB_CLIENT_SECRET ||
    "57eb3159522c2e6d77a7809d5d7431f2daddbc8cf4d06e13";
  const lobehubUrl = (process.env.LOBEHUB_URL || "http://localhost:3210").replace(
    /\/+$/,
    ""
  );

  let clients = await kcAdmin.clients.find({ realm: KEYCLOAK_REALM, clientId });
  let client = clients?.[0];

  const redirectUris = [
    `${lobehubUrl}/*`,
    `${lobehubUrl}/api/auth/callback/keycloak`,
  ];
  const webOrigins = [lobehubUrl, "+"];

  if (!client?.id) {
    console.log(`[Keycloak] Creating confidential client "${clientId}"...`);
    await kcAdmin.clients.create({
      realm: KEYCLOAK_REALM,
      clientId,
      name: "LobeHub AI Workspace",
      description: "LobeHub Self-Hosted AI Platform with Keycloak SSO",
      enabled: true,
      protocol: "openid-connect",
      publicClient: false,
      clientAuthenticatorType: "client-secret",
      secret,
      standardFlowEnabled: true,
      implicitFlowEnabled: false,
      directAccessGrantsEnabled: true,
      serviceAccountsEnabled: true,
      redirectUris,
      webOrigins,
    });
  } else {
    console.log(`[Keycloak] Updating client "${clientId}" redirect URIs...`);
    const existingRedirects = client.redirectUris || [];
    const existingOrigins = client.webOrigins || [];
    const mergedRedirects = Array.from(
      new Set([...existingRedirects, ...redirectUris])
    );
    const mergedOrigins = Array.from(
      new Set([...existingOrigins, ...webOrigins])
    );

    await kcAdmin.clients.update(
      { realm: KEYCLOAK_REALM, id: client.id },
      {
        ...client,
        publicClient: false,
        clientAuthenticatorType: "client-secret",
        secret: client.secret || secret,
        standardFlowEnabled: true,
        directAccessGrantsEnabled: true,
        redirectUris: mergedRedirects,
        webOrigins: mergedOrigins,
      }
    );
  }
}

async function setupKeycloakRealm() {
  await authAdmin();
  await getOrCreateRealm();
  const createdRoles = await upsertRealmRoles();
  await configureCompositeRoles(createdRoles);
  await configureNameProtocolMappers();
  await configureClientRedirectUris(KEYCLOAK_CLIENT_ID_APP);
  await configureClientRedirectUris(KEYCLOAK_OPENINTERVIEWER_CLIENT_ID);
  await configureClientRedirectUris(KEYCLOAK_CHATWOOT_CLIENT_ID);
  await ensureLobeHubClient();
  return { success: true, realm: KEYCLOAK_REALM };
}

module.exports = { setupKeycloakRealm };

if (require.main === module) {
  require("dotenv").config();
  setupKeycloakRealm()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("\nSetup failed:", err?.response?.data || err.message || err);
      process.exit(1);
    });
}
