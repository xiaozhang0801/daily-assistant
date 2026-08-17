export type AppUpdatePhase =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "downloaded"
  | "not-available"
  | "error";

export interface AppUpdateStatus {
  phase: AppUpdatePhase;
  currentVersion: string;
  latestVersion?: string;
  percent?: number;
  message: string;
  error?: string;
}

export interface CheckForUpdatesRequest {
  automatic?: boolean;
}

export function isAppUpdateFeatureEnabled(value: unknown): boolean {
  return value !== "false";
}
