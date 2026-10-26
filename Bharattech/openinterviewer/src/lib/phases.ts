import type { InterviewPhase } from '@/types';

// The interview's five phases in order (lib/prompts/interview.ts); the chat's header shows them as a bar.
export const INTERVIEW_PHASES: InterviewPhase[] = ['introduction', 'education', 'project', 'functionality', 'ending'];

/** How far the interview is: 0 for the first phase … 4 for the last; anything unknown counts as the start. */
export function phaseStep(phase?: string) {
  return Math.max(0, INTERVIEW_PHASES.indexOf(phase as InterviewPhase));
}
