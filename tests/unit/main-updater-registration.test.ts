import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("main updater registration", () => {
  it("registers the updater IPC controller from the main process", () => {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
    const source = readFileSync(resolve(root, "src/main/index.ts"), "utf8");

    expect(source).toContain("createAppUpdaterController");
    expect(source).toContain("registerUpdaterIpc");
    expect(source).toContain("isAppUpdateFeatureEnabled");
    expect(source).toContain("VITE_ENABLE_APP_UPDATE");
  });
});
