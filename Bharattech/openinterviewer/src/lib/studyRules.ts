import type { StudyConfig } from '@/types';

// What a study needs before it is saved or handed to candidates: a post name, a research objective, and the job
// description the AI builds its questions from (owner, 2026-10-28). The setup screen and the server use this one rule.
/** What's missing, in the screen's words ("Fill in: Job description."), or '' when the study is complete. */
export function studyProblem(config: Partial<Pick<StudyConfig, 'name' | 'researchQuestion' | 'jobRequirements'>>): string {
  const missing = [
    !config.name?.trim() && 'Post name',
    !config.researchQuestion?.trim() && 'Research objective',
    !config.jobRequirements?.trim() && 'Job description'
  ].filter(Boolean);
  return missing.length ? `Fill in: ${missing.join(', ')}.` : '';
}
