import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  AIProviderProfile,
  AppSetting,
  CaptureRecord,
  CaptureSettings,
  CaptureStatus,
  DailyReport,
  PromptTemplate,
  ProviderStatus,
  ReportType,
  WorkEvent,
  WorkEventDraft,
  WorkEventSource
} from "../../src/shared/types";

describe("shared domain types", () => {
  it("supports the MVP capture to report shape", () => {
    const provider: AIProviderProfile = {
      id: "provider-1",
      name: "MiniMax",
      type: "minimax",
      baseUrl: null,
      apiKeyRef: "minimax-key",
      modelName: "configured-model",
      customHeaders: {},
      enabled: true
    };

    const capture: CaptureRecord = {
      id: "capture-1",
      capturedAt: "2026-07-07T09:00:00.000Z",
      imagePath: "captures/capture-1.png",
      activeApp: "Code.exe",
      windowTitle: "Daily Assistant",
      status: "captured",
      skipReason: null
    };

    const event: WorkEvent = {
      id: "event-1",
      captureId: capture.id,
      startedAt: capture.capturedAt,
      endedAt: "2026-07-07T09:15:00.000Z",
      title: "Implemented dashboard shell",
      summary: "Built the first workbench structure.",
      category: "development",
      confidence: 0.86,
      source: "ai"
    };

    const report: DailyReport = {
      id: "report-1",
      date: "2026-07-07",
      type: "daily",
      content: "- Implemented dashboard shell",
      generatedAt: "2026-07-07T18:00:00.000Z",
      updatedAt: "2026-07-07T18:00:00.000Z",
      providerId: provider.id,
      modelName: provider.modelName
    };

    expect(event.captureId).toBe(capture.id);
    expect(report.providerId).toBe(provider.id);
    expectTypeOf(provider).toMatchTypeOf<AIProviderProfile>();
    expectTypeOf(capture).toMatchTypeOf<CaptureRecord>();
    expectTypeOf(event).toMatchTypeOf<WorkEvent>();
    expectTypeOf(report).toMatchTypeOf<DailyReport>();
  });

  it("exports the remaining shared configuration and AI types", () => {
    const captureStatus = "analyzed" satisfies CaptureStatus;
    const reportType = "daily" satisfies ReportType;
    const eventSource = "manual" satisfies WorkEventSource;

    const prompt = {
      id: "prompt-1",
      name: "Default screenshot prompt",
      purpose: "screenshot_analysis",
      content: "Return JSON only.",
      isDefault: true
    } satisfies PromptTemplate;

    const providerStatus = {
      ok: true,
      message: "Provider is configured."
    } satisfies ProviderStatus;

    const draft = {
      title: "Reviewed settings",
      summary: "Checked AI provider configuration.",
      category: "planning",
      confidence: 0.77
    } satisfies WorkEventDraft;

    const setting = {
      key: "capture.intervalMinutes",
      value: "5"
    } satisfies AppSetting;

    const captureSettings = {
      intervalMinutes: 5,
      storageDirectory: "captures",
      retentionDays: 14,
      uploadToAIEnabled: false,
      blacklist: ["Password Manager"]
    } satisfies CaptureSettings;

    expect(captureStatus).toBe("analyzed");
    expect(reportType).toBe("daily");
    expect(eventSource).toBe("manual");
    expect(prompt.purpose).toBe("screenshot_analysis");
    expect(providerStatus.ok).toBe(true);
    expect(draft.confidence).toBeGreaterThan(0);
    expect(setting.key).toBe("capture.intervalMinutes");
    expect(captureSettings.uploadToAIEnabled).toBe(false);
  });
});
