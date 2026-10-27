// Session token utilities for researcher authentication
// Uses signed JWTs to prevent forgery

import * as jose from 'jose';
import { createHash } from 'crypto';
import type { StudyConfig } from '@/types';

const SESSION_COOKIE_NAME = 'research-auth';
// Security report 2026-10-28 leads 7 + 8 (owner's F6A): a working day, not 7 days.
const SESSION_DURATION = 60 * 60 * 8;

// How a researcher signed in: through the BharatTech portal's pass or Keycloak (both name the person), or with the
// shared ADMIN_PASSWORD (names nobody).
export type SessionOrigin = 'portal' | 'keycloak' | 'password';

interface SessionPayload {
  type: 'session';
  via: SessionOrigin;
  sub?: string;
  iat: number;
  exp: number;
}

// Only SESSION_SECRET signs sessions. It used to fall back to ADMIN_PASSWORD, so every launched admin's cookie was a
// way to test guesses at the shared password offline; without it nobody gets a session.
function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable is required');
  }
  return new TextEncoder().encode(secret);
}

/** A signed session: `sub` is the Keycloak account of a portal or Keycloak sign-in, none for the shared password. */
export async function createSessionToken(origin: { via: SessionOrigin; sub?: string } = { via: 'password' }): Promise<string> {
  const secret = getSecret();
  if (origin.via !== 'password' && !origin.sub) {
    throw new Error('A portal or Keycloak session must say whose it is');
  }

  let token = new jose.SignJWT({ type: 'session', via: origin.via })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`);
  if (origin.sub) token = token.setSubject(origin.sub);
  return token.sign(secret);
}

// What the portal backend last said about each person: asked at most once a minute, so blocking, removing, marking
// as left or demoting someone ends their researcher access within a minute.
const SESSION_CHECK_SECONDS = 60;
const sessionChecks = new Map<string, { active: boolean; until: number }>();

/** For tests: as if a minute has passed for everyone. */
export function forgetSessionChecks() {
  sessionChecks.clear();
}

// Asks the portal backend (POST /api/openinterviewer/session-check) whether this Keycloak account is still an active
// Admin or Super Admin, with a one-minute check signed by the launch secret. No answer counts as no.
async function stillResearcher(sub: string): Promise<boolean> {
  const known = sessionChecks.get(sub);
  if (known && known.until > Date.now()) return known.active;

  const apiUrl = process.env.BHARATTECH_API_URL;
  const launchSecret = process.env.BHARATTECH_LAUNCH_SECRET;
  if (!apiUrl || !launchSecret) {
    console.error('[Security] BHARATTECH_API_URL and BHARATTECH_LAUNCH_SECRET are needed to check portal sessions');
    return false;
  }

  let active = false;
  try {
    const check = await new jose.SignJWT({ type: 'openinterviewer-session-check' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(sub)
      .setIssuedAt()
      .setExpirationTime(`${SESSION_CHECK_SECONDS}s`)
      .sign(new TextEncoder().encode(launchSecret));
    const res = await fetch(new URL('/api/openinterviewer/session-check', apiUrl), {
      method: 'POST',
      headers: { Authorization: `Bearer ${check}` },
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    });
    active = res.ok && (await res.json())?.active === true;
  } catch (error) {
    console.error('Session check with the portal backend failed:', error instanceof Error ? error.message : error);
    return false; // not remembered: the next request asks again
  }

  sessionChecks.set(sub, { active, until: Date.now() + SESSION_CHECK_SECONDS * 1000 });
  return active;
}

// Verify a session token - returns true if valid
export async function verifySessionToken(token: string): Promise<boolean> {
  if (!token) {
    return false;
  }

  let payload: jose.JWTPayload;
  try {
    ({ payload } = await jose.jwtVerify(token, getSecret(), { algorithms: ['HS256'] }));
  } catch {
    // invalid, expired, tampered with, or no SESSION_SECRET to check it with
    return false;
  }

  // Check that it's a session token (not a participant token), made since sessions say how they were opened
  if (payload.type !== 'session') return false;
  if (payload.via === 'password') return true;
  // a portal or Keycloak session: only while that person is still an admin (an older session names nobody)
  return typeof payload.sub === 'string' && payload.sub !== '' && stillResearcher(payload.sub);
}

// Cookie configuration for session token
export function getSessionCookieOptions() {
  const embeddedInBharatTech = process.env.OPENINTERVIEWER_EMBEDDED === 'true';

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || embeddedInBharatTech,
    sameSite: embeddedInBharatTech ? 'none' as const : 'lax' as const,
    maxAge: SESSION_DURATION,
    path: '/',
  };
}

// Ends the session. A browser only replaces a cookie sent with the same settings, and from another site (a BharatTech
// app signing out) only a SameSite=None; Secure one, so the expired cookie carries exactly the session's settings.
export function expireSessionCookie(cookieStore: { set(name: string, value: string, options: ReturnType<typeof getSessionCookieOptions>): unknown }) {
  cookieStore.set(SESSION_COOKIE_NAME, '', { ...getSessionCookieOptions(), maxAge: 0 });
}

export { SESSION_COOKIE_NAME };

// === Participant Token Verification ===

// What an interview record keeps to know which link wrote it: a fingerprint, not the link itself (a working link is
// a way in, and records are listed to researchers).
export function linkHashOf(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

// Interview turns one link may use: the interview caps itself at 20 answers (api/interview/route.ts), plus room for
// retries after a failed turn. Counted on the server, since the history a browser sends can be reset.
export const MAX_TURNS_PER_LINK = 30;

// Parse cookies from request headers
function getCookieValue(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map(c => c.trim());
  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.split('=');
    if (key === name) {
      return valueParts.join('=');
    }
  }
  return null;
}

// Check if request has valid admin session cookie
async function hasValidAdminSession(request: Request): Promise<boolean> {
  const sessionToken = getCookieValue(request, SESSION_COOKIE_NAME);
  if (!sessionToken) return false;
  return verifySessionToken(sessionToken);
}

// Verify participant token from Authorization header
// Also accepts valid admin session cookies (for researcher preview)
// A link counts only while its stored record is there: not expired, not ended or finished, its study still there and
// taking links. A signed link with no record (or a deleted one) doesn't, and the link's own study settings come back
// with it so routes never run a candidate's interview on settings sent from the browser.
export async function verifyParticipantToken(request: Request): Promise<{ valid: boolean; token?: string; linkHash?: string; studyId?: string; studyConfig?: StudyConfig; isAdmin?: boolean; error?: string }> {
  // First, check for participant token in Authorization header
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    const { getParticipantToken, getStudy } = await import('@/lib/kv');
    const tokenData = await getParticipantToken(token);

    if (tokenData) {
      if (tokenData.terminatedAt) {
        return { valid: false, error: 'This interview has ended.' };
      }
      if (tokenData.completedAt) {
        return { valid: false, error: 'This interview is already finished.' };
      }

      const study = await getStudy(tokenData.studyId);
      if (!study) {
        return { valid: false, error: 'This interview is no longer available.' };
      }
      if (study.config.linksEnabled === false) {
        return { valid: false, error: 'Participant links have been disabled for this study.' };
      }

      return { valid: true, token, linkHash: linkHashOf(token), studyId: tokenData.studyId, studyConfig: tokenData.studyConfig };
    }
  }

  // No valid participant token - check for admin session (researcher preview)
  const isAdmin = await hasValidAdminSession(request);
  if (isAdmin) {
    return { valid: true, isAdmin: true };
  }

  return { valid: false };
}
