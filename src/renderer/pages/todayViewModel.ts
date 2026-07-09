import type { DailyReportGenerationResult, WorkEvent } from "../../shared/types";

export const todayRefreshIntervalMs = 2_000;

export function sortEventsNewestFirst(events: WorkEvent[]): WorkEvent[] {
  return [...events].sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime());
}

export function summarizeEventCategories(events: WorkEvent[]): Array<{ label: string; count: number }> {
  const counts = new Map<string, { label: string; count: number; firstIndex: number }>();

  for (const [index, event] of events.entries()) {
    const label = event.category.trim() || "未分类";
    const existing = counts.get(label);
    counts.set(label, existing ? { ...existing, count: existing.count + 1 } : { label, count: 1, firstIndex: index });
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.firstIndex - b.firstIndex)
    .map(({ label, count }) => ({ label, count }));
}

export function toReportGenerationStatusMessage(result: DailyReportGenerationResult): string {
  if (result.notice) return result.notice;
  return result.source === "ai" ? "AI 日报已生成，记得保存。" : "已使用本地记录生成基础日报，记得保存。";
}

export function toResumeCaptureStatusMessage(providerStatus: string): string {
  if (providerStatus === "ready") {
    return "已继续记录，新的截图会按设置间隔采集。";
  }

  return "已继续记录，但 AI 设置还没有保存完整，截图不会自动分析。请到设置保存 API Key 和模型后再使用 AI 分析。";
}
