import { describe, expect, it } from "vitest";
import { normalizeAIProviderSettings } from "../../src/renderer/pages/settingsViewModel";

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
});
