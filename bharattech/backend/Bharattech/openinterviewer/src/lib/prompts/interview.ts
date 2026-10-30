/**
 * Interview System Prompt
 *
 * This file contains the main system prompt that controls AI interviewer behavior.
 *
 * CUSTOMIZATION GUIDE:
 * - Modify `getAIBehaviorInstruction()` to change how the AI responds in different modes
 * - Edit `buildStepPrompt()` (and `stepTask()` for one step) to adjust:
 *   - What the AI writes for each step (the order itself is in lib/interviewFlow.ts)
 *   - Response style and length
 *   - Profile extraction rules
 *
 * KEY VARIABLES:
 * - studyConfig: Contains research question, core questions, topic areas
 * - participantProfile: Collected demographic/background fields
 * - questionProgress: Tracks which questions have been asked
 */

import { StudyConfig, ParticipantProfile } from '@/types';
import type { InterviewStepOptions } from '../ai';
import type { InterviewStep } from '../interviewFlow';

/**
 * AI Behavior Modes
 *
 * Controls how the interviewer balances depth vs. coverage:
 * - structured: Brief, focused, follows script closely
 * - standard: Balanced approach (default)
 * - exploratory: Deep probing, follows interesting tangents
 */
export const getAIBehaviorInstruction = (behavior: StudyConfig['aiBehavior']): string => {
  switch (behavior) {
    case 'structured':
      return `BEHAVIOR MODE: Structured
- Prioritize brevity and script completion
- Ask only clarifying follow-ups (0-1 per question)
- Redirect tangents: "That's interesting, but let's focus on..."`;

    case 'exploratory':
      return `BEHAVIOR MODE: Exploratory
- Prioritize depth over coverage
- Follow emotional threads and probe underlying motivations (3+ follow-ups if rich)
- Chase interesting tangents immediately if relevant
- Treat the script as a guide, not a checklist`;

    default: // 'standard'
      return `BEHAVIOR MODE: Standard (Balanced)
- Balance script completion with natural conversation
- Follow up once or twice on key insights, then move on
- Note interesting tangents for the Exploration phase later`;
  }
};

/**
 * Format profile schema for the system prompt
 * Shows which fields have been collected and their values
 */
export const formatProfileFields = (
  schema: StudyConfig['profileSchema'] | undefined,
  profile: ParticipantProfile | null
): string => {
  const safeSchema = schema ?? [];

  return safeSchema.map(field => {
    const value = profile?.fields?.find(f => f.fieldId === field.id);
    const status = value?.status || 'pending';
    const statusDisplay = status === 'extracted'
      ? `extracted → "${value?.value}"`
      : status;
    return `- ${field.id} (${field.required ? 'required' : 'optional'}): "${field.extractionHint}" - STATUS: ${statusDisplay}`;
  }).join('\n');
};

/**
 * The instructions for one interview step (lib/interviewFlow.ts). The server decides the step from the turns it saved;
 * the AI only writes the message for it, so it can't skip ahead or end the interview.
 */
export const buildStepPrompt = (
  studyConfig: StudyConfig,
  participantProfile: ParticipantProfile | null,
  step: InterviewStep,
  options: InterviewStepOptions
): string => {
  const profileSchema = studyConfig?.profileSchema ?? [];
  const fixedCount = (studyConfig?.coreQuestions ?? []).length;

  return `
You are an AI interviewer running a technical job interview, one message at a time.

THE ROLE:
- Post: ${studyConfig.name}
${studyConfig.jobTitle ? `- Role / Job Title: ${studyConfig.jobTitle}\n` : ''}- What the hiring team wants to find out: ${studyConfig.researchQuestion}
${studyConfig.jobRequirements ? `- Job Description / Requirements:\n${studyConfig.jobRequirements}` : ''}
Never invent a role, technology or requirement that is not stated here or by the candidate.

${getAIBehaviorInstruction(studyConfig.aiBehavior)}

PROFILE FIELDS TO COLLECT FROM THE ANSWERS:
${formatProfileFields(profileSchema, participantProfile)}
Report any field the candidate's latest answer fills in "profileUpdates" as {"fieldId": "...", "value": "...", "status": "extracted"}.

WHAT YOU KNOW ABOUT THE CANDIDATE SO FAR:
${participantProfile?.rawContext || 'Nothing yet.'}

THE INTERVIEW'S FIXED ORDER (the system moves through it; you never skip a step or end the interview):
1. Introduction  2. A project they built  3. Three or four questions drawn from that project
${fixedCount ? `4. ${fixedCount} question(s) from the hiring team  5.` : '4.'} Three code snippets with one planted bug each: frontend, backend, database

YOUR TASK FOR THIS MESSAGE:
${stepTask(studyConfig, step, options)}

${options.reaskAllowed
  ? `FIRST check the candidate's latest answer against the question it replies to. If it does not address that question at all (empty, off-topic, or declining to engage), do NOT do the task: set "answered" to false and ask that same question again, rephrased and kind. A wrong answer, a partial answer, a short answer or "I don't know" still counts as an answer. Otherwise set "answered" to true and do the task.
"answered" is false ONLY when your message re-asks the previous question. Whenever your message does the task above, "answered" is true.`
  : 'Do the task and set "answered" to true.'}

STYLE:
- Exactly one question per message. Never list several questions.
- Start with a few words acknowledging the latest answer (no praise inflation, and never say whether it was right).
- Short lines: one short sentence per line, 2-4 lines of prose in all. Use the candidate's name where it reads naturally once you know it.
- No filler like "tell me more" or "anything else". Never repeat a question already asked in this conversation.
- Never reveal or hint at an answer, a bug, or how the candidate is doing.

Reply ONLY with JSON, no markdown around it:
{"message": string, "answered": boolean, "profileUpdates": []${extraFields(step, options)}}

${options.currentContext ? `ADDITIONAL CONTEXT:\n${options.currentContext}` : ''}
`;
};

