// POST /api/interview - Generate one clean AI interview turn.
// Server-side only - API keys never sent to client.

import { NextResponse } from 'next/server';
import { MAX_TURNS_PER_LINK, verifyParticipantToken } from '@/lib/auth';
import { claimParticipantTurn, getParticipantToken, recordParticipantExchange, type ExchangeExtra } from '@/lib/kv';
import { getInterviewProvider } from '@/lib/providers';
import type { InterviewStepOptions } from '@/lib/ai';
import { nextStep, phaseOf, plannedDeepDives, SNIPPET_KINDS, type AskedStep, type SnippetKind } from '@/lib/interviewFlow';
import {
  StudyConfig,
  ParticipantProfile,
  InterviewMessage,
  QuestionProgress,
  AIInterviewResponse
} from '@/types';

const MAX_MESSAGE_LENGTH = 5000;

// What one turn may carry, as /api/synthesis allows: every field reaches the AI prompt, and nothing capped them
// (security report 2026-10-28 lead 16: 450 KB went through as one turn)
const MAX_HISTORY_MESSAGES = 200;
const MAX_RAW_CONTEXT = 10000;
const MAX_CURRENT_CONTEXT = 2000;
const MAX_PROFILE_VALUE = 500;

function tooMuchText(body: any): boolean {
  const history = Array.isArray(body?.history) ? body.history : [];
  const fields = Array.isArray(body?.participantProfile?.fields) ? body.participantProfile.fields : [];
  return (
    history.length > MAX_HISTORY_MESSAGES ||
    history.some((message: any) => String(message?.content ?? '').length > MAX_MESSAGE_LENGTH) ||
    String(body?.participantProfile?.rawContext ?? '').length > MAX_RAW_CONTEXT ||
    String(body?.currentContext ?? '').length > MAX_CURRENT_CONTEXT ||
    fields.some((field: any) => String(field?.value ?? '').length > MAX_PROFILE_VALUE)
  );
}

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

  // A model sometimes writes the line break after a closing fence as the two characters "\n" ("```\nWhich line…"),
  // which leaves the code block unclosed in the chat. Only a "\n" right after a fence changes; one inside code stays.
  text = text.replace(/```\\n/g, '```\n');

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

function buildCoreQuestionTurn(aiMessage: string, nextQuestion: string) {
  const normalizedMessage = normalizeText(aiMessage);
  const normalizedQuestion = normalizeText(nextQuestion);

  if (normalizedMessage === normalizedQuestion) return nextQuestion;

  const acknowledgement = getShortAcknowledgement(aiMessage);
  return `${acknowledgement}\n\n${nextQuestion}`;
}

// Hard safety cap - whatever happens, the interview ends once the candidate has answered this many times.
const MAX_PARTICIPANT_ANSWERS = 20;
const CLOSING_MESSAGE = 'Thank you for your time and valuable insights. This concludes the interview.';
const RETRY_MESSAGE = "Sorry, something went wrong on my side.\nCould you send your answer again?";

/** A researcher's preview keeps its steps in the browser (it has no candidate link); only well-formed ones are used. */
function previewSteps(questionProgress: QuestionProgress | undefined): AskedStep[] {
  const steps = Array.isArray(questionProgress?.steps) ? questionProgress!.steps : [];
  return steps
    .filter((s) => typeof s?.step === 'string' && s.step.length <= 40)
    .slice(0, MAX_PARTICIPANT_ANSWERS + 10)
    .map((s) => ({ step: s.step, ...(Number.isInteger(s.planned) && { planned: s.planned }) }));
}

/** The planted bug as the summary reads it: "frontend snippet: line 4: off by one. Fix: use <". */
function bugNote(kind: string, bug: NonNullable<AIInterviewResponse['bug']>) {
  const explanation = bug.explanation.trim().replace(/\.+$/, '');
  return `${kind} snippet: ${bug.line ? `line ${bug.line}: ` : ''}${explanation}. Fix: ${bug.fix.trim()}`;
}

export async function POST(request: Request) {
  try {
    // Each turn spends the AI key, so only a live candidate link or the researcher's own session gets one.
    const auth = await verifyParticipantToken(request);
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error || 'Valid participant link or researcher session required' },
        { status: 401 }
      );
    }
    const body = await request.json();
    if (tooMuchText(body)) {
      return NextResponse.json({ error: 'That is more text than one interview turn takes.' }, { status: 413 });
    }

    if (!auth.isAdmin && !(await claimParticipantTurn(auth.token!, MAX_TURNS_PER_LINK))) {
      return NextResponse.json(
        { error: 'This interview has reached its limit of questions.' },
        { status: 429 }
      );
    }

    const {
      history,
      participantProfile,
      questionProgress,
      currentContext
    }: {
      history: InterviewMessage[];
      participantProfile: ParticipantProfile | null;
      questionProgress: QuestionProgress;
      currentContext: string;
    } = body;
    // A candidate's interview runs on the study stored with their link; only the researcher previews other settings.
    const studyConfig: StudyConfig = auth.isAdmin ? body.studyConfig : auth.studyConfig;

    if (!Array.isArray(history) || !studyConfig) {
      return NextResponse.json(
        { error: 'Missing interview history or study configuration' },
        { status: 400 }
      );
    }

    // The steps asked so far: a candidate's from the turns the server saved, never from what the browser says.
    const link = auth.isAdmin ? null : await getParticipantToken(auth.token!);
    if (!auth.isAdmin && !link) {
      return NextResponse.json({ error: 'This interview link is no longer active.' }, { status: 410 });
    }
    const asked: AskedStep[] = link
      ? link.exchanges.map((e) => ({ step: e.step ?? 'unknown', ...(e.planned && { planned: e.planned }) }))
      : previewSteps(questionProgress);

    const fixedQuestions = (studyConfig.coreQuestions || []).filter((q) => typeof q === 'string' && q.trim());
    const step = asked.length >= MAX_PARTICIPANT_ANSWERS ? 'ending' : nextStep(asked, fixedQuestions.length);
    // a failed turn ('retry') doesn't end a re-ask: the question still counts as asked again
    const lastStep = [...asked].reverse().find((a) => a.step !== 'retry')?.step;
    // where the progress bar stays when this turn re-asks or retries: the stage of the question last asked
    const lastRealStep = [...asked].reverse().find((a) => a.step !== 'reask' && a.step !== 'retry')?.step;

    let message: string;
    let extra: ExchangeExtra = { step };
    let profileUpdates: AIInterviewResponse['profileUpdates'] = [];

    if (step === 'ending') {
      // no AI call: the close is always the same
      message = CLOSING_MESSAGE;
    } else {
      const deepDiveNumber = asked.filter((a) => a.step === 'deepdive').length + 1;
      const kind = step.startsWith('snippet:') ? step.slice('snippet:'.length) : '';
      const options: InterviewStepOptions = {
        // the first reply is to the greeting ("ready?"), and a question is asked again at most once in a row
        reaskAllowed: step !== 'introduction' && lastStep !== 'reask',
        currentContext: String(currentContext ?? ''),
        ...(step === 'deepdive' && { deepDiveNumber }),
        ...(step === 'deepdive' && deepDiveNumber > 1 && { plannedQuestions: plannedDeepDives(asked) }),
        ...(kind && { snippetNumber: SNIPPET_KINDS.indexOf(kind as SnippetKind) + 1 }),
        ...(step.startsWith('core:') && { fixedQuestion: fixedQuestions[Number(step.slice('core:'.length))] })
      };
      const ask = () => getInterviewProvider(studyConfig).generateInterviewResponse(
        history.slice(-20),
        studyConfig,
        participantProfile,
        step,
        options
      );
      // What the step needs from the AI: a re-ask or a question has a question in it (Groq once sent just "Understood."),
      // a snippet has its code and its planted bug (without them it can't be judged later), a fixed question's
      // acknowledgement just has to be there.
      const usable = (r: AIInterviewResponse) => {
        if (r.failed || !r.message.trim()) return false;
        if (r.answered === false && options.reaskAllowed) return r.message.includes('?');
        if (kind) return /```/.test(r.message) && Boolean(r.bug);
        return step.startsWith('core:') || r.message.includes('?');
      };
      // an unusable reply is asked for once more before the candidate is told anything went wrong
      let result = await ask();
      if (!usable(result)) result = await ask();
      const reasked = result.answered === false && options.reaskAllowed;
      const broken = !usable(result);

      if (broken) {
        message = RETRY_MESSAGE;
        extra = { step: 'retry' };
      } else if (reasked) {
        message = cleanMessage(result.message);
        extra = { step: 'reask' };
      } else {
        message = step.startsWith('core:') ? buildCoreQuestionTurn(result.message, options.fixedQuestion!) : cleanMessage(result.message);
        if (step === 'deepdive' && deepDiveNumber === 1) {
          extra = { step, planned: result.plannedQuestions === 4 ? 4 : 3, ...(result.analysis && { note: `Project analysis: ${result.analysis}` }) };
        }
        if (kind) extra = { step, note: bugNote(kind, result.bug!) };
      }
      profileUpdates = result.profileUpdates || [];
    }

    const nameField = participantProfile?.fields?.find(
      (field: any) => field.fieldId === 'name'
    );
    const extractedName = nameField?.value || null;

    if (extractedName) {
      profileUpdates = [
        ...profileUpdates,
        {
          fieldId: 'name',
          value: extractedName,
          status: 'extracted'
        }
      ];
    }

    let updatedProfile = participantProfile;

    if (participantProfile && profileUpdates.length) {
      updatedProfile = {
        ...participantProfile,
        fields: participantProfile.fields.map((field: any) => {
          const update = profileUpdates.find(
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

    // the server keeps this turn (the candidate's answer, this reply, its step and any hidden note); finishing saves
    // those, not the browser's copy
    if (!auth.isAdmin) {
      const answer = [...history].reverse().find((message) => message.role === 'user');
      await recordParticipantExchange(auth.token!, String(answer?.content ?? '').slice(0, MAX_MESSAGE_LENGTH), message, extra);
    }

    const updatedHistory = history.slice(-20);
    const last = updatedHistory[updatedHistory.length - 1];

    if (!last || last.role !== 'ai' || last.content !== message) {
      updatedHistory.push({
        id: `msg-${Date.now()}`,
        role: 'ai',
        content: message,
        timestamp: Date.now()
      });
    }

    const shownStep = extra.step === 'reask' || extra.step === 'retry' ? lastRealStep ?? 'introduction' : extra.step!;
    // the browser gets the message and where the interview stands; the hidden notes (analysis, planted bug) stay here
    return NextResponse.json({
      message,
      step: extra.step,
      ...(extra.planned && { planned: extra.planned }),
      questionAddressed: null,
      phaseTransition: phaseOf(shownStep),
      shouldConclude: extra.step === 'ending',
      profileUpdates,
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
