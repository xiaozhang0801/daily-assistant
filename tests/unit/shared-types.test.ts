import { describe, expect, it } from "vitest";
import type { AIProviderProfile, CaptureRecord, DailyReport, WorkEvent } from "../../src/shared/types";

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
  });
});
