import type { CaptureRecord, WorkEvent } from "../../shared/types";
import { createDashboardState, type TodayDashboardState } from "./dashboardState";

interface CaptureSchedulerLike {
  start(): void;
  pause(): void;
  resume(): void;
  stop(): void;
  getState(): { running: boolean; paused: boolean };
}

interface DashboardCaptureControllerOptions {
  scheduler: CaptureSchedulerLike;
  captureNow: () => Promise<CaptureRecord>;
  saveCapture?: (record: CaptureRecord) => void;
  analyzeCapture?: (record: CaptureRecord) => Promise<WorkEvent | null>;
  saveWorkEvent?: (event: WorkEvent) => void | Promise<void>;
  deleteCapture?: (record: CaptureRecord) => void | Promise<void>;
  getTodaySnapshot?: (state: TodayDashboardState) => TodayDashboardState;
}

export function createDashboardCaptureController(options: DashboardCaptureControllerOptions) {
  const dashboardState = createDashboardState();
  let captureInFlight = false;

  async function captureOnce(): Promise<void> {
    if (captureInFlight) return;
    captureInFlight = true;

    try {
      const record = await options.captureNow();
      options.saveCapture?.(record);
      dashboardState.recordCapture();
      const event = await options.analyzeCapture?.(record);
      if (event) {
        await options.saveWorkEvent?.(event);
        dashboardState.recordEvent(event);
        await options.deleteCapture?.(record);
      }
    } catch {
      // Keep recording active. A later scheduler tick can retry capture.
    } finally {
      captureInFlight = false;
    }
  }

  return {
    getToday: () => {
      const state = dashboardState.getToday();
      return options.getTodaySnapshot?.(state) ?? state;
    },
    pauseCapture: () => {
      options.scheduler.pause();
      return dashboardState.pauseCapture();
    },
    async resumeCapture() {
      options.scheduler.resume();
      options.scheduler.start();
      const result = dashboardState.resumeCapture();
      await captureOnce();
      return result;
    },
    setReportDraft(content: string) {
      dashboardState.setReportDraft(content);
    }
  };
}
