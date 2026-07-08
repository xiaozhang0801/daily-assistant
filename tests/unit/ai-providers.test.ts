import { describe, expect, it, vi } from "vitest";
import { createOpenAICompatibleProvider } from "../../src/main/services/ai/openaiCompatibleProvider";
import { createProviderRegistry } from "../../src/main/services/ai/providerRegistry";
import {
  defaultDailyReportPrompt,
  defaultScreenshotPrompt,
  legacyDefaultDailyReportPrompt,
  legacyDefaultScreenshotPrompt,
  resolveDailyReportPrompt,
  resolveScreenshotPrompt
} from "../../src/main/services/ai/prompts";

describe("AI providers", () => {
  it("builds OpenAI-compatible screenshot analysis requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: "Implemented UI",
                summary: "Worked on the dashboard.",
                category: "development",
                confidence: 0.8
              })
            }
          }
        ]
      })
    });

    const provider = createOpenAICompatibleProvider(
      {
        id: "custom",
        name: "Custom",
        type: "openai_compatible",
        baseUrl: "https://example.test/v1",
        apiKeyRef: "secret",
        modelName: "vision-model",
        customHeaders: { "X-Test": "yes" },
        enabled: true
      },
      "api-key",
      fetchMock as typeof fetch
    );

    const result = await provider.analyzeScreenshot({
      imageBase64: "abc",
      mimeType: "image/png",
      prompt: defaultScreenshotPrompt
    });

    expect(result.title).toBe("Implemented UI");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.test/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer api-key",
          "X-Test": "yes"
        })
      })
    );
  });

  it("selects MiniMax as the default preset", () => {
    const registry = createProviderRegistry();
    expect(registry.defaultProviderType).toBe("minimax");
  });

  it("contains editable Chinese default prompt templates", () => {
    expect(defaultScreenshotPrompt).toContain("只返回 JSON");
    expect(defaultScreenshotPrompt).toContain("截图");
    expect(defaultDailyReportPrompt).toContain("中文日报");
    expect(defaultDailyReportPrompt).toContain("Markdown");
  });

  it("migrates saved legacy English defaults without overwriting custom prompts", () => {
    expect(resolveScreenshotPrompt(null)).toBe(defaultScreenshotPrompt);
    expect(resolveScreenshotPrompt(legacyDefaultScreenshotPrompt)).toBe(defaultScreenshotPrompt);
    expect(resolveScreenshotPrompt("自定义截图提示词")).toBe("自定义截图提示词");

    expect(resolveDailyReportPrompt(null)).toBe(defaultDailyReportPrompt);
    expect(resolveDailyReportPrompt(legacyDefaultDailyReportPrompt)).toBe(defaultDailyReportPrompt);
    expect(resolveDailyReportPrompt("自定义日报提示词")).toBe("自定义日报提示词");
  });
});
