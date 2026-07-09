import type { WorkEvent } from "../../shared/types";

export interface TodayDashboardState {
  recording: boolean;
  capturedDurationMinutes: number;
  analyzedEventCount: number;
  captureAnalysisWarningCount: number;
  latestCaptureAnalysisWarningMessage: string;
  providerStatus: string;
  events: WorkEvent[];
  reportDraft: string;
  reportSaved: boolean;
}

export interface CaptureToggleResult {
  ok: true;
  recording: boolean;
}

export function createDashboardState(initial?: Partial<TodayDashboardState>) {
  const defaultState: TodayDashboardState = {
    recording: false,
    capturedDurationMinutes: 0,
    analyzedEventCount: 0,
    captureAnalysisWarningCount: 0,
    latestCaptureAnalysisWarningMessage: "",
    providerStatus: "not_configured",
    events: [],
    reportDraft: "",
    reportSaved: false
  };

  let state: TodayDashboardState = {
    ...defaultState,
    ...initial,
    events: initial?.events ? [...initial.events] : []
  };

  function getToday(): TodayDashboardState {
    return {
      ...state,
      events: [...state.events]
    };
  }

  function setRecording(recording: boolean): CaptureToggleResult {
    state = { ...state, recording };
    return { ok: true, recording };
  }

  return {
    getToday,
    pauseCapture: () => setRecording(false),
    resumeCapture: () => setRecording(true),
    recordCapture() {
      state = {
        ...state,
        capturedDurationMinutes: state.capturedDurationMinutes + 1
      };
    },
    recordEvent(event: WorkEvent) {
      state = {
        ...state,
        analyzedEventCount: state.analyzedEventCount + 1,
        events: [...state.events, event]
      };
    },
    setReportDraft(content: string, saved = false) {
      state = { ...state, reportDraft: content, reportSaved: saved };
    }
  };
}
