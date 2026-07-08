import { defaultDailyReportPrompt, defaultScreenshotPrompt } from "../../main/services/ai/prompts";
import type { AIProviderType } from "../../shared/types";

export interface AIProviderSettingsInput {
  providerType: AIProviderType;
  baseUrl: string;
  apiKey: string;
  modelName: string;
  customHeadersText?: string;
  screenshotPrompt?: string;
  dailyReportPrompt?: string;
  uploadToAIEnabled?: boolean;
  captureIntervalMinutes?: number;
}

export interface NormalizedAIProviderSettings {
  providerType: AIProviderType;
  baseUrl: string;
  apiKey: string;
  modelName: string;
  customHeaders: Record<string, string>;
  customHeadersText: string;
  screenshotPrompt: string;
  dailyReportPrompt: string;
  uploadToAIEnabled: boolean;
  captureIntervalMinutes: number;
}

function parseCustomHeaders(text: string, errors: string[]): Record<string, string> {
  const trimmed = text.trim();
  if (!trimmed) return {};

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      errors.push("自定义 Headers 必须是 JSON 对象");
      return {};
    }

    const headers = Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string");
    if (headers.length !== Object.keys(parsed).length) {
      errors.push("自定义 Headers 的值必须是字符串");
    }

    return Object.fromEntries(headers);
  } catch {
    errors.push("自定义 Headers 不是有效 JSON");
    return {};
  }
}

export function normalizeAIProviderSettings(input: AIProviderSettingsInput): {
  value: NormalizedAIProviderSettings;
  errors: string[];
} {
  const errors: string[] = [];
  const providerType = input.providerType;
  const baseUrl = input.baseUrl.trim();
  const apiKey = input.apiKey.trim();
  const modelName = input.modelName.trim();
  const customHeadersText = input.customHeadersText?.trim() ?? "";
  const screenshotPrompt = input.screenshotPrompt?.trim() || defaultScreenshotPrompt;
  const dailyReportPrompt = input.dailyReportPrompt?.trim() || defaultDailyReportPrompt;
  const captureIntervalMinutes = Math.max(1, Math.min(60, input.captureIntervalMinutes ?? 5));

  if (!apiKey) {
    errors.push("需要填写 API Key");
  }

  if (!modelName) {
    errors.push("需要填写模型名称");
  }

  if (providerType === "openai_compatible" && !baseUrl) {
    errors.push("自定义兼容接口需要填写 Base URL");
  }

  return {
    value: {
      providerType,
      baseUrl,
      apiKey,
      modelName,
      customHeaders: parseCustomHeaders(customHeadersText, errors),
      customHeadersText,
      screenshotPrompt,
      dailyReportPrompt,
      uploadToAIEnabled: Boolean(input.uploadToAIEnabled),
      captureIntervalMinutes
    },
    errors
  };
}
