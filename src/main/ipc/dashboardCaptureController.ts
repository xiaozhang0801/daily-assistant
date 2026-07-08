import { randomUUID } from "node:crypto";
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
  captureNow: () => Promise<CaptureRecord[]>;
  saveCapture?: (record: CaptureRecord) => void;
  analyzeCapture?: (record: CaptureRecord) => Promise<WorkEvent | null>;
  saveWorkEvent?: (event: WorkEvent) => void | Promise<void>;
  deleteCapture?: (record: CaptureRecord) => void | Promise<void>;
  startRecordingSession?: (session: { id: string; startedAt: string; endedAt: null }) => void;
  endRecordingSession?: (id: string, endedAt: string) => void;
  getTodaySnapshot?: (state: TodayDashboardState) => TodayDashboardState;
  now?: () => Date;
}

export function createDashboardCaptureController(options: DashboardCaptureControllerOptions) {
  const dashboardState = createDashboardState();
  let captureInFlight = false;
  let activeSessionId: string | null = null;
  const now = options.now ?? (() => new Date());

  async function captureOnce(): Promise<void> {
    if (captureInFlight) return;
    captureInFlight = true;

    try {
      const records = await options.captureNow();
      let captureRecorded = false;
      for (const record of records) {
        options.saveCapture?.(record);
        if (!captureRecorded) {
          dashboardState.recordCapture();
          captureRecorded = true;
        }
        const event = await options.analyzeCapture?.(record);
        if (event) {
          await options.saveWorkEvent?.(event);
          dashboardState.recordEvent(event);
          await options.deleteCapture?.(record);
        }
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
      if (activeSessionId) {
        options.endRecordingSession?.(activeSessionId, now().toISOString());
        activeSessionId = null;
      }
      return dashboardState.pauseCapture();
    },
    async resumeCapture() {
      options.scheduler.resume();
      options.scheduler.start();
      if (!activeSessionId) {
        activeSessionId = randomUUID();
        options.startRecordingSession?.({
          id: activeSessionId,
          startedAt: now().toISOString(),
          endedAt: null
        });
      }
      const result = dashboardState.resumeCapture();
      await captureOnce();
      return result;
    },
    setReportDraft(content: string, saved = false) {
      dashboardState.setReportDraft(content, saved);
    }
  };
}
