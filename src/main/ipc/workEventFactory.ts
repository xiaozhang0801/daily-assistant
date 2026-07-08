import { randomUUID } from "node:crypto";
import type { CaptureRecord, WorkEvent, WorkEventDraft } from "../../shared/types";

interface CreateWorkEventOptions {
  intervalMs: number;
  idFactory?: () => string;
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function normalizeWorkEventDraft(draft: WorkEventDraft): WorkEventDraft {
  return {
    title: draft.title.trim() || "未命名活动",
    summary: draft.summary.trim() || "AI 未返回摘要。",
    category: draft.category.trim() || "未分类",
    confidence: clampConfidence(draft.confidence)
  };
}

function intervalStart(capturedAt: string, intervalMs: number): string {
  const endTime = new Date(capturedAt).getTime();
  const safeIntervalMs = Number.isFinite(intervalMs) ? Math.max(0, intervalMs) : 0;
  return new Date(endTime - safeIntervalMs).toISOString();
}

export function createWorkEventFromCapture(
  record: CaptureRecord,
  draft: WorkEventDraft,
  options: CreateWorkEventOptions
): WorkEvent {
  const normalized = normalizeWorkEventDraft(draft);
  const idFactory = options.idFactory ?? randomUUID;

  return {
    id: idFactory(),
    captureId: record.id,
    startedAt: intervalStart(record.capturedAt, options.intervalMs),
    endedAt: record.capturedAt,
    title: normalized.title,
    summary: normalized.summary,
    category: normalized.category,
    confidence: normalized.confidence,
    source: "ai"
  };
}

export function normalizePointInTimeEvent(event: WorkEvent, intervalMs: number): WorkEvent {
  if (event.startedAt !== event.endedAt) {
    return event;
  }

  return {
    ...event,
    startedAt: intervalStart(event.endedAt, intervalMs)
  };
}
