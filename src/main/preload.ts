import { contextBridge, ipcRenderer } from "electron";
import { dashboardChannels, settingsChannels } from "../shared/types/ipc";

contextBridge.exposeInMainWorld("dailyAssistant", {
  dashboard: {
    getToday: () => ipcRenderer.invoke(dashboardChannels.getToday),
    pauseCapture: () => ipcRenderer.invoke(dashboardChannels.pauseCapture),
    resumeCapture: () => ipcRenderer.invoke(dashboardChannels.resumeCapture),
    generateReport: () => ipcRenderer.invoke(dashboardChannels.generateReport)
  },
  settings: {
    get: () => ipcRenderer.invoke(settingsChannels.get),
    save: (settings: unknown) => ipcRenderer.invoke(settingsChannels.save, settings),
    testAIProvider: (settings: unknown) => ipcRenderer.invoke(settingsChannels.testAIProvider, settings)
  }
});
