// POST /api/interview - Generate one clean AI interview turn.
// Server-side only - API keys never sent to client.

import { NextResponse } from 'next/server';
import { getInterviewProvider } from '@/lib/providers';
import {
  StudyConfig,
  ParticipantProfile,
  InterviewMessage,
  QuestionProgress
} from '@/types';

const MAX_MESSAGE_LENGTH = 5000;

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function cleanMessage(value: unknown) {
  let text = String(value || '').replace(/\r/g, '').trim();

  // Defensive cleanup only: if the model wrapped its ENTIRE message in a
  // single ```json / ``` fence (a common LLM mistake when it means to
  // return raw JSON), unwrap that one outer fence.
  //
  // IMPORTANT: this must NOT touch fenced code blocks that are legitimately
  // part of the message content (e.g. a code snippet the interviewer AI is
  // showing the participant). Previously this function stripped every
  // ``` in the string, which destroyed real code fences and made
  // react-markdown misrender the snippet as a numbered list instead of a
  // code block. Only strip when the fence spans the whole trimmed string.
  const wholeMessageFence = text.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  if (wholeMessageFence) {
    text = wholeMessageFence[1].trim();
  }

  return text.slice(0, MAX_MESSAGE_LENGTH);
}

function getShortAcknowledgement(message: string) {
  const firstStatement = cleanMessage(message)
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
    .find(line => !line.includes('?') && line.length <= 180);

  if (!firstStatement) return 'Thank you for sharing that.';

  return firstStatement
    .replace(/^[-*\d.)\s]+/, '')
    .trim();
}

function extractFirstQuestion(message: string, fallback: string) {
  const text = cleanMessage(message);
  const match = text.match(/[^?]*\?/);
  const question = match?.[0]?.replace(/^[-*\d.)\s]+/, '').trim();
  return question && question.length >= 12 ? question : fallback;
}

function buildCoreQuestionTurn(aiMessage: string, nextQuestion: string) {
  const normalizedMessage = normalizeText(aiMessage);
  const normalizedQuestion = normalizeText(nextQuestion);

  if (normalizedMessage === normalizedQuestion) return nextQuestion;

  const acknowledgement = getShortAcknowledgement(aiMessage);
  return `${acknowledgement}\n\n${nextQuestion}`;
}

function getNextCoreQuestion(studyConfig: StudyConfig, questionProgress?: QuestionProgress) {
  const coreQuestions = studyConfig?.coreQuestions || [];
  const askedIndexes = new Set(questionProgress?.questionsAsked || []);
  const nextIndex = coreQuestions.findIndex((_, index) => !askedIndexes.has(index));

  if (nextIndex === -1) {
    return {
      index: null,
      question: null,
      total: coreQuestions.length
    };
  }

  return {
    index: nextIndex,
    question: coreQuestions[nextIndex],
    total: coreQuestions.length
  };
}

const VALID_PHASES: QuestionProgress['currentPhase'][] = [
  'introduction', 'education', 'project', 'functionality', 'ending'
];

// Hard safety cap - regardless of what the AI decides, force wrap-up once the
// participant has answered this many times. Prevents runaway interviews.
const MAX_PARTICIPANT_ANSWERS = 20;

