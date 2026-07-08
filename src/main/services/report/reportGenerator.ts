import type { WorkEvent } from "../../../shared/types";
import type { DailyReport } from "../../../shared/types";
import { formatGitActivityMarkdown, type GitActivitySummary } from "../git/gitActivity";

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

export function buildDailyReportFallback(events: WorkEvent[]): string {
  const lines = ["# 今日日报", "", "## 今日工作总结", ""];

  if (events.length === 0) {
    lines.push("- 今日暂无可用工作记录。");
    return lines.join("\n");
  }

  for (const event of events) {
    lines.push(`- ${timeLabel(event.startedAt)}-${timeLabel(event.endedAt)} ${event.title}：${event.summary}`);
  }

  return lines.join("\n");
}

export function buildCodeReportFallback(codeActivity: GitActivitySummary): string {
  return ["# 今日日报", "", formatGitActivityMarkdown(codeActivity)].join("\n");
}

export function buildMixedReportFallback(events: WorkEvent[], codeActivity: GitActivitySummary): string {
  return `${buildDailyReportFallback(events)}\n\n${formatGitActivityMarkdown(codeActivity)}`;
}

export function buildWeeklyReportFallback(dailyReports: DailyReport[], startDate: string, endDate: string): string {
  const lines = ["# 本周周报", "", `## 周报总结（${startDate} - ${endDate}）`, ""];

  if (dailyReports.length === 0) {
    lines.push("- 本周暂无已保存日报，无法生成周报。");
    return lines.join("\n");
  }

  for (const report of dailyReports) {
    lines.push(`### ${report.date}`);
    lines.push(report.content.trim());
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
