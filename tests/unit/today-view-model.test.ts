import { describe, expect, it } from "vitest";
import type { WorkEvent } from "../../src/shared/types";
import {
  sortEventsNewestFirst,
  summarizeEventCategories,
  toReportGenerationStatusMessage,
  toResumeCaptureStatusMessage
} from "../../src/renderer/pages/todayViewModel";

function event(id: string, startedAt: string): WorkEvent {
  return {
    id,
    captureId: `capture-${id}`,
    startedAt,
    endedAt: startedAt,
    title: id,
    summary: id,
    category: "development",
    confidence: 0.8,
    source: "ai"
  };
}

describe("today view model", () => {
  it("sorts timeline events from newest to oldest without mutating source data", () => {
    const oldest = event("oldest", "2026-07-08T08:00:00.000Z");
    const newest = event("newest", "2026-07-08T10:00:00.000Z");
    const middle = event("middle", "2026-07-08T09:00:00.000Z");
    const source = [oldest, newest, middle];

    expect(sortEventsNewestFirst(source).map((item) => item.id)).toEqual(["newest", "middle", "oldest"]);
    expect(source.map((item) => item.id)).toEqual(["oldest", "newest", "middle"]);
  });

  it("sorts interval events by end time because start time is shifted back by the capture interval", () => {
    const olderShortInterval = {
      ...event("older-short-interval", "2026-07-08T09:55:00.000Z"),
      endedAt: "2026-07-08T09:56:00.000Z"
    };
    const latestLongInterval = {
      ...event("latest-long-interval", "2026-07-08T09:50:00.000Z"),
      endedAt: "2026-07-08T10:00:00.000Z"
    };

    expect(sortEventsNewestFirst([olderShortInterval, latestLongInterval]).map((item) => item.id)).toEqual([
      "latest-long-interval",
      "older-short-interval"
    ]);
  });

  it("summarizes category counts for the timeline side panel", () => {
    const events = [
      event("dev-1", "2026-07-08T08:00:00.000Z"),
      { ...event("dev-2", "2026-07-08T09:00:00.000Z"), category: "development" },
      { ...event("meeting", "2026-07-08T10:00:00.000Z"), category: "meeting" },
      { ...event("blank", "2026-07-08T11:00:00.000Z"), category: "" }
    ];

    expect(summarizeEventCategories(events)).toEqual([
      { label: "development", count: 2 },
      { label: "meeting", count: 1 },
      { label: "未分类", count: 1 }
    ]);
  });

  it("uses backend report generation notices as visible status text", () => {
    expect(
      toReportGenerationStatusMessage({
        content: "# 今日日报\n\n- 基础日报",
        source: "fallback",
        notice: "未使用 AI 生成：设置里还没有保存 API Key。已使用本地记录生成基础日报。"
      })
    ).toBe("未使用 AI 生成：设置里还没有保存 API Key。已使用本地记录生成基础日报。");
  });

  it("explains that resumed capture will not analyze screenshots until AI settings are saved", () => {
    expect(toResumeCaptureStatusMessage("not_configured")).toBe(
      "已继续记录，但 AI 设置还没有保存完整，截图不会自动分析。请到设置保存 API Key 和模型后再使用 AI 分析。"
    );
  });
});
