import { describe, expect, it } from "vitest";
import type { WorkEvent } from "../../src/shared/types";
import { mergeSimilarWorkEvents } from "../../src/shared/workEventMerge";

function event(overrides: Partial<WorkEvent> & Pick<WorkEvent, "id" | "startedAt" | "endedAt" | "title" | "summary">): WorkEvent {
  return {
    captureId: `capture-${overrides.id}`,
    category: "开发",
    confidence: 0.8,
    source: "ai",
    ...overrides
  };
}

describe("work event merge", () => {
  it("merges adjacent similar work events into one visible timeline item", () => {
    const events = [
      event({
        id: "event-1",
        startedAt: "2026-07-08T09:00:00.000Z",
        endedAt: "2026-07-08T09:05:00.000Z",
        title: "开发日报助手时间线",
        summary: "优化今日时间线重复记录展示。",
        confidence: 0.8
      }),
      event({
        id: "event-2",
        startedAt: "2026-07-08T09:05:00.000Z",
        endedAt: "2026-07-08T09:10:00.000Z",
        title: "继续开发日报助手时间线",
        summary: "继续优化今日时间线的重复记录展示。",
        confidence: 0.9
      })
    ];

    const merged = mergeSimilarWorkEvents(events, { maxGapMs: 10 * 60_000 });

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      startedAt: "2026-07-08T09:00:00.000Z",
      endedAt: "2026-07-08T09:10:00.000Z",
      category: "开发",
      confidence: 0.85,
      mergedEventCount: 2
    });
  });

  it("keeps different work events separate even when they share a category", () => {
    const events = [
      event({
        id: "event-1",
        startedAt: "2026-07-08T09:00:00.000Z",
        endedAt: "2026-07-08T09:05:00.000Z",
        title: "开发日报助手时间线",
        summary: "优化今日时间线重复记录展示。"
      }),
      event({
        id: "event-2",
        startedAt: "2026-07-08T09:06:00.000Z",
        endedAt: "2026-07-08T09:11:00.000Z",
        title: "修复 AI 连接设置",
        summary: "处理自定义模型连接状态展示。"
      })
    ];

    expect(mergeSimilarWorkEvents(events, { maxGapMs: 10 * 60_000 }).map((item) => item.id)).toEqual([
      "event-1",
      "event-2"
    ]);
  });

  it("does not merge similar work that is separated by a long gap", () => {
    const events = [
      event({
        id: "event-1",
        startedAt: "2026-07-08T09:00:00.000Z",
        endedAt: "2026-07-08T09:05:00.000Z",
        title: "开发日报助手时间线",
        summary: "优化今日时间线重复记录展示。"
      }),
      event({
        id: "event-2",
        startedAt: "2026-07-08T11:00:00.000Z",
        endedAt: "2026-07-08T11:05:00.000Z",
        title: "开发日报助手时间线",
        summary: "优化今日时间线重复记录展示。"
      })
    ];

    expect(mergeSimilarWorkEvents(events, { maxGapMs: 10 * 60_000 })).toHaveLength(2);
  });
});
