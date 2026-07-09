import { readFile, unlink } from "node:fs/promises";
import { desktopCapturer, ipcMain, nativeImage } from "electron";
import type { CaptureRecord, GenerateReportRequest, ReportGenerationMode, WorkEvent, WorkEventDraft } from "../../shared/types";
import { dashboardChannels } from "../../shared/types/ipc";
import { createProviderRegistry } from "../services/ai/providerRegistry";
import { resolveScreenshotPrompt } from "../services/ai/prompts";
import { composeBitmapsHorizontally } from "../services/capture/screenshotComposer";
import { captureScreenshot } from "../services/capture/screenshotCapture";
import { createCaptureScheduler } from "../services/capture/captureScheduler";
import type { AppRepositories } from "../services/storage/repositories";
import { createDashboardCaptureController } from "./dashboardCaptureController";
import { buildDashboardHistory } from "./dashboardHistory";
import { generateDashboardReport, generateWeeklyReport, saveDashboardReport, saveWeeklyReport } from "./dashboardReport";
import { createDashboardState } from "./dashboardState";
import { createDashboardSummaryProvider } from "./dashboardSummary";
import { createWorkEventFromCapture } from "./workEventFactory";
import { buildDailyReportFallback, buildWeeklyReportFallback } from "../services/report/reportGenerator";

interface DashboardController {
  getToday(): unknown;
  pauseCapture(): unknown;
  resumeCapture(): unknown;
  setReportDraft(content: string, saved?: boolean): void;
}

interface DashboardIpcOptions {
  repositories?: AppRepositories;
  screenshotsDirectory?: string;
  controller?: DashboardController;
}

function reportGenerationModeFromRequest(request: unknown): ReportGenerationMode {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    return "work";
  }

  const mode = (request as GenerateReportRequest).mode;
  return mode === "code" || mode === "mixed" ? mode : "work";
}

function captureIntervalMs(repositories?: AppRepositories): number {
  const minutes = Number(repositories?.settings.get("capture.intervalMinutes") ?? "5");
  const safeMinutes = Number.isFinite(minutes) ? Math.max(1, Math.min(60, minutes)) : 5;
  return safeMinutes * 60_000;
}

function weekRangeFor(date: Date): { weekKey: string; startDate: string; endDate: string } {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  const monday = new Date(utcDate);
  monday.setUTCDate(utcDate.getUTCDate() - day + 1);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const thursday = new Date(utcDate);
  thursday.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const weekYear = thursday.getUTCFullYear();
  const yearStart = new Date(Date.UTC(weekYear, 0, 1));
  const week = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);

  return {
    weekKey: `${weekYear}-W${String(week).padStart(2, "0")}`,
    startDate: monday.toISOString().slice(0, 10),
    endDate: sunday.toISOString().slice(0, 10)
  };
}

function createScreenshotAnalyzer(repositories: AppRepositories) {
  const registry = createProviderRegistry();

  return async (record: CaptureRecord): Promise<WorkEvent | null> => {
    if (repositories.settings.get("capture.uploadToAIEnabled") !== "true") {
      return null;
    }

    const profile = repositories.aiProviders.listEnabled()[0];
    const apiKey = repositories.settings.get("ai.apiKey");
    if (!profile || !apiKey || !profile.modelName) {
      return null;
    }

    const imageBase64 = (await readFile(record.imagePath)).toString("base64");
    const prompt = resolveScreenshotPrompt(repositories.settings.get("prompt.screenshot"));
    const provider = registry.create(profile, apiKey);
    const draft = await provider.analyzeScreenshot({
      imageBase64,
      mimeType: "image/png",
      prompt
    });

    return createWorkEventFromCapture(record, draft, {
      intervalMs: captureIntervalMs(repositories)
    });
  };
}

async function deleteScreenshotFile(record: CaptureRecord): Promise<void> {
  try {
    await unlink(record.imagePath);
  } catch (error) {
    const code = error instanceof Error && "code" in error ? error.code : null;
    if (code !== "ENOENT") {
      throw error;
    }
  }
}

