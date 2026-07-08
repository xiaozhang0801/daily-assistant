import type { AIProviderProfile, WorkEventDraft } from "../../../shared/types";
import type { AIProvider, DailyReportInput, ScreenshotAnalysisInput } from "./provider";

type FetchLike = typeof fetch;

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
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

export function createOpenAICompatibleProvider(
  profile: AIProviderProfile,
  apiKey: string,
  fetchImpl: FetchLike = fetch
): AIProvider {
  if (!profile.baseUrl) {
    throw new Error("OpenAI-compatible provider requires baseUrl.");
  }

  const endpoint = chatEndpoint(profile.baseUrl);

  async function post(messages: unknown[]): Promise<ChatCompletionResponse> {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...profile.customHeaders
      },
      body: JSON.stringify({
        model: profile.modelName,
        messages
      })
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
      return { ok: true, message: "Provider profile is configured." };
    }
  };
}
