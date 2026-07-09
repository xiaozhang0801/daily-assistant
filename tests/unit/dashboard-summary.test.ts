import { describe, expect, it, vi } from "vitest";
import type { AppRepositories } from "../../src/main/services/storage/repositories";
import type { CaptureRecord, RecordingSession, WorkEvent } from "../../src/shared/types";
import { createDashboardState } from "../../src/main/ipc/dashboardState";
import { createDashboardSummaryProvider } from "../../src/main/ipc/dashboardSummary";

const captureRecord: CaptureRecord = {
  id: "capture-1",
  capturedAt: "2026-07-08T09:00:00.000Z",
  imagePath: "C:/tmp/capture-1.png",
  activeApp: null,
  windowTitle: null,
  status: "captured",
  skipReason: null
};

const workEvent: WorkEvent = {
  id: "event-1",
  captureId: captureRecord.id,
  startedAt: captureRecord.capturedAt,
  endedAt: captureRecord.capturedAt,
  title: "实现日报助手",
  summary: "完成截图采集和 AI 状态展示。",
  category: "开发",
  confidence: 0.9,
  source: "ai"
};

const recordingSession: RecordingSession = {
  id: "session-1",
  startedAt: "2026-07-08T09:00:00.000Z",
  endedAt: "2026-07-08T09:10:00.000Z"
};

