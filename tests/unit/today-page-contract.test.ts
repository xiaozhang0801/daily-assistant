import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("today page transient message contract", () => {
  it("schedules operation and report messages to disappear automatically", () => {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
    const source = readFileSync(resolve(root, "src/renderer/pages/TodayPage.vue"), "utf8");

    expect(source).toContain("todayTransientMessageDurationMs");
    expect(source).toContain("let messageDismissTimer");
    expect(source).toContain("function scheduleTodayMessageDismiss");
    expect(source).toContain("window.clearTimeout(messageDismissTimer)");
    expect(source).toContain("operationMessage.value = \"\"");
    expect(source).toContain("reportStatusMessage.value = \"\"");
    expect(source).toContain("reportErrorMessage.value = \"\"");
  });
});
