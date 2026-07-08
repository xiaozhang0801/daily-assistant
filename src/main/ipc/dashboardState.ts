import type { WorkEvent } from "../../shared/types";

export interface TodayDashboardState {
  recording: boolean;
  capturedDurationMinutes: number;
  analyzedEventCount: number;
  providerStatus: string;
  events: WorkEvent[];
  reportDraft: string;
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
    providerStatus: "not_configured",
    events: [],
    reportDraft: ""
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
    setReportDraft(content: string) {
      state = { ...state, reportDraft: content };
    }
  };
}
