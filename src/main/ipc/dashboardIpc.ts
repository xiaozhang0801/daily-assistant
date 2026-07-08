import { ipcMain } from "electron";
import { dashboardChannels } from "../../shared/types/ipc";
import { createDashboardState } from "./dashboardState";

export function registerDashboardIpc(dashboardState = createDashboardState()): void {
  ipcMain.handle(dashboardChannels.getToday, async () => dashboardState.getToday());

  ipcMain.handle(dashboardChannels.pauseCapture, async () => dashboardState.pauseCapture());
  ipcMain.handle(dashboardChannels.resumeCapture, async () => dashboardState.resumeCapture());
  ipcMain.handle(dashboardChannels.generateReport, async () => {
    const content = "# 今日日报\n\n- 暂无记录。";
    dashboardState.setReportDraft(content);
    return { content };
  });
}
