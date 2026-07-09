import { describe, expect, it, vi } from "vitest";
import type { AppRepositories } from "../../src/main/services/storage/repositories";
import type { AIProvider, DailyReportInput, ScreenshotAnalysisInput } from "../../src/main/services/ai/provider";
import type { AIProviderProfile, CaptureRecord, WorkEvent, WorkEventDraft } from "../../src/shared/types";
import {
  generateDashboardReport,
  generateWeeklyReport,
  saveDashboardReport,
  saveWeeklyReport
} from "../../src/main/ipc/dashboardReport";
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
  settingOverrides: Record<string, string> = {},
  workEvents: WorkEvent[] = [workEvent],
  captures: CaptureRecord[] = []
): AppRepositories {
  const settings = new Map<string, string>([
    ["ai.apiKey", enabledProvider ? "api-key" : ""],
    ["prompt.dailyReport", "请根据事件生成日报。"],
    ...Object.entries(settingOverrides)
  ]);

  return {
    captures: {
      save: vi.fn(),
      listByDate: vi.fn(() => captures)
    },
    workEvents: {
      save: vi.fn(),
      listByDate: vi.fn(() => workEvents)
    },
    reports: {
      save: vi.fn(),
      getByDate: vi.fn(() => null),
      getByDateAndType: vi.fn(() => null),
      listDailyByDateRange: vi.fn(() => [])
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

  it("explains when AI report generation cannot use unsaved provider settings", async () => {
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
    const repositories = createRepositoryStub(profile, { "ai.apiKey": "" });

    const result = await generateDashboardReport({
      repositories,
      now: () => new Date("2026-07-08T10:00:00.000Z")
    });

    expect(result.source).toBe("fallback");
    expect(result.notice).toContain("设置里还没有保存 API Key");
    expect(result.notice).toContain("已使用本地记录生成基础日报");
    expect(result.content).toContain("Implemented realtime dashboard refresh");
  });

  it("explains when AI report generation fails and fallback content is used", async () => {
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
      createProvider: () => ({
        ...createProviderStub("# AI 日报"),
        generateDailyReport: async () => {
          throw new Error("AI provider request failed: 401");
        }
      })
    });

    expect(result.source).toBe("fallback");
    expect(result.notice).toContain("AI 生成失败");
    expect(result.notice).toContain("已使用本地记录生成基础日报");
    expect(result.content).toContain("Implemented realtime dashboard refresh");
  });

  it("warns when today's report is generated with screenshots that have no analysis result", async () => {
    const skippedCapture: CaptureRecord = {
      id: "capture-skipped",
      capturedAt: "2026-07-08T09:30:00.000Z",
      imagePath: "C:/tmp/capture-skipped.png",
      activeApp: null,
      windowTitle: null,
      status: "skipped",
      skipReason: "API Key 未保存"
    };
    const repositories = createRepositoryStub(undefined, {}, [workEvent], [skippedCapture]);

    const result = await generateDashboardReport({
      repositories,
      now: () => new Date("2026-07-08T10:00:00.000Z")
    });

    expect(result.notice).toContain("有 1 张截图没有生成 AI 分析结果，本次日报可能不完整");
    expect(result.notice).toContain("API Key 未保存");
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

  it("passes merged similar work events into AI report generation", async () => {
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
    const events: WorkEvent[] = [
      {
        ...workEvent,
        id: "event-1",
        startedAt: "2026-07-08T09:00:00.000Z",
        endedAt: "2026-07-08T09:05:00.000Z",
        title: "开发日报助手时间线",
        summary: "优化今日时间线重复记录展示。",
        confidence: 0.8
      },
      {
        ...workEvent,
        id: "event-2",
        startedAt: "2026-07-08T09:05:00.000Z",
        endedAt: "2026-07-08T09:10:00.000Z",
        title: "继续开发日报助手时间线",
        summary: "继续优化今日时间线的重复记录展示。",
        confidence: 0.9
      }
    ];
    const repositories = createRepositoryStub(profile, {}, events);
    const aiInputs: DailyReportInput[] = [];

    await generateDashboardReport({
      repositories,
      now: () => new Date("2026-07-08T10:00:00.000Z"),
      createProvider: () => ({
        ...createProviderStub("# AI 日报"),
        generateDailyReport: async (input: DailyReportInput) => {
          aiInputs.push(input);
          return "# AI 日报";
        }
      })
    });

    expect(aiInputs[0].events).toHaveLength(1);
    expect(aiInputs[0].events[0]).toMatchObject({
      startedAt: "2026-07-08T09:00:00.000Z",
      endedAt: "2026-07-08T09:10:00.000Z",
      mergedEventCount: 2
    });
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

  it("builds a weekly draft from saved daily reports without reading timeline events", async () => {
    const repositories = createRepositoryStub();
    vi.mocked(repositories.reports.listDailyByDateRange).mockReturnValue([
      {
        id: "daily-2026-07-06",
        date: "2026-07-06",
        type: "daily",
        content: "# 7 月 6 日日报\n\n- 完成日报助手时间线优化。",
        generatedAt: "2026-07-06T18:00:00.000Z",
        updatedAt: "2026-07-06T18:00:00.000Z",
        providerId: "manual",
        modelName: "manual"
      },
      {
        id: "daily-2026-07-07",
        date: "2026-07-07",
        type: "daily",
        content: "# 7 月 7 日日报\n\n- 完成代码日报 Git 提交统计。",
        generatedAt: "2026-07-07T18:00:00.000Z",
        updatedAt: "2026-07-07T18:00:00.000Z",
        providerId: "manual",
        modelName: "manual"
      }
    ]);

    const result = await generateWeeklyReport({
      repositories,
      now: () => new Date("2026-07-08T10:00:00.000Z")
    });

    expect(repositories.reports.listDailyByDateRange).toHaveBeenCalledWith("2026-07-06", "2026-07-12");
    expect(repositories.workEvents.listByDate).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      weekKey: "2026-W28",
      startDate: "2026-07-06",
      endDate: "2026-07-12",
      sourceReportCount: 2
    });
    expect(result.content).toContain("周报总结");
    expect(result.content).toContain("完成日报助手时间线优化");
    expect(result.content).toContain("完成代码日报 Git 提交统计");
  });

  it("passes saved daily reports into AI weekly report generation", async () => {
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
    vi.mocked(repositories.reports.listDailyByDateRange).mockReturnValue([
      {
        id: "daily-2026-07-06",
        date: "2026-07-06",
        type: "daily",
        content: "# 日报\n\n- 推进日报库周报功能。",
        generatedAt: "2026-07-06T18:00:00.000Z",
        updatedAt: "2026-07-06T18:00:00.000Z",
        providerId: "manual",
        modelName: "manual"
      }
    ]);
    const aiInputs: DailyReportInput[] = [];

    const result = await generateWeeklyReport({
      repositories,
      now: () => new Date("2026-07-08T10:00:00.000Z"),
      createProvider: () => ({
        ...createProviderStub("# 本周周报\n\n- AI 生成内容"),
        generateDailyReport: async (input: DailyReportInput) => {
          aiInputs.push(input);
          return "# 本周周报\n\n- AI 生成内容";
        }
      })
    });

    expect(result.content).toContain("AI 生成内容");
    expect(aiInputs[0].events).toEqual([]);
    expect(aiInputs[0].userInstruction).toContain("2026-07-06");
    expect(aiInputs[0].userInstruction).toContain("推进日报库周报功能");
  });

  it("saves the weekly draft and overwrites the existing report for the same week", () => {
    const repositories = createRepositoryStub();
    vi.mocked(repositories.reports.getByDateAndType).mockReturnValue({
      id: "weekly-2026-W28",
      date: "2026-W28",
      type: "weekly",
      content: "旧周报",
      generatedAt: "2026-07-08T09:00:00.000Z",
      updatedAt: "2026-07-08T09:00:00.000Z",
      providerId: "manual",
      modelName: "manual"
    });

    const result = saveWeeklyReport({
      repositories,
      content: "# 本周周报\n\n- 新保存的周报。",
      now: () => new Date("2026-07-08T18:00:00.000Z")
    });

    expect(result).toEqual({
      ok: true,
      content: "# 本周周报\n\n- 新保存的周报。",
      weekKey: "2026-W28",
      startDate: "2026-07-06",
      endDate: "2026-07-12"
    });
    expect(repositories.reports.save).toHaveBeenCalledWith({
      id: "weekly-2026-W28",
      date: "2026-W28",
      type: "weekly",
      content: "# 本周周报\n\n- 新保存的周报。",
      generatedAt: "2026-07-08T09:00:00.000Z",
      updatedAt: "2026-07-08T18:00:00.000Z",
      providerId: "manual",
      modelName: "manual"
    });
  });
});
