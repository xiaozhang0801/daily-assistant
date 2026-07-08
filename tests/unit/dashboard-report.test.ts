import { describe, expect, it, vi } from "vitest";
import type { AppRepositories } from "../../src/main/services/storage/repositories";
import type { AIProvider, DailyReportInput, ScreenshotAnalysisInput } from "../../src/main/services/ai/provider";
import type { AIProviderProfile, WorkEvent, WorkEventDraft } from "../../src/shared/types";
import { generateDashboardReport } from "../../src/main/ipc/dashboardReport";

const workEvent: WorkEvent = {
  id: "event-1",
  captureId: "capture-1",
  startedAt: "2026-07-08T09:00:00.000Z",
  endedAt: "2026-07-08T09:15:00.000Z",
  title: "Implemented realtime dashboard refresh",
  summary: "Connected today's workspace to fresh dashboard snapshots.",
  category: "development",
  confidence: 0.91,
  source: "ai"
};

function createRepositoryStub(enabledProvider?: AIProviderProfile): AppRepositories {
  const settings = new Map<string, string>([
    ["ai.apiKey", enabledProvider ? "api-key" : ""],
    ["prompt.dailyReport", "请根据事件生成日报。"]
  ]);

  return {
    captures: {
      save: vi.fn(),
      listByDate: vi.fn(() => [])
    },
    workEvents: {
      save: vi.fn(),
      listByDate: vi.fn(() => [workEvent])
    },
    reports: {
      save: vi.fn(),
      getByDate: vi.fn(() => null)
    },
    aiProviders: {
      save: vi.fn(),
      listEnabled: vi.fn(() => (enabledProvider ? [enabledProvider] : []))
    },
    promptTemplates: {
      save: vi.fn(),
      listByPurpose: vi.fn(() => [])
    },
    settings: {
      set: vi.fn(),
      get: vi.fn((key: string) => settings.get(key) ?? null)
    }
  } as unknown as AppRepositories;
}

function createProviderStub(content: string): AIProvider {
  return {
    profile: {
      id: "primary",
      name: "MiniMax",
      type: "minimax",
      baseUrl: null,
      apiKeyRef: "settings:ai.apiKey",
      modelName: "MiniMax-M3",
      customHeaders: {},
      enabled: true
    },
    analyzeScreenshot: async (_input: ScreenshotAnalysisInput): Promise<WorkEventDraft> => ({
      title: "",
      summary: "",
      category: "",
      confidence: 0
    }),
    generateDailyReport: async (_input: DailyReportInput) => content,
    checkConnection: async () => ({ ok: true, message: "连接成功。" })
  };
}

describe("dashboard report generation", () => {
  it("builds and saves a report from today's work events when AI is unavailable", async () => {
    const repositories = createRepositoryStub();

    const result = await generateDashboardReport({
      repositories,
      now: () => new Date("2026-07-08T10:00:00.000Z")
    });

    expect(result.content).toContain("Implemented realtime dashboard refresh");
    expect(result.content).toContain("Connected today's workspace");
    expect(repositories.reports.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "daily-2026-07-08",
        date: "2026-07-08",
        type: "daily",
        content: result.content,
        providerId: "local-fallback",
        modelName: "fallback"
      })
    );
  });

  it("falls back to an event-based report when AI returns only a completion status", async () => {
    const profile: AIProviderProfile = {
      id: "primary",
      name: "MiniMax",
      type: "minimax",
      baseUrl: null,
      apiKeyRef: "settings:ai.apiKey",
      modelName: "MiniMax-M3",
      customHeaders: {},
      enabled: true
    };
    const repositories = createRepositoryStub(profile);

    const result = await generateDashboardReport({
      repositories,
      now: () => new Date("2026-07-08T10:00:00.000Z"),
      createProvider: () => createProviderStub("已生成")
    });

    expect(result.content).toContain("Implemented realtime dashboard refresh");
    expect(result.content).not.toBe("已生成");
    expect(repositories.reports.save).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: "local-fallback",
        modelName: "fallback"
      })
    );
  });
});
