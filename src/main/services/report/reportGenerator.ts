import type { WorkEvent } from "../../../shared/types";

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
