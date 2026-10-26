// Session token utilities for researcher authentication
// Uses signed JWTs to prevent forgery

import * as jose from 'jose';
import { createHash } from 'crypto';
import type { StudyConfig } from '@/types';

const SESSION_COOKIE_NAME = 'research-auth';
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days in seconds

interface SessionPayload {
  type: 'session';
  iat: number;
  exp: number;
}

// Get the signing secret from environment
// Uses SESSION_SECRET if available, falls back to ADMIN_PASSWORD
function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) {
    throw new Error('SESSION_SECRET or ADMIN_PASSWORD environment variable is required');
  }

  // Warn if using ADMIN_PASSWORD as session secret (less secure)
  if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
    console.warn(
      '[Security] SESSION_SECRET not set - falling back to ADMIN_PASSWORD. ' +
      'For better security, set a dedicated SESSION_SECRET environment variable.'
    );
  }

  return new TextEncoder().encode(secret);
}

// Create a signed session token
export async function createSessionToken(): Promise<string> {
  const secret = getSecret();

  const token = await new jose.SignJWT({ type: 'session' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(secret);

  return token;
}

// Verify a session token - returns true if valid
export async function verifySessionToken(token: string): Promise<boolean> {
  if (!token) {
    return false;
  }

  try {
    const secret = getSecret();
    const { payload } = await jose.jwtVerify(token, secret);

    // Check that it's a session token (not a participant token)
    if (payload.type !== 'session') {
      return false;
    }

    return true;
  } catch (error) {
    // Token invalid, expired, or tampered with
    return false;
  }
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
