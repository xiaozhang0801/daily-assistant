import type { DailyHistoryDay } from "../../shared/types";
import type { AppRepositories } from "../services/storage/repositories";
import { calculateRecordingDurationMinutes } from "./recordingDuration";

interface DashboardHistoryOptions {
  repositories: AppRepositories;
  now?: () => Date;
  days?: number;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function recentDateKey(today: Date, offsetDays: number): string {
  const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - offsetDays));
  return dateKey(date);
}

export function buildDashboardHistory(options: DashboardHistoryOptions): DailyHistoryDay[] {
  const now = options.now ?? (() => new Date());
  const today = now();
  const days = Math.max(1, options.days ?? 7);

  return Array.from({ length: days }, (_, index) => {
    const date = recentDateKey(today, index);
    const sessions = options.repositories.recordingSessions.listByDate(date);
    const captures = options.repositories.captures.listByDate(date);
    const events = options.repositories.workEvents.listByDate(date);
    const report = options.repositories.reports.getByDateAndType(date, "daily");
    const durationMinutes =
      sessions.length > 0 ? calculateRecordingDurationMinutes(sessions, date, today) : captures.length;

    return {
      date,
      duration: `${durationMinutes}m`,
      events: events.length,
      report: report ? "已生成" : durationMinutes > 0 || captures.length > 0 || events.length > 0 ? "草稿" : "未生成",
      reportContent: report?.content ?? null
    };
  });
}
