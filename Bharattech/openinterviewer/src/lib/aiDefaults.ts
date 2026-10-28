import { DEFAULT_GROQ_MODEL, GROQ_MODELS, StudyConfig } from '@/types';

// Which model runs a study's interviews. Groq runs every study (owner, 2026-10-28: Gemini, Claude and Mistral were
// removed). A study keeps a model only when the researcher picked one of GROQ_MODELS; anything else it carries (a model
// of the removed AIs, or none) runs on the server's GROQ_MODEL, else the default.

/** Server side only: GROQ_MODEL when set (any model the key can use), else the default. */
export function serverDefaultModel(): string {
  return process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL;
}

/** The saved model when it is one the setup screen offers, else undefined. */
export function knownGroqModel(saved?: string): string | undefined {
  return GROQ_MODELS.some((m) => m.id === saved) ? saved : undefined;
}

/** Server side only: the model a study's interviews and summaries run on. */
export function studyModel(studyConfig: Partial<StudyConfig>): string {
  return knownGroqModel(studyConfig?.aiModel) || serverDefaultModel();
}

/** A study keeps a model only when the researcher picked one; otherwise it follows the server. */
export function aiChoiceToSave(chosen: boolean, aiModel: string) {
  return chosen ? { aiModel } : {};
}