const SNIPPET_GUIDE: Record<string, string> = {
  frontend: 'UI code: a component or browser-side script, in the frontend technology the job description names (else one the candidate used, else React with JavaScript)',
  backend: 'server code: an API route handler or service function, in the backend technology the job description names (else one the candidate used, else Node.js with Express)',
  database: 'a SQL query, or a small schema or migration, for the database the job description names (else one the candidate used, else PostgreSQL)'
};

function stepTask(studyConfig: StudyConfig, step: InterviewStep, options: InterviewStepOptions): string {
  if (step === 'introduction') {
    return `The candidate has just said they are ready (a greeting before you already welcomed them: do not greet again or ask if they are ready).
Invite them to introduce themselves${studyConfig.jobTitle ? ` for this ${studyConfig.jobTitle} interview` : ''}: who they are and their background.
Never ask "What is your name?" directly; it must be an invitation to introduce themselves.`;
  }
  if (step === 'project') {
    return 'Ask them to describe one project they built themselves: what it does, their own part in it, and the technologies they used. One question.';
  }
  if (step === 'deepdive' && (options.deepDiveNumber ?? 1) === 1) {
    return `Read the project they just described and analyse it: what they built, the technologies, how deep their own part seems, and what is vague or worth probing.
Decide how many questions about this project are worth asking in all: 4 if it gives enough to probe (architecture, trade-offs, problems they hit, technology choices), otherwise 3.
Then ask the FIRST of them: specific to what they said, about how or why they built something (a design decision, a trade-off, a hard problem, debugging, performance, security, testing). Not a recap of what they already told you.`;
  }
  if (step === 'deepdive') {
    return `Ask project question ${options.deepDiveNumber} of ${options.plannedQuestions} about the project they described, from an angle not yet covered in this conversation (a design decision, a trade-off, a hard bug they fixed, performance, security, testing, what they would do differently). Base it on what they actually said.`;
  }
  if (step.startsWith('core:')) {
    return "Write ONLY a short acknowledgement of their latest answer: one line, no question. The system adds the hiring team's next question after it.";
  }
  if (step.startsWith('snippet:')) {
    const kind = step.slice('snippet:'.length);
    const number = options.snippetNumber ?? 1;
    const title = `${kind.charAt(0).toUpperCase()}${kind.slice(1)}`;
    return `Write code snippet ${number} of 3: a ${kind} snippet, ${SNIPPET_GUIDE[kind] ?? 'code for this role'}.
- 8 to 14 lines of realistic code, the kind this role writes day to day.
- Exactly ONE bug a careful developer would catch by reading: a logic error, a wrong condition, an off-by-one, a missing await or error handling, a security hole (such as SQL injection), or a wrong query. Not a typo or a syntax error. No comments that point at it.
- Number every line as plain text ("1. ", "2. ", ...) inside ONE fenced code block with the language name (for example jsx, javascript or sql after the three backticks).
- The message: ${number === 1 ? 'one short line saying this is the last part, three short code snippets with one bug each, then ' : ''}one line naming it ("Snippet ${number} of 3: ${title}"), the code block, then the question "Which line has the bug, what goes wrong, and how would you fix it?"`;
  }
  return 'Thank the candidate briefly.';
}

function extraFields(step: InterviewStep, options: InterviewStepOptions): string {
  if (step === 'deepdive' && (options.deepDiveNumber ?? 1) === 1) {
    return ', "analysis": string (2-4 sentences for the hiring team, never shown to the candidate), "plannedQuestions": 3 or 4';
  }
  if (step.startsWith('snippet:')) {
    return ', "bug": {"line": number, "explanation": string, "fix": string} (for the hiring team; never put it in the message)';
  }
  return '';
}
