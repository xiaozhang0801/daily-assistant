import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("preload updater contract", () => {
  it("exposes updater methods through the dailyAssistant bridge", () => {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
    const source = readFileSync(resolve(root, "src/main/preload.ts"), "utf8");

    expect(source).toContain("updaterChannels");
    expect(source).toContain("updater:");
    expect(source).toContain("getStatus");
    expect(source).toContain("checkForUpdates");
    expect(source).toContain("quitAndInstall");
    expect(source).toContain("onStatus");
    expect(source).toContain("removeListener");
  });
});
