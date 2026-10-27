export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { linkHashOf } from '@/lib/auth';
import { serverTranscript } from '@/lib/transcript';
import {
  getParticipantToken,
  getStudy,
  incrementStudyInterviewCount,
  lockStudy,
  saveInterview,
  terminateParticipantToken
} from '@/lib/kv';
import { InterviewMessage, StoredInterview } from '@/types';

function getParticipantName(history: InterviewMessage[], participantProfile: any) {
  const nameField = participantProfile?.fields?.find(
    (field: any) => field.fieldId === 'name' && typeof field.value === 'string' && field.value.trim()
  );

  if (nameField?.value) {
    return nameField.value.trim();
  }

  const nameMessage = history.find((message: any, index: number) => {
    if (message.role !== 'user') return false;
    const previousMessage = history[index - 1]?.content?.toLowerCase() || '';
    return previousMessage.includes('name');
  });

  return nameMessage?.content?.trim() || 'Terminated Participant';
}

async function saveTerminatedInterview(token: string, tokenData: NonNullable<Awaited<ReturnType<typeof getParticipantToken>>>, reason: string, body: any) {
  const now = Date.now();
  // the turns the server kept, never the history the browser sends (security report 2026-10-28 lead 17)
  const transcript = tokenData.exchanges.length
    ? serverTranscript(tokenData.studyConfig, tokenData.exchanges)
    : [{
        id: `termination-${now}`,
        role: 'system',
        content: reason,
        timestamp: now
      } as InterviewMessage];
  // the record is known by the link's fingerprint, never the link itself: a working link is a way in
  const linkHash = linkHashOf(token);
  const participantProfile = body.participantProfile || {
    id: `terminated-${linkHash}`,
    fields: [],
    rawContext: '',
    timestamp: now
  };

  const interview: StoredInterview & { linkHash?: string; terminationReason?: string } = {
    id: `terminated-${linkHash}`,
    linkHash,
    studyId: tokenData.studyId,
    studyName: tokenData.studyConfig.name || 'Unknown Study',
    participantName: getParticipantName(transcript, participantProfile),
    participantProfile: {
      id: participantProfile.id || `terminated-${linkHash}`,
      fields: Array.isArray(participantProfile.fields) ? participantProfile.fields : [],
      rawContext: participantProfile.rawContext || '',
      timestamp: participantProfile.timestamp || now
    },
    transcript,
    messages: transcript,
    history: transcript,
    synthesis: {
      statedPreferences: [],
      revealedPreferences: [],
      themes: [],
      contradictions: [],
      keyInsights: [],
      bottomLine: `Interview terminated: ${reason}`
    },
    behaviorData: body.behaviorData || {
      timePerTopic: {},
      messagesPerTopic: {},
      topicsExplored: [],
      contradictions: []
    },
    terminationReason: reason,
    createdAt: now,
    completedAt: now,
    status: 'terminated'
  };

  const saved = await saveInterview(interview);
  if (saved) {
    await incrementStudyInterviewCount(tokenData.studyId);
    await lockStudy(tokenData.studyId);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const reason = typeof body.reason === 'string'
      ? body.reason.trim()
      : 'The interview was terminated because a restricted action was detected.';

    if (!token) {
      return NextResponse.json(
        { error: 'Participant token is required' },
        { status: 400 }
      );
    }

    const tokenData = await getParticipantToken(token);
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired participant token' },
        { status: 404 }
      );
    }

    // a finished interview stays finished, and a link whose study is gone or closed ends nothing (security report
    // 2026-10-28 lead 26: ending a finished link added a second record)
    if (tokenData.completedAt) {
      return NextResponse.json({ error: 'This interview is already finished.' }, { status: 409 });
    }
    const study = await getStudy(tokenData.studyId);
    if (!study || study.config.linksEnabled === false) {
      return NextResponse.json({ error: 'This interview is no longer available.' }, { status: 404 });
    }
    // ended already: its record was saved then, and stays as it was
    if (tokenData.terminatedAt) {
      return NextResponse.json({
        success: true,
        alreadyTerminated: true,
        terminationReason: tokenData.terminationReason,
        terminatedAt: tokenData.terminatedAt
      });
    }

    const ended = await terminateParticipantToken(token, reason);
    if (!ended) {
      // finished or ended a moment ago by another request
      return NextResponse.json({ error: 'This interview has already ended.' }, { status: 409 });
    }

    try {
      await saveTerminatedInterview(token, tokenData, reason, body);
    } catch (interviewError) {
      console.error('Failed to save terminated interview:', interviewError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Participant termination error:', error);
    return NextResponse.json(
      { error: 'Failed to terminate participant token' },
      { status: 500 }
    );
  }
}
