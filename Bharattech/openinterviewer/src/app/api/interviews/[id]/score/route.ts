// POST /api/interviews/[id]/score - the answer score for an interview held before answers were scored
// (owner, 2026-10-28). Worked out once from the transcript and kept as estimated: no planted bug was on record.
// An interview that already has a score (in its summary, or from an earlier call) gets that one back, with no AI call.

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getInterview, getStudy, setInterviewScorecard } from '@/lib/kv';
import { getInterviewProvider } from '@/lib/providers';
import { buildEstimatedScorecard, scorecardOf, transcriptPairs } from '@/lib/scoring';
import { StoredInterview, StudyConfig } from '@/types';

function transcriptOf(interview: StoredInterview) {
  for (const list of [interview.transcript, interview.messages, interview.history]) {
    if (Array.isArray(list) && list.length) return list;
  }
  return [];
}

// the study's role details for the AI; an interview whose study is gone is scored against its name only
async function studyConfigOf(interview: StoredInterview): Promise<StudyConfig> {
  const study = await getStudy(interview.studyId);
  if (study?.config) return study.config;
  return {
    id: interview.studyId,
    name: interview.studyName || 'Interview',
    description: '',
    researchQuestion: interview.studyName || 'Technical interview',
    coreQuestions: [],
    topicAreas: [],
    profileSchema: [],
    aiBehavior: 'standard',
    consentText: '',
    createdAt: interview.createdAt || Date.now()
  };
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // the score spends the AI key and is for the hiring team: a researcher's session only
    const session = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
    if (!session || !(await verifySessionToken(session))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const interview = await getInterview(params.id);
    if (!interview) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const kept = scorecardOf(interview);
    if (kept) return NextResponse.json({ scorecard: kept });

    const pairs = transcriptPairs(transcriptOf(interview));
    if (!pairs.length) {
      return NextResponse.json({ error: 'Not enough answers to score.' }, { status: 422 });
    }

    const studyConfig = await studyConfigOf(interview);
    const verdicts = await getInterviewProvider(studyConfig).scoreTranscript(studyConfig, pairs);
    if (!verdicts) {
      return NextResponse.json({ error: "Scoring didn't work this time. Try again in a minute." }, { status: 502 });
    }

    const scorecard = buildEstimatedScorecard(pairs, verdicts);
    if (!scorecard) {
      return NextResponse.json({ error: 'Not enough answers to score.' }, { status: 422 });
    }

    // two requests at once keep the first score; the answer is whichever was kept
    await setInterviewScorecard(interview.id, scorecard);
    const saved = await getInterview(interview.id);
    return NextResponse.json({ scorecard: (saved && scorecardOf(saved)) || scorecard });
  } catch (error) {
    console.error('Score interview API error:', error);
    return NextResponse.json({ error: 'Failed to score the interview' }, { status: 500 });
  }
}
