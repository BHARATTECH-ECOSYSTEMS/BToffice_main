// POST /api/auth/logout - End the researcher session.
// The BharatTech apps call this address when someone signs out there (frontend AuthContext.jsx), so the 7-day
// researcher session here doesn't outlive their sign-out.

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { expireSessionCookie } from '@/lib/auth';

export async function POST() {
  const cookieStore = await cookies();
  expireSessionCookie(cookieStore);
  return NextResponse.json({ success: true });
}
