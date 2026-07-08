import type { ReportGenerationMode } from "../../shared/types";

export interface ReportGenerationModeOption {
  id: ReportGenerationMode;
  label: string;
  title: string;
}

export const defaultReportGenerationMode: ReportGenerationMode = "mixed";

export const reportGenerationModeOptions: ReportGenerationModeOption[] = [
  { id: "work", label: "工作", title: "根据截图分析事件生成日报" },
  { id: "code", label: "代码", title: "根据本地 Git 仓库活动生成日报" },
  { id: "mixed", label: "混合", title: "结合工作事件和 Git 活动生成日报" }
];
