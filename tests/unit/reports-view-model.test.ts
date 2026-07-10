import { describe, expect, it } from "vitest";
import type { DailyHistoryDay, WorkEvent } from "../../src/shared/types";
import {
  buildReportLibraryView,
  buildTodayReportView,
  currentNaturalWeekDayCount,
  resolveSelectedReportDate,
  toDesktopBridgeUnavailableMessage,
  toReportHistoryLoadErrorMessage,
  toMarkdownExportUnavailableMessage
} from "../../src/renderer/pages/reportsViewModel";

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

function historyDay(
  date: string,
  reportContent: string | null,
  events = 0,
  report: DailyHistoryDay["report"] = reportContent ? "已生成" : "未生成"
): DailyHistoryDay {
  return {
    date,
    duration: events > 0 ? "15m" : "0m",
    events,
    report,
    reportContent
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
        count: 2,
        content: "# 今日日报\n\n- 已保存内容。",
        readOnly: false
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
      count: 0,
      readOnly: false
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

  it("combines today's draft with saved reports from the current natural week", () => {
    const view = buildReportLibraryView({
      date: "2026-07-08",
      reportDraft: "# 今日日报\n\n- 今天的草稿。",
      reportSaved: false,
      events: [event("today")],
      history: [
        historyDay("2026-07-08", "# 数据库中的今天日报", 1),
        historyDay("2026-07-07", "# 7 月 7 日日报", 3),
        historyDay("2026-07-06", null, 2, "草稿")
      ]
    });

    expect(view.currentReport).toBe("# 今日日报\n\n- 今天的草稿。");
    expect(view.reports).toEqual([
      {
        id: "today",
        date: "2026-07-08",
        status: "草稿",
        count: 1,
        content: "# 今日日报\n\n- 今天的草稿。",
        readOnly: false
      },
      {
        id: "daily-2026-07-07",
        date: "2026-07-07",
        status: "已保存",
        count: 3,
        content: "# 7 月 7 日日报",
        readOnly: true
      }
    ]);
  });

  it("keeps an available historical selection after refresh and falls back when missing", () => {
    const reports = buildReportLibraryView({
      date: "2026-07-08",
      reportDraft: "# 今天",
      reportSaved: false,
      events: [],
      history: [historyDay("2026-07-07", "# 昨天")]
    }).reports;

    expect(resolveSelectedReportDate("2026-07-07", reports, "2026-07-08")).toBe("2026-07-07");
    expect(resolveSelectedReportDate("2026-07-06", reports, "2026-07-08")).toBe("2026-07-08");
  });

  it("calculates how many current-week days the report page should request", () => {
    expect(currentNaturalWeekDayCount(new Date("2026-07-08T12:00:00.000Z"))).toBe(3);
    expect(currentNaturalWeekDayCount(new Date("2026-07-12T12:00:00.000Z"))).toBe(7);
  });

  it("formats history load failures without hiding today's report", () => {
    expect(toReportHistoryLoadErrorMessage(new Error("database is busy"))).toBe(
      "历史日报读取失败：database is busy。今日日报仍可查看和保存。"
    );
    expect(toReportHistoryLoadErrorMessage("网络异常")).toBe("历史日报读取失败：网络异常。今日日报仍可查看和保存。");
    expect(toReportHistoryLoadErrorMessage(null)).toBe("历史日报读取失败，请稍后重试。今日日报仍可查看和保存。");
  });

  it("builds visible messages for unavailable report actions", () => {
    expect(toDesktopBridgeUnavailableMessage("保存日报")).toBe("没有连接到 Electron 主进程，无法保存日报。");
    expect(toMarkdownExportUnavailableMessage()).toBe("导出 Markdown 还没有接入文件保存功能，请先使用复制。");
  });
});
