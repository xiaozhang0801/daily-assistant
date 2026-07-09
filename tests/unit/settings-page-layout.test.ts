import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@vue/compiler-sfc";
import { describe, expect, it } from "vitest";

describe("Settings page layout", () => {
  it("renders connection feedback before the long settings grid", () => {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
    const source = readFileSync(resolve(root, "src/renderer/pages/SettingsPage.vue"), "utf8");
    const template = parse(source).descriptor.template?.content ?? "";

    const feedbackIndex = template.indexOf("feedback-panel");
    const settingsGridIndex = template.indexOf("settings-grid");

    expect(feedbackIndex).toBeGreaterThanOrEqual(0);
    expect(settingsGridIndex).toBeGreaterThanOrEqual(0);
    expect(feedbackIndex).toBeLessThan(settingsGridIndex);
  });
});
