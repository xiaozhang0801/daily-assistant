import { desktopCapturer, ipcMain } from "electron";
import { dashboardChannels } from "../../shared/types/ipc";
import { captureScreenshot } from "../services/capture/screenshotCapture";
import { createCaptureScheduler } from "../services/capture/captureScheduler";
import type { AppRepositories } from "../services/storage/repositories";
import { createDashboardCaptureController } from "./dashboardCaptureController";
import { createDashboardState } from "./dashboardState";

interface DashboardController {
  getToday(): unknown;
  pauseCapture(): unknown;
  resumeCapture(): unknown;
  setReportDraft(content: string): void;
}

interface DashboardIpcOptions {
  repositories?: AppRepositories;
  screenshotsDirectory?: string;
  controller?: DashboardController;
}

function captureIntervalMs(repositories?: AppRepositories): number {
  const minutes = Number(repositories?.settings.get("capture.intervalMinutes") ?? "5");
  const safeMinutes = Number.isFinite(minutes) ? Math.max(1, Math.min(60, minutes)) : 5;
  return safeMinutes * 60_000;
}

async function captureDesktopPng(): Promise<Buffer> {
  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: { width: 1920, height: 1080 }
  });
  const firstScreen = sources[0];
  if (!firstScreen) {
    throw new Error("No screen source available.");
  }

  return firstScreen.thumbnail.toPNG();
}

function createDefaultDashboardController(options: DashboardIpcOptions): DashboardController {
  if (!options.repositories || !options.screenshotsDirectory) {
    return createDashboardState();
  }

  let controller: ReturnType<typeof createDashboardCaptureController>;
  const scheduler = createCaptureScheduler({
    intervalMs: captureIntervalMs(options.repositories),
    run: () => {
      void controller.resumeCapture();
    }
  });

  controller = createDashboardCaptureController({
    scheduler,
    captureNow: () =>
      captureScreenshot({
        storageDirectory: options.screenshotsDirectory ?? "",
        screenshotPng: captureDesktopPng
      }),
    saveCapture: (record) => options.repositories?.captures.save(record)
  });

  return controller;
}

export function registerDashboardIpc(options: DashboardIpcOptions = {}): void {
  const controller = options.controller ?? createDefaultDashboardController(options);

  ipcMain.handle(dashboardChannels.getToday, async () => controller.getToday());

  ipcMain.handle(dashboardChannels.pauseCapture, async () => controller.pauseCapture());
  ipcMain.handle(dashboardChannels.resumeCapture, async () => controller.resumeCapture());
  ipcMain.handle(dashboardChannels.generateReport, async () => {
    const content = "# 今日日报\n\n- 暂无记录。";
    controller.setReportDraft(content);
    return { content };
  });
}
