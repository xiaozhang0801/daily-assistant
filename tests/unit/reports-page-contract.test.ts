import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("reports page loading contract", () => {
  it("loads today's report separately from history so history failures do not block today", () => {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
    const source = readFileSync(resolve(root, "src/renderer/pages/ReportsPage.vue"), "utf8");

    expect(source).toContain("await dashboard.getToday()");
    expect(source).toContain("await dashboard.getHistory(currentNaturalWeekDayCount())");
    expect(source).toContain("toReportHistoryLoadErrorMessage");
    expect(source).not.toContain("Promise.all([dashboard.getToday(), dashboard.getHistory");
  });
});
