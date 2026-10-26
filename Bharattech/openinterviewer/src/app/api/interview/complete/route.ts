import { NextResponse } from 'next/server';
import { verifyParticipantToken } from '@/lib/auth';
import { getInterviewProvider } from '@/lib/providers';
import {
  finishParticipantToken,
  getInterviewByLink,
  incrementStudyInterviewCount,
  isMongoStorageAvailable,
  lockStudy,
  reopenParticipantToken,
  saveInterview
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
    const { history, participantProfile } = body;
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

    try {
      const provider = getInterviewProvider(studyConfig);
      const synthesis = await provider.synthesizeInterview(
        history,
        studyConfig,
        behaviorData,
        baseInterview.participantProfile
      );

      const synthesisSaved = await saveInterview({
        ...baseInterview,
        synthesis
      });

      if (!synthesisSaved) {
        console.warn('Interview saved, but synthesis was not persisted to MongoDB');
      }
    } catch (synthesisError) {
      console.warn('Interview saved, but synthesis failed:', synthesisError);
    }

    return NextResponse.json({ interviewId });
  } catch (error) {
    console.error('Complete Interview Error:', error);
    return NextResponse.json(
      { error: 'Failed to complete interview' },
      { status: 500 }
    );
  }
}
