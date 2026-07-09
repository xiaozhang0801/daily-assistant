import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { createAppUpdaterController, resolveElectronAutoUpdater } from "../../src/main/services/updater/appUpdater";
import type { AppUpdateStatus } from "../../src/shared/types";

function createUpdaterStub() {
  const emitter = new EventEmitter();
  const updater = {
    autoDownload: false,
    on: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
      emitter.on(event, listener);
      return updater;
    }),
    checkForUpdates: vi.fn(async () => undefined),
    quitAndInstall: vi.fn(),
    emit: (event: string, ...args: unknown[]) => emitter.emit(event, ...args)
  };

  return updater;
}

describe("app updater controller", () => {
  it("resolves autoUpdater from a CommonJS default namespace", () => {
    const updater = createUpdaterStub();

    expect(resolveElectronAutoUpdater({ default: { autoUpdater: updater } })).toBe(updater);
  });

  it("does not check updates when the feature is disabled", async () => {
    const updater = createUpdaterStub();
    const emitted: AppUpdateStatus[] = [];
    const controller = createAppUpdaterController({
      enabled: false,
      packaged: true,
      currentVersion: "0.1.1",
      updater,
      emitStatus: (status: AppUpdateStatus) => emitted.push(status)
    });

    const result = await controller.checkForUpdates({ automatic: true });

    expect(updater.checkForUpdates).not.toHaveBeenCalled();
    expect(result.phase).toBe("idle");
    expect(result.message).toContain("更新入口未启用");
    expect(emitted).toHaveLength(0);
  });

  it("runs the startup automatic check only once per process", async () => {
    const updater = createUpdaterStub();
    const controller = createAppUpdaterController({
      enabled: true,
      packaged: true,
      currentVersion: "0.1.1",
      updater,
      emitStatus: vi.fn()
    });

    await controller.checkForUpdates({ automatic: true });
    await controller.checkForUpdates({ automatic: true });

    expect(updater.checkForUpdates).toHaveBeenCalledTimes(1);
  });

  it("blocks update checks in development builds", async () => {
    const updater = createUpdaterStub();
    const controller = createAppUpdaterController({
      enabled: true,
      packaged: false,
      currentVersion: "0.1.1",
      updater,
      emitStatus: vi.fn()
    });

    const result = await controller.checkForUpdates();

    expect(updater.checkForUpdates).not.toHaveBeenCalled();
    expect(result.phase).toBe("error");
    expect(result.message).toContain("自动更新仅在打包后的应用中可用");
  });

  it("updates status from updater lifecycle events", async () => {
    const updater = createUpdaterStub();
    const emitted: AppUpdateStatus[] = [];
    const controller = createAppUpdaterController({
      enabled: true,
      packaged: true,
      currentVersion: "0.1.1",
      updater,
      emitStatus: (status: AppUpdateStatus) => emitted.push(status)
    });

    await controller.checkForUpdates();
    updater.emit("update-available", { version: "0.1.2" });
    updater.emit("download-progress", { percent: 42.4 });
    updater.emit("update-downloaded", { version: "0.1.2" });

    expect(emitted.map((status) => status.phase)).toEqual(["checking", "available", "downloading", "downloaded"]);
    expect(controller.getStatus()).toMatchObject({
      phase: "downloaded",
      currentVersion: "0.1.1",
      latestVersion: "0.1.2",
      percent: 100
    });
  });
});
