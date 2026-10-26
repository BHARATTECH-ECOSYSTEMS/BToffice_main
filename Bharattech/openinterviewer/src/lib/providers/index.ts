// AI Provider Factory
// Returns the appropriate provider based on study or environment configuration

import { MistralProvider } from "./mistral";
import { GeminiProvider } from "./gemini";
import { ClaudeProvider } from "./claude";
import { AIProvider } from "../ai";
import { StudyConfig } from "@/types";
import { serverDefaultProvider } from "@/lib/aiDefaults";

export type ProviderType = "gemini" | "claude" | "mistral";

// Validate provider safely: the study's own choice, else the server's (the same rule the setup screen shows)
function resolveProviderType(studyConfig?: StudyConfig): ProviderType {
  return studyConfig?.aiProvider || serverDefaultProvider();
}

// Provider priority:
// 1. studyConfig.aiProvider
// 2. process.env.AI_PROVIDER
// 3. default = gemini
export function getInterviewProvider(
  studyConfig?: StudyConfig
): AIProvider {

  const providerType = resolveProviderType(studyConfig);
  const model = studyConfig?.aiModel;

  switch (providerType) {

    case "claude":
      return new ClaudeProvider(model);

    case "mistral":
      return new MistralProvider(model);

    case "gemini":
    default:
      return new GeminiProvider(model);
  }
}

// Explicit exports
export { GeminiProvider } from "./gemini";
export { ClaudeProvider } from "./claude";
export { MistralProvider } from "./mistral";
