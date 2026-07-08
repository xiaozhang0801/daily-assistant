import type { AIProviderProfile } from "../../../shared/types";
import type { AIProvider } from "./provider";
import { createMiniMaxProvider } from "./minimaxProvider";
import { createOpenAICompatibleProvider } from "./openaiCompatibleProvider";

export function createProviderRegistry() {
  return {
    defaultProviderType: "minimax" as const,
    create(profile: AIProviderProfile, apiKey: string): AIProvider {
      if (profile.type === "minimax") {
        return createMiniMaxProvider(profile, apiKey);
      }

      return createOpenAICompatibleProvider(profile, apiKey);
    }
  };
}
