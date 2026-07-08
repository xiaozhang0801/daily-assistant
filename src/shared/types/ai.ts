export type AIProviderType = "minimax" | "openai_compatible";
export type PromptPurpose = "screenshot_analysis" | "daily_report";

export interface AIProviderProfile {
  id: string;
  name: string;
  type: AIProviderType;
  baseUrl: string | null;
  apiKeyRef: string;
  modelName: string;
  customHeaders: Record<string, string>;
  enabled: boolean;
}

export interface PromptTemplate {
  id: string;
  name: string;
  purpose: PromptPurpose;
  content: string;
  isDefault: boolean;
}

export interface ProviderStatus {
  ok: boolean;
  message: string;
}

export interface WorkEventDraft {
  title: string;
  summary: string;
  category: string;
  confidence: number;
}
