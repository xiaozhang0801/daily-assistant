import { contextBridge, ipcRenderer } from "electron";
import type { GenerateReportRequest } from "../shared/types";
import { dashboardChannels, settingsChannels } from "../shared/types/ipc";

contextBridge.exposeInMainWorld("dailyAssistant", {
  dashboard: {
    getToday: () => ipcRenderer.invoke(dashboardChannels.getToday),
    pauseCapture: () => ipcRenderer.invoke(dashboardChannels.pauseCapture),
    resumeCapture: () => ipcRenderer.invoke(dashboardChannels.resumeCapture),
    generateReport: (request?: GenerateReportRequest) => ipcRenderer.invoke(dashboardChannels.generateReport, request),
    saveReport: (content: string) => ipcRenderer.invoke(dashboardChannels.saveReport, content),
    getHistory: () => ipcRenderer.invoke(dashboardChannels.getHistory)
  },
  settings: {
    get: () => ipcRenderer.invoke(settingsChannels.get),
    save: (settings: unknown) => ipcRenderer.invoke(settingsChannels.save, settings),
    testAIProvider: (settings: unknown) => ipcRenderer.invoke(settingsChannels.testAIProvider, settings)
  }
});
