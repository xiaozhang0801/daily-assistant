import { describe, expect, it, vi } from "vitest";
import { createMiniMaxProvider } from "../../src/main/services/ai/minimaxProvider";
import { createOpenAICompatibleProvider } from "../../src/main/services/ai/openaiCompatibleProvider";

function successfulResponse(): Pick<Response, "ok" | "json" | "status"> {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: "pong" } }] })
  };
}

function successfulAnthropicResponse(text = "pong"): Pick<Response, "ok" | "json" | "status"> {
  return {
    ok: true,
    status: 200,
    json: async () => ({ content: [{ type: "text", text }] })
  };
}

function failedResponse(status: number): Pick<Response, "ok" | "json" | "status"> {
  return {
    ok: false,
    status,
    json: async () => ({ error: { message: "failed" } })
  };
}

describe("AI connection test", () => {
  it("posts a minimal chat completion request and reports success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(successfulResponse());
    const provider = createOpenAICompatibleProvider(
      {
        id: "custom",
        name: "Custom",
        type: "openai_compatible",
        baseUrl: "https://example.test/v1",
        apiKeyRef: "settings:ai.apiKey",
        modelName: "MiniMax-M3",
        customHeaders: {},
        enabled: true
      },
      "api-key",
      fetchMock as typeof fetch
    );

    await expect(provider.checkConnection()).resolves.toEqual({ ok: true, message: "连接成功。" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.test/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer api-key"
        }),
        body: JSON.stringify({
          model: "MiniMax-M3",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1,
          stream: false
        })
      })
    );
  });

  it.each([
    [401, "API Key 无效或无权限。"],
    [403, "API Key 无效或无权限。"],
    [404, "接口地址或模型不存在。"],
    [429, "请求过于频繁或额度受限。"]
  ])("maps HTTP %s to a clear Chinese message", async (status, message) => {
    const fetchMock = vi.fn().mockResolvedValue(failedResponse(status));
    const provider = createOpenAICompatibleProvider(
      {
        id: "custom",
        name: "Custom",
        type: "openai_compatible",
        baseUrl: "https://example.test/v1",
        apiKeyRef: "settings:ai.apiKey",
        modelName: "MiniMax-M3",
        customHeaders: {},
        enabled: true
      },
      "api-key",
      fetchMock as typeof fetch
    );

    await expect(provider.checkConnection()).resolves.toEqual({ ok: false, message });
  });

  it("reports network failures without leaking the API key", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED api-key"));
    const provider = createOpenAICompatibleProvider(
      {
        id: "custom",
        name: "Custom",
        type: "openai_compatible",
        baseUrl: "https://example.test/v1",
        apiKeyRef: "settings:ai.apiKey",
        modelName: "MiniMax-M3",
        customHeaders: {},
        enabled: true
      },
      "api-key",
      fetchMock as typeof fetch
    );

    const result = await provider.checkConnection();

    expect(result.ok).toBe(false);
    expect(result.message).toContain("连接失败");
    expect(result.message).not.toContain("api-key");
  });

  it("uses the MiniMax Anthropic-compatible messages endpoint by default", async () => {
    const fetchMock = vi.fn().mockResolvedValue(successfulAnthropicResponse());
    const provider = createMiniMaxProvider(
      {
        id: "minimax",
        name: "MiniMax",
        type: "minimax",
        baseUrl: null,
        apiKeyRef: "settings:ai.apiKey",
        modelName: "MiniMax-M3",
        customHeaders: {},
        enabled: true
      },
      "api-key",
      fetchMock as typeof fetch
    );

    await provider.checkConnection();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.minimaxi.com/anthropic/v1/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "anthropic-version": "2023-06-01",
          "x-api-key": "api-key"
        }),
        body: JSON.stringify({
          model: "MiniMax-M3",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1
        })
      })
    );
  });

  it("ignores stale custom base URL values for the MiniMax preset", async () => {
    const fetchMock = vi.fn().mockResolvedValue(successfulAnthropicResponse());
    const provider = createMiniMaxProvider(
      {
        id: "minimax",
        name: "MiniMax",
        type: "minimax",
        baseUrl: "http://192.168.19.232:48760/v1",
        apiKeyRef: "settings:ai.apiKey",
        modelName: "MiniMax-M3",
        customHeaders: {},
        enabled: true
      },
      "api-key",
      fetchMock as typeof fetch
    );

    await provider.checkConnection();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.minimaxi.com/anthropic/v1/messages",
      expect.any(Object)
    );
  });

  it("reads MiniMax Anthropic text responses for daily reports", async () => {
    const fetchMock = vi.fn().mockResolvedValue(successfulAnthropicResponse("日报内容"));
    const provider = createMiniMaxProvider(
      {
        id: "minimax",
        name: "MiniMax",
        type: "minimax",
        baseUrl: null,
        apiKeyRef: "settings:ai.apiKey",
        modelName: "MiniMax-M3",
        customHeaders: {},
        enabled: true
      },
      "api-key",
      fetchMock as typeof fetch
    );

    await expect(
      provider.generateDailyReport({
        events: [],
        prompt: "生成日报",
        userInstruction: "精简"
      })
    ).resolves.toBe("日报内容");
  });

  it("parses MiniMax screenshot analysis JSON wrapped in a markdown code fence", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      successfulAnthropicResponse(`\`\`\`json
{
  "title": "配置 API",
  "summary": "正在配置 MiniMax API 提供方。",
  "category": "开发配置",
  "confidence": 0.82
}
\`\`\``)
    );
    const provider = createMiniMaxProvider(
      {
        id: "minimax",
        name: "MiniMax",
        type: "minimax",
        baseUrl: null,
        apiKeyRef: "settings:ai.apiKey",
        modelName: "MiniMax-M3",
        customHeaders: {},
        enabled: true
      },
      "api-key",
      fetchMock as typeof fetch
    );

    await expect(
      provider.analyzeScreenshot({
        imageBase64: "iVBORw0KGgo=",
        mimeType: "image/png",
        prompt: "只返回 JSON"
      })
    ).resolves.toEqual({
      title: "配置 API",
      summary: "正在配置 MiniMax API 提供方。",
      category: "开发配置",
      confidence: 0.82
    });
  });
});
