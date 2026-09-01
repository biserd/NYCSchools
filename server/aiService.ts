import { env } from "cloudflare:workers";

export const AI_MODEL = "@cf/zai-org/glm-4.7-flash" as const;

export type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type StreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string | null;
    };
  }>;
  response?: string;
};

function getStreamContent(value: unknown): string {
  if (!value || typeof value !== "object") return "";

  const chunk = value as StreamChunk;
  const delta = chunk.choices?.[0]?.delta?.content;
  if (typeof delta === "string") return delta;

  return typeof chunk.response === "string" ? chunk.response : "";
}

function parseSseLine(line: string): string | undefined {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return undefined;

  const data = trimmed.slice(5).trim();
  if (!data || data === "[DONE]") return undefined;

  try {
    return getStreamContent(JSON.parse(data));
  } catch {
    console.warn(JSON.stringify({
      message: "Ignoring malformed Workers AI stream event",
      model: AI_MODEL,
    }));
    return undefined;
  }
}

export async function generateJson(
  messages: AiMessage[],
  maxCompletionTokens: number,
): Promise<string> {
  const result = await env.AI.run(AI_MODEL, {
    messages,
    response_format: { type: "json_object" },
    max_completion_tokens: maxCompletionTokens,
    reasoning_effort: "low",
    chat_template_kwargs: { enable_thinking: false },
    temperature: 0.2,
  });

  const content = result.choices[0]?.message?.content;
  if (!content) {
    throw new Error(`No response from Workers AI model ${AI_MODEL}`);
  }

  return content;
}

export async function* streamText(
  messages: AiMessage[],
  maxCompletionTokens: number,
): AsyncGenerator<string> {
  const stream = await env.AI.run(AI_MODEL, {
    messages,
    stream: true,
    max_completion_tokens: maxCompletionTokens,
    reasoning_effort: "low",
    chat_template_kwargs: { enable_thinking: false },
    temperature: 0.3,
  });

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      let newlineIndex = buffer.indexOf("\n");

      while (newlineIndex >= 0) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        const content = parseSseLine(line);
        if (content) yield content;

        newlineIndex = buffer.indexOf("\n");
      }
    }

    buffer += decoder.decode();
    if (buffer) {
      const content = parseSseLine(buffer);
      if (content) yield content;
    }
  } finally {
    reader.releaseLock();
  }
}
