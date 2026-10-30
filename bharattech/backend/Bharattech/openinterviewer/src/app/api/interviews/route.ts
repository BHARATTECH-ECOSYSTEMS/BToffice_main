// GET /api/interviews - List all interviews (or filter by studyId)
// Protected: Requires authenticated session

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAllInterviews, getStudyInterviews, getPaginatedInterviews, isKVAvailable } from '@/lib/kv';
import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    // Check authentication with token validation
    const cookieStore = await cookies();
    const authCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!authCookie?.value) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify the session token is valid
    const isValid = await verifySessionToken(authCookie.value);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Session expired or invalid' },
        { status: 401 }
      );
    }

    const storageAvailable = await isKVAvailable();
    if (!storageAvailable) {
      return NextResponse.json({
        interviews: [],
        count: 0,
        totalCount: 0,
        totalPages: 1,
        currentPage: 1,
        limit: 10,
        warning: 'Storage not configured. Set MONGODB_URI to enable persistence.'
      });
    }

    // Check for studyId and pagination parameters
    const { searchParams } = new URL(request.url);
    const studyId = searchParams.get('studyId') || undefined;
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    // If page or limit are passed (or by default for efficient list querying), use pagination
    if (pageParam !== null || limitParam !== null) {
      const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;
      const limit = limitParam ? Math.max(1, parseInt(limitParam, 10) || 10) : 10;

      const paginatedResult = await getPaginatedInterviews({
        studyId,
        page,
        limit
      });

      return NextResponse.json({
        interviews: paginatedResult.items,
        count: paginatedResult.items.length,
        totalCount: paginatedResult.totalCount,
        totalPages: paginatedResult.totalPages,
        currentPage: paginatedResult.currentPage,
        limit: paginatedResult.limit
      });
    }

    // Unpaginated fallback (for bulk exports or older callers)
    const interviews = studyId
      ? await getStudyInterviews(studyId)
      : await getAllInterviews();

    return NextResponse.json({
      interviews,
      count: interviews.length,
      totalCount: interviews.length,
      totalPages: 1,
      currentPage: 1,
      limit: interviews.length
    });

  } catch (error) {
    console.error('Interviews API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch interviews' },
      { status: 500 }
    );
  }
}
