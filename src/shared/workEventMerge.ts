import type { WorkEvent } from "./types";

export interface MergeSimilarWorkEventsOptions {
  maxGapMs?: number;
}

const defaultMaxGapMs = 10 * 60_000;
const ignoredTerms = new Set(["继续", "进行", "处理", "工作", "的", "和", "与"]);

function timestamp(value: string): number {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .replace(/继续|进行/g, "");
}

function textTokens(value: string): Set<string> {
  const normalized = normalizeText(value);
  const tokens = new Set<string>();

  for (const term of ignoredTerms) {
    if (normalized === term) return tokens;
  }

  if (normalized.length <= 2) {
    if (normalized) tokens.add(normalized);
    return tokens;
  }

  for (let index = 0; index < normalized.length - 1; index += 1) {
    const token = normalized.slice(index, index + 2);
    if (!ignoredTerms.has(token)) {
      tokens.add(token);
    }
  }

  return tokens;
}

function tokenSimilarity(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) return 0;

  let shared = 0;
  for (const token of left) {
    if (right.has(token)) {
      shared += 1;
    }
  }

  return shared / Math.min(left.size, right.size);
}

function eventText(event: WorkEvent): string {
  return `${event.title} ${event.summary}`;
}

function areSimilarEvents(left: WorkEvent, right: WorkEvent, maxGapMs: number): boolean {
  const gapMs = timestamp(right.startedAt) - timestamp(left.endedAt);
  if (gapMs < 0 || gapMs > maxGapMs) return false;

  const leftCategory = left.category.trim();
  const rightCategory = right.category.trim();
  if (leftCategory && rightCategory && leftCategory !== rightCategory) return false;

  return tokenSimilarity(textTokens(eventText(left)), textTokens(eventText(right))) >= 0.42;
}

function uniqueSummary(left: string, right: string): string {
  const cleanLeft = left.trim();
  const cleanRight = right.trim();
  if (!cleanLeft) return cleanRight;
  if (!cleanRight) return cleanLeft;
  if (cleanLeft.includes(cleanRight)) return cleanLeft;
  if (cleanRight.includes(cleanLeft)) return cleanRight;
  return `${cleanLeft}；${cleanRight}`;
}

function mergeTwoEvents(left: WorkEvent, right: WorkEvent): WorkEvent {
  const leftCount = left.mergedEventCount ?? 1;
  const rightCount = right.mergedEventCount ?? 1;
  const mergedEventCount = leftCount + rightCount;
  const confidence = Math.round(((left.confidence * leftCount + right.confidence * rightCount) / mergedEventCount) * 100) / 100;

  return {
    ...left,
    endedAt: timestamp(right.endedAt) > timestamp(left.endedAt) ? right.endedAt : left.endedAt,
    summary: uniqueSummary(left.summary, right.summary),
    confidence,
    mergedEventCount
  };
}

export function mergeSimilarWorkEvents(
  events: WorkEvent[],
  options: MergeSimilarWorkEventsOptions = {}
): WorkEvent[] {
  const maxGapMs = options.maxGapMs ?? defaultMaxGapMs;
  const sortedEvents = [...events].sort((left, right) => timestamp(left.startedAt) - timestamp(right.startedAt));
  const mergedEvents: WorkEvent[] = [];

  for (const event of sortedEvents) {
    const previous = mergedEvents.at(-1);
    if (previous && areSimilarEvents(previous, event, maxGapMs)) {
      mergedEvents[mergedEvents.length - 1] = mergeTwoEvents(previous, event);
    } else {
      mergedEvents.push({ ...event });
    }
  }

  return mergedEvents;
}
