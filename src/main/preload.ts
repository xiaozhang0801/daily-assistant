import { contextBridge, ipcRenderer } from "electron";
import type { IpcRendererEvent } from "electron";
import type { AppUpdateStatus, CheckForUpdatesRequest, GenerateReportRequest } from "../shared/types";
import { dashboardChannels, settingsChannels, updaterChannels } from "../shared/types/ipc";

contextBridge.exposeInMainWorld("dailyAssistant", {
  dashboard: {
    getToday: () => ipcRenderer.invoke(dashboardChannels.getToday),
    pauseCapture: () => ipcRenderer.invoke(dashboardChannels.pauseCapture),
    resumeCapture: () => ipcRenderer.invoke(dashboardChannels.resumeCapture),
    generateReport: (request?: GenerateReportRequest) => ipcRenderer.invoke(dashboardChannels.generateReport, request),
    saveReport: (content: string) => ipcRenderer.invoke(dashboardChannels.saveReport, content),
    generateWeeklyReport: () => ipcRenderer.invoke(dashboardChannels.generateWeeklyReport),
    saveWeeklyReport: (content: string) => ipcRenderer.invoke(dashboardChannels.saveWeeklyReport, content),
    getHistory: (days?: number) => ipcRenderer.invoke(dashboardChannels.getHistory, days)
  },
  settings: {
    get: () => ipcRenderer.invoke(settingsChannels.get),
    save: (settings: unknown) => ipcRenderer.invoke(settingsChannels.save, settings),
    testAIProvider: (settings: unknown) => ipcRenderer.invoke(settingsChannels.testAIProvider, settings)
  },
  updater: {
    getStatus: () => ipcRenderer.invoke(updaterChannels.getStatus),
    checkForUpdates: (request?: CheckForUpdatesRequest) => ipcRenderer.invoke(updaterChannels.checkForUpdates, request),
    quitAndInstall: () => ipcRenderer.invoke(updaterChannels.quitAndInstall),
    onStatus: (listener: (status: AppUpdateStatus) => void) => {
      const handler = (_event: IpcRendererEvent, status: AppUpdateStatus) => listener(status);
      ipcRenderer.on(updaterChannels.status, handler);
      return () => ipcRenderer.removeListener(updaterChannels.status, handler);
    }
  }
});
