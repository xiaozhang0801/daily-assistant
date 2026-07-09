import type {
  AIProviderProfile,
  DailyReportGenerationResult,
  DailyReport,
  ReportGenerationMode,
  WeeklyReportGenerationResult,
  WeeklyReportSaveResult
} from "../../shared/types";
import {
  buildCodeReportFallback,
  buildDailyReportFallback,
  buildMixedReportFallback,
  buildWeeklyReportFallback
} from "../services/report/reportGenerator";
import { resolveDailyReportPrompt } from "../services/ai/prompts";
import { createProviderRegistry } from "../services/ai/providerRegistry";
import type { AIProvider } from "../services/ai/provider";
import type { AppRepositories } from "../services/storage/repositories";
import { mergeSimilarWorkEvents } from "../../shared/workEventMerge";
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

interface GenerateWeeklyReportOptions {
  repositories: AppRepositories;
  now?: () => Date;
  createProvider?: (profile: AIProviderProfile, apiKey: string) => AIProvider;
}

interface SaveWeeklyReportOptions {
  repositories: AppRepositories;
  content: string;
  now?: () => Date;
}

interface WeekRange {
  weekKey: string;
  startDate: string;
  endDate: string;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function utcDateKey(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

function isoWeekNumber(date: Date): { weekYear: number; week: number } {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const weekYear = utcDate.getUTCFullYear();
  const yearStart = new Date(Date.UTC(weekYear, 0, 1));
  const week = Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return { weekYear, week };
}

function weekRangeFor(date: Date): WeekRange {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  const monday = new Date(utcDate);
  monday.setUTCDate(utcDate.getUTCDate() - day + 1);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const { weekYear, week } = isoWeekNumber(utcDate);

  return {
    weekKey: `${weekYear}-W${String(week).padStart(2, "0")}`,
    startDate: utcDateKey(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate()),
    endDate: utcDateKey(sunday.getUTCFullYear(), sunday.getUTCMonth(), sunday.getUTCDate())
  };
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

function captureIntervalMs(repositories: AppRepositories): number {
  const minutes = Number(repositories.settings.get("capture.intervalMinutes") ?? "5");
  const safeMinutes = Number.isFinite(minutes) ? Math.max(1, Math.min(60, minutes)) : 5;
  return safeMinutes * 60_000;
}

function gitActivityCount(codeActivity: GitActivitySummary | null): number {
  if (!codeActivity) return 0;
  return codeActivity.repositories.reduce((total, repository) => total + repository.commits.length, 0);
}

function reportInputCount(
  mode: ReportGenerationMode,
  events: ReturnType<AppRepositories["workEvents"]["listByDate"]>,
  codeActivity: GitActivitySummary | null
): number {
  if (mode === "code") return gitActivityCount(codeActivity);
  if (mode === "mixed") return events.length + gitActivityCount(codeActivity);
  return events.length;
}

function missingAISettingsNotice(profile: AIProviderProfile | undefined, apiKey: string | null): string | null {
  const missing: string[] = [];
  if (!profile) missing.push("AI 提供方");
  if (!apiKey) missing.push("API Key");
  if (profile && !profile.modelName) missing.push("模型");

  if (missing.length === 0) return null;

  return `未使用 AI 生成：设置里还没有保存 ${missing.join("、")}。请先到设置保存后再生成。已使用本地记录生成基础日报。`;
}

function aiFailureNotice(): string {
  return "AI 生成失败，已使用本地记录生成基础日报。请检查设置里的 API Key、模型和接口地址后重试。";
}

function unusableAIContentNotice(): string {
  return "AI 返回内容不可用，已使用本地记录生成基础日报。";
}

function emptyReportInputNotice(mode: ReportGenerationMode): string {
  if (mode === "code") {
    return "当前没有可用于生成日报的 Git 提交记录。请确认 Git 搜索根目录已保存，或先产生今日提交后再生成。";
  }

  if (mode === "mixed") {
    return "当前没有可用于生成日报的截图分析事件或 Git 提交记录。请先继续记录一段时间，或保存 Git 搜索根目录后再生成。";
  }

  return "当前没有可用于生成日报的记录。请先继续记录一段时间，并确认设置里的 AI 配置已保存。";
}

function captureAnalysisReasonMessage(reason: string | null): string {
  return reason?.replace(/^截图 AI (?:分析失败|分析已跳过)：?/, "").trim() ?? "";
}

function captureAnalysisNotice(captures: ReturnType<AppRepositories["captures"]["listByDate"]>): string | null {
  const warningCaptures = captures.filter((capture) => capture.status === "failed" || capture.status === "skipped");
  if (warningCaptures.length === 0) return null;

  const latestWarning = [...warningCaptures].sort(
    (left, right) => Date.parse(right.capturedAt) - Date.parse(left.capturedAt)
  )[0];
  const reason = captureAnalysisReasonMessage(latestWarning.skipReason);
  const reasonMessage = reason ? `最近原因：${reason}` : "请检查 AI 设置和网络后重试。";
  return `有 ${warningCaptures.length} 张截图没有生成 AI 分析结果，本次日报可能不完整。${reasonMessage}`;
}

function appendNotice(existing: string | undefined, addition: string | null): string | undefined {
  if (!addition) return existing;
  return existing ? `${existing} ${addition}` : addition;
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

function buildWeeklyUserInstruction(range: WeekRange, dailyReports: DailyReport[]): string {
  const reportSection =
    dailyReports.length > 0
      ? dailyReports.map((report) => `### ${report.date}\n${report.content.trim()}`).join("\n\n")
      : "本周没有已保存日报。";

  return [
    `请根据日报库中 ${range.startDate} 到 ${range.endDate} 的已保存日报生成本周周报。`,
    "只能使用下面的日报内容，不要读取或推测时间线、截图、未保存草稿或其他数据。",
    "请合并重复事项，突出本周完成内容、进展、问题和下周计划。",
    "",
    "日报库内容：",
    reportSection
  ].join("\n");
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
): Promise<DailyReportGenerationResult> {
  const now = options.now ?? (() => new Date());
  const generatedAt = now();
  const date = dateKey(generatedAt);
  const mode = normalizeReportGenerationMode(options.mode);
  const intervalMs = captureIntervalMs(options.repositories);
  const captures = mode === "code" ? [] : options.repositories.captures.listByDate(date);
  const events = mergeSimilarWorkEvents(options.repositories.workEvents.listByDate(date), { maxGapMs: intervalMs * 2 });
  const codeActivity =
    mode === "work"
      ? null
      : await (options.collectCodeActivity ?? collectGitActivity)(codeActivityOptions(options.repositories, generatedAt));
  const profile = options.repositories.aiProviders.listEnabled()[0];
  const apiKey = options.repositories.settings.get("ai.apiKey");
  const createProvider = options.createProvider ?? createProviderRegistry().create;

  let content: string | null = null;
  let notice: string | undefined;

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
      if (!content) {
        notice = unusableAIContentNotice();
      }
    } catch {
      notice = aiFailureNotice();
      content = null;
    }
  } else {
    notice = missingAISettingsNotice(profile, apiKey) ?? undefined;
  }

  const reportContent = content ?? buildFallbackReport(mode, events, codeActivity);
  if (!content && reportInputCount(mode, events, codeActivity) === 0) {
    notice = emptyReportInputNotice(mode);
  }
  notice = appendNotice(notice, captureAnalysisNotice(captures));

  return {
    content: reportContent,
    source: content ? "ai" : "fallback",
    ...(notice ? { notice } : {})
  };
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

export async function generateWeeklyReport(
  options: GenerateWeeklyReportOptions
): Promise<WeeklyReportGenerationResult> {
  const now = options.now ?? (() => new Date());
  const generatedAt = now();
  const range = weekRangeFor(generatedAt);
  const dailyReports = options.repositories.reports.listDailyByDateRange(range.startDate, range.endDate);
  const profile = options.repositories.aiProviders.listEnabled()[0];
  const apiKey = options.repositories.settings.get("ai.apiKey");
  const createProvider = options.createProvider ?? createProviderRegistry().create;
  let content: string | null = null;

  if (dailyReports.length > 0 && profile && apiKey && profile.modelName) {
    try {
      const provider = createProvider(profile, apiKey);
      content = usefulReportContent(
        await provider.generateDailyReport({
          events: [],
          userInstruction: buildWeeklyUserInstruction(range, dailyReports),
          prompt: resolveDailyReportPrompt(options.repositories.settings.get("prompt.dailyReport"))
        }),
        dailyReports.length
      );
    } catch {
      content = null;
    }
  }

  return {
    ...range,
    content: content ?? buildWeeklyReportFallback(dailyReports, range.startDate, range.endDate),
    sourceReportCount: dailyReports.length
  };
}

export function saveWeeklyReport(options: SaveWeeklyReportOptions): WeeklyReportSaveResult {
  const now = options.now ?? (() => new Date());
  const savedAt = now();
  const range = weekRangeFor(savedAt);
  const timestamp = savedAt.toISOString();
  const existingReport = options.repositories.reports.getByDateAndType(range.weekKey, "weekly");

  options.repositories.reports.save({
    id: `weekly-${range.weekKey}`,
    date: range.weekKey,
    type: "weekly",
    content: options.content,
    generatedAt: existingReport?.generatedAt ?? timestamp,
    updatedAt: timestamp,
    providerId: existingReport?.providerId ?? "manual",
    modelName: existingReport?.modelName ?? "manual"
  });

  return {
    ok: true,
    content: options.content,
    ...range
  };
}
