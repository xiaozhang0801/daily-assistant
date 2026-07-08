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
        }>;
        pauseCapture: () => Promise<{ ok: boolean }>;
        resumeCapture: () => Promise<{ ok: boolean }>;
        generateReport: () => Promise<{ content: string }>;
      };
      settings: {
        get: () => Promise<unknown>;
        save: (settings: unknown) => Promise<{ ok: boolean; settings: unknown }>;
        testAIProvider: () => Promise<{ ok: boolean; message: string }>;
      };
    };
  }
}
