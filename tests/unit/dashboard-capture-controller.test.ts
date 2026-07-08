import { describe, expect, it, vi } from "vitest";
import type { CaptureRecord } from "../../src/shared/types";
import { createDashboardCaptureController } from "../../src/main/ipc/dashboardCaptureController";

function createCaptureRecord(id = "capture-1"): CaptureRecord {
  return {
    id,
    capturedAt: "2026-07-08T09:00:00.000Z",
    imagePath: `C:/tmp/${id}.png`,
    activeApp: null,
    windowTitle: null,
    status: "captured",
    skipReason: null
  };
}

function createSchedulerStub() {
  return {
    start: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
    getState: vi.fn(() => ({ running: true, paused: false }))
  };
}

describe("dashboard capture controller", () => {
  it("starts scheduling and captures immediately when recording resumes", async () => {
    const scheduler = createSchedulerStub();
    const captureRecord = createCaptureRecord();
    const captureNow = vi.fn().mockResolvedValue(captureRecord);
    const saveCapture = vi.fn();
    const controller = createDashboardCaptureController({
      scheduler,
      captureNow,
      saveCapture
    });

    await expect(controller.resumeCapture()).resolves.toEqual({ ok: true, recording: true });

    expect(scheduler.resume).toHaveBeenCalledTimes(1);
    expect(scheduler.start).toHaveBeenCalledTimes(1);
    expect(captureNow).toHaveBeenCalledTimes(1);
    expect(saveCapture).toHaveBeenCalledWith(captureRecord);
    expect(controller.getToday().recording).toBe(true);
  });

  it("pauses scheduling when recording pauses", () => {
    const scheduler = createSchedulerStub();
    const controller = createDashboardCaptureController({
      scheduler,
      captureNow: vi.fn().mockResolvedValue(createCaptureRecord()),
      saveCapture: vi.fn()
    });

    expect(controller.pauseCapture()).toEqual({ ok: true, recording: false });

    expect(scheduler.pause).toHaveBeenCalledTimes(1);
    expect(controller.getToday().recording).toBe(false);
  });
});
