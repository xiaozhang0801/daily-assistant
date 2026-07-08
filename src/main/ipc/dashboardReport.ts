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

interface SaveDashboardReportOptions {
  repositories: AppRepositories;
  content: string;
  now?: () => Date;
}

interface SaveDashboardReportResult {
  ok: true;
  content: string;
  date: string;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function nonEmptyContent(value: string): string | null {
  const content = value.trim();
  return content.length > 0 ? content : null;
}

function isCompletionStatusOnly(content: string): boolean {
  const normalized = content.trim().replace(/[。.!！\s]/g, "");
  const lower = normalized.toLowerCase();
  return (
    normalized === "完成" ||
    lower === "done" ||
    (normalized.length <= 8 && (normalized.includes("已生成") || normalized.includes("生成完成")))
  );
}

function usefulReportContent(value: string, eventCount: number): string | null {
  const content = nonEmptyContent(value);
  if (!content) return null;
  if (eventCount > 0 && isCompletionStatusOnly(content)) return null;
  return content;
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

  let content: string | null = null;

  if (profile && apiKey && profile.modelName) {
    try {
      const provider = createProvider(profile, apiKey);
      content = usefulReportContent(
        await provider.generateDailyReport({
          events,
          userInstruction: "请根据今天已分析出的工作事件生成日报。",
          prompt: resolveDailyReportPrompt(options.repositories.settings.get("prompt.dailyReport"))
        }),
        events.length
      );
    } catch {
      content = null;
    }
  }

  const reportContent = content ?? buildDailyReportFallback(events);

  return { content: reportContent };
}

export function saveDashboardReport(options: SaveDashboardReportOptions): SaveDashboardReportResult {
  const now = options.now ?? (() => new Date());
  const savedAt = now();
  const date = dateKey(savedAt);
  const timestamp = savedAt.toISOString();
  const existingReport = options.repositories.reports.getByDate(date);

  options.repositories.reports.save({
    id: `daily-${date}`,
    date,
    type: "daily",
    content: options.content,
    generatedAt: existingReport?.generatedAt ?? timestamp,
    updatedAt: timestamp,
    providerId: existingReport?.providerId ?? "manual",
    modelName: existingReport?.modelName ?? "manual"
  });

  return {
    ok: true,
    content: options.content,
    date
  };
}
