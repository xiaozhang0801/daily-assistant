import type { TodayDashboardState } from "./dashboardState";
import type { AppRepositories } from "../services/storage/repositories";
import { calculateRecordingDurationMinutes } from "./recordingDuration";
import { normalizePointInTimeEvent } from "./workEventFactory";

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

  return enabledProvider && apiKey && modelName ? "ready" : "not_configured";
}

function captureIntervalMs(repositories: AppRepositories): number {
  const minutes = Number(repositories.settings.get("capture.intervalMinutes") ?? "5");
  const safeMinutes = Number.isFinite(minutes) ? Math.max(1, Math.min(60, minutes)) : 5;
  return safeMinutes * 60_000;
}

export function createDashboardSummaryProvider(options: DashboardSummaryProviderOptions) {
  const now = options.now ?? (() => new Date());

  return {
    getToday(baseState: TodayDashboardState): TodayDashboardState {
      const today = dateKey(now());
      const sessions = options.repositories.recordingSessions.listByDate(today);
      const captures = options.repositories.captures.listByDate(today);
      const intervalMs = captureIntervalMs(options.repositories);
      const events = options.repositories.workEvents
        .listByDate(today)
        .map((event) => normalizePointInTimeEvent(event, intervalMs));
      const savedReport = options.repositories.reports.getByDate(today);
      const durationMinutes =
        sessions.length > 0 ? calculateRecordingDurationMinutes(sessions, today, now()) : captures.length;

      return {
        ...baseState,
        capturedDurationMinutes: durationMinutes,
        analyzedEventCount: events.length,
        providerStatus: resolveProviderStatus(options.repositories),
        events,
        reportDraft: savedReport?.content ?? baseState.reportDraft,
        reportSaved: savedReport ? true : baseState.reportSaved
      };
    }
  };
}
