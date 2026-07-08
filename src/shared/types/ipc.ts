export const dashboardChannels = {
  getToday: "dashboard:getToday",
  pauseCapture: "dashboard:pauseCapture",
  resumeCapture: "dashboard:resumeCapture",
  generateReport: "dashboard:generateReport",
  saveReport: "dashboard:saveReport",
  getHistory: "dashboard:getHistory"
} as const;

export const settingsChannels = {
  get: "settings:get",
  save: "settings:save",
  testAIProvider: "settings:testAIProvider"
} as const;
