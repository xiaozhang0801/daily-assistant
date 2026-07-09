import { BrowserWindow, app } from "electron";
import * as electronUpdaterModule from "electron-updater";
import { updaterChannels } from "../../../shared/types/ipc";
import type { AppUpdateStatus, CheckForUpdatesRequest } from "../../../shared/types/updater";

interface VersionInfo {
  version?: string;
}

interface ProgressInfo {
  percent?: number;
}

interface UpdaterLike {
  autoDownload: boolean;
  on(event: "checking-for-update", listener: () => void): UpdaterLike;
  on(event: "update-available", listener: (info: VersionInfo) => void): UpdaterLike;
  on(event: "update-not-available", listener: (info: VersionInfo) => void): UpdaterLike;
  on(event: "download-progress", listener: (progress: ProgressInfo) => void): UpdaterLike;
  on(event: "update-downloaded", listener: (info: VersionInfo) => void): UpdaterLike;
  on(event: "error", listener: (error: Error) => void): UpdaterLike;
  checkForUpdates(): Promise<unknown>;
  quitAndInstall(): void;
}

export interface AppUpdaterController {
  getStatus: () => AppUpdateStatus;
  checkForUpdates: (request?: CheckForUpdatesRequest) => Promise<AppUpdateStatus>;
  quitAndInstall: () => AppUpdateStatus;
}

interface AppUpdaterControllerOptions {
  enabled?: boolean;
  packaged?: boolean;
  currentVersion?: string;
  updater?: UpdaterLike;
  emitStatus?: (status: AppUpdateStatus) => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function findAutoUpdater(value: unknown): UpdaterLike | null {
  if (!isRecord(value)) return null;
  return isRecord(value.autoUpdater) ? (value.autoUpdater as unknown as UpdaterLike) : null;
}

export function resolveElectronAutoUpdater(moduleNamespace: unknown = electronUpdaterModule): UpdaterLike {
  const direct = findAutoUpdater(moduleNamespace);
  if (direct) return direct;

  const defaultExport = isRecord(moduleNamespace) ? moduleNamespace.default : null;
  const fromDefault = findAutoUpdater(defaultExport);
  if (fromDefault) return fromDefault;

  throw new Error("electron-updater autoUpdater is unavailable.");
}

function defaultEmitStatus(status: AppUpdateStatus): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(updaterChannels.status, status);
  }
}

function getVersion(info: VersionInfo | undefined): string | undefined {
  return typeof info?.version === "string" && info.version ? info.version : undefined;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return "检查更新失败";
}

function roundPercent(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function createAppUpdaterController(options: AppUpdaterControllerOptions = {}): AppUpdaterController {
  const enabled = options.enabled ?? false;
  const packaged = options.packaged ?? app.isPackaged;
  const currentVersion = options.currentVersion ?? app.getVersion();
  const updater = options.updater ?? resolveElectronAutoUpdater();
  const emitStatus = options.emitStatus ?? defaultEmitStatus;
  let automaticCheckStarted = false;
  let checkInProgress = false;
  let status: AppUpdateStatus = {
    phase: "idle",
    currentVersion,
    message: enabled ? "尚未检查更新。" : "更新入口未启用。"
  };

  function setStatus(next: Partial<AppUpdateStatus>): AppUpdateStatus {
    status = {
      ...status,
      ...next,
      currentVersion
    };
    emitStatus(status);
    return status;
  }

  updater.autoDownload = true;
  updater.on("checking-for-update", () => {
    checkInProgress = true;
    setStatus({
      phase: "checking",
      message: "正在检查更新..."
    });
  });
  updater.on("update-available", (info: VersionInfo) => {
    const latestVersion = getVersion(info);
    setStatus({
      phase: "available",
      latestVersion,
      message: latestVersion ? `发现新版本 ${latestVersion}，开始下载。` : "发现新版本，开始下载。"
    });
  });
  updater.on("download-progress", (progress: ProgressInfo) => {
    const percent = roundPercent(progress.percent);
    setStatus({
      phase: "downloading",
      percent,
      message: typeof percent === "number" ? `正在下载更新 ${percent}%` : "正在下载更新..."
    });
  });
  updater.on("update-downloaded", (info: VersionInfo) => {
    checkInProgress = false;
    const latestVersion = getVersion(info);
    setStatus({
      phase: "downloaded",
      latestVersion,
      percent: 100,
      message: latestVersion ? `新版本 ${latestVersion} 已下载，重启后安装。` : "新版本已下载，重启后安装。"
    });
  });
  updater.on("update-not-available", (info: VersionInfo) => {
    checkInProgress = false;
    setStatus({
      phase: "not-available",
      latestVersion: getVersion(info),
      message: "当前已是最新版本。"
    });
  });
  updater.on("error", (error: Error) => {
    checkInProgress = false;
    const message = getErrorMessage(error);
    setStatus({
      phase: "error",
      error: message,
      message: `检查更新失败：${message}`
    });
  });

  return {
    getStatus: () => status,
    checkForUpdates: async (request = {}) => {
      if (!enabled) return status;
      if (request.automatic && automaticCheckStarted) return status;
      if (request.automatic) automaticCheckStarted = true;

      if (!packaged) {
        return setStatus({
          phase: "error",
          message: "自动更新仅在打包后的应用中可用。"
        });
      }

      if (checkInProgress || status.phase === "downloading") return status;

      checkInProgress = true;
      setStatus({
        phase: "checking",
        message: request.automatic ? "正在自动检查更新..." : "正在检查更新..."
      });

      try {
        await updater.checkForUpdates();
      } catch (error) {
        checkInProgress = false;
        const message = getErrorMessage(error);
        return setStatus({
          phase: "error",
          error: message,
          message: `检查更新失败：${message}`
        });
      }

      return status;
    },
    quitAndInstall: () => {
      if (status.phase === "downloaded") {
        updater.quitAndInstall();
      }
      return status;
    }
  };
}
