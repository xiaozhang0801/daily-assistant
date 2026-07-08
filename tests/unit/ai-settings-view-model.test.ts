import { describe, expect, it } from "vitest";
import { normalizeAIProviderSettings, toConnectionStatusMessage } from "../../src/renderer/pages/settingsViewModel";

describe("AI settings view model", () => {
  it("requires base URL for OpenAI-compatible providers but not MiniMax preset", () => {
    expect(
      normalizeAIProviderSettings({
        providerType: "minimax",
        baseUrl: "",
        apiKey: "key",
        modelName: "model"
      }).errors
    ).toHaveLength(0);

    expect(
      normalizeAIProviderSettings({
        providerType: "openai_compatible",
        baseUrl: "",
        apiKey: "key",
        modelName: "model"
      }).errors
    ).toContain("自定义兼容接口需要填写 Base URL");
  });

  it("shows a clear message when Electron bridge returns no connection status", () => {
    expect(toConnectionStatusMessage(undefined)).toBe("没有连接到 Electron 主进程，请在桌面应用窗口中测试连接");
  });
});
