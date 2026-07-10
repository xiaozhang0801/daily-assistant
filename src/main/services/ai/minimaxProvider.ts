import type { AIProviderProfile, ProviderStatus } from "../../../shared/types";
import type { AIProvider, DailyReportInput, ScreenshotAnalysisInput } from "./provider";
import { parseWorkEventResponse } from "./workEventResponseParser";

export const minimaxDefaultBaseUrl = "https://api.minimaxi.com/anthropic";
const anthropicVersion = "2023-06-01";

type FetchLike = typeof fetch;

interface AnthropicMessageResponse {
  content: Array<{
    type: string;
    text?: string;
  }>;
}

interface AnthropicMessageRequest {
  model: string;
  messages: unknown[];
  max_tokens?: number;
}

function messagesEndpoint(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/v1/messages`;
}

function connectionStatusFromHttpStatus(status: number): ProviderStatus {
  if (status === 401 || status === 403) {
    return { ok: false, message: "API Key 无效或无权限。" };
  }

  if (status === 404) {
    return { ok: false, message: "接口地址或模型不存在。" };
  }

  if (status === 429) {
    return { ok: false, message: "请求过于频繁或额度受限。" };
  }

  return { ok: false, message: `连接失败：接口返回 HTTP ${status}。` };
}

function extractText(payload: AnthropicMessageResponse): string {
  return payload.content
    .filter((item) => item.type === "text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("");
}

export function createMiniMaxProvider(
  profile: AIProviderProfile,
  apiKey: string,
  fetchImpl: FetchLike = fetch
): AIProvider {
  const resolvedProfile: AIProviderProfile = {
    ...profile,
    type: "minimax",
    baseUrl: minimaxDefaultBaseUrl
  };

  const endpoint = messagesEndpoint(minimaxDefaultBaseUrl);

  async function requestMessages(body: AnthropicMessageRequest): Promise<Response> {
    return fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": anthropicVersion,
        "x-api-key": apiKey,
        ...resolvedProfile.customHeaders
      },
      body: JSON.stringify(body)
    });
  }

  async function post(messages: unknown[]): Promise<AnthropicMessageResponse> {
    const response = await requestMessages({
      model: resolvedProfile.modelName,
      messages
    });

    if (!response.ok) {
      throw new Error(`AI provider request failed: ${response.status}`);
    }

    return response.json() as Promise<AnthropicMessageResponse>;
  }

  return {
    profile: resolvedProfile,
    async analyzeScreenshot(input: ScreenshotAnalysisInput) {
      const payload = await post([
        {
          role: "user",
          content: [
            { type: "text", text: input.prompt },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: input.mimeType,
                data: input.imageBase64
              }
            }
          ]
        }
      ]);

      return parseWorkEventResponse(extractText(payload));
    },
    async generateDailyReport(input: DailyReportInput) {
      const payload = await post([
        {
          role: "user",
          content: `${input.prompt}\n\nUser instruction: ${input.userInstruction}\n\nEvents:\n${JSON.stringify(input.events)}`
        }
      ]);

      return extractText(payload);
    },
    async checkConnection() {
      try {
        const response = await requestMessages({
          model: resolvedProfile.modelName,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1
        });

        if (!response.ok) {
          return connectionStatusFromHttpStatus(response.status);
        }

        return { ok: true, message: "连接成功。" };
      } catch {
        return { ok: false, message: "连接失败：网络不可用或接口无法访问。" };
      }
    }
  };
}
