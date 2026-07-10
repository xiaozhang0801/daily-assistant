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
  captureIntervalMinutes: number;
  gitSearchRoot: string;
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
  captureIntervalMinutes: 5,
  gitSearchRoot: ""
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
    captureIntervalMinutes: Math.max(1, Math.min(60, numberValue(value.captureIntervalMinutes))),
    gitSearchRoot: stringValue(value.gitSearchRoot).trim()
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
    captureIntervalMinutes: Number(repositories.settings.get("capture.intervalMinutes") ?? "5"),
    gitSearchRoot: repositories.settings.get("git.searchRoot") ?? ""
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
  const normalizedSettings =
    settings.providerType === "minimax"
      ? {
          ...settings,
          baseUrl: ""
        }
      : settings;

  memorySettings = normalizedSettings;
  if (!repositories) return;

  repositories.settings.set("ai.providerType", normalizedSettings.providerType);
  repositories.settings.set("ai.baseUrl", normalizedSettings.baseUrl);
  repositories.settings.set("ai.apiKey", normalizedSettings.apiKey);
  repositories.settings.set("ai.modelName", normalizedSettings.modelName);
  repositories.settings.set("ai.customHeaders", JSON.stringify(normalizedSettings.customHeaders));
  repositories.settings.set("ai.customHeadersText", normalizedSettings.customHeadersText);
  repositories.settings.set("prompt.screenshot", normalizedSettings.screenshotPrompt);
  repositories.settings.set("prompt.dailyReport", normalizedSettings.dailyReportPrompt);
  repositories.settings.set("capture.intervalMinutes", String(normalizedSettings.captureIntervalMinutes));
  repositories.settings.set("git.searchRoot", normalizedSettings.gitSearchRoot);
  repositories.aiProviders.save(toProviderProfile(normalizedSettings));
  repositories.promptTemplates.save({
    id: "default-screenshot-analysis",
    name: "截图分析",
    purpose: "screenshot_analysis",
    content: normalizedSettings.screenshotPrompt,
    isDefault: true
  });
  repositories.promptTemplates.save({
    id: "default-daily-report",
    name: "日报生成",
    purpose: "daily_report",
    content: normalizedSettings.dailyReportPrompt,
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
