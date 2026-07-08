import { describe, expect, it } from "vitest";
import type { CaptureRecord, WorkEventDraft } from "../../src/shared/types";
import { createWorkEventFromCapture } from "../../src/main/ipc/workEventFactory";

const capture: CaptureRecord = {
  id: "capture-1",
  capturedAt: "2026-07-08T07:56:00.000Z",
  imagePath: "C:/tmp/capture-1.png",
  activeApp: null,
  windowTitle: null,
  status: "captured",
  skipReason: null
};

const draft: WorkEventDraft = {
  title: "整理日报助手",
  summary: "修复时间线显示。",
  category: "开发",
  confidence: 0.91
};

describe("work event factory", () => {
  it("uses the screenshot capture time as the end and subtracts the capture interval for the start", () => {
    const event = createWorkEventFromCapture(capture, draft, {
      intervalMs: 5 * 60_000,
      idFactory: () => "event-1"
    });

    expect(event).toMatchObject({
      id: "event-1",
      captureId: "capture-1",
      startedAt: "2026-07-08T07:51:00.000Z",
      endedAt: "2026-07-08T07:56:00.000Z",
      title: "整理日报助手",
      summary: "修复时间线显示。",
      category: "开发",
      confidence: 0.91,
      source: "ai"
    });
  });
});
