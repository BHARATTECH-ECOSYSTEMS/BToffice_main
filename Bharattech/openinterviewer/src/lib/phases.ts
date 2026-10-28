import type { InterviewPhase } from '@/types';

// The interview's five stages in order (lib/interviewFlow.ts phaseOf); the chat's header shows them as a bar.
export const INTERVIEW_PHASES: InterviewPhase[] = ['introduction', 'project', 'questions', 'code', 'ending'];

/** How far the interview is: 0 for the first stage … 4 for the last; anything unknown counts as the start. */
export function phaseStep(phase?: string) {
  return Math.max(0, INTERVIEW_PHASES.indexOf(phase as InterviewPhase));
}
