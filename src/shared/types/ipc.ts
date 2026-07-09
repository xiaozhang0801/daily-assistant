export const dashboardChannels = {
  getToday: "dashboard:getToday",
  pauseCapture: "dashboard:pauseCapture",
  resumeCapture: "dashboard:resumeCapture",
  generateReport: "dashboard:generateReport",
  saveReport: "dashboard:saveReport",
  generateWeeklyReport: "dashboard:generateWeeklyReport",
  saveWeeklyReport: "dashboard:saveWeeklyReport",
  getHistory: "dashboard:getHistory"
} as const;

export const settingsChannels = {
  get: "settings:get",
  save: "settings:save",
  testAIProvider: "settings:testAIProvider"
} as const;

export const updaterChannels = {
  getStatus: "updater:getStatus",
  checkForUpdates: "updater:checkForUpdates",
  quitAndInstall: "updater:quitAndInstall",
  status: "updater:status"
} as const;
