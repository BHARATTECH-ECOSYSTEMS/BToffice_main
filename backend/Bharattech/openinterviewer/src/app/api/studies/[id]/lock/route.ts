// POST /api/studies/[id]/lock - Manually lock or unlock a study
// Body: { locked: boolean }
// A locked study cannot be edited or deleted until it's unlocked again.
// Protected: Requires authenticated session

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { lockStudy, unlockStudy, getStudy, isKVAvailable } from '@/lib/kv';
import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

async function verifyAuth() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!authCookie?.value) {
    return { authorized: false, error: 'Unauthorized' };
  }

  const isValid = await verifySessionToken(authCookie.value);
  if (!isValid) {
    return { authorized: false, error: 'Session expired or invalid' };
  }

  return { authorized: true };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { id } = await params;

    const kvAvailable = await isKVAvailable();
    if (!kvAvailable) {
      return NextResponse.json(
        { error: 'Storage not configured' },
        { status: 503 }
      );
    }

    const existing = await getStudy(id);
    if (!existing) {
      return NextResponse.json({ error: 'Study not found' }, { status: 404 });
    }

    const body = await request.json();
    const locked = Boolean(body?.locked);

    const success = locked ? await lockStudy(id) : await unlockStudy(id);
    if (!success) {
      return NextResponse.json(
        { error: locked ? 'Failed to lock study' : 'Failed to unlock study' },
        { status: 500 }
      );
    }

    return NextResponse.json({ isLocked: locked });
  } catch (error) {
    console.error('Study lock toggle API error:', error);
    return NextResponse.json(
      { error: 'Failed to update lock state' },
      { status: 500 }
    );
  }
}
