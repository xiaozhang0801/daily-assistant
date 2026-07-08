import { ipcMain } from "electron";
import { dashboardChannels } from "../../shared/types/ipc";

export function registerDashboardIpc(): void {
  ipcMain.handle(dashboardChannels.getToday, async () => ({
    recording: false,
    capturedDurationMinutes: 0,
    analyzedEventCount: 0,
    providerStatus: "not_configured",
    events: [],
    reportDraft: ""
  }));

  ipcMain.handle(dashboardChannels.pauseCapture, async () => ({ ok: true }));
  ipcMain.handle(dashboardChannels.resumeCapture, async () => ({ ok: true }));
  ipcMain.handle(dashboardChannels.generateReport, async () => ({ content: "# 今日日报\n\n- 暂无记录。" }));
}
