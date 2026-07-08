import { describe, expect, it, vi } from "vitest";
import type { AppRepositories } from "../../src/main/services/storage/repositories";
import type { WorkEvent } from "../../src/shared/types";
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

function createRepositoryStub(): AppRepositories {
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
});
