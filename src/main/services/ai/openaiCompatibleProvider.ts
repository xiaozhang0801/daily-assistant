import type { AIProviderProfile, ProviderStatus, WorkEventDraft } from "../../../shared/types";
import type { AIProvider, DailyReportInput, ScreenshotAnalysisInput } from "./provider";

type FetchLike = typeof fetch;

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface ChatCompletionRequest {
  model: string;
  messages: unknown[];
  max_tokens?: number;
  stream?: boolean;
}

function parseWorkEvent(content: string): WorkEventDraft {
  const parsed = JSON.parse(content) as Partial<WorkEventDraft>;

  return {
    title: String(parsed.title),
    summary: String(parsed.summary),
    category: String(parsed.category),
    confidence: Number(parsed.confidence)
  };
}

function chatEndpoint(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/chat/completions`;
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

export function createOpenAICompatibleProvider(
  profile: AIProviderProfile,
  apiKey: string,
  fetchImpl: FetchLike = fetch
): AIProvider {
  if (!profile.baseUrl) {
    throw new Error("OpenAI-compatible provider requires baseUrl.");
  }

  const endpoint = chatEndpoint(profile.baseUrl);

  async function requestChat(body: ChatCompletionRequest): Promise<Response> {
    return fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...profile.customHeaders
      },
      body: JSON.stringify(body)
    });
  }

  async function post(messages: unknown[]): Promise<ChatCompletionResponse> {
    const response = await requestChat({
      model: profile.modelName,
      messages
    });

    if (!response.ok) {
      throw new Error(`AI provider request failed: ${response.status}`);
    }

    return response.json() as Promise<ChatCompletionResponse>;
  }

  return {
    profile,
    async analyzeScreenshot(input: ScreenshotAnalysisInput) {
      const payload = await post([
        {
          role: "user",
          content: [
            { type: "text", text: input.prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${input.mimeType};base64,${input.imageBase64}`
              }
            }
          ]
        }
      ]);

      return parseWorkEvent(payload.choices[0].message.content);
    },
    async generateDailyReport(input: DailyReportInput) {
      const payload = await post([
        {
          role: "user",
          content: `${input.prompt}\n\nUser instruction: ${input.userInstruction}\n\nEvents:\n${JSON.stringify(input.events)}`
        }
      ]);

      return payload.choices[0].message.content;
    },
    async checkConnection() {
      try {
        const response = await requestChat({
          model: profile.modelName,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1,
          stream: false
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
