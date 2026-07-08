import { describe, expect, it } from "vitest";
import { createDashboardState } from "../../src/main/ipc/dashboardState";

describe("dashboard state", () => {
  it("keeps recording state after resuming so navigation can reload it", () => {
    const dashboard = createDashboardState();

    expect(dashboard.getToday().recording).toBe(false);

    const resumeResult = dashboard.resumeCapture();

    expect(resumeResult).toEqual({ ok: true, recording: true });
    expect(dashboard.getToday().recording).toBe(true);
  });

  it("keeps paused state after pausing so navigation can reload it", () => {
    const dashboard = createDashboardState({ recording: true });

    const pauseResult = dashboard.pauseCapture();

    expect(pauseResult).toEqual({ ok: true, recording: false });
    expect(dashboard.getToday().recording).toBe(false);
  });
});
