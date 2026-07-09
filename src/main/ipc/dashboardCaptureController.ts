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
  captureNow: () => Promise<CaptureRecord>;
  saveCapture?: (record: CaptureRecord) => void;
  analyzeCapture?: (record: CaptureRecord) => Promise<CaptureAnalysisResult>;
  saveWorkEvent?: (event: WorkEvent) => void | Promise<void>;
  deleteCapture?: (record: CaptureRecord) => void | Promise<void>;
  markCaptureSkipped?: (record: CaptureRecord, reason: string) => void | Promise<void>;
  markCaptureFailed?: (record: CaptureRecord, reason: string) => void | Promise<void>;
  startRecordingSession?: (session: { id: string; startedAt: string; endedAt: null }) => void;
  endRecordingSession?: (id: string, endedAt: string) => void;
  getTodaySnapshot?: (state: TodayDashboardState) => TodayDashboardState;
  now?: () => Date;
}

interface CaptureAnalysisSkip {
  kind: "skipped";
  reason: string;
}

export type CaptureAnalysisResult = WorkEvent | CaptureAnalysisSkip | null;

export function skipCaptureAnalysis(reason: string): CaptureAnalysisSkip {
  return {
    kind: "skipped",
    reason
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return "未知错误";
}

function isCaptureAnalysisSkip(result: CaptureAnalysisResult | undefined): result is CaptureAnalysisSkip {
  return Boolean(result && typeof result === "object" && "kind" in result && result.kind === "skipped");
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
      const record = await options.captureNow();
      options.saveCapture?.(record);
      dashboardState.recordCapture();
      try {
        const result = await options.analyzeCapture?.(record);
        if (isCaptureAnalysisSkip(result)) {
          await options.markCaptureSkipped?.(record, result.reason);
        } else if (result) {
          await options.saveWorkEvent?.(result);
          dashboardState.recordEvent(result);
          await options.deleteCapture?.(record);
        }
      } catch (error) {
        await options.markCaptureFailed?.(record, errorMessage(error));
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