function createRepositoryStub(
  workEvents: WorkEvent[] = [workEvent],
  recordingSessions: RecordingSession[] = [recordingSession],
  captures: CaptureRecord[] = [captureRecord, { ...captureRecord, id: "capture-2" }]
): AppRepositories {
  const settings = new Map<string, string>([
    ["ai.providerType", "openai_compatible"],
    ["ai.baseUrl", "https://api.example.com/v1"],
    ["ai.apiKey", "test-key"],
    ["ai.modelName", "MiniMax-M3"],
    ["capture.uploadToAIEnabled", "true"],
    ["capture.intervalMinutes", "5"]
  ]);

  return {
    captures: {
      save: vi.fn(),
      listByDate: vi.fn(() => captures)
    },
    recordingSessions: {
      save: vi.fn(),
      end: vi.fn(),
      listByDate: vi.fn(() => recordingSessions)
    },
    workEvents: {
      save: vi.fn(),
      listByDate: vi.fn(() => workEvents)
    },
    reports: {
      save: vi.fn(),
      getByDate: vi.fn(() => null)
    },
    aiProviders: {
      save: vi.fn(),
      listEnabled: vi.fn(() => [
        {
          id: "primary",
          name: "OpenAI Compatible",
          type: "openai_compatible",
          baseUrl: "https://api.example.com/v1",
          apiKeyRef: "settings:ai.apiKey",
          modelName: "MiniMax-M3",
          customHeaders: {},
          enabled: true
        }
      ])
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

describe("dashboard summary provider", () => {
  it("summarizes today's recorded session time, events, and AI configuration", () => {
    const repositories = createRepositoryStub();
    const state = createDashboardState({ recording: true });
    const summary = createDashboardSummaryProvider({
      repositories,
      now: () => new Date("2026-07-08T10:00:00.000Z")
    });

    expect(summary.getToday(state.getToday())).toMatchObject({
      recording: true,
      capturedDurationMinutes: 10,
      analyzedEventCount: 1,
      providerStatus: "ready",
      events: [
        {
          ...workEvent,
          startedAt: "2026-07-08T08:55:00.000Z"
        }
      ]
    });
  });

  it("uses the saved daily report as today's report draft", () => {
    const repositories = createRepositoryStub();
    vi.mocked(repositories.reports.getByDate).mockReturnValue({
      id: "daily-2026-07-08",
      date: "2026-07-08",
      type: "daily",
      content: "# 今日日报\n\n- 已保存的日报内容。",
      generatedAt: "2026-07-08T10:00:00.000Z",
      updatedAt: "2026-07-08T10:00:00.000Z",
      providerId: "local-fallback",
      modelName: "fallback"
    });
    const state = createDashboardState({ reportDraft: "" });
    const summary = createDashboardSummaryProvider({
      repositories,
      now: () => new Date("2026-07-08T10:00:00.000Z")
    });

    expect(summary.getToday(state.getToday()).reportDraft).toBe("# 今日日报\n\n- 已保存的日报内容。");
    expect(summary.getToday(state.getToday()).reportSaved).toBe(true);
  });

  it("reports upload-disabled status when AI is configured but screenshot upload is off", () => {
    const repositories = createRepositoryStub();
    vi.mocked(repositories.settings.get).mockImplementation((key: string) => {
      if (key === "capture.uploadToAIEnabled") return "false";
      const values: Record<string, string> = {
        "ai.apiKey": "test-key",
        "ai.modelName": "MiniMax-M3",
        "capture.intervalMinutes": "5"
      };
      return values[key] ?? null;
    });
    const state = createDashboardState();
    const summary = createDashboardSummaryProvider({
      repositories,
      now: () => new Date("2026-07-08T10:00:00.000Z")
    });

    expect(summary.getToday(state.getToday()).providerStatus).toBe("upload_disabled");
  });

  it("normalizes legacy point-in-time work events into capture interval ranges", () => {
    const repositories = createRepositoryStub();
    const state = createDashboardState();
    const summary = createDashboardSummaryProvider({
      repositories,
      now: () => new Date("2026-07-08T10:00:00.000Z")
    });

    expect(summary.getToday(state.getToday()).events[0]).toMatchObject({
      startedAt: "2026-07-08T08:55:00.000Z",
      endedAt: "2026-07-08T09:00:00.000Z"
    });
  });

  it("returns merged similar events for today's timeline", () => {
    const repositories = createRepositoryStub([
      {
        ...workEvent,
        id: "event-1",
        captureId: "capture-1",
        startedAt: "2026-07-08T09:00:00.000Z",
        endedAt: "2026-07-08T09:05:00.000Z",
        title: "开发日报助手时间线",
        summary: "优化今日时间线重复记录展示。",
        confidence: 0.8
      },
      {
        ...workEvent,
        id: "event-2",
        captureId: "capture-2",
        startedAt: "2026-07-08T09:05:00.000Z",
        endedAt: "2026-07-08T09:10:00.000Z",
        title: "继续开发日报助手时间线",
        summary: "继续优化今日时间线的重复记录展示。",
        confidence: 0.9
      }
    ]);
    const state = createDashboardState();
    const summary = createDashboardSummaryProvider({
      repositories,
      now: () => new Date("2026-07-08T10:00:00.000Z")
    });

    expect(summary.getToday(state.getToday())).toMatchObject({
      analyzedEventCount: 1,
      events: [
        {
          startedAt: "2026-07-08T09:00:00.000Z",
          endedAt: "2026-07-08T09:10:00.000Z",
          mergedEventCount: 2
        }
      ]
    });
  });

  it("does not keep increasing duration for an open session while recording is paused", () => {
    const repositories = createRepositoryStub(
      [],
      [
        {
          id: "session-open",
          startedAt: "2026-07-08T09:00:00.000Z",
          endedAt: null
        }
      ],
      [
        {
          ...captureRecord,
          capturedAt: "2026-07-08T09:10:00.000Z"
        }
      ]
    );
    const state = createDashboardState({ recording: false });
    const summary = createDashboardSummaryProvider({
      repositories,
      now: () => new Date("2026-07-08T10:00:00.000Z")
    });

    expect(summary.getToday(state.getToday()).capturedDurationMinutes).toBe(10);
  });

  it("summarizes captures without analysis results for visible feedback", () => {
    const skippedCapture: CaptureRecord = {
      ...captureRecord,
      id: "capture-skipped",
      capturedAt: "2026-07-08T09:30:00.000Z",
      status: "skipped",
      skipReason: "API Key 未保存"
    };
    const failedCapture: CaptureRecord = {
      ...captureRecord,
      id: "capture-failed",
      capturedAt: "2026-07-08T09:40:00.000Z",
      status: "failed",
      skipReason: "模型接口请求失败"
    };
    const repositories = createRepositoryStub([], [], [captureRecord, skippedCapture, failedCapture]);
    const state = createDashboardState();
    const summary = createDashboardSummaryProvider({
      repositories,
      now: () => new Date("2026-07-08T10:00:00.000Z")
    });

    expect(summary.getToday(state.getToday())).toMatchObject({
      captureAnalysisWarningCount: 2,
      latestCaptureAnalysisWarningMessage: "模型接口请求失败"
    });
  });
});
