import type { AIProviderProfile } from "../../../shared/types";
import type { AIProvider } from "./provider";
import { createOpenAICompatibleProvider } from "./openaiCompatibleProvider";

export function createMiniMaxProvider(
  profile: AIProviderProfile,
  apiKey: string,
  fetchImpl: typeof fetch = fetch
): AIProvider {
  const resolvedProfile: AIProviderProfile = {
    ...profile,
    type: "minimax"
  };

  return createOpenAICompatibleProvider(resolvedProfile, apiKey, fetchImpl);
}
