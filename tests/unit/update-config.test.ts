import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";
import { isAppUpdateFeatureEnabled } from "../../src/shared/types/updater";

describe("update config", () => {
  it("uses the requested release version", () => {
    expect(packageJson.version).toBe("0.1.4");
  });

  it("uses the fixed intranet generic publish URL", () => {
    expect(packageJson.build.publish).toEqual([
      {
        provider: "generic",
        url: "http://192.168.19.220/daily-assistant/releases/"
      }
    ]);
  });

  it("enables the update entry only for an explicit true value", () => {
    expect(isAppUpdateFeatureEnabled("true")).toBe(true);
    expect(isAppUpdateFeatureEnabled("false")).toBe(false);
    expect(isAppUpdateFeatureEnabled(undefined)).toBe(false);
  });

  it("uses domestic mirrors for Electron and electron-builder downloads during Windows packaging", () => {
    const script = packageJson.scripts["dist:win"];

    expect(script).toContain("ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/");
    expect(script).toContain("ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/");
  });
});
