import { jsonrepair } from "jsonrepair";
import type { WorkEventDraft } from "../../../shared/types";

export const invalidWorkEventResponseMessage =
  "截图 AI 返回内容格式异常，自动修复失败，请稍后重试。";

function addCandidate(candidates: string[], seen: Set<string>, value: string): void {
  const candidate = value.trim();
  if (!candidate || seen.has(candidate)) return;

  seen.add(candidate);
  candidates.push(candidate);
}

function extractObjectCandidates(content: string, candidates: string[], seen: Set<string>): void {
  for (let start = 0; start < content.length; start += 1) {
    if (content[start] !== "{") continue;

    let depth = 0;
    for (let end = start; end < content.length; end += 1) {
      if (content[end] === "{") depth += 1;
      if (content[end] === "}") depth -= 1;

      if (depth === 0) {
        addCandidate(candidates, seen, content.slice(start, end + 1));
        break;
      }
    }
  }
}

function extractJsonCandidates(content: string): string[] {
  const trimmed = content.trim();
  const candidates: string[] = [];
  const seen = new Set<string>();

  for (const match of trimmed.matchAll(/```json\s*([\s\S]*?)\s*```/gi)) {
    addCandidate(candidates, seen, match[1]);
  }

  for (const match of trimmed.matchAll(/```[ \t]*\r?\n([\s\S]*?)\s*```/g)) {
    addCandidate(candidates, seen, match[1]);
  }

  extractObjectCandidates(trimmed, candidates, seen);
  addCandidate(candidates, seen, trimmed);
  return candidates;
}

function parseJsonCandidate(candidate: string): unknown {
  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    return JSON.parse(jsonrepair(candidate)) as unknown;
  }
}

function recordValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Work event response is not an object.");
  }

  return value as Record<string, unknown>;
}

function requiredText(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Work event response contains an invalid text field.");
  }

  return value.trim();
}

function requiredConfidence(value: unknown): number {
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) {
    throw new Error("Work event response contains an invalid confidence.");
  }

  const confidence = Number(value);
  if (!Number.isFinite(confidence)) {
    throw new Error("Work event response contains an invalid confidence.");
  }

  return confidence;
}

function validateWorkEventDraft(value: unknown): WorkEventDraft {
  const record = recordValue(value);

  return {
    title: requiredText(record.title),
    summary: requiredText(record.summary),
    category: requiredText(record.category),
    confidence: requiredConfidence(record.confidence)
  };
}

export function parseWorkEventResponse(content: string): WorkEventDraft {
  for (const candidate of extractJsonCandidates(content)) {
    try {
      return validateWorkEventDraft(parseJsonCandidate(candidate));
    } catch {
      // Try the next candidate before reporting a format failure.
    }
  }

  throw new Error(invalidWorkEventResponseMessage);
}
