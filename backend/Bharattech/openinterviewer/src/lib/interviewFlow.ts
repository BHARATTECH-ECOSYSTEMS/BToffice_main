import type { InterviewPhase } from '@/types';

// The interview's order (owner, 2026-10-28): the candidate introduces themselves, describes a project, answers 3 or 4
// questions the AI draws from that project (the AI decides when it first reads it), then the researcher's own fixed
// questions, then finds the planted bug in three code snippets, one frontend, one backend, one database. The server
// picks every step from the turns it saved itself (each turn keeps the step its question belonged to), so neither the
// AI nor the browser can skip a step or end the interview early.

export const SNIPPET_KINDS = ['frontend', 'backend', 'database'] as const;
export type SnippetKind = typeof SNIPPET_KINDS[number];

/**
 * One step: 'introduction', 'project', 'deepdive', 'core:<n>' (a fixed question), 'snippet:<kind>', 'ending'.
 * Two more are kept with a turn but never count as a step: 'reask' (the AI asked the last question again, once, after an
 * answer that didn't address it) and 'retry' (the AI failed and the candidate was asked to send the answer again).
 */
export type InterviewStep = string;
export type AskedStep = { step: InterviewStep; planned?: number };

/** How many project questions the AI planned when it read the project: 3 or 4, anything else 3. */
export function plannedDeepDives(asked: AskedStep[]): 3 | 4 {
  return asked.find((a) => a.step === 'deepdive')?.planned === 4 ? 4 : 3;
}

/** The step the next question belongs to, after the steps already asked. */
export function nextStep(asked: AskedStep[], fixedQuestions: number): InterviewStep {
  const steps = asked.map((a) => a.step);
  if (!steps.includes('introduction')) return 'introduction';
  if (!steps.includes('project')) return 'project';
  const deepDives = steps.filter((s) => s === 'deepdive').length;
  if (deepDives < (deepDives === 0 ? 1 : plannedDeepDives(asked))) return 'deepdive';
  for (let i = 0; i < fixedQuestions; i++) if (!steps.includes(`core:${i}`)) return `core:${i}`;
  for (const kind of SNIPPET_KINDS) if (!steps.includes(`snippet:${kind}`)) return `snippet:${kind}`;
  return 'ending';
}

/** The stage the chat's progress bar shows for a step. */
export function phaseOf(step: InterviewStep): InterviewPhase {
  if (step === 'introduction' || step === 'project' || step === 'ending') return step;
  if (step.startsWith('snippet:')) return 'code';
  return 'questions';
}
