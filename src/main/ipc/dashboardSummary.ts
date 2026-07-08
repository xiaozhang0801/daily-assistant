import type { TodayDashboardState } from "./dashboardState";
import type { AppRepositories } from "../services/storage/repositories";

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

export function createDashboardSummaryProvider(options: DashboardSummaryProviderOptions) {
  const now = options.now ?? (() => new Date());

  return {
    getToday(baseState: TodayDashboardState): TodayDashboardState {
      const today = dateKey(now());
      const captures = options.repositories.captures.listByDate(today);
      const events = options.repositories.workEvents.listByDate(today);
      const savedReport = options.repositories.reports.getByDate(today);

      return {
        ...baseState,
        capturedDurationMinutes: captures.length,
        analyzedEventCount: events.length,
        providerStatus: resolveProviderStatus(options.repositories),
        events,
        reportDraft: savedReport?.content ?? baseState.reportDraft
      };
    }
  };
}
