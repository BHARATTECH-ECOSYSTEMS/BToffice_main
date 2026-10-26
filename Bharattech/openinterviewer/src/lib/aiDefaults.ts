import {
  AIProviderType,
  DEFAULT_CLAUDE_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_MISTRAL_MODEL
} from '@/types';

// Which AI runs a study's interviews. A study that names none runs on the server's (AI_PROVIDER), so a new study
// works with whichever key the server has; the setup screen used to save Google Gemini into every study, which
// failed on every turn on a server with only the Mistral key.

const PROVIDERS: AIProviderType[] = ['gemini', 'claude', 'mistral'];

/** Server side only: AI_PROVIDER when it names one of ours, else Mistral (the key the setup doc asks for). */
export function serverDefaultProvider(): AIProviderType {
  const configured = process.env.AI_PROVIDER;
  return PROVIDERS.includes(configured as AIProviderType) ? configured as AIProviderType : 'mistral';
}

export function defaultModelFor(provider: AIProviderType) {
  return provider === 'claude'
    ? DEFAULT_CLAUDE_MODEL
    : provider === 'mistral'
    ? DEFAULT_MISTRAL_MODEL
    : DEFAULT_GEMINI_MODEL;
}

/** The AI the setup screen shows as chosen: the study's own, else the server's, else Mistral until the server answers. */
export function shownProvider(saved?: AIProviderType, server?: AIProviderType): AIProviderType {
  return saved || server || 'mistral';
}

/** A study keeps an AI (and its model) only when the researcher picked one; otherwise it follows the server. */
export function aiChoiceToSave(chosen: boolean, aiProvider: AIProviderType, aiModel: string) {
  return chosen ? { aiProvider, aiModel } : {};
}
