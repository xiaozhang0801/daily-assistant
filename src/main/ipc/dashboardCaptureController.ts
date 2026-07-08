import type { CaptureRecord } from "../../shared/types";
import { createDashboardState } from "./dashboardState";

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
}

export function createDashboardCaptureController(options: DashboardCaptureControllerOptions) {
  const dashboardState = createDashboardState();

  async function captureOnce(): Promise<void> {
    try {
      const record = await options.captureNow();
      options.saveCapture?.(record);
      dashboardState.recordCapture();
    } catch {
      // Keep recording active. A later scheduler tick can retry capture.
    }
  }

  return {
    getToday: () => dashboardState.getToday(),
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
