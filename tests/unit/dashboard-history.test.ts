import { describe, expect, it, vi } from "vitest";
import type { AppRepositories } from "../../src/main/services/storage/repositories";
import type { CaptureRecord, DailyReport, RecordingSession, WorkEvent } from "../../src/shared/types";
import { buildDashboardHistory } from "../../src/main/ipc/dashboardHistory";

function capture(id: string, capturedAt: string): CaptureRecord {
  return {
    id,
    capturedAt,
    imagePath: `C:/tmp/${id}.png`,
    activeApp: null,
    windowTitle: null,
    status: "captured",
    skipReason: null
  };
}

function event(id: string, startedAt: string): WorkEvent {
  return {
    id,
    captureId: `capture-${id}`,
    startedAt,
    endedAt: startedAt,
    title: id,
    summary: id,
    category: "开发",
    confidence: 0.9,
    source: "ai"
  };
}

function report(date: string): DailyReport {
  return {
    id: `daily-${date}`,
    date,
    type: "daily",
    content: "# 今日日报",
    generatedAt: `${date}T18:00:00.000Z`,
    updatedAt: `${date}T18:00:00.000Z`,
    providerId: "manual",
    modelName: "manual"
  };
}

function session(id: string, startedAt: string, endedAt: string | null): RecordingSession {
  return {
    id,
    startedAt,
    endedAt
  };
}

function createRepositoryStub(): AppRepositories {
  const capturesByDate = new Map<string, CaptureRecord[]>([
    ["2026-07-08", [capture("capture-1", "2026-07-08T09:00:00.000Z")]],
    [
      "2026-07-07",
      [
        capture("capture-2", "2026-07-07T09:00:00.000Z"),
        capture("capture-3", "2026-07-07T10:00:00.000Z")
      ]
    ]
  ]);
  const eventsByDate = new Map<string, WorkEvent[]>([
    ["2026-07-08", [event("event-1", "2026-07-08T09:05:00.000Z")]],
    ["2026-07-07", [event("event-2", "2026-07-07T09:05:00.000Z")]]
  ]);
  const reportsByDate = new Map<string, DailyReport>([["2026-07-08", report("2026-07-08")]]);
  const sessionsByDate = new Map<string, RecordingSession[]>([
    ["2026-07-08", [session("session-1", "2026-07-08T09:00:00.000Z", "2026-07-08T09:10:00.000Z")]],
    ["2026-07-07", [session("session-2", "2026-07-07T09:00:00.000Z", "2026-07-07T09:35:00.000Z")]]
  ]);

  return {
    captures: {
      save: vi.fn(),
      listByDate: vi.fn((date: string) => capturesByDate.get(date) ?? [])
    },
    recordingSessions: {
      save: vi.fn(),
      end: vi.fn(),
      listByDate: vi.fn((date: string) => sessionsByDate.get(date) ?? [])
    },
    workEvents: {
      save: vi.fn(),
      listByDate: vi.fn((date: string) => eventsByDate.get(date) ?? [])
    },
    reports: {
      save: vi.fn(),
      getByDate: vi.fn((date: string) => reportsByDate.get(date) ?? null),
      getByDateAndType: vi.fn((date: string, type: string) =>
        type === "daily" ? reportsByDate.get(date) ?? null : null
      )
    },
    aiProviders: {
      save: vi.fn(),
      listEnabled: vi.fn(() => [])
    },
    promptTemplates: {
      save: vi.fn(),
      listByPurpose: vi.fn(() => [])
    },
    settings: {
      set: vi.fn(),
      get: vi.fn(() => null)
    }
  } as unknown as AppRepositories;
}

describe("dashboard history", () => {
  it("keeps the default history range at the latest seven days", () => {
    const history = buildDashboardHistory({
      repositories: createRepositoryStub(),
      now: () => new Date("2026-07-08T12:00:00.000Z")
    });

    expect(history).toHaveLength(7);
    expect(history[0].date).toBe("2026-07-08");
    expect(history[6].date).toBe("2026-07-02");
  });

  it("builds a requested current-week range with saved daily report content", () => {
    const repositories = createRepositoryStub();
    const history = buildDashboardHistory({
      repositories,
      now: () => new Date("2026-07-08T12:00:00.000Z"),
      days: 3
    });

    expect(history).toEqual([
      {
        date: "2026-07-08",
        duration: "10m",
        events: 1,
        report: "已生成",
        reportContent: "# 今日日报"
      },
      {
        date: "2026-07-07",
        duration: "35m",
        events: 1,
        report: "草稿",
        reportContent: null
      },
      {
        date: "2026-07-06",
        duration: "0m",
        events: 0,
        report: "未生成",
        reportContent: null
      }
    ]);
    expect(repositories.reports.getByDateAndType).toHaveBeenCalledTimes(3);
    expect(repositories.reports.getByDateAndType).toHaveBeenCalledWith("2026-07-08", "daily");
    expect(repositories.reports.getByDate).not.toHaveBeenCalled();
  });
});