async function captureDesktopPng(): Promise<Buffer> {
  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: { width: 1920, height: 1080 }
  });
  if (sources.length === 0) {
    throw new Error("No screen source available.");
  }

  const composed = composeBitmapsHorizontally(
    sources.map((source) => {
      const size = source.thumbnail.getSize(1);
      return {
        width: size.width,
        height: size.height,
        bitmap: source.thumbnail.toBitmap({ scaleFactor: 1 })
      };
    })
  );

  return nativeImage
    .createFromBitmap(composed.bitmap, {
      width: composed.width,
      height: composed.height,
      scaleFactor: 1
    })
    .toPNG();
}

function createDefaultDashboardController(options: DashboardIpcOptions): DashboardController {
  if (!options.repositories || !options.screenshotsDirectory) {
    return createDashboardState();
  }

  const repositories = options.repositories;
  const screenshotsDirectory = options.screenshotsDirectory;
  const summaryProvider = createDashboardSummaryProvider({ repositories });
  let controller: ReturnType<typeof createDashboardCaptureController>;
  const scheduler = createCaptureScheduler({
    intervalMs: () => captureIntervalMs(repositories),
    run: () => {
      void controller.resumeCapture();
    }
  });

  controller = createDashboardCaptureController({
    scheduler,
    captureNow: () =>
      captureScreenshot({
        storageDirectory: screenshotsDirectory,
        screenshotPng: captureDesktopPng
      }),
    saveCapture: (record) => repositories.captures.save(record),
    analyzeCapture: createScreenshotAnalyzer(repositories),
    saveWorkEvent: (event) => repositories.workEvents.save(event),
    deleteCapture: deleteScreenshotFile,
    startRecordingSession: (session) => repositories.recordingSessions.save(session),
    endRecordingSession: (id, endedAt) => repositories.recordingSessions.end(id, endedAt),
    getTodaySnapshot: (state) => summaryProvider.getToday(state)
  });

  return controller;
}

export function registerDashboardIpc(options: DashboardIpcOptions = {}): void {
  const controller = options.controller ?? createDefaultDashboardController(options);

  ipcMain.handle(dashboardChannels.getToday, async () => controller.getToday());

  ipcMain.handle(dashboardChannels.pauseCapture, async () => controller.pauseCapture());
  ipcMain.handle(dashboardChannels.resumeCapture, async () => controller.resumeCapture());
  ipcMain.handle(dashboardChannels.generateReport, async (_event, request: GenerateReportRequest | undefined) => {
    const mode = reportGenerationModeFromRequest(request);
    const result = options.repositories
      ? await generateDashboardReport({ repositories: options.repositories, mode })
      : {
          content: buildDailyReportFallback((controller.getToday() as { events?: WorkEvent[] }).events ?? []),
          source: "fallback" as const,
          notice: "没有连接到本地数据库，已使用当前页面记录生成基础日报。"
        };
    controller.setReportDraft(result.content, false);
    return result;
  });
  ipcMain.handle(dashboardChannels.saveReport, async (_event, content: string) => {
    const reportContent = typeof content === "string" ? content : "";
    const result = options.repositories
      ? saveDashboardReport({ repositories: options.repositories, content: reportContent })
      : { ok: true as const, content: reportContent, date: new Date().toISOString().slice(0, 10) };
    controller.setReportDraft(result.content, true);
    return result;
  });
  ipcMain.handle(dashboardChannels.generateWeeklyReport, async () => {
    if (options.repositories) {
      return generateWeeklyReport({ repositories: options.repositories });
    }

    const range = weekRangeFor(new Date());
    return {
      ...range,
      content: buildWeeklyReportFallback([], range.startDate, range.endDate),
      sourceReportCount: 0
    };
  });
  ipcMain.handle(dashboardChannels.saveWeeklyReport, async (_event, content: string) => {
    const reportContent = typeof content === "string" ? content : "";
    if (options.repositories) {
      return saveWeeklyReport({ repositories: options.repositories, content: reportContent });
    }

    return {
      ok: true as const,
      content: reportContent,
      ...weekRangeFor(new Date())
    };
  });
  ipcMain.handle(dashboardChannels.getHistory, async () =>
    options.repositories ? buildDashboardHistory({ repositories: options.repositories }) : []
  );
}
