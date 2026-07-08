import { describe, expect, it, vi } from "vitest";
import type { CaptureRecord, WorkEvent } from "../../src/shared/types";
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

function createWorkEvent(captureId = "capture-1"): WorkEvent {
  return {
    id: "event-1",
    captureId,
    startedAt: "2026-07-08T09:00:00.000Z",
    endedAt: "2026-07-08T09:00:00.000Z",
    title: "实现日报助手",
    summary: "整理日报助手的截图采集和状态展示。",
    category: "开发",
    confidence: 0.9,
    source: "ai"
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

  it("persists a recording session from resume to pause", async () => {
    const scheduler = createSchedulerStub();
    const startRecordingSession = vi.fn();
    const endRecordingSession = vi.fn();
    const times = [new Date("2026-07-08T09:00:00.000Z"), new Date("2026-07-08T09:10:00.000Z")];
    const controller = createDashboardCaptureController({
      scheduler,
      captureNow: vi.fn().mockResolvedValue(createCaptureRecord()),
      startRecordingSession,
      endRecordingSession,
      now: () => times.shift() ?? new Date("2026-07-08T09:10:00.000Z")
    });

    await controller.resumeCapture();
    const session = startRecordingSession.mock.calls[0]?.[0];
    controller.pauseCapture();

    expect(session).toEqual({
      id: expect.any(String),
      startedAt: "2026-07-08T09:00:00.000Z",
      endedAt: null
    });
    expect(endRecordingSession).toHaveBeenCalledWith(session.id, "2026-07-08T09:10:00.000Z");
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

  it("analyzes a captured screenshot and saves the work event", async () => {
    const scheduler = createSchedulerStub();
    const captureRecord = createCaptureRecord();
    const workEvent = createWorkEvent(captureRecord.id);
    const analyzeCapture = vi.fn().mockResolvedValue(workEvent);
    const saveWorkEvent = vi.fn();
    const controller = createDashboardCaptureController({
      scheduler,
      captureNow: vi.fn().mockResolvedValue(captureRecord),
      saveCapture: vi.fn(),
      analyzeCapture,
      saveWorkEvent
    });

    await controller.resumeCapture();

    expect(analyzeCapture).toHaveBeenCalledWith(captureRecord);
    expect(saveWorkEvent).toHaveBeenCalledWith(workEvent);
  });

  it("deletes the screenshot after the analyzed event is saved", async () => {
    const scheduler = createSchedulerStub();
    const captureRecord = createCaptureRecord();
    const workEvent = createWorkEvent(captureRecord.id);
    const deleteCapture = vi.fn();
    const controller = createDashboardCaptureController({
      scheduler,
      captureNow: vi.fn().mockResolvedValue(captureRecord),
      saveCapture: vi.fn(),
      analyzeCapture: vi.fn().mockResolvedValue(workEvent),
      saveWorkEvent: vi.fn(),
      deleteCapture
    });

    await controller.resumeCapture();

    expect(deleteCapture).toHaveBeenCalledWith(captureRecord);
  });

  it("keeps the screenshot when no analyzed event is produced", async () => {
    const scheduler = createSchedulerStub();
    const captureRecord = createCaptureRecord();
    const deleteCapture = vi.fn();
    const controller = createDashboardCaptureController({
      scheduler,
      captureNow: vi.fn().mockResolvedValue(captureRecord),
      saveCapture: vi.fn(),
      analyzeCapture: vi.fn().mockResolvedValue(null),
      saveWorkEvent: vi.fn(),
      deleteCapture
    });

    await controller.resumeCapture();

    expect(deleteCapture).not.toHaveBeenCalled();
  });

  it("saves, analyzes, stores an event, and deletes one combined screen capture in one cycle", async () => {
    const scheduler = createSchedulerStub();
    const captureRecord = createCaptureRecord("combined-screen");
    const workEvent = createWorkEvent(captureRecord.id);
    const saveCapture = vi.fn();
    const analyzeCapture = vi.fn().mockResolvedValue(workEvent);
    const saveWorkEvent = vi.fn();
    const deleteCapture = vi.fn();
    const controller = createDashboardCaptureController({
      scheduler,
      captureNow: vi.fn().mockResolvedValue(captureRecord),
      saveCapture,
      analyzeCapture,
      saveWorkEvent,
      deleteCapture
    });

    await controller.resumeCapture();

    expect(saveCapture).toHaveBeenCalledWith(captureRecord);
    expect(analyzeCapture).toHaveBeenCalledWith(captureRecord);
    expect(saveWorkEvent).toHaveBeenCalledWith(workEvent);
    expect(deleteCapture).toHaveBeenCalledWith(captureRecord);
    expect(controller.getToday().capturedDurationMinutes).toBe(1);
  });
});
