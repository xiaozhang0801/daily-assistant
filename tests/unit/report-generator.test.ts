import { describe, expect, it } from "vitest";
import { buildDailyReportFallback } from "../../src/main/services/report/reportGenerator";

describe("report generator", () => {
  it("builds a readable Chinese fallback report from events", () => {
    const report = buildDailyReportFallback([
      {
        id: "event-1",
        captureId: "capture-1",
        startedAt: "2026-07-07T09:00:00.000Z",
        endedAt: "2026-07-07T10:00:00.000Z",
        title: "开发日报助手工作台",
        summary: "完成今日页面结构和状态栏设计。",
        category: "development",
        confidence: 0.9,
        source: "ai"
      }
    ]);

    expect(report).toContain("今日工作总结");
    expect(report).toContain("开发日报助手工作台");
    expect(report).toContain("完成今日页面结构和状态栏设计");
  });
});
