import { ipcMain } from "electron";
import { settingsChannels } from "../../shared/types/ipc";
import type { AIProviderProfile, AIProviderType } from "../../shared/types";
import { createMiniMaxProvider } from "../services/ai/minimaxProvider";
import { createOpenAICompatibleProvider } from "../services/ai/openaiCompatibleProvider";
import {
  defaultDailyReportPrompt,
  defaultScreenshotPrompt,
  resolveDailyReportPrompt,
  resolveScreenshotPrompt
} from "../services/ai/prompts";
import type { AppRepositories } from "../services/storage/repositories";

interface AISettingsPayload {
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

const defaultSettings: AISettingsPayload = {
  providerType: "minimax",
  baseUrl: "",
  apiKey: "",
  modelName: "",
  customHeaders: {},
  customHeadersText: "",
  screenshotPrompt: defaultScreenshotPrompt,
  dailyReportPrompt: defaultDailyReportPrompt,
  uploadToAIEnabled: false,
  captureIntervalMinutes: 5
};

let memorySettings = { ...defaultSettings };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isProviderType(value: unknown): value is AIProviderType {
  return value === "minimax" || value === "openai_compatible";
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function booleanValue(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function numberValue(value: unknown, fallback = 5): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toStringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
}

function parseStringRecordJson(value: string | null): Record<string, string> {
  if (!value) return {};

  try {
    return toStringRecord(JSON.parse(value));
  } catch {
    return {};
  }
}

function normalizePayload(value: unknown): AISettingsPayload {
  if (!isRecord(value)) return { ...defaultSettings };

  const customHeaders = toStringRecord(value.customHeaders);

  return {
    providerType: isProviderType(value.providerType) ? value.providerType : defaultSettings.providerType,
    baseUrl: stringValue(value.baseUrl),
    apiKey: stringValue(value.apiKey),
    modelName: stringValue(value.modelName),
    customHeaders,
    customHeadersText: stringValue(value.customHeadersText, JSON.stringify(customHeaders, null, 2)),
    screenshotPrompt: stringValue(value.screenshotPrompt, defaultScreenshotPrompt),
    dailyReportPrompt: stringValue(value.dailyReportPrompt, defaultDailyReportPrompt),
    uploadToAIEnabled: booleanValue(value.uploadToAIEnabled),
    captureIntervalMinutes: Math.max(1, Math.min(60, numberValue(value.captureIntervalMinutes)))
  };
}

function readSettings(repositories?: AppRepositories): AISettingsPayload {
  if (!repositories) return memorySettings;

  const storedProviderType = repositories.settings.get("ai.providerType");

  return {
    providerType: isProviderType(storedProviderType) ? storedProviderType : "minimax",
    baseUrl: repositories.settings.get("ai.baseUrl") ?? "",
    apiKey: repositories.settings.get("ai.apiKey") ?? "",
    modelName: repositories.settings.get("ai.modelName") ?? "",
    customHeaders: parseStringRecordJson(repositories.settings.get("ai.customHeaders")),
    customHeadersText: repositories.settings.get("ai.customHeadersText") ?? "",
    screenshotPrompt: resolveScreenshotPrompt(repositories.settings.get("prompt.screenshot")),
    dailyReportPrompt: resolveDailyReportPrompt(repositories.settings.get("prompt.dailyReport")),
    uploadToAIEnabled: repositories.settings.get("capture.uploadToAIEnabled") === "true",
    captureIntervalMinutes: Number(repositories.settings.get("capture.intervalMinutes") ?? "5")
  };
}

function toProviderProfile(settings: AISettingsPayload): AIProviderProfile {
  return {
    id: "primary",
    name: settings.providerType === "minimax" ? "MiniMax" : "OpenAI Compatible",
    type: settings.providerType,
    baseUrl: settings.baseUrl || null,
    apiKeyRef: "settings:ai.apiKey",
    modelName: settings.modelName,
    customHeaders: settings.customHeaders,
    enabled: true
  };
}

function saveSettings(repositories: AppRepositories | undefined, settings: AISettingsPayload): void {
  memorySettings = settings;
  if (!repositories) return;

  repositories.settings.set("ai.providerType", settings.providerType);
  repositories.settings.set("ai.baseUrl", settings.baseUrl);
  repositories.settings.set("ai.apiKey", settings.apiKey);
  repositories.settings.set("ai.modelName", settings.modelName);
  repositories.settings.set("ai.customHeaders", JSON.stringify(settings.customHeaders));
  repositories.settings.set("ai.customHeadersText", settings.customHeadersText);
  repositories.settings.set("prompt.screenshot", settings.screenshotPrompt);
  repositories.settings.set("prompt.dailyReport", settings.dailyReportPrompt);
  repositories.settings.set("capture.uploadToAIEnabled", String(settings.uploadToAIEnabled));
  repositories.settings.set("capture.intervalMinutes", String(settings.captureIntervalMinutes));
  repositories.aiProviders.save(toProviderProfile(settings));
  repositories.promptTemplates.save({
    id: "default-screenshot-analysis",
    name: "截图分析",
    purpose: "screenshot_analysis",
    content: settings.screenshotPrompt,
    isDefault: true
  });
  repositories.promptTemplates.save({
    id: "default-daily-report",
    name: "日报生成",
    purpose: "daily_report",
    content: settings.dailyReportPrompt,
    isDefault: true
  });
}

function validateConnectionSettings(settings: AISettingsPayload): string | null {
  if (!settings.apiKey) return "需要填写 API Key";
  if (!settings.modelName) return "需要填写模型名称";
  if (settings.providerType === "openai_compatible" && !settings.baseUrl) {
    return "自定义兼容接口需要填写 Base URL";
  }

  return null;
}

async function testAIConnection(settings: AISettingsPayload): Promise<{ ok: boolean; message: string }> {
  const profile = toProviderProfile(settings);
  const provider =
    settings.providerType === "minimax"
      ? createMiniMaxProvider(profile, settings.apiKey)
      : createOpenAICompatibleProvider(profile, settings.apiKey);

  return provider.checkConnection();
}

export function registerSettingsIpc(repositories?: AppRepositories): void {
  ipcMain.handle(settingsChannels.get, async () => readSettings(repositories));

  ipcMain.handle(settingsChannels.save, async (_event, settings: unknown) => {
    const normalized = normalizePayload(settings);
    saveSettings(repositories, normalized);
    return { ok: true, settings: normalized };
  });

  ipcMain.handle(settingsChannels.testAIProvider, async (_event, settings: unknown) => {
    const normalized = normalizePayload(settings);
    const validationMessage = validateConnectionSettings(normalized);
    if (validationMessage) {
      return { ok: false, message: validationMessage };
    }

    return testAIConnection(normalized);
  });
}
