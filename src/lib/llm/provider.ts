import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import { embedMany, generateText, streamText, type LanguageModel } from "ai";
import { getPresenceConfig } from "@/lib/config";

export type LlmProviderId = "openrouter" | "openai" | "none";

export interface ResolvedLlm {
  provider: Exclude<LlmProviderId, "none">;
  apiKey: string;
  baseURL?: string;
  chatModel: string;
  embeddingModel: string;
  headers?: Record<string, string>;
  siteUrl: string;
  siteTitle: string;
}

export interface LlmStatus {
  provider: LlmProviderId;
  chatModel: string | null;
  embeddingModel: string | null;
  configured: boolean;
}

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const DEFAULT_OPENAI_CHAT = "gpt-4o-mini";
const DEFAULT_OPENAI_EMBED = "text-embedding-3-small";
const DEFAULT_OPENROUTER_CHAT = "openai/gpt-4o-mini";
const DEFAULT_OPENROUTER_EMBED = "openai/text-embedding-3-small";

function siteMeta(): { siteUrl: string; siteTitle: string } {
  try {
    const config = getPresenceConfig();
    return {
      siteUrl: config.website || "http://localhost:3000",
      siteTitle: config.fullName || config.name || "Presence",
    };
  } catch {
    return { siteUrl: "http://localhost:3000", siteTitle: "Presence" };
  }
}

function configModels(): { chat?: string; embedding?: string } {
  try {
    const k = getPresenceConfig().knowledge;
    return { chat: k.chatModel, embedding: k.embeddingModel };
  } catch {
    return {};
  }
}

/** OpenRouter expects `vendor/model`; bare OpenAI ids get an openai/ prefix. */
export function normalizeModelId(
  provider: Exclude<LlmProviderId, "none">,
  model: string,
): string {
  if (provider === "openrouter" && model && !model.includes("/")) {
    return `openai/${model}`;
  }
  return model;
}

/**
 * Prefer OpenRouter when OPENROUTER_API_KEY is set; else OpenAI; else none.
 */
export function resolveLlm(): ResolvedLlm | null {
  const { siteUrl, siteTitle } = siteMeta();
  const fromConfig = configModels();

  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (openrouterKey) {
    const chatModel = normalizeModelId(
      "openrouter",
      process.env.OPENROUTER_MODEL?.trim() ||
        process.env.LLM_MODEL?.trim() ||
        fromConfig.chat ||
        DEFAULT_OPENROUTER_CHAT,
    );
    const embeddingModel = normalizeModelId(
      "openrouter",
      process.env.OPENROUTER_EMBEDDING_MODEL?.trim() ||
        process.env.LLM_EMBEDDING_MODEL?.trim() ||
        fromConfig.embedding ||
        DEFAULT_OPENROUTER_EMBED,
    );
    return {
      provider: "openrouter",
      apiKey: openrouterKey,
      baseURL: OPENROUTER_BASE,
      chatModel,
      embeddingModel,
      headers: {
        "HTTP-Referer": siteUrl,
        "X-Title": siteTitle,
      },
      siteUrl,
      siteTitle,
    };
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    const chatModel =
      process.env.LLM_MODEL?.trim() ||
      process.env.OPENAI_MODEL?.trim() ||
      fromConfig.chat ||
      DEFAULT_OPENAI_CHAT;
    const embeddingModel =
      process.env.LLM_EMBEDDING_MODEL?.trim() ||
      process.env.OPENAI_EMBEDDING_MODEL?.trim() ||
      fromConfig.embedding ||
      DEFAULT_OPENAI_EMBED;
    return {
      provider: "openai",
      apiKey: openaiKey,
      chatModel: chatModel.includes("/")
        ? chatModel.replace(/^openai\//, "")
        : chatModel,
      embeddingModel: embeddingModel.includes("/")
        ? embeddingModel.replace(/^openai\//, "")
        : embeddingModel,
      siteUrl,
      siteTitle,
    };
  }

  return null;
}

export function getLlmStatus(): LlmStatus {
  const resolved = resolveLlm();
  if (!resolved) {
    return {
      provider: "none",
      chatModel: null,
      embeddingModel: null,
      configured: false,
    };
  }
  return {
    provider: resolved.provider,
    chatModel: resolved.chatModel,
    embeddingModel: resolved.embeddingModel,
    configured: true,
  };
}

function createClient(resolved: ResolvedLlm): OpenAIProvider {
  return createOpenAI({
    apiKey: resolved.apiKey,
    baseURL: resolved.baseURL,
    headers: resolved.headers,
    name: resolved.provider,
  });
}

export function getChatModel(resolved?: ResolvedLlm | null): LanguageModel | null {
  const llm = resolved ?? resolveLlm();
  if (!llm) return null;
  const client = createClient(llm);
  return client(llm.chatModel);
}

export async function llmGenerateText(options: {
  system: string;
  prompt: string;
  temperature?: number;
}): Promise<{ text: string; provider: string; model: string } | null> {
  const llm = resolveLlm();
  const model = getChatModel(llm);
  if (!llm || !model) return null;

  const { text } = await generateText({
    model,
    system: options.system,
    prompt: options.prompt,
    temperature: options.temperature ?? 0.3,
  });

  return { text, provider: llm.provider, model: llm.chatModel };
}

/**
 * Stream chat tokens. Caller iterates `textStream` and may await `text` for the full string.
 */
export async function llmStreamText(options: {
  system: string;
  prompt: string;
  temperature?: number;
}): Promise<{
  textStream: AsyncIterable<string>;
  text: Promise<string>;
  provider: string;
  model: string;
} | null> {
  const llm = resolveLlm();
  const model = getChatModel(llm);
  if (!llm || !model) return null;

  const result = streamText({
    model,
    system: options.system,
    prompt: options.prompt,
    temperature: options.temperature ?? 0.3,
  });

  return {
    textStream: result.textStream,
    text: Promise.resolve(result.text),
    provider: llm.provider,
    model: llm.chatModel,
  };
}

/**
 * Embed texts via the configured provider. Returns null if unavailable or on failure.
 */
export async function llmEmbed(
  values: string[],
): Promise<{ embeddings: number[][]; provider: string; model: string } | null> {
  if (values.length === 0) return null;
  const llm = resolveLlm();
  if (!llm) return null;

  try {
    const client = createClient(llm);
    const { embeddings } = await embedMany({
      model: client.embedding(llm.embeddingModel),
      values,
    });
    return { embeddings, provider: llm.provider, model: llm.embeddingModel };
  } catch (err) {
    console.warn("llm embeddings failed; continuing without vectors", err);
    return null;
  }
}

export function describeLlmForHumans(): string {
  const status = getLlmStatus();
  if (!status.configured) {
    return "No LLM key — extractive / graph-only mode. Set OPENROUTER_API_KEY (preferred) or OPENAI_API_KEY.";
  }
  return `Using ${status.provider} (${status.chatModel}).`;
}
