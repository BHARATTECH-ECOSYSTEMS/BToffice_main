import { StudyConfig } from '@/types';

/**
 * The part of a study a candidate's browser gets: its name, consent text, the details it asks for, and how many core
 * questions there are. The questions themselves, the job requirements and the AI settings stay with the researcher
 * (security report 2026-10-28 lead 27: a link showed them before the interview).
 */
export function candidateStudy(config: StudyConfig): Pick<StudyConfig, 'id' | 'name' | 'consentText' | 'profileSchema' | 'questionCount'> {
  return {
    id: config.id,
    name: config.name,
    consentText: config.consentText,
    profileSchema: config.profileSchema,
    questionCount: config.coreQuestions?.length ?? 0,
  };
}
