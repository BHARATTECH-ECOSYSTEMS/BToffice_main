import { NextResponse } from 'next/server';
import { verifyParticipantToken } from '@/lib/auth';
import { getInterviewProvider } from '@/lib/providers';
import { serverTranscript } from '@/lib/transcript';
import { scoredQuestions, type ScoredQuestion } from '@/lib/scoring';
import {
  finishParticipantToken,
  getParticipantToken,
  getInterviewByLink,
  incrementStudyInterviewCount,
  isMongoStorageAvailable,
  lockStudy,
  reopenParticipantToken,
  saveInterview,
  setInterviewSynthesis
} from '@/lib/kv';
import { InterviewMessage, StoredInterview } from '@/types';

function getParticipantName(history: InterviewMessage[], participantProfile: any) {
  const nameField = participantProfile?.fields?.find(
    (field: any) => field.fieldId === 'name'
  );

  if (
    typeof nameField?.value === 'string' &&
    nameField.value.trim() &&
    nameField.value.trim().toLowerCase() !== 'yes'
  ) {
    return nameField.value.trim();
  }

const nameMessage = history.find((message: any, index: number) => {
  if (message.role !== 'user') return false;
  const previousMessage = history[index - 1]?.content?.toLowerCase() || '';
  return previousMessage.includes('name');
});

  const extractedName = nameMessage?.content
    ? nameMessage.content
      .trim()
      .replace(/[^a-zA-Z\s]/g, '')
      .replace(/\s+/g, ' ')
    : null;

  return extractedName || 'Participant';
}

// notes: the interviewer's hidden notes kept with the turns (the project analysis, the planted bugs); questions: the
// answers to score (lib/scoring.ts)
async function writeSynthesis(interview: StoredInterview, studyConfig: any, behaviorData: StoredInterview['behaviorData'], notes?: string, questions?: ScoredQuestion[]) {
  try {
    const provider = getInterviewProvider(studyConfig);
    const synthesis = await provider.synthesizeInterview(
      interview.transcript,
      studyConfig,
      behaviorData,
      interview.participantProfile,
      notes,
      questions
    );

    if (!(await setInterviewSynthesis(interview.id, synthesis))) {
      console.warn('Interview synthesis not saved: the interview is gone or storage failed');
    }
  } catch (synthesisError) {
    console.warn('Interview saved, but synthesis failed:', synthesisError);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyParticipantToken(request);
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error || 'Valid participant link or researcher session required' },
        { status: 401 }
      );
    }

    const storageAvailable = await isMongoStorageAvailable();
    if (!storageAvailable) {
      return NextResponse.json(
        { error: 'MongoDB is not connected. Fix MONGODB_URI before completing interviews.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { participantProfile } = body;
    // a candidate's transcript is the one the server kept, turn by turn; only a researcher's preview sends its own
    const link = auth.isAdmin ? null : await getParticipantToken(auth.token!);
    if (!auth.isAdmin && !link?.exchanges.length) {
      return NextResponse.json({ error: 'Answer at least one question before finishing.' }, { status: 409 });
    }
    const history = auth.isAdmin ? body.history : serverTranscript(auth.studyConfig!, link!.exchanges);
    // A candidate's interview is saved under their link's study, whatever study the browser names.
    const studyConfig = auth.isAdmin ? body.studyConfig : auth.studyConfig;
    const studyId = auth.isAdmin
      ? studyConfig?.id || studyConfig?._id || studyConfig?.studyId
      : auth.studyId;

    if (!Array.isArray(history) || !studyConfig || !studyId) {
      return NextResponse.json(
        { error: 'Missing required data' },
        { status: 400 }
      );
    }

    const now = Date.now();
    // the record this link already saved (interviews/save), if any: a link keeps one record
    const ownRecord = auth.linkHash ? await getInterviewByLink(auth.linkHash) : null;
    const interviewId = ownRecord?.id || crypto.randomUUID();
    const updatedProfile = participantProfile || { fields: [] };
    const behaviorData = {
      timePerTopic: {},
      messagesPerTopic: {},
      topicsExplored: [],
      contradictions: []
    };

    const baseInterview: StoredInterview & { linkHash?: string } = {
      id: interviewId,
      ...(auth.linkHash && { linkHash: auth.linkHash }),
      studyId,
      studyName: studyConfig.name || 'Unknown Study',
      participantName: getParticipantName(history, updatedProfile),
      participantProfile: {
        id: updatedProfile.id || interviewId,
        fields: updatedProfile.fields || [],
        rawContext: updatedProfile.rawContext || '',
        timestamp: updatedProfile.timestamp || now
      },
      transcript: history,
      messages: history,
      history,
      synthesis: null,
      behaviorData,
      status: 'completed',
      createdAt: now,
      completedAt: now
    };

    // A link finishes once: claim it (one conditional update) right before saving, so a repeat or two finishes at
    // once save nothing more and spend no more of the AI key on summaries.
    if (!auth.isAdmin && !(await finishParticipantToken(auth.token!))) {
      return NextResponse.json(
        { error: 'This interview is already finished.' },
        { status: 401 }
      );
    }

    const saved = await saveInterview(baseInterview);
    if (!saved) {
      // nothing was kept, so the candidate may finish again
      if (!auth.isAdmin) await reopenParticipantToken(auth.token!);
      return NextResponse.json(
        { error: 'Failed to save interview to MongoDB' },
        { status: 500 }
      );
    }

    await incrementStudyInterviewCount(studyId);
    await lockStudy(studyId);

    // The summary is for the researcher; the candidate's thank-you page never shows it, so they don't wait on the AI
    // (up to 15 s). The server runs as one long-lived process, so the write finishes after the reply; until then the
    // researcher's page says no analysis is available yet.
    const notes = (link?.exchanges ?? []).flatMap((e) => (e.note ? [e.note] : [])).join('\n') || undefined;
    void writeSynthesis(baseInterview, studyConfig, behaviorData, notes, link ? scoredQuestions(link.exchanges) : undefined);

    return NextResponse.json({ interviewId });
  } catch (error) {
    console.error('Complete Interview Error:', error);
    return NextResponse.json(
      { error: 'Failed to complete interview' },
      { status: 500 }
    );
  }
}
