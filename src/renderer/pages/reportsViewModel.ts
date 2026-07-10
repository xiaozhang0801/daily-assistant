import type { DailyHistoryDay, WorkEvent } from "../../shared/types";

export const emptyDailyReport = "# 今日日报\n\n- 今日暂无记录。";

interface TodayReportInput {
  date: string;
  reportDraft: string;
  reportSaved: boolean;
  events: WorkEvent[];
}

export interface ReportListItem {
  id: string;
  date: string;
  status: string;
  count: number;
  content: string;
  readOnly: boolean;
}

interface TodayReportView {
  currentReport: string;
  reports: ReportListItem[];
}

interface ReportLibraryInput extends TodayReportInput {
  history: DailyHistoryDay[];
}

export function buildReportLibraryView(input: ReportLibraryInput): TodayReportView {
  const content = input.reportDraft.trim() ? input.reportDraft : emptyDailyReport;
  const hasGeneratedReport = input.reportDraft.trim().length > 0;
  const historicalReports = input.history
    .filter((day) => day.date !== input.date && day.reportContent?.trim())
    .sort((left, right) => right.date.localeCompare(left.date))
    .map((day) => ({
      id: `daily-${day.date}`,
      date: day.date,
      status: "已保存",
      count: day.events,
      content: day.reportContent!.trim(),
      readOnly: true
    }));

  return {
    currentReport: content,
    reports: [
      {
        id: "today",
        date: input.date,
        status: hasGeneratedReport && input.reportSaved ? "已保存" : "草稿",
        count: input.events.length,
        content,
        readOnly: false
      },
      ...historicalReports
    ]
  };
}

export function buildTodayReportView(input: TodayReportInput): TodayReportView {
  return buildReportLibraryView({
    ...input,
    history: []
  });
}

export function resolveSelectedReportDate(
  selectedDate: string,
  reports: ReportListItem[],
  todayDate: string
): string {
  return reports.some((report) => report.date === selectedDate) ? selectedDate : todayDate;
}

export function currentNaturalWeekDayCount(date: Date = new Date()): number {
  return date.getDay() || 7;
}

export function toDesktopBridgeUnavailableMessage(action: string): string {
  return `没有连接到 Electron 主进程，无法${action}。`;
}

export function toReportHistoryLoadErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const reason = message.trim() ? `：${message.trim()}` : "，请稍后重试";
  return `历史日报读取失败${reason}。今日日报仍可查看和保存。`;
}

export function toMarkdownExportUnavailableMessage(): string {
  return "导出 Markdown 还没有接入文件保存功能，请先使用复制。";
}
