// Research Interview Tool Types

import type { Scorecard } from '@/lib/scoring';

// ============================================
// Interview Phase & Progress Tracking
// ============================================

// The stages the chat's progress bar shows (lib/interviewFlow.ts phaseOf maps each step onto one)
export type InterviewPhase =
  | 'introduction'    // The candidate introduces themselves
  | 'project'         // A project the candidate has built
  | 'questions'       // 3 or 4 questions drawn from that project, then the researcher's fixed questions
  | 'code'            // Three code snippets (frontend, backend, database), each with one planted bug
  | 'ending';          // Interview complete

export interface QuestionProgress {
  questionsAsked: number[];  // Indices of completed questions
  total: number;
  currentPhase: InterviewPhase;
  isComplete: boolean;
  // a researcher's preview only (it has no candidate link for the server to keep the steps on)
  steps?: { step: string; planned?: number }[];
}

// ============================================
// Profile Schema - Researcher-defined fields
// ============================================

export interface ProfileField {
  id: string;
  label: string;              // e.g., "Current Role"
  extractionHint: string;     // e.g., "Their job title or position"
  required: boolean;
  options?: string[];         // Optional preset options for validation
}

export type ProfileFieldStatus = 'pending' | 'extracted' | 'vague' | 'refused';

export interface ProfileFieldValue {
  fieldId: string;
  value: string | null;
  status: ProfileFieldStatus;
  extractedAt?: number;
}

export interface ParticipantProfile {
  id: string;
  fields: ProfileFieldValue[];  // Structured field values
  rawContext: string;           // Full context summary from conversation
  timestamp: number;
}

// ============================================
// Study Configuration
// ============================================

export type AIBehavior = 'structured' | 'standard' | 'exploratory';

// ============================================
// AI Model Configuration
// ============================================

export interface AIModelOption {
  id: string;
  label: string;
  desc: string;
}

