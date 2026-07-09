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

  it("explains that the Git search root can be a parent folder or a project folder", () => {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
    const source = readFileSync(resolve(root, "src/renderer/pages/SettingsPage.vue"), "utf8");
    const template = parse(source).descriptor.template?.content ?? "";

    expect(template).toContain("可以填写总根目录，也可以填写具体项目目录");
    expect(template).toContain("代码日报会在这个范围内搜索 Git 仓库");
  });
});
