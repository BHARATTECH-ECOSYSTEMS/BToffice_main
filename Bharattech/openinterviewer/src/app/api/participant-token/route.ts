export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { candidateStudy } from '@/lib/candidateStudy';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getParticipantToken, getStudy, saveParticipantToken } from '@/lib/kv';

// Token expiry (24 hours)
const TOKEN_TTL_SECONDS = 60 * 60 * 24;

// POST /api/participant-token - Generate participant token (researchers only: a link starts an interview on the AI key)
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken || !(await verifySessionToken(sessionToken))) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { studyId } = body;

    if (!studyId) {
      return NextResponse.json(
        { error: 'Study ID is required' },
        { status: 400 }
      );
    }

    const study = await getStudy(studyId);
    if (!study) {
      return NextResponse.json(
        { error: 'Study not found' },
        { status: 404 }
      );
    }

    const token = randomUUID();
    const saved = await saveParticipantToken(
      token,
      {
        studyId,
        studyConfig: study.config
      },
      TOKEN_TTL_SECONDS
    );

    if (!saved) {
      return NextResponse.json(
        { error: 'Failed to create participant token' },
        { status: 500 }
      );
    }

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Token generation error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// GET /api/participant-token - Validate participant token
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ valid: false });
    }

    const tokenData = await getParticipantToken(token);

    // a link whose study was deleted leads nowhere
    if (!tokenData || !(await getStudy(tokenData.studyId))) {
      return NextResponse.json({ valid: false });
    }

    return NextResponse.json({
      valid: true,
      studyConfig: candidateStudy(tokenData.studyConfig),
      terminated: Boolean(tokenData.terminatedAt),
      terminationReason: tokenData.terminationReason,
      terminatedAt: tokenData.terminatedAt,
      completed: Boolean(tokenData.completedAt)
    });
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json({ valid: false });
  }
}
