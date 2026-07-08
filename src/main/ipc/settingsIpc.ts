import { ipcMain } from "electron";
import { settingsChannels } from "../../shared/types/ipc";

export function registerSettingsIpc(): void {
  ipcMain.handle(settingsChannels.get, async () => ({
    providerType: "minimax",
    baseUrl: "",
    modelName: "",
    uploadToAIEnabled: false,
    captureIntervalMinutes: 5
  }));

  ipcMain.handle(settingsChannels.save, async (_event, settings: unknown) => ({ ok: true, settings }));
  ipcMain.handle(settingsChannels.testAIProvider, async () => ({ ok: false, message: "AI provider is not configured." }));
}
