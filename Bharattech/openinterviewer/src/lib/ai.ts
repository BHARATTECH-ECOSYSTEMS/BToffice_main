// AI Provider Abstraction Layer
// Supports Gemini, Claude, and Mistral

import {
  StudyConfig,
  ParticipantProfile,
  InterviewMessage,
  SynthesisResult,
  BehaviorData,
  AIInterviewResponse,
  QuestionProgress,
  AggregateSynthesisResult
} from '@/types';

// =============================
// Re-export prompts
// =============================

export {
  buildInterviewSystemPrompt,
  getAIBehaviorInstruction,
  formatProfileFields
} from './prompts';

// =============================
// Provider Interface
// =============================

export interface AIProvider {
  generateRawResponse(extractionPrompt: string): unknown;
  generateInterviewResponse(
    history: InterviewMessage[],
    studyConfig: StudyConfig,
    participantProfile: ParticipantProfile | null,
    questionProgress: QuestionProgress,
    currentContext: string
  ): Promise<AIInterviewResponse>;

  getInterviewGreeting(studyConfig: StudyConfig): Promise<string>;

  synthesizeInterview(
    history: InterviewMessage[],
    studyConfig: StudyConfig,
    behaviorData: BehaviorData,
    participantProfile: ParticipantProfile | null
  ): Promise<SynthesisResult>;

  synthesizeAggregate(
    studyConfig: StudyConfig,
    syntheses: SynthesisResult[],
    interviewCount: number
  ): Promise<Omit<AggregateSynthesisResult, 'studyId' | 'interviewCount' | 'generatedAt'>>;

  generateFollowupStudy(
    parentConfig: StudyConfig,
    synthesis: AggregateSynthesisResult
  ): Promise<{ name: string; researchQuestion: string; coreQuestions: string[] }>;
}

// =============================
// JSON Cleaner
// =============================

export const cleanJSON = (text: string): string => {
  if (!text) return '{}';

  // Only strip a fence that wraps the OUTSIDE of the entire response (the
  // common LLM habit of returning ```json { ... } ``` for the whole
  // payload). This is intentionally anchored to the start/end only - a
  // non-anchored global strip (the previous behavior) also deletes any
  // legitimate ```code``` fence living inside a string field value, e.g. a
  // code snippet inside the "message" field shown to the interview
  // participant, corrupting it before it's even parsed as JSON.
  let cleaned = text
    .replace(/^\s*```(?:json)?\s*/, '')
    .replace(/```\s*$/, '')
    .trim();

  const firstBrace = cleaned.indexOf('{');
  if (firstBrace !== -1) {
    let depth = 0;
    for (let i = firstBrace; i < cleaned.length; i++) {
      if (cleaned[i] === '{') depth++;
      if (cleaned[i] === '}') depth--;
      if (depth === 0) {
        return cleaned.substring(firstBrace, i + 1);
      }
    }
  }

  return cleaned;
};

// =============================
// Default Fallback Responses
// =============================

export const defaultInterviewResponse: AIInterviewResponse = {
  message: "I appreciate you sharing that. What else comes to mind?",
  questionAddressed: null,
  phaseTransition: null,
  profileUpdates: [],
  shouldConclude: false
};

export const defaultSynthesisResult: SynthesisResult = {
  statedPreferences: [],
  revealedPreferences: [],
  themes: [],
  contradictions: [],
  keyInsights: ['Analysis pending...'],
  bottomLine: 'Interview synthesis in progress.'
};

export const defaultAggregateSynthesisResult: Omit<
  AggregateSynthesisResult,
  'studyId' | 'interviewCount' | 'generatedAt'
> = {
  commonThemes: [],
  divergentViews: [],
  keyFindings: ['Analysis pending...'],
  researchImplications: [],
  bottomLine: 'Aggregate synthesis in progress.'
};
