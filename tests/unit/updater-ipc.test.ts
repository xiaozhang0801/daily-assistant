import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppUpdaterController } from "../../src/main/services/updater/appUpdater";
import { updaterChannels } from "../../src/shared/types/ipc";
import type { AppUpdateStatus } from "../../src/shared/types/updater";

const handlers = new Map<string, (...args: unknown[]) => unknown>();

vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(channel, handler);
    })
  }
}));

describe("updater IPC", () => {
  beforeEach(() => {
    handlers.clear();
  });

  it("registers update status, check, and install handlers", async () => {
    const idleStatus: AppUpdateStatus = { phase: "idle", currentVersion: "0.1.1", message: "尚未检查更新。" };
    const checkingStatus: AppUpdateStatus = { phase: "checking", currentVersion: "0.1.1", message: "正在检查更新..." };
    const downloadedStatus: AppUpdateStatus = { phase: "downloaded", currentVersion: "0.1.1", message: "新版本已下载。" };
    const controller: AppUpdaterController = {
      getStatus: vi.fn(() => idleStatus),
      checkForUpdates: vi.fn(async () => checkingStatus),
      quitAndInstall: vi.fn(() => downloadedStatus)
    };
    const { registerUpdaterIpc } = await import("../../src/main/ipc/updaterIpc");

    registerUpdaterIpc(controller);

    expect(await handlers.get(updaterChannels.getStatus)?.({})).toEqual({
      phase: "idle",
      currentVersion: "0.1.1",
      message: "尚未检查更新。"
    });
    expect(await handlers.get(updaterChannels.checkForUpdates)?.({}, { automatic: true })).toEqual({
      phase: "checking",
      currentVersion: "0.1.1",
      message: "正在检查更新..."
    });
    expect(await handlers.get(updaterChannels.quitAndInstall)?.({})).toEqual({
      phase: "downloaded",
      currentVersion: "0.1.1",
      message: "新版本已下载。"
    });
    expect(controller.checkForUpdates).toHaveBeenCalledWith({ automatic: true });
    expect(controller.quitAndInstall).toHaveBeenCalled();
  });
});
