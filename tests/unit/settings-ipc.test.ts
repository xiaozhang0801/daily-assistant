import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppRepositories } from "../../src/main/services/storage/repositories";
import { settingsChannels } from "../../src/shared/types/ipc";

const handlers = new Map<string, (...args: unknown[]) => unknown>();
const checkConnection = vi.fn(async () => ({ ok: true, message: "连接成功。" }));
const createMiniMaxProvider = vi.fn(() => ({
  checkConnection
}));

vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(channel, handler);
    })
  }
}));

vi.mock("../../src/main/services/ai/minimaxProvider", () => ({
  createMiniMaxProvider
}));

vi.mock("../../src/main/services/ai/openaiCompatibleProvider", () => ({
  createOpenAICompatibleProvider: vi.fn(() => ({
    checkConnection
  }))
}));

function createRepositoryStub(): AppRepositories {
  return {
    settings: {
      get: vi.fn(() => null),
      set: vi.fn()
    },
    aiProviders: {
      save: vi.fn(),
      listEnabled: vi.fn(() => [])
    },
    promptTemplates: {
      save: vi.fn(),
      listByPurpose: vi.fn(() => [])
    }
  } as unknown as AppRepositories;
}

describe("settings IPC", () => {
  beforeEach(() => {
    handlers.clear();
    checkConnection.mockClear();
    createMiniMaxProvider.mockClear();
  });

  it("tests the current form settings without saving them", async () => {
    const repositories = createRepositoryStub();
    const { registerSettingsIpc } = await import("../../src/main/ipc/settingsIpc");
    registerSettingsIpc(repositories);

    const handler = handlers.get(settingsChannels.testAIProvider);
    if (!handler) throw new Error("settings test handler was not registered");

    const result = await handler(
      {},
      {
        providerType: "minimax",
        baseUrl: "",
        apiKey: "unsaved-key",
        modelName: "MiniMax-M3",
        customHeaders: {},
        customHeadersText: "",
        screenshotPrompt: "截图提示词",
        dailyReportPrompt: "日报提示词",
        uploadToAIEnabled: true,
        captureIntervalMinutes: 5,
        gitSearchRoot: ""
      }
    );

    expect(result).toEqual({ ok: true, message: "连接成功。" });
    expect(createMiniMaxProvider).toHaveBeenCalledWith(expect.objectContaining({ modelName: "MiniMax-M3" }), "unsaved-key");
    expect(repositories.settings.set).not.toHaveBeenCalled();
    expect(repositories.aiProviders.save).not.toHaveBeenCalled();
    expect(repositories.promptTemplates.save).not.toHaveBeenCalled();
  });
});
