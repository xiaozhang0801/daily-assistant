import type { TodayDashboardState } from "./dashboardState";
import type { AppRepositories } from "../services/storage/repositories";
import { calculateRecordingDurationMinutes } from "./recordingDuration";
import { normalizePointInTimeEvent } from "./workEventFactory";
import type { CaptureRecord, RecordingSession } from "../../shared/types";
import { mergeSimilarWorkEvents } from "../../shared/workEventMerge";

interface DashboardSummaryProviderOptions {
  repositories: AppRepositories;
  now?: () => Date;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function resolveProviderStatus(repositories: AppRepositories): string {
  const enabledProvider = repositories.aiProviders.listEnabled()[0];
  const apiKey = repositories.settings.get("ai.apiKey");
  const modelName = repositories.settings.get("ai.modelName") || enabledProvider?.modelName;

  if (!enabledProvider || !apiKey || !modelName) return "not_configured";
  return "ready";
}

function captureIntervalMs(repositories: AppRepositories): number {
  const minutes = Number(repositories.settings.get("capture.intervalMinutes") ?? "5");
  const safeMinutes = Number.isFinite(minutes) ? Math.max(1, Math.min(60, minutes)) : 5;
  return safeMinutes * 60_000;
}

function latestTimestamp(values: Array<string | null>): number | null {
  const timestamps = values
    .filter((value): value is string => Boolean(value))
    .map((value) => Date.parse(value))
    .filter((value) => Number.isFinite(value));

  return timestamps.length > 0 ? Math.max(...timestamps) : null;
}

function durationReferenceTime(
  recording: boolean,
  captures: CaptureRecord[],
  sessions: RecordingSession[],
  now: Date
): Date {
  if (recording) return now;

  const latestRecordedTime = latestTimestamp([
    ...captures.map((capture) => capture.capturedAt),
    ...sessions.map((session) => session.endedAt)
  ]);
  if (latestRecordedTime !== null) {
    return new Date(latestRecordedTime);
  }

  const latestOpenSessionStart = latestTimestamp(sessions.map((session) => session.startedAt));
  return latestOpenSessionStart !== null ? new Date(latestOpenSessionStart) : now;
}

function isCaptureAnalysisWarning(capture: CaptureRecord): boolean {
  return capture.status === "failed" || capture.status === "skipped";
}

function latestCaptureAnalysisWarning(captures: CaptureRecord[]): CaptureRecord | null {
  const warningCaptures = captures.filter(isCaptureAnalysisWarning);
  if (warningCaptures.length === 0) return null;

  return [...warningCaptures].sort(
    (left, right) => Date.parse(right.capturedAt) - Date.parse(left.capturedAt)
  )[0];
}

export function createDashboardSummaryProvider(options: DashboardSummaryProviderOptions) {
  const now = options.now ?? (() => new Date());

  return {
    getToday(baseState: TodayDashboardState): TodayDashboardState {
      const today = dateKey(now());
      const currentTime = now();
      const sessions = options.repositories.recordingSessions.listByDate(today);
      const captures = options.repositories.captures.listByDate(today);
      const analysisWarningCaptures = captures.filter(isCaptureAnalysisWarning);
      const latestAnalysisWarning = latestCaptureAnalysisWarning(captures);
      const intervalMs = captureIntervalMs(options.repositories);
      const events = mergeSimilarWorkEvents(
        options.repositories.workEvents.listByDate(today).map((event) => normalizePointInTimeEvent(event, intervalMs)),
        { maxGapMs: intervalMs * 2 }
      );
      const savedReport = options.repositories.reports.getByDate(today);
      const durationMinutes =
        sessions.length > 0
          ? calculateRecordingDurationMinutes(
              sessions,
              today,
              durationReferenceTime(baseState.recording, captures, sessions, currentTime)
            )
          : captures.length;

      return {
        ...baseState,
        capturedDurationMinutes: durationMinutes,
        analyzedEventCount: events.length,
        captureAnalysisWarningCount: analysisWarningCaptures.length,
        latestCaptureAnalysisWarningMessage: latestAnalysisWarning?.skipReason ?? "",
        providerStatus: resolveProviderStatus(options.repositories),
        events,
        reportDraft: savedReport?.content ?? baseState.reportDraft,
        reportSaved: savedReport ? true : baseState.reportSaved
      };
    }
  };
}
