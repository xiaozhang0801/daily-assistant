import { describe, expect, it, vi } from "vitest";
import type { AppRepositories } from "../../src/main/services/storage/repositories";
import type { CaptureRecord, WorkEvent } from "../../src/shared/types";
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

function createRepositoryStub(): AppRepositories {
  const settings = new Map<string, string>([
    ["ai.providerType", "openai_compatible"],
    ["ai.baseUrl", "https://api.example.com/v1"],
    ["ai.apiKey", "test-key"],
    ["ai.modelName", "MiniMax-M3"]
  ]);

  return {
    captures: {
      save: vi.fn(),
      listByDate: vi.fn(() => [captureRecord, { ...captureRecord, id: "capture-2" }])
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
  it("summarizes today's captures, events, and AI configuration", () => {
    const repositories = createRepositoryStub();
    const state = createDashboardState({ recording: true });
    const summary = createDashboardSummaryProvider({
      repositories,
      now: () => new Date("2026-07-08T10:00:00.000Z")
    });

    expect(summary.getToday(state.getToday())).toMatchObject({
      recording: true,
      capturedDurationMinutes: 2,
      analyzedEventCount: 1,
      providerStatus: "ready",
      events: [workEvent]
    });
  });
});
