import type { AIProviderProfile } from "../../../shared/types";
import type { AIProvider } from "./provider";
import { createOpenAICompatibleProvider } from "./openaiCompatibleProvider";

export const minimaxDefaultBaseUrl = "https://api.minimaxi.com/v1";

export function createMiniMaxProvider(
  profile: AIProviderProfile,
  apiKey: string,
  fetchImpl: typeof fetch = fetch
): AIProvider {
  const resolvedProfile: AIProviderProfile = {
    ...profile,
    type: "minimax",
    baseUrl: profile.baseUrl || minimaxDefaultBaseUrl
  };

  return createOpenAICompatibleProvider(resolvedProfile, apiKey, fetchImpl);
}
