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

// A BharatTech launch pass in the address bar (/login?launchToken=…) is left to the login page, which posts it to
// /api/auth/launch: that route runs on Node, where the pass can be recorded as used. Middleware runs on the edge
// runtime, without the database, so it can't make a pass single-use.
export async function middleware(request: NextRequest) {
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
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
