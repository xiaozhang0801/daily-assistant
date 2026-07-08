export type ReportType = "daily";
export type WorkEventSource = "ai" | "manual";

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
