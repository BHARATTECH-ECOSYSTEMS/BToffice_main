import * as jose from 'jose';
import { claimLaunchPass } from '@/lib/kv';
import { isAdminRole } from '@/lib/roles';

type UnknownRecord = Record<string, unknown>;

// The BharatTech portal backend's pass (utils/openInterviewerToken.js there): HS256 with BHARATTECH_LAUNCH_SECRET,
// at most a minute long, with its own id so it can be used once.
const PORTAL_PASS_TYPE = 'bharattech-admin-launch';
const PORTAL_PASS_MAX_SECONDS = 60;
// The portal backend runs on another server whose clock can be a little ahead or behind; without some slack a pass
// stamped a second "in the future" is refused.
const CLOCK_TOLERANCE_SECONDS = 5;

let cachedIssuer: string | null = null;
let cachedJwks: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

function getConfiguredValue(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }

  return undefined;
}

// No built-in address: without KEYCLOAK_URL the Keycloak check is off, so a laptop or test run can never send
// tokens to the company's live Keycloak by accident.
export function getKeycloakIssuer() {
  const rawUrl = getConfiguredValue(
    'KEYCLOAK_URL',
    'NEXT_PUBLIC_KEYCLOAK_URL',
    'VITE_KEYCLOAK_URL'
  );
  if (!rawUrl) return null;

  const realm = getConfiguredValue(
    'KEYCLOAK_REALM',
    'NEXT_PUBLIC_KEYCLOAK_REALM',
    'VITE_KEYCLOAK_REALM'
  ) || 'bharattech';
  const baseUrl = rawUrl.replace(/\/+$/, '');

  if (baseUrl.includes('/realms/')) {
    return baseUrl;
  }

  return `${baseUrl}/realms/${realm}`;
}

function getKeycloakJwks(issuer: string) {
  if (cachedIssuer !== issuer || !cachedJwks) {
    cachedIssuer = issuer;
    cachedJwks = jose.createRemoteJWKSet(
      new URL(`${issuer}/protocol/openid-connect/certs`)
    );
  }

  return cachedJwks;
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' ? value as UnknownRecord : {};
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(item => asStringArray(item));
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }

  return [];
}

function collectRoles(payload: jose.JWTPayload) {
  const claims = payload as UnknownRecord;
  const realmAccess = asRecord(claims.realm_access);
  const resourceAccess = asRecord(claims.resource_access);
  const roles = new Set<string>();

  [claims.roles, claims.groups, realmAccess.roles].forEach(value => {
    asStringArray(value).forEach(role => roles.add(role));
  });

  Object.values(resourceAccess).forEach(clientAccess => {
    asStringArray(asRecord(clientAccess).roles).forEach(role => roles.add(role));
  });

  return Array.from(roles);
}

function hasAdminRole(payload: jose.JWTPayload) {
  return collectRoles(payload).some(role =>
    isAdminRole(role) || role.split('/').filter(Boolean).some(segment => isAdminRole(segment))
  );
}

// Only BHARATTECH_LAUNCH_SECRET signs a pass. ADMIN_PASSWORD, SESSION_SECRET and the rest sign other things here
// (sessions, candidate links) and must never double as a way in.
// Checks a pass without using it up: the launch route makes the session first and uses the pass last (owner's 2A).
async function checkPortalPass(token: string): Promise<{ id: string; expiresAt: Date } | null> {
  const secret = process.env.BHARATTECH_LAUNCH_SECRET;
  if (!secret) return null;

  let payload: jose.JWTPayload;
  try {
    ({ payload } = await jose.jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
      requiredClaims: ['jti', 'iat', 'exp'],
      maxTokenAge: PORTAL_PASS_MAX_SECONDS,
      clockTolerance: CLOCK_TOLERANCE_SECONDS,
    }));
  } catch {
    return null;
  }

  if (payload.type !== PORTAL_PASS_TYPE || !isAdminRole(String(payload.role || ''))) return null;
  if (payload.exp! - payload.iat! > PORTAL_PASS_MAX_SECONDS) return null;

  return { id: payload.jti!, expiresAt: new Date(payload.exp! * 1000) };
}

// A Keycloak sign-in counts when this app's own Keycloak client got it (the login page's single sign-on check), so a
// token another BharatTech app holds can't be replayed here.
async function verifyKeycloakToken(token: string) {
  const issuer = getKeycloakIssuer();
  if (!issuer) return false;

  try {
    const { payload } = await jose.jwtVerify(token, getKeycloakJwks(issuer), { issuer });
    const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'openinterviewer-client';
    return payload.azp === clientId && hasAdminRole(payload);
  } catch {
    return false;
  }
}

/**
 * A launch token that may open a session, or null. `use()` is called last, once the session is ready: for a portal
 * pass it records the pass as used and is true only the first time; a Keycloak sign-in has nothing to use up.
 */
export async function checkLaunchToken(token: string): Promise<{ use: () => Promise<boolean> } | null> {
  const cleanToken = token.trim();
  if (!cleanToken) return null;

  const pass = await checkPortalPass(cleanToken);
  if (pass) return { use: () => claimLaunchPass(pass.id, pass.expiresAt) };

  return (await verifyKeycloakToken(cleanToken)) ? { use: async () => true } : null;
}

export async function verifyLaunchToken(token: string) {
  const launch = await checkLaunchToken(token);
  return launch ? launch.use() : false;
}
