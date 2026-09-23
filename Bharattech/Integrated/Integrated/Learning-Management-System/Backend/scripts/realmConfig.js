const REALM_ROLES = [
  { name: "Super-admin", description: "Top-level administrator. Can manage all users and invite Admins." },
  { name: "admin", description: "Administrator. Can manage Employee and Intern users." },
  { name: "Subadmin", description: "Sub-administrator role." },
  { name: "Employee", description: "Standard employee." },
  { name: "Intern", description: "Intern / trainee." },
];

const SUPER_ADMIN_COMPOSITE_MEMBERS = ["admin", "Subadmin", "Employee", "Intern"];

const CONNECTED_APP_ORIGINS = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  process.env.VITE_BHARAT_URL || "http://localhost:8081",
  process.env.OPEN_INTERVIEWER_URL || "http://localhost:3000",
  process.env.CHATWOOT_URL || "http://localhost:3000",
];

const NAME_PROTOCOL_MAPPERS = [
  {
    name: "given name",
    protocol: "openid-connect",
    protocolMapper: "oidc-usermodel-property-mapper",
    consentRequired: false,
    config: {
      "userinfo.token.claim": "true",
      "user.attribute": "firstName",
      "id.token.claim": "true",
      "access.token.claim": "true",
      "claim.name": "given_name",
      "jsonType.label": "String",
    },
  },
  {
    name: "family name",
    protocol: "openid-connect",
    protocolMapper: "oidc-usermodel-property-mapper",
    consentRequired: false,
    config: {
      "userinfo.token.claim": "true",
      "user.attribute": "lastName",
      "id.token.claim": "true",
      "access.token.claim": "true",
      "claim.name": "family_name",
      "jsonType.label": "String",
    },
  },
  {
    name: "full name",
    protocol: "openid-connect",
    protocolMapper: "oidc-full-name-mapper",
    consentRequired: false,
    config: {
      "id.token.claim": "true",
      "access.token.claim": "true",
      "userinfo.token.claim": "true",
    },
  },
  {
    name: "email",
    protocol: "openid-connect",
    protocolMapper: "oidc-usermodel-property-mapper",
    consentRequired: false,
    config: {
      "userinfo.token.claim": "true",
      "user.attribute": "email",
      "id.token.claim": "true",
      "access.token.claim": "true",
      "claim.name": "email",
      "jsonType.label": "String",
    },
  },
];

module.exports = {
  REALM_ROLES,
  SUPER_ADMIN_COMPOSITE_MEMBERS,
  CONNECTED_APP_ORIGINS,
  NAME_PROTOCOL_MAPPERS,
};
