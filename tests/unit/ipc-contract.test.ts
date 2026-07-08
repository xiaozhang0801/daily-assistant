import { describe, expect, it } from "vitest";
import { dashboardChannels, settingsChannels } from "../../src/shared/types/ipc";

describe("IPC contract", () => {
  it("uses namespaced channel names", () => {
    expect(dashboardChannels.getToday).toBe("dashboard:getToday");
    expect(dashboardChannels.generateReport).toBe("dashboard:generateReport");
    expect(settingsChannels.get).toBe("settings:get");
    expect(settingsChannels.save).toBe("settings:save");
  });
});
