// POST /api/auth/launch - Exchange a BharatTech LMS launch token for an admin session.

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  createSessionToken,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME
} from '@/lib/auth';
import { checkLaunchToken } from '@/lib/launchAuth';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body.launchToken === 'string'
      ? body.launchToken.trim()
      : typeof body.bt_token === 'string'
        ? body.bt_token.trim()
        : '';

    if (!token) {
      return NextResponse.json(
        { error: 'Launch token is required' },
        { status: 400 }
      );
    }

    const refused = () => NextResponse.json(
      { error: 'Invalid or unauthorized launch token' },
      { status: 401 }
    );

    const launch = await checkLaunchToken(token);
    if (!launch) return refused();

    // the session first, the pass used up last: a session that can't be made doesn't waste the pass (owner's 2A)
    const sessionToken = await createSessionToken();
    if (!(await launch.use())) return refused();

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, getSessionCookieOptions());

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Launch auth error:', error);
    return NextResponse.json(
      { error: 'Failed to authenticate launch token' },
      { status: 500 }
    );
  }
}
