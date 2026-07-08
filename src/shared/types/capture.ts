export type CaptureStatus = "captured" | "skipped" | "analyzed" | "failed";

export interface CaptureRecord {
  id: string;
  capturedAt: string;
  imagePath: string;
  activeApp: string | null;
  windowTitle: string | null;
  status: CaptureStatus;
  skipReason: string | null;
}

export interface RecordingSession {
  id: string;
  startedAt: string;
  endedAt: string | null;
}
