import { describe, expect, it, vi } from "vitest";
import { createCaptureScheduler } from "../../src/main/services/capture/captureScheduler";

describe("capture scheduler", () => {
  it("starts, pauses, resumes, and stops without double scheduling", () => {
    vi.useFakeTimers();
    const run = vi.fn();
    const scheduler = createCaptureScheduler({ intervalMs: 60_000, run });

    scheduler.start();
    scheduler.start();
    vi.advanceTimersByTime(60_000);
    expect(run).toHaveBeenCalledTimes(1);

    scheduler.pause();
    vi.advanceTimersByTime(60_000);
    expect(run).toHaveBeenCalledTimes(1);

    scheduler.resume();
    vi.advanceTimersByTime(60_000);
    expect(run).toHaveBeenCalledTimes(2);

    scheduler.stop();
    vi.advanceTimersByTime(60_000);
    expect(run).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("reschedules with the latest interval when start is called again", () => {
    vi.useFakeTimers();
    let intervalMs = 300_000;
    const run = vi.fn();
    const scheduler = createCaptureScheduler({ intervalMs: () => intervalMs, run });

    scheduler.start();
    intervalMs = 60_000;
    scheduler.start();
    vi.advanceTimersByTime(60_000);

    expect(run).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
