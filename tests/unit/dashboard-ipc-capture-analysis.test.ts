import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppRepositories } from "../../src/main/services/storage/repositories";
import type { AIProviderProfile, CaptureRecord } from "../../src/shared/types";
import { dashboardChannels } from "../../src/shared/types/ipc";

const handlers = new Map<string, (...args: unknown[]) => unknown>();
const captureRecord: CaptureRecord = {
  id: "capture-1",
  capturedAt: "2026-07-08T09:00:00.000Z",
  imagePath: "C:/tmp/capture-1.png",
  activeApp: null,
  windowTitle: null,
  status: "captured",
  skipReason: null
};

const captureScreenshot = vi.fn(async () => captureRecord);
const analysisMocks = vi.hoisted(() => ({
  analyzeScreenshot: vi.fn(async () => ({
    title: "继续分析截图",
    summary: "旧上传开关关闭时仍继续进行 AI 分析。",
    category: "开发",
    confidence: 0.82
  })),
  readFile: vi.fn(async () => Buffer.from("png-bytes")),
  unlink: vi.fn(async () => undefined)
}));

vi.mock("node:fs/promises", () => ({
  readFile: analysisMocks.readFile,
  unlink: analysisMocks.unlink
}));

vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(channel, handler);
    })
  },
  desktopCapturer: {
    getSources: vi.fn()
  },
  nativeImage: {
    createFromBitmap: vi.fn()
  }
}));

vi.mock("../../src/main/services/capture/screenshotCapture", () => ({
  captureScreenshot
}));

vi.mock("../../src/main/services/capture/captureScheduler", () => ({
  createCaptureScheduler: vi.fn(() => ({
    start: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
    getState: vi.fn(() => ({ running: true, paused: false }))
  }))
}));

vi.mock("../../src/main/services/ai/providerRegistry", () => ({
  createProviderRegistry: vi.fn(() => ({
    create: vi.fn(() => ({
      analyzeScreenshot: analysisMocks.analyzeScreenshot
    }))
  }))
}));

function createRepositoryStub(options: {
  uploadToAIEnabled?: boolean;
  providers?: AIProviderProfile[];
  apiKey?: string;
}): AppRepositories {
  const settings = new Map<string, string>([
    ["capture.uploadToAIEnabled", options.uploadToAIEnabled === false ? "false" : "true"],
    ["capture.intervalMinutes", "5"],
    ["ai.apiKey", options.apiKey ?? "test-key"]
  ]);

  return {
    captures: {
      save: vi.fn(),
      listByDate: vi.fn(() => [])
    },
    recordingSessions: {
      save: vi.fn(),
      end: vi.fn(),
      listByDate: vi.fn(() => [])
    },
    workEvents: {
      save: vi.fn(),
      listByDate: vi.fn(() => [])
    },
    reports: {
      save: vi.fn(),
      getByDate: vi.fn(() => null)
    },
    aiProviders: {
      save: vi.fn(),
      listEnabled: vi.fn(() => options.providers ?? [])
    },
    promptTemplates: {
      save: vi.fn(),
      listByPurpose: vi.fn(() => [])
    },
    settings: {
      set: vi.fn(),
      get: vi.fn((key: string) => settings.get(key) ?? null)
    }
  } as unknown as AppRepositories;
}

function provider(modelName = "MiniMax-M3"): AIProviderProfile {
  return {
    id: "primary",
    name: "OpenAI Compatible",
    type: "openai_compatible",
    baseUrl: "https://api.example.com/v1",
    apiKeyRef: "settings:ai.apiKey",
    modelName,
    customHeaders: {},
    enabled: true
  };
}

async function resumeDefaultController(repositories: AppRepositories): Promise<void> {
  const { registerDashboardIpc } = await import("../../src/main/ipc/dashboardIpc");
  registerDashboardIpc({
    repositories,
    screenshotsDirectory: "C:/tmp/daily-captures"
  });

  const handler = handlers.get(dashboardChannels.resumeCapture);
  if (!handler) throw new Error("dashboard resume handler was not registered");
  await handler({});
}

describe("dashboard IPC capture analysis feedback", () => {
  beforeEach(() => {
    handlers.clear();
    captureScreenshot.mockClear();
    analysisMocks.analyzeScreenshot.mockClear();
    analysisMocks.readFile.mockClear();
    analysisMocks.unlink.mockClear();
  });

  it("analyzes screenshots even when the legacy upload setting is false", async () => {
    const repositories = createRepositoryStub({ uploadToAIEnabled: false, providers: [provider()] });

    await resumeDefaultController(repositories);

    expect(analysisMocks.analyzeScreenshot).toHaveBeenCalledWith(
      expect.objectContaining({
        imageBase64: Buffer.from("png-bytes").toString("base64"),
        mimeType: "image/png"
      })
    );
    expect(repositories.workEvents.save).toHaveBeenCalledWith(
      expect.objectContaining({
        captureId: captureRecord.id,
        title: "继续分析截图",
        summary: "旧上传开关关闭时仍继续进行 AI 分析。",
        category: "开发",
        confidence: 0.82,
        source: "ai"
      })
    );
    expect(repositories.captures.save).toHaveBeenCalledTimes(1);
    expect(analysisMocks.unlink).toHaveBeenCalledWith(captureRecord.imagePath);
  });

  it.each([
    {
      name: "AI provider is missing",
      repositories: createRepositoryStub({ providers: [] }),
      reason: "AI 提供方未保存"
    },
    {
      name: "API Key is missing",
      repositories: createRepositoryStub({ providers: [provider()], apiKey: "" }),
      reason: "API Key 未保存"
    },
    {
      name: "model name is missing",
      repositories: createRepositoryStub({ providers: [provider("")] }),
      reason: "模型名称未保存"
    }
  ])("marks the capture as skipped when $name", async ({ repositories, reason }) => {
    await resumeDefaultController(repositories);

    expect(repositories.captures.save).toHaveBeenLastCalledWith({
      ...captureRecord,
      status: "skipped",
      skipReason: reason
    });
    expect(repositories.workEvents.save).not.toHaveBeenCalled();
  });
});
