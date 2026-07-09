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

  it("clears stale custom base URL values when MiniMax is selected", () => {
    const result = normalizeAIProviderSettings({
      providerType: "minimax",
      baseUrl: "  http://192.168.19.232:48760/v1  ",
      apiKey: "key",
      modelName: "model"
    });

    expect(result.value.baseUrl).toBe("");
  });

  it("shows a clear message when Electron bridge returns no connection status", () => {
    expect(toConnectionStatusMessage(undefined)).toBe("没有连接到 Electron 主进程，请在桌面应用窗口中测试连接");
  });

  it("explains that a successful connection test does not save changed settings", () => {
    expect(toConnectionStatusMessage({ ok: true, message: "连接成功。" }, { hasUnsavedChanges: true })).toBe(
      "连接成功。当前只是测试表单内容，还没有保存设置。请点击保存后再用于生成日报和截图分析。"
    );
  });

  it("normalizes the configured git search root for code reports", () => {
    const result = normalizeAIProviderSettings({
      providerType: "minimax",
      baseUrl: "",
      apiKey: "key",
      modelName: "model",
      gitSearchRoot: "  C:/project  "
    });

    expect(result.value.gitSearchRoot).toBe("C:/project");
  });

  it("keeps screenshot upload enabled because it is no longer user-adjustable", () => {
    const result = normalizeAIProviderSettings({
      providerType: "minimax",
      baseUrl: "",
      apiKey: "key",
      modelName: "model",
      uploadToAIEnabled: false
    });

    expect(result.value.uploadToAIEnabled).toBe(true);
  });
});
