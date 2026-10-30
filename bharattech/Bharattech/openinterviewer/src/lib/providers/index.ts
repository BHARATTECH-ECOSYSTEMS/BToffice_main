// AI Provider Factory
// Every study runs on Groq (owner, 2026-10-28: Gemini, Claude and Mistral were removed). The study only picks the
// model (lib/aiDefaults.ts studyModel); an AI a study saved before that is ignored.

import { GroqProvider } from "./groq";
import { AIProvider } from "../ai";
import { StudyConfig } from "@/types";

// the study isn't needed to choose an AI any more; callers still pass it, and the model comes from it per call
export function getInterviewProvider(_studyConfig?: StudyConfig): AIProvider {
  return new GroqProvider();
}

export { GroqProvider } from "./groq";