export async function POST(request: Request) {
  try {
    // TEMP: participant verification is currently relaxed in this app.
    const body = await request.json();

    const {
      history,
      studyConfig,
      participantProfile,
      questionProgress,
      currentContext
    }: {
      history: InterviewMessage[];
      studyConfig: StudyConfig;
      participantProfile: ParticipantProfile | null;
      questionProgress: QuestionProgress;
      currentContext: string;
    } = body;

    if (!Array.isArray(history) || !studyConfig) {
      return NextResponse.json(
        { error: 'Missing interview history or study configuration' },
        { status: 400 }
      );
    }

    const coreQuestions = studyConfig?.coreQuestions || [];
    const { index: nextQuestionIndex, question: nextQuestion, total } =
      getNextCoreQuestion(studyConfig, questionProgress);
    const participantAnswerCount = history.filter(message => message.role === 'user').length;
    const provider = getInterviewProvider(studyConfig);

    const result = await provider.generateInterviewResponse(
      history.slice(-20),
      studyConfig,
      participantProfile,
      questionProgress,
      currentContext
    );

    const nameField = participantProfile?.fields?.find(
      (field: any) => field.fieldId === 'name'
    );
    const extractedName = nameField?.value || null;

    if (extractedName) {
      result.profileUpdates = [
        ...(result.profileUpdates || []),
        {
          fieldId: 'name',
          value: extractedName,
          status: 'extracted'
        }
      ];
    }

    let updatedProfile = participantProfile;

    if (participantProfile && result.profileUpdates?.length) {
      updatedProfile = {
        ...participantProfile,
        fields: participantProfile.fields.map((field: any) => {
          const update = result.profileUpdates.find(
            (item: any) => item.fieldId === field.fieldId
          );

          if (!update) {
            return {
              ...field,
              status: field.status || 'pending'
            };
          }

          return {
            ...field,
            value: update.value ?? field.value,
            status: update.status
          };
        })
      };
    }

    let shouldConclude = Boolean(result.shouldConclude);
    let finalMessage: string;
    let questionAddressed: number | null = null;
    let phaseTransition: QuestionProgress['currentPhase'] | null = null;

    if (coreQuestions.length > 0 && nextQuestion && nextQuestionIndex !== null) {
      // Legacy path: admin hand-typed specific core questions. Grind through
      // them one by one, same as before, just mapped onto the new phase names
      // (there's no exact old->new equivalent, so this sits in 'functionality'
      // until the list is exhausted, then moves to 'ending').
      finalMessage = buildCoreQuestionTurn(result.message, nextQuestion);
      questionAddressed = nextQuestionIndex;
      phaseTransition = nextQuestionIndex + 1 >= total ? 'ending' : 'functionality';
      shouldConclude = false;
    } else if (coreQuestions.length > 0) {
      // Legacy path, core questions exhausted - wrap up.
      const fallback = 'Do you have any final thoughts you would like to add?';
      const cleaned = cleanMessage(result.message);
      finalMessage = cleaned && cleaned.length >= 12 ? cleaned : fallback;
      phaseTransition = 'ending';
      shouldConclude = true;
    } else {
      // AI-generated-question path (no hand-typed core questions): trust the
      // phase the AI itself declared, since interview.ts instructs it to
      // track its own progress through Introduction -> Education -> Project
      // -> Functionality -> Ending. Only fall back to the previous phase if
      // the AI didn't return a valid one.
      const fallbackQuestion = 'Could you tell me a bit more about that?';
      const cleaned = cleanMessage(result.message);
      finalMessage = cleaned && cleaned.length >= 12 ? cleaned : fallbackQuestion;

      const aiPhase = result.phaseTransition as QuestionProgress['currentPhase'] | undefined;
      phaseTransition = aiPhase && VALID_PHASES.includes(aiPhase)
        ? aiPhase
        : (questionProgress?.currentPhase || 'introduction');

      // Hard safety cap - force wrap-up regardless of what the AI thinks,
      // so the interview can never run away indefinitely.
      if (participantAnswerCount >= MAX_PARTICIPANT_ANSWERS) {
        phaseTransition = 'ending';
        shouldConclude = true;
      } else {
        shouldConclude = shouldConclude || phaseTransition === 'ending';
      }
    }

    const closingText = cleanMessage(finalMessage).toLowerCase();
    if (
      closingText.includes('concludes our interview') ||
      closingText.includes('this concludes') ||
      closingText.includes('thank you for your time')
    ) {
      shouldConclude = true;
      phaseTransition = 'ending';
    }

    if (shouldConclude) {
      finalMessage = 'Thank you for your time and valuable insights. This concludes the interview.';
    }

    const updatedHistory = history.slice(-20);
    const last = updatedHistory[updatedHistory.length - 1];

    if (!last || last.role !== 'ai' || last.content !== finalMessage) {
      updatedHistory.push({
        id: `msg-${Date.now()}`,
        role: 'ai',
        content: finalMessage,
        timestamp: Date.now()
      });
    }

    return NextResponse.json({
      ...result,
      message: finalMessage,
      questionAddressed,
      phaseTransition,
      shouldConclude,
      history: updatedHistory,
      participantProfile: updatedProfile
    });
  } catch (error) {
    console.error('Interview API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate interview response' },
      { status: 500 }
    );
  }
}
