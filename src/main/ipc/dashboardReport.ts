import type { AIProviderProfile } from "../../shared/types";
import { buildDailyReportFallback } from "../services/report/reportGenerator";
import { resolveDailyReportPrompt } from "../services/ai/prompts";
import { createProviderRegistry } from "../services/ai/providerRegistry";
import type { AIProvider } from "../services/ai/provider";
import type { AppRepositories } from "../services/storage/repositories";

interface GenerateDashboardReportOptions {
  repositories: AppRepositories;
  now?: () => Date;
  createProvider?: (profile: AIProviderProfile, apiKey: string) => AIProvider;
}

interface GenerateDashboardReportResult {
  content: string;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function nonEmptyContent(value: string): string | null {
  const content = value.trim();
  return content.length > 0 ? content : null;
}

export async function generateDashboardReport(
  options: GenerateDashboardReportOptions
): Promise<GenerateDashboardReportResult> {
  const now = options.now ?? (() => new Date());
  const generatedAt = now();
  const date = dateKey(generatedAt);
  const events = options.repositories.workEvents.listByDate(date);
  const profile = options.repositories.aiProviders.listEnabled()[0];
  const apiKey = options.repositories.settings.get("ai.apiKey");
  const createProvider = options.createProvider ?? createProviderRegistry().create;

  let providerId = "local-fallback";
  let modelName = "fallback";
  let content: string | null = null;

  if (profile && apiKey && profile.modelName) {
    try {
      const provider = createProvider(profile, apiKey);
      content = nonEmptyContent(
        await provider.generateDailyReport({
          events,
          userInstruction: "请根据今天已分析出的工作事件生成日报。",
          prompt: resolveDailyReportPrompt(options.repositories.settings.get("prompt.dailyReport"))
        })
      );
      providerId = profile.id;
      modelName = profile.modelName;
    } catch {
      content = null;
    }
  }

  const reportContent = content ?? buildDailyReportFallback(events);
  const timestamp = generatedAt.toISOString();

  options.repositories.reports.save({
    id: `daily-${date}`,
    date,
    type: "daily",
    content: reportContent,
    generatedAt: timestamp,
    updatedAt: timestamp,
    providerId,
    modelName
  });

  return { content: reportContent };
}
