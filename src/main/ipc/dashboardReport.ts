import type { AIProviderProfile, ReportGenerationMode } from "../../shared/types";
import {
  buildCodeReportFallback,
  buildDailyReportFallback,
  buildMixedReportFallback
} from "../services/report/reportGenerator";
import { resolveDailyReportPrompt } from "../services/ai/prompts";
import { createProviderRegistry } from "../services/ai/providerRegistry";
import type { AIProvider } from "../services/ai/provider";
import type { AppRepositories } from "../services/storage/repositories";
import {
  collectGitActivity,
  formatGitActivityMarkdown,
  type CollectGitActivityOptions,
  type GitActivitySummary
} from "../services/git/gitActivity";

interface GenerateDashboardReportOptions {
  repositories: AppRepositories;
  mode?: ReportGenerationMode;
  now?: () => Date;
  createProvider?: (profile: AIProviderProfile, apiKey: string) => AIProvider;
  collectCodeActivity?: (options: CollectGitActivityOptions) => Promise<GitActivitySummary>;
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

function normalizeReportGenerationMode(mode: ReportGenerationMode | undefined): ReportGenerationMode {
  return mode === "code" || mode === "mixed" ? mode : "work";
}

function gitActivityCount(codeActivity: GitActivitySummary | null): number {
  if (!codeActivity) return 0;
  return codeActivity.repositories.reduce((total, repository) => total + repository.commits.length, 0);
}

function gitSearchRootFromSettings(repositories: AppRepositories): string | null {
  const root = repositories.settings.get("git.searchRoot")?.trim() ?? "";
  return root.length > 0 ? root : null;
}

function codeActivityOptions(repositories: AppRepositories, generatedAt: Date): CollectGitActivityOptions {
  const gitSearchRoot = gitSearchRootFromSettings(repositories);
  if (!gitSearchRoot) {
    return {
      now: () => generatedAt
    };
  }

  return {
    roots: [gitSearchRoot],
    maxDepth: 4,
    maxRepositories: 50,
    now: () => generatedAt
  };
}

function buildUserInstruction(mode: ReportGenerationMode, codeActivity: GitActivitySummary | null): string {
  if (mode === "work") {
    return "请根据今天已分析出的工作事件生成日报。";
  }

  const codeSection = codeActivity ? formatGitActivityMarkdown(codeActivity) : "## 代码工作总结\n\n- 未发现今日 Git 提交。";
  const modeInstruction =
    mode === "code"
      ? "请根据今天的本地 Git 已提交记录生成研发日报，重点总结提交内容和涉及模块。"
      : "请结合今天已分析出的工作事件和本地 Git 已提交记录生成日报，避免重复描述。";

  return `${modeInstruction}\n\n以下是安全汇总后的 Git 活动摘要，只能基于摘要写日报，不要假设未列出的代码内容：\n${codeSection}`;
}

function buildFallbackReport(mode: ReportGenerationMode, events: ReturnType<AppRepositories["workEvents"]["listByDate"]>, codeActivity: GitActivitySummary | null): string {
  if (mode === "code") {
    return buildCodeReportFallback(
      codeActivity ?? {
        generatedAt: new Date().toISOString(),
        repositories: []
      }
    );
  }

  if (mode === "mixed") {
    return buildMixedReportFallback(
      events,
      codeActivity ?? {
        generatedAt: new Date().toISOString(),
        repositories: []
      }
    );
  }

  return buildDailyReportFallback(events);
}

export async function generateDashboardReport(
  options: GenerateDashboardReportOptions
): Promise<GenerateDashboardReportResult> {
  const now = options.now ?? (() => new Date());
  const generatedAt = now();
  const date = dateKey(generatedAt);
  const mode = normalizeReportGenerationMode(options.mode);
  const events = options.repositories.workEvents.listByDate(date);
  const codeActivity =
    mode === "work"
      ? null
      : await (options.collectCodeActivity ?? collectGitActivity)(codeActivityOptions(options.repositories, generatedAt));
  const profile = options.repositories.aiProviders.listEnabled()[0];
  const apiKey = options.repositories.settings.get("ai.apiKey");
  const createProvider = options.createProvider ?? createProviderRegistry().create;

  let content: string | null = null;

  if (profile && apiKey && profile.modelName) {
    try {
      const provider = createProvider(profile, apiKey);
      content = usefulReportContent(
        await provider.generateDailyReport({
          events: mode === "code" ? [] : events,
          userInstruction: buildUserInstruction(mode, codeActivity),
          prompt: resolveDailyReportPrompt(options.repositories.settings.get("prompt.dailyReport"))
        }),
        events.length + gitActivityCount(codeActivity)
      );
    } catch {
      content = null;
    }
  }

  const reportContent = content ?? buildFallbackReport(mode, events, codeActivity);

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
