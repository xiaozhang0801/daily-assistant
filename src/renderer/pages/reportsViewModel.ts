import type { WorkEvent } from "../../shared/types";

export const emptyDailyReport = "# 今日日报\n\n- 今日暂无记录。";

interface TodayReportInput {
  date: string;
  reportDraft: string;
  reportSaved: boolean;
  events: WorkEvent[];
}

interface ReportListItem {
  id: string;
  date: string;
  status: string;
  count: number;
}

interface TodayReportView {
  currentReport: string;
  reports: ReportListItem[];
}

export function buildTodayReportView(input: TodayReportInput): TodayReportView {
  const content = input.reportDraft.trim() ? input.reportDraft : emptyDailyReport;
  const hasGeneratedReport = input.reportDraft.trim().length > 0;

  return {
    currentReport: content,
    reports: [
      {
        id: "today",
        date: input.date,
        status: hasGeneratedReport && input.reportSaved ? "已保存" : "草稿",
        count: input.events.length
      }
    ]
  };
}

export function toDesktopBridgeUnavailableMessage(action: string): string {
  return `没有连接到 Electron 主进程，无法${action}。`;
}

export function toMarkdownExportUnavailableMessage(): string {
  return "导出 Markdown 还没有接入文件保存功能，请先使用复制。";
}
