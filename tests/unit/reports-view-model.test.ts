import { describe, expect, it } from "vitest";
import type { WorkEvent } from "../../src/shared/types";
import { buildTodayReportView } from "../../src/renderer/pages/reportsViewModel";

function event(id: string): WorkEvent {
  return {
    id,
    captureId: `capture-${id}`,
    startedAt: "2026-07-08T09:00:00.000Z",
    endedAt: "2026-07-08T09:05:00.000Z",
    title: id,
    summary: id,
    category: "development",
    confidence: 0.9,
    source: "ai"
  };
}

describe("reports view model", () => {
  it("builds today's report list row and editor content from dashboard state", () => {
    const view = buildTodayReportView({
      date: "2026-07-08",
      reportDraft: "# 今日日报\n\n- 已保存内容。",
      reportSaved: true,
      events: [event("one"), event("two")]
    });

    expect(view.currentReport).toBe("# 今日日报\n\n- 已保存内容。");
    expect(view.reports).toEqual([
      {
        id: "today",
        date: "2026-07-08",
        status: "已保存",
        count: 2
      }
    ]);
  });

  it("falls back to an empty draft row when no saved report exists", () => {
    const view = buildTodayReportView({
      date: "2026-07-08",
      reportDraft: "",
      reportSaved: false,
      events: []
    });

    expect(view.currentReport).toBe("# 今日日报\n\n- 今日暂无记录。");
    expect(view.reports[0]).toMatchObject({
      status: "草稿",
      count: 0
    });
  });

  it("keeps generated but unsaved content as a draft row", () => {
    const view = buildTodayReportView({
      date: "2026-07-08",
      reportDraft: "# 今日日报\n\n- 刚生成，还未保存。",
      reportSaved: false,
      events: [event("one")]
    });

    expect(view.currentReport).toContain("刚生成");
    expect(view.reports[0]).toMatchObject({
      status: "草稿",
      count: 1
    });
  });
});
