export {};

declare global {
  interface Window {
    dailyAssistant?: {
      dashboard: {
        getToday: () => Promise<{
          recording: boolean;
          capturedDurationMinutes: number;
          analyzedEventCount: number;
          providerStatus: string;
          events: import("../../shared/types").WorkEvent[];
          reportDraft: string;
          reportSaved: boolean;
        }>;
        pauseCapture: () => Promise<{ ok: boolean; recording: boolean }>;
        resumeCapture: () => Promise<{ ok: boolean; recording: boolean }>;
        generateReport: (
          request?: import("../../shared/types").GenerateReportRequest
        ) => Promise<import("../../shared/types").DailyReportGenerationResult>;
        saveReport: (content: string) => Promise<{ ok: true; content: string; date: string }>;
        generateWeeklyReport: () => Promise<import("../../shared/types").WeeklyReportGenerationResult>;
        saveWeeklyReport: (content: string) => Promise<import("../../shared/types").WeeklyReportSaveResult>;
        getHistory: () => Promise<import("../../shared/types").DailyHistoryDay[]>;
      };
      settings: {
        get: () => Promise<unknown>;
        save: (settings: unknown) => Promise<{ ok: boolean; settings: unknown }>;
        testAIProvider: (settings: unknown) => Promise<{ ok: boolean; message: string }>;
      };
    };
  }
}
