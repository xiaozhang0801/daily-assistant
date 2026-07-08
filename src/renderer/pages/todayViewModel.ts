import type { WorkEvent } from "../../shared/types";

export const todayRefreshIntervalMs = 2_000;

export function sortEventsNewestFirst(events: WorkEvent[]): WorkEvent[] {
  return [...events].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}
