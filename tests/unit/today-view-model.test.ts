import { describe, expect, it } from "vitest";
import type { WorkEvent } from "../../src/shared/types";
import { sortEventsNewestFirst, summarizeEventCategories } from "../../src/renderer/pages/todayViewModel";

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
});
