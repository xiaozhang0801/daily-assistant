import type { WorkEvent } from "../../shared/types";

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
