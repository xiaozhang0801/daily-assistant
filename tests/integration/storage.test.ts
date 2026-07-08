import { describe, expect, it } from "vitest";
import { createInMemoryDatabase } from "../../src/main/services/storage/database";
import { createRepositories } from "../../src/main/services/storage/repositories";

describe("storage repositories", () => {
  it("persists captures, AI provider profiles, work events, and reports", () => {
    const db = createInMemoryDatabase();
    const repos = createRepositories(db);

    repos.aiProviders.save({
      id: "provider-1",
      name: "MiniMax",
      type: "minimax",
      baseUrl: null,
      apiKeyRef: "key",
      modelName: "model",
      customHeaders: {},
      enabled: true
    });

    repos.captures.save({
      id: "capture-1",
      capturedAt: "2026-07-07T09:00:00.000Z",
      imagePath: "captures/capture-1.png",
      activeApp: "Code.exe",
      windowTitle: "Daily Assistant",
      status: "captured",
      skipReason: null
    });

    repos.workEvents.save({
      id: "event-1",
      captureId: "capture-1",
      startedAt: "2026-07-07T09:00:00.000Z",
      endedAt: "2026-07-07T09:10:00.000Z",
      title: "Reviewed requirements",
      summary: "Read the MVP spec.",
      category: "planning",
      confidence: 0.9,
      source: "ai"
    });

    repos.reports.save({
      id: "report-1",
      date: "2026-07-07",
      type: "daily",
      content: "Reviewed requirements",
      generatedAt: "2026-07-07T18:00:00.000Z",
      updatedAt: "2026-07-07T18:00:00.000Z",
      providerId: "provider-1",
      modelName: "model"
    });

    expect(repos.captures.listByDate("2026-07-07")).toHaveLength(1);
    expect(repos.workEvents.listByDate("2026-07-07")).toHaveLength(1);
    expect(repos.reports.getByDate("2026-07-07")?.content).toContain("Reviewed");
    expect(repos.aiProviders.listEnabled()[0].name).toBe("MiniMax");
  });
});
