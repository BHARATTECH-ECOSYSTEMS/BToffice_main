/**
 * Interview Greeting Prompt
 *
 * Generates the opening message that welcomes participants to the interview.
 *
 * CUSTOMIZATION GUIDE:
 * - Modify the tone by changing phrases like "warm" or "inviting"
 * - Adjust the structure (e.g., add/remove mention of question count)
 * - Change how profile gathering is introduced
 *
 * KEY VARIABLES:
 * - studyConfig.name: Study title shown to participant
 * - studyConfig.researchQuestion: Main research focus
 * - studyConfig.coreQuestions: List of main questions
 * - studyConfig.profileSchema: Background fields to collect
 */

import { StudyConfig } from '@/types';

/**
 * Fixed greeting shown to every participant.
 *
 * Per requirement: the opening message is NOT AI-generated. It is a fixed,
 * hardcoded message (same for every participant/study), split across
 * multiple short lines instead of one long paragraph so it's easy to read
 * in the chat bubble.
 *
 * TODO: confirm exact wording - currently a placeholder based on the text
 * given verbally ("Hello. Welcome welcome from the team. Let's start.").
 * Edit the string below directly to change the wording; no other file needs
 * to change since /api/greeting just returns this.
 */
export const getFixedGreeting = (_studyConfig: StudyConfig): string => {
  return `Hello! Welcome, welcome from the team.

Let's get started - are you ready to begin the interview?`;
};

/**
 * ---------------------------------------------------------------------
 * UNUSED - kept for reference only.
 *
 * These functions used to AI-generate the opening greeting via
 * provider.getInterviewGreeting() (see lib/providers/*.ts). The greeting is
 * now a fixed hardcoded message (getFixedGreeting, above) and
 * /api/greeting/route.ts no longer calls the AI provider for this, so
 * these are no longer used by the live flow. Left in place in case the
 * AI-generated greeting behavior is wanted again later.
 * ---------------------------------------------------------------------
 */
// export const buildGreetingPrompt = (studyConfig: StudyConfig): string => {
//   const profileFieldLabels = studyConfig.profileSchema
//     .filter(f => f.required)
//     .map(f => f.label.toLowerCase())
//     .slice(0, 3);
//
//   const hasFixedQuestions = studyConfig.coreQuestions.length > 0;
//
//   return `You are starting a research interview.
//
// Study: ${studyConfig.name}
// Research Question: ${studyConfig.researchQuestion}
// ${studyConfig.jobTitle ? `Role / Job Title: ${studyConfig.jobTitle}` : ''}
// ${hasFixedQuestions ? `Number of core questions: ${studyConfig.coreQuestions.length}` : 'Questions will be generated dynamically based on the role and the participant\'s answers.'}
// Profile info to gather first: ${profileFieldLabels.join(', ')}
//
// Write a warm, brief opening (2-3 sentences) that:
// 1. Thanks them for participating${studyConfig.jobTitle ? ` in the interview for the ${studyConfig.jobTitle} role` : ''}
// 2. ${hasFixedQuestions
//     ? `Mentions you'll have about ${studyConfig.coreQuestions.length} main questions to explore`
//     : `Mentions you'll be asking a series of questions about their background and experience`}
// 3. Asks if they are ready to begin, and once they confirm, asks an opening background question that naturally gathers their ${profileFieldLabels[0] || 'background'} and context
//
// Keep it conversational and inviting. Start gathering their profile naturally - don't make it feel like a form.`;
// };
//
// export const getDefaultGreeting = (studyConfig: StudyConfig): string => {
//   const questionsPhrase = studyConfig.coreQuestions.length > 0
//     ? `about ${studyConfig.coreQuestions.length} questions`
//     : 'a series of questions about your background and experience';
//   return `Thank you for participating in this study! I'm excited to learn from your experiences. We'll explore ${questionsPhrase} together. To get started, could you share a bit about yourself and your background?`;
// };
