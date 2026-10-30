import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

const SESSION_COOKIE_NAME = 'research-auth';

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/studies'];

// Verify session token in edge middleware
async function verifySession(token: string, request: NextRequest): Promise<boolean> {
  if (!token) {
    return false;
  }

  // Only SESSION_SECRET signs sessions (src/lib/auth.ts); it no longer falls back to ADMIN_PASSWORD
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    return false;
  }

  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, secretKey, { algorithms: ['HS256'] });

    // A session that says how it was opened. Whether a named researcher is still an admin is asked by the API routes
    // (verifySessionToken), which every page loads its data from: the edge runtime here keeps no answers between calls.
    return payload.type === 'session' && ['portal', 'keycloak', 'password'].includes(String(payload.via));
  } catch (error) {
    // Token invalid, expired, or tampered with
    return false;
  }
}

// The BharatTech portal's own site(s), when it shows or calls this app (comma-separated origins)
function portalOrigins(): string[] {
  return (process.env.BHARATTECH_PORTAL_ORIGIN || '').split(',').map((origin) => origin.trim().replace(/\/$/, '')).filter(Boolean);
}

const WRITES = ['POST', 'PUT', 'PATCH', 'DELETE'];
// another BharatTech app signing everyone out calls this from its own site; signing out is harmless
const OPEN_TO_OTHER_SITES = ['/api/auth/logout'];

// Security report 2026-10-28 leads 13 + 18: in embedded mode the session cookie goes with requests from any site, and
// a form on another site could post to the API (as text/plain) or a frame could be clicked through. A change must come
// from this site or the portal's, as JSON (forms can't send that across sites without asking first).
function crossSiteWriteProblem(request: NextRequest): string | null {
  if (!WRITES.includes(request.method) || OPEN_TO_OTHER_SITES.includes(request.nextUrl.pathname)) return null;
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
  const origin = request.headers.get('origin');
  let fromHere = false;
  let fromPortal = false;
  if (origin) {
    try {
      fromHere = new URL(origin).host === host;
    } catch {
      return 'Unreadable origin';
    }
    fromPortal = portalOrigins().includes(origin);
    if (!fromHere && !fromPortal) return 'Changes are only accepted from this site';
  }
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none' && !fromPortal) return 'Changes are only accepted from this site';
  const type = request.headers.get('content-type');
  if (type && !type.toLowerCase().startsWith('application/json')) return 'Send changes as JSON';
  return null;
}

// Pages may be shown in a frame only by this site, or the portal when named; X-Frame-Options can't name another site,
// so it is only sent when there is none.
function withFrameRules(response: NextResponse) {
  const portals = portalOrigins();
  response.headers.set('Content-Security-Policy', `frame-ancestors ${["'self'", ...portals].join(' ')}`);
  if (!portals.length) response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  return response;
}

// A BharatTech launch pass in the address bar (/login?launchToken=…) is left to the login page, which posts it to
// /api/auth/launch: that route runs on Node, where the pass can be recorded as used. Middleware runs on the edge
// runtime, without the database, so it can't make a pass single-use.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/')) {
    const problem = crossSiteWriteProblem(request);
    return problem ? NextResponse.json({ error: problem }, { status: 403 }) : NextResponse.next();
  }
  return withFrameRules(await pageResponse(request));
}

async function pageResponse(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if this is a protected route
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Get auth cookie
  const authCookie = request.cookies.get(SESSION_COOKIE_NAME);

  if (!authCookie?.value) {
    // No cookie - redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify the token is valid (not just that it exists)
  const isValid = await verifySession(authCookie.value, request);

  if (!isValid) {
    // Invalid token - clear cookie and redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * (API routes are included: their writes are checked to come from this site)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