// The Groq models a study may pick (Groq's own model list for our key, checked 2026-10-28). Groq runs every study.
export const GROQ_MODELS: AIModelOption[] = [
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B', desc: 'Most capable' },
  { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B', desc: 'Faster, lighter' },
  { id: 'qwen/qwen3.8-27b', label: 'Qwen3.8 27B', desc: 'Alibaba Cloud model' },
];

export const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';

// Link expiration options
export type LinkExpirationOption = 'never' | '7days' | '30days' | '90days';

export interface StudyConfig {
  _id?: string;
  id: string;
  name: string;
  description: string;
  researchQuestion: string;
  coreQuestions: string[];
  // Role details used to let the AI generate interview questions itself,
  // instead of the admin hand-writing every question in coreQuestions.
  // If jobTitle/jobRequirements are filled in and coreQuestions is left
  // empty, the interview prompt derives questions dynamically from these.
  jobTitle?: string;
  jobRequirements?: string;
  topicAreas: string[];           // General topic areas for synthesis
  profileSchema: ProfileField[];  // Fields to collect during interview
  aiBehavior: AIBehavior;
  aiModel?: string;               // One of GROQ_MODELS, else the server's GROQ_MODEL (lib/aiDefaults.ts studyModel)
  consentText: string;
  createdAt: number;
  // Follow-up study lineage
  parentStudyId?: string;         // ID of parent study if this is a follow-up
  parentStudyName?: string;       // Name of parent study for display
  generatedFrom?: 'synthesis' | 'manual';  // How this study was created
  // Link management
  linksEnabled?: boolean;         // Whether participant links are active (default: true)
  linkExpiration?: LinkExpirationOption;  // When links expire (default: 'never')
  // AI Reasoning
  enableReasoning?: boolean;      // undefined=auto, true=force on, false=force off
  // Only on a candidate's copy, which has no questions (src/lib/candidateStudy.ts)
  questionCount?: number;
}

// ============================================
// Interview Messages
// ============================================

export interface InterviewMessage {
  id: string;
  role: 'user' | 'ai' | 'system';
  content: string;
  timestamp: number;
}

// ============================================
// Behavior & Analysis Data
// ============================================

export interface BehaviorData {
  timePerTopic: Record<string, number>;
  messagesPerTopic: Record<string, number>;
  topicsExplored: string[];
  contradictions: string[];
}

export interface SynthesisResult {
  statedPreferences: string[];
  revealedPreferences: string[];
  themes: { theme: string; evidence: string; frequency: number }[];
  contradictions: string[];
  keyInsights: string[];
  bottomLine: string;
  // how many answers were correct (lib/scoring.ts); only for a candidate's interview, and only when the AI gave verdicts
  scorecard?: Scorecard;

  extractedProfile?: {
    role?: string;
    industry?: string;
    ai_frequency?: string;
    comfort_level?: string;
    years_experience?: string;
  };

}

// ============================================
// App State
// ============================================

export type AppStep =
  | 'setup'        // Researcher configures study
  | 'consent'      // Participant sees consent + foreshadowing
  | 'interview'    // Main interview chat (includes background gathering)
  | 'synthesis'    // Analysis results
  | 'export';      // Export data

export type ViewMode = 'researcher' | 'participant' | 'admin';

export interface ContextEntry {
  id: string;
  text: string;
  source: 'text' | 'system';
  timestamp: number;
}

// ============================================
// AI Response Structure (for API routes)
// ============================================

// What the AI writes for one interview step (lib/interviewFlow.ts). The server decides the step; the AI only writes it.
export interface AIInterviewResponse {
  message: string;
  profileUpdates: {
    fieldId: string;
    value: string | null;
    status: 'extracted' | 'vague' | 'refused';
  }[];
  answered?: boolean;                   // false: the latest answer didn't address the question, and it was asked again
  failed?: boolean;                     // the AI couldn't be reached or answered nonsense; the step is not taken
  analysis?: string;                    // first project question only: the AI's reading of the project (never shown)
  plannedQuestions?: number;            // first project question only: 3 or 4 project questions in all
  bug?: { line?: number; explanation: string; fix: string };  // a code snippet's planted bug (never shown)
}

// ============================================
// Stored Interview
// ============================================

export interface StoredInterview {
  _id?: string;
  history?: any;
  messages?: any;
  id: string;
  participantName?: string;
  studyId: string;
  studyName: string;
  participantProfile: ParticipantProfile;
  transcript: InterviewMessage[];
  synthesis: SynthesisResult | null;
  // an interview held before answers were scored: its estimated score, worked out later (lib/scoring.ts scorecardOf)
  scorecard?: Scorecard | null;
  behaviorData: BehaviorData;
  createdAt: number;
  completedAt: number;
  status: 'in_progress' | 'completed' | 'terminated';
}

// ============================================
// Participant Token (URL)
// ============================================

// What a generated link carries; the study itself stays on the server
export interface ParticipantToken {
  studyId: string;
  createdAt: number;
  expiresAt?: number;
}

// ============================================
// Stored Study
// ============================================

export interface StoredStudy {
  id: string;                    // Server-assigned UUID
  config: StudyConfig;           // Full study configuration
  createdAt: number;
  updatedAt: number;
  interviewCount: number;        // Cached count for dashboard display
  isLocked: boolean;             // True after first interview collected
}

// ============================================
// Aggregate Synthesis (Cross-Interview)
// ============================================

export interface AggregateSynthesisResult {
  studyId: string;
  interviewCount: number;
  commonThemes: { theme: string; frequency: number; representativeQuotes: string[] }[];
  divergentViews: { topic: string; viewA: string; viewB: string }[];
  participantComparisons?: {
    participantName: string;
    rank: number;
    score: number;
    strengths: string[];
    gaps: string[];
    summary: string;
  }[];
  topParticipantSummary?: string;
  keyFindings: string[];
  researchImplications: string[];
  bottomLine: string;           // One-paragraph summary of all interviews
  generatedAt: number;
}
