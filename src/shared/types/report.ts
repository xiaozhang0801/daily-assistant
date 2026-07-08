export type ReportType = "daily" | "weekly";
export type WorkEventSource = "ai" | "manual";
export type ReportGenerationMode = "work" | "code" | "mixed";

export interface GenerateReportRequest {
  mode?: ReportGenerationMode;
}

export interface WorkEvent {
  id: string;
  captureId: string;
  startedAt: string;
  endedAt: string;
  title: string;
  summary: string;
  category: string;
  confidence: number;
  source: WorkEventSource;
  mergedEventCount?: number;
}

export interface DailyReport {
  id: string;
  date: string;
  type: ReportType;
  content: string;
  generatedAt: string;
  updatedAt: string;
  providerId: string;
  modelName: string;
}

export type DailyHistoryReportStatus = "已生成" | "草稿" | "未生成";

export interface DailyHistoryDay {
  date: string;
  duration: string;
  events: number;
  report: DailyHistoryReportStatus;
}

export interface WeeklyReportGenerationResult {
  content: string;
  weekKey: string;
  startDate: string;
  endDate: string;
  sourceReportCount: number;
}

export interface WeeklyReportSaveResult {
  ok: true;
  content: string;
  weekKey: string;
  startDate: string;
  endDate: string;
}
