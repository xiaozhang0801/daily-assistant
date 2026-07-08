import type { AIProviderProfile, ProviderStatus, WorkEvent, WorkEventDraft } from "../../../shared/types";

export interface ScreenshotAnalysisInput {
  imageBase64: string;
  mimeType: "image/png" | "image/jpeg";
  prompt: string;
}

export interface DailyReportInput {
  events: WorkEvent[];
  userInstruction: string;
  prompt: string;
}

export interface AIProvider {
  profile: AIProviderProfile;
  analyzeScreenshot(input: ScreenshotAnalysisInput): Promise<WorkEventDraft>;
  generateDailyReport(input: DailyReportInput): Promise<string>;
  checkConnection(): Promise<ProviderStatus>;
}
