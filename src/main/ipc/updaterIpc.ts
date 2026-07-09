import { ipcMain } from "electron";
import { updaterChannels } from "../../shared/types/ipc";
import type { CheckForUpdatesRequest } from "../../shared/types/updater";
import type { AppUpdaterController } from "../services/updater/appUpdater";

export function registerUpdaterIpc(controller: AppUpdaterController): void {
  ipcMain.handle(updaterChannels.getStatus, async () => controller.getStatus());

  ipcMain.handle(updaterChannels.checkForUpdates, async (_event, request: CheckForUpdatesRequest | undefined) =>
    controller.checkForUpdates(request)
  );

  ipcMain.handle(updaterChannels.quitAndInstall, async () => controller.quitAndInstall());
}
