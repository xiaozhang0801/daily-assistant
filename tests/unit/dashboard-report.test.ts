import { describe, expect, it, vi } from "vitest";
import type { AppRepositories } from "../../src/main/services/storage/repositories";
import type { AIProvider, DailyReportInput, ScreenshotAnalysisInput } from "../../src/main/services/ai/provider";
import type { AIProviderProfile, WorkEvent, WorkEventDraft } from "../../src/shared/types";
import { generateDashboardReport, saveDashboardReport } from "../../src/main/ipc/dashboardReport";
import type { GitActivitySummary } from "../../src/main/services/git/gitActivity";

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

function createRepositoryStub(
  enabledProvider?: AIProviderProfile,
  settingOverrides: Record<string, string> = {}
): AppRepositories {
  const settings = new Map<string, string>([
    ["ai.apiKey", enabledProvider ? "api-key" : ""],
    ["prompt.dailyReport", "请根据事件生成日报。"],
    ...Object.entries(settingOverrides)
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
  it("builds a draft from today's work events without saving it", async () => {
    const repositories = createRepositoryStub();

    const result = await generateDashboardReport({
      repositories,
      now: () => new Date("2026-07-08T10:00:00.000Z")
    });

    expect(result.content).toContain("Implemented realtime dashboard refresh");
    expect(result.content).toContain("Connected today's workspace");
    expect(repositories.reports.save).not.toHaveBeenCalled();
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
    expect(repositories.reports.save).not.toHaveBeenCalled();
  });

  it("builds a code-mode draft from local git activity without saving it", async () => {
    const repositories = createRepositoryStub();
    const codeActivity: GitActivitySummary = {
      generatedAt: "2026-07-08T10:00:00.000Z",
      repositories: [
        {
          path: "C:/project/client-app",
          name: "client-app",
          branch: "main",
          commits: ["feat: add code report mode"],
          changedFiles: [],
          diffStats: []
        }
      ]
    };

    const result = await generateDashboardReport({
      repositories,
      mode: "code",
      now: () => new Date("2026-07-08T10:00:00.000Z"),
      collectCodeActivity: async () => codeActivity
    });

    expect(result.content).toContain("代码工作总结");
    expect(result.content).toContain("client-app");
    expect(result.content).toContain("feat: add code report mode");
    expect(result.content).not.toContain("Implemented realtime dashboard refresh");
    expect(repositories.reports.save).not.toHaveBeenCalled();
  });

  it("uses the configured git search root when collecting code activity", async () => {
    const repositories = createRepositoryStub(undefined, {
      "git.searchRoot": "C:/project"
    });
    const collectCodeActivity = vi.fn(async () => ({
      generatedAt: "2026-07-08T10:00:00.000Z",
      repositories: []
    }));

    await generateDashboardReport({
      repositories,
      mode: "code",
      now: () => new Date("2026-07-08T10:00:00.000Z"),
      collectCodeActivity
    });

    expect(collectCodeActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        roots: ["C:/project"],
        maxDepth: 4,
        maxRepositories: 50
      })
    );
  });

  it("builds a mixed-mode draft with work events and git activity when AI is unavailable", async () => {
    const repositories = createRepositoryStub();
    const codeActivity: GitActivitySummary = {
      generatedAt: "2026-07-08T10:00:00.000Z",
      repositories: [
        {
          path: "C:/project/client-app",
          name: "client-app",
          branch: "main",
          commits: [],
          changedFiles: ["M src/renderer/pages/TodayPage.vue"],
          diffStats: [" src/renderer/pages/TodayPage.vue | 8 ++++++--"]
        }
      ]
    };

    const result = await generateDashboardReport({
      repositories,
      mode: "mixed",
      now: () => new Date("2026-07-08T10:00:00.000Z"),
      collectCodeActivity: async () => codeActivity
    });

    expect(result.content).toContain("今日工作总结");
    expect(result.content).toContain("Implemented realtime dashboard refresh");
    expect(result.content).toContain("代码工作总结");
    expect(result.content).toContain("未发现今日 Git 提交。");
    expect(result.content).not.toContain("TodayPage.vue");
    expect(repositories.reports.save).not.toHaveBeenCalled();
  });

  it("saves the current draft as today's report and preserves existing report metadata when overwriting", () => {
    const repositories = createRepositoryStub();
    vi.mocked(repositories.reports.getByDate).mockReturnValue({
      id: "old-report",
      date: "2026-07-08",
      type: "daily",
      content: "旧日报",
      generatedAt: "2026-07-08T09:00:00.000Z",
      updatedAt: "2026-07-08T09:00:00.000Z",
      providerId: "primary",
      modelName: "MiniMax-M3"
    });

    const result = saveDashboardReport({
      repositories,
      content: "# 今日日报\n\n- 新保存的日报。",
      now: () => new Date("2026-07-08T18:00:00.000Z")
    });

    expect(result).toEqual({
      ok: true,
      content: "# 今日日报\n\n- 新保存的日报。",
      date: "2026-07-08"
    });
    expect(repositories.reports.save).toHaveBeenCalledWith({
      id: "daily-2026-07-08",
      date: "2026-07-08",
      type: "daily",
      content: "# 今日日报\n\n- 新保存的日报。",
      generatedAt: "2026-07-08T09:00:00.000Z",
      updatedAt: "2026-07-08T18:00:00.000Z",
      providerId: "primary",
      modelName: "MiniMax-M3"
    });
  });
});
