// AI Provider Abstraction Layer
// One provider: Groq (lib/providers/groq.ts)

import {
  StudyConfig,
  ParticipantProfile,
  InterviewMessage,
  SynthesisResult,
  BehaviorData,
  AIInterviewResponse,
  AggregateSynthesisResult
} from '@/types';
import type { ScoredQuestion, TranscriptPair } from './scoring';

// =============================
// Re-export prompts
// =============================

export {
  buildStepPrompt,
  getAIBehaviorInstruction,
  formatProfileFields
} from './prompts';

// =============================
// Provider Interface
// =============================

export interface InterviewStepOptions {
  // whether the AI may ask the last question again instead (once in a row) when the latest answer doesn't address it
  reaskAllowed: boolean;
  currentContext: string;
  deepDiveNumber?: number;    // which project question this is (1-based)
  plannedQuestions?: number;  // how many project questions were planned (known from the second one on)
  snippetNumber?: number;     // which code snippet this is (1-based)
  fixedQuestion?: string;     // a 'core:<n>' step: the researcher's own question, asked as written
}

export interface AIProvider {
  generateRawResponse(extractionPrompt: string): unknown;
  // writes the question for one step the server chose (lib/interviewFlow.ts)
  generateInterviewResponse(
    history: InterviewMessage[],
    studyConfig: StudyConfig,
    participantProfile: ParticipantProfile | null,
    step: string,
    options: InterviewStepOptions
  ): Promise<AIInterviewResponse>;

  getInterviewGreeting(studyConfig: StudyConfig): Promise<string>;

  synthesizeInterview(
    history: InterviewMessage[],
    studyConfig: StudyConfig,
    behaviorData: BehaviorData,
    participantProfile: ParticipantProfile | null,
    // the interviewer's hidden notes (the project analysis, the planted bugs), to judge the answers against
    notes?: string,
    // the questions to score, each with the candidate's final answer (lib/scoring.ts); the result then has a scorecard
    questions?: ScoredQuestion[]
  ): Promise<SynthesisResult>;

  // an interview held before answers were scored: per pair, its kind (project / fixed / code / skip) and a verdict;
  // null when the AI couldn't be reached or answered nonsense
  scoreTranscript(studyConfig: StudyConfig, pairs: TranscriptPair[]): Promise<unknown[] | null>;

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

// what a turn gets when the AI can't be reached or answers nonsense: the route asks for the answer again
export const defaultInterviewResponse: AIInterviewResponse = {
  message: "I appreciate you sharing that. What else comes to mind?",
  profileUpdates: [],
  failed: true
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
