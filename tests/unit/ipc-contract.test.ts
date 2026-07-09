import { describe, expect, it } from "vitest";
import { dashboardChannels, settingsChannels, updaterChannels } from "../../src/shared/types/ipc";

describe("IPC contract", () => {
  it("uses namespaced channel names", () => {
    expect(dashboardChannels.getToday).toBe("dashboard:getToday");
    expect(dashboardChannels.generateReport).toBe("dashboard:generateReport");
    expect(dashboardChannels.saveReport).toBe("dashboard:saveReport");
    expect(dashboardChannels.generateWeeklyReport).toBe("dashboard:generateWeeklyReport");
    expect(dashboardChannels.saveWeeklyReport).toBe("dashboard:saveWeeklyReport");
    expect(dashboardChannels.getHistory).toBe("dashboard:getHistory");
    expect(settingsChannels.get).toBe("settings:get");
    expect(settingsChannels.save).toBe("settings:save");
    expect(updaterChannels.getStatus).toBe("updater:getStatus");
    expect(updaterChannels.checkForUpdates).toBe("updater:checkForUpdates");
    expect(updaterChannels.quitAndInstall).toBe("updater:quitAndInstall");
    expect(updaterChannels.status).toBe("updater:status");
  });
});
