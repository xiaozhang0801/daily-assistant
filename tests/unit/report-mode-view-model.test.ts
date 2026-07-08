import { describe, expect, it } from "vitest";
import { defaultReportGenerationMode, reportGenerationModeOptions } from "../../src/renderer/pages/reportModeViewModel";

describe("report mode view model", () => {
  it("offers work, code, and mixed report generation modes with mixed as the default", () => {
    expect(defaultReportGenerationMode).toBe("mixed");
    expect(reportGenerationModeOptions).toEqual([
      { id: "work", label: "工作", title: "根据截图分析事件生成日报" },
      { id: "code", label: "代码", title: "根据本地 Git 仓库活动生成日报" },
      { id: "mixed", label: "混合", title: "结合工作事件和 Git 活动生成日报" }
    ]);
  });
});
