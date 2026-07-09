import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@vue/compiler-sfc";
import { describe, expect, it } from "vitest";

describe("app startup update check", () => {
  it("checks for updates once on startup when the update feature is enabled", () => {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
    const source = readFileSync(resolve(root, "src/renderer/App.vue"), "utf8");
    const script = parse(source).descriptor.scriptSetup?.content ?? "";

    expect(script).toContain("onMounted");
    expect(script).toContain("isAppUpdateFeatureEnabled");
    expect(script).toContain("VITE_ENABLE_APP_UPDATE");
    expect(script).toContain("checkForUpdates({ automatic: true })");
  });
});
